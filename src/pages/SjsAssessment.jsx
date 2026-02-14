import React, { useState, useEffect, useMemo, useRef } from 'react';
// --- 1. CONFIGURATION ---
const aldenCriteria = {
  time: [
    { value: 3, label: 'Suggestive (5 - 28 days)' },
    { value: 2, label: 'Compatible (29 - 56 days)' },
    { value: 1, label: 'Likely (1 - 4 days)' },
    { value: -1, label: 'Unlikely (> 56 days)' },
    { value: -3, label: 'Excluded (Start after Index Day)' },
  ],
  presence: [
    { value: 0, label: 'Definite (Present at onset)' },
    { value: -1, label: 'Doubtful (Stopped > 5x T1/2)' },
    { value: -3, label: 'Excluded (Stopped long ago)' },
  ],
  prechallenge: [
    { value: 4, label: 'Positive (SJS/TEN w/ same drug)' },
    { value: 2, label: 'Positive (SJS/TEN w/ similar drug)' },
    { value: 1, label: 'Positive (Other reaction)' },
    { value: 0, label: 'Unknown / None' },
    { value: -2, label: 'Negative (Used before/during w/o harm)' },
  ],
  dechallenge: [
    { value: 0, label: 'Neutral (Stopped/Unknown)' },
    { value: -2, label: 'Negative (Continued w/o harm)' },
  ],
  notoriety: [
    { value: 3, label: 'Strongly Associated (High Risk)' },
    { value: 2, label: 'Associated (Lower Risk)' },
    { value: 1, label: 'Suspected (Surveillance)' },
    { value: 0, label: 'Unknown (New drugs)' },
    { value: -1, label: 'Not Suspected (Common drugs)' },
  ],
  otherCause: [
    { value: 0, label: 'No other strong cause' },
    { value: -1, label: 'Other drug has score > 3' },
  ],
};

const HIGH_RISK_DRUGS = [
  'allopurinol',
  'carbamazepine',
  'lamotrigine',
  'phenobarbital',
  'phenytoin',
  'sulfamethoxazole',
  'nevirapine',
  'oxicam',
  'tenoxicam',
  'piroxicam',
  'meloxicam',
];
const COMMON_SAFE_DRUGS = [
  'paracetamol',
  'acetaminophen',
  'ibuprofen',
  'insulin',
  'metformin',
];

// --- HELPER: DATE NORMALIZER (Returns Timestamp) ---
const normalizeDate = (dateStr) => {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  // Use strictly local year/month/day to midnight
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
};

// --- 2. SUB-COMPONENTS ---
const AldenRow = ({
  label,
  subLabel,
  value,
  onChange,
  optionsArr,
  isAutoCalc,
}) => {
  const safeValue = parseInt(value) ?? 0;
  const selectedLabel =
    optionsArr.find((o) => o.value === safeValue)?.label || '';
  return (
    <tr className="border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors">
      <td className="py-3 pl-6 w-[35%] align-middle text-slate-700 font-bold text-sm text-left">
        {label}{' '}
        {isAutoCalc && (
          <span className="ml-2 text-[9px] bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded border border-blue-200 tracking-wider">
            AUTO
          </span>
        )}
      </td>
      <td className="py-3 px-2 w-[25%] align-middle text-slate-500 text-xs text-left">
        {subLabel}
      </td>
      <td className="py-3 pr-6 w-[40%] align-middle text-right">
        <div className="hidden print:block text-sm font-bold text-slate-800 text-right">
          {selectedLabel} ({safeValue > 0 ? `+${safeValue}` : safeValue})
        </div>
        <div className="print:hidden">
          <select
            className={`w-full text-right font-bold bg-transparent focus:outline-none cursor-pointer text-sm ${
              safeValue > 0
                ? 'text-orange-600'
                : safeValue < 0
                ? 'text-slate-400'
                : 'text-slate-600'
            }`}
            value={safeValue}
            onChange={onChange}
          >
            {optionsArr.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label} ({opt.value > 0 ? `+${opt.value}` : opt.value})
              </option>
            ))}
          </select>
        </div>
      </td>
    </tr>
  );
};

const AldenCard = ({
  drugName,
  groupedData,
  score,
  onScoreChange,
  indexDate,
}) => {
  const totalScore = Object.values(score).reduce(
    (a, b) => a + (parseInt(b) || 0),
    0
  );
  let result = {
    text: 'Unlikely',
    color: 'bg-slate-400',
    border: 'border-slate-400',
  };
  if (totalScore >= 6)
    result = {
      text: 'Very Probable',
      color: 'bg-red-600',
      border: 'border-red-600',
    };
  else if (totalScore >= 4)
    result = {
      text: 'Probable',
      color: 'bg-orange-500',
      border: 'border-orange-500',
    };
  else if (totalScore >= 2)
    result = {
      text: 'Possible',
      color: 'bg-yellow-500',
      border: 'border-yellow-500',
    };
  else if (totalScore < 0)
    result = {
      text: 'Very Unlikely',
      color: 'bg-green-600',
      border: 'border-green-600',
    };

  const dateRanges = groupedData.intervals
    .map(
      (iv) =>
        `${new Date(iv.startDate).toLocaleDateString('en-GB', {
          day: 'numeric',
          month: 'short',
        })} - ${
          iv.stopDate
            ? new Date(iv.stopDate).toLocaleDateString('en-GB', {
                day: 'numeric',
                month: 'short',
              })
            : 'Ongoing'
        }`
    )
    .join(', ');

  return (
    <div
      className={`print-section border-2 ${result.border} rounded-xl overflow-hidden shadow-sm bg-white mb-6 break-inside-avoid animate-fade-in`}
    >
      <div
        className={`${result.color} text-white px-6 py-4 flex justify-between items-center shadow-inner`}
      >
        <div>
          <h3 className="text-2xl font-bold tracking-tight text-left capitalize">
            {drugName}
          </h3>
          <div className="text-xs opacity-90 mt-1 font-mono">
            <span className="bg-white/20 px-2 py-0.5 rounded border border-white/10">
              {dateRanges}
            </span>
          </div>
        </div>
        <div className="text-right">
          <div className="text-5xl font-extrabold leading-none drop-shadow-md">
            {totalScore}
          </div>
          <div className="text-sm font-bold uppercase tracking-widest opacity-90 mt-1">
            {result.text}
          </div>
        </div>
      </div>
      <div className="bg-white p-4">
        <table className="w-full table-fixed border-collapse">
          <tbody>
            <AldenRow
              label="1. Time Lag"
              subLabel={`Index: ${indexDate || '?'}`}
              value={score.time}
              onChange={(e) => onScoreChange(drugName, 'time', e.target.value)}
              optionsArr={aldenCriteria.time}
              isAutoCalc
            />
            <AldenRow
              label="2. Drug Presence"
              subLabel="T1/2 & Kidney/Liver"
              value={score.presence}
              onChange={(e) =>
                onScoreChange(drugName, 'presence', e.target.value)
              }
              optionsArr={aldenCriteria.presence}
            />
            <AldenRow
              label="3. Prechallenge/Rechallenge"
              subLabel="History of use"
              value={score.prechallenge}
              onChange={(e) =>
                onScoreChange(drugName, 'prechallenge', e.target.value)
              }
              optionsArr={aldenCriteria.prechallenge}
              isAutoCalc
            />
            <AldenRow
              label="4. Dechallenge"
              subLabel="Stopped drug?"
              value={score.dechallenge}
              onChange={(e) =>
                onScoreChange(drugName, 'dechallenge', e.target.value)
              }
              optionsArr={aldenCriteria.dechallenge}
            />
            <AldenRow
              label="5. Notoriety"
              subLabel="EuroSCAR Data"
              value={score.notoriety}
              onChange={(e) =>
                onScoreChange(drugName, 'notoriety', e.target.value)
              }
              optionsArr={aldenCriteria.notoriety}
              isAutoCalc
            />
            <AldenRow
              label="6. Other Cause"
              subLabel="If other drug > 3"
              value={score.otherCause}
              onChange={(e) =>
                onScoreChange(drugName, 'otherCause', e.target.value)
              }
              optionsArr={aldenCriteria.otherCause}
              isAutoCalc={score.otherCause === -1}
            />
          </tbody>
        </table>
      </div>
    </div>
  );
};

// --- 3. MAIN COMPONENT ---
const SjsAssessment = (props) => {
  const [internalDrugList, setInternalDrugList] = useState([]);
  const [internalIndexDate, setInternalIndexDate] = useState('');
  const [internalNote, setInternalNote] = useState('');

  const drugList = props.drugList || internalDrugList;
  const setDrugList = props.setDrugList || setInternalDrugList;
  const indexDate =
    props.indexDate !== undefined ? props.indexDate : internalIndexDate;
  const setIndexDate = props.setIndexDate || setInternalIndexDate;
  const pharmacistNote =
    props.pharmacistNote !== undefined ? props.pharmacistNote : internalNote;
  const setPharmacistNote = props.onPharmacistNoteChange || setInternalNote;

  const [internalLogs, setInternalLogs] = useState([]);
  const symptomLogs = props.symptomLogs || internalLogs;
  const setSymptomLogs = props.setSymptomLogs || setInternalLogs;

  const [currentDrug, setCurrentDrug] = useState({
    name: '',
    startDate: '',
    stopDate: '',
  });
  const [currentLog, setCurrentLog] = useState({
    date: '',
    detachment: '',
    temp: '',
    mucositis: { eye: false, mouth: false, genital: false },
    note: '',
  });

  const [aldenScores, setAldenScores] = useState({});
  const [timelineMeta, setTimelineMeta] = useState(null);
  const [activeTab, setActiveTab] = useState(null);
  const [showResults, setShowResults] = useState(false);

  // --- HELPER: GROUP DRUGS ---
  const groupedDrugs = useMemo(() => {
    const groups = {};
    drugList.forEach((d) => {
      const key = d.name.trim().toLowerCase();
      if (!groups[key])
        groups[key] = { id: key, displayName: d.name, intervals: [] };
      groups[key].intervals.push({
        startDate: d.startDate,
        stopDate: d.stopDate,
      });
    });
    return Object.values(groups);
  }, [drugList]);

  // --- TIMELINE: EVENT-BASED POINTS ---
  const timelinePoints = useMemo(() => {
    if (drugList.length === 0 && !indexDate) return [];
    const uniqueDates = new Set();
    drugList.forEach((d) => {
      uniqueDates.add(normalizeDate(d.startDate));
      if (d.stopDate) uniqueDates.add(normalizeDate(d.stopDate));
      if (indexDate) uniqueDates.add(normalizeDate(indexDate));
    });
    symptomLogs.forEach((l) => uniqueDates.add(normalizeDate(l.date)));
    return Array.from(uniqueDates)
      .filter((d) => d !== null)
      .sort((a, b) => a - b);
  }, [drugList, symptomLogs, indexDate]);

  // --- HELPER: Position Calculation (Pass Timestamp Number Only) ---
  const getTimelinePos = (dateInput) => {
    // Allow passing date string OR timestamp number
    const target =
      typeof dateInput === 'number' ? dateInput : normalizeDate(dateInput);

    if (!target || timelinePoints.length < 2) return 0;

    const index = timelinePoints.indexOf(target);
    if (index !== -1) return 5 + (index / (timelinePoints.length - 1)) * 90;

    // Interpolate
    let prevIndex = -1;
    for (let i = 0; i < timelinePoints.length; i++) {
      if (timelinePoints[i] < target) prevIndex = i;
      else break;
    }
    if (prevIndex === -1) return 0;
    if (prevIndex === timelinePoints.length - 1) return 100;

    const t1 = timelinePoints[prevIndex];
    const t2 = timelinePoints[prevIndex + 1];
    const ratio = (target - t1) / (t2 - t1);
    const p1 = 5 + (prevIndex / (timelinePoints.length - 1)) * 90;
    const p2 = 5 + ((prevIndex + 1) / (timelinePoints.length - 1)) * 90;
    return p1 + ratio * (p2 - p1);
  };

  const getBarProps = (start, stop) => {
    if (timelinePoints.length < 2)
      return { left: '0%', width: '0%', showStart: true, showEnd: true };
    const tStart = normalizeDate(start);
    const tStop = stop
      ? normalizeDate(stop)
      : timelinePoints[timelinePoints.length - 1]; // Extend to end if ongoing

    const left = getTimelinePos(tStart);
    const right = getTimelinePos(tStop);

    return {
      left: `${left}%`,
      width: `${Math.max(0.5, right - left)}%`,
      showStart: true,
      showEnd: !!stop,
    };
  };

  // --- ANALYSIS LOGIC ---
  const performAnalysis = () => {
    const newScores = {};
    const tIndex = normalizeDate(indexDate);
    const sortedLogs = [...symptomLogs].sort(
      (a, b) => normalizeDate(a.date) - normalizeDate(b.date)
    );

    groupedDrugs.forEach((group) => {
      const drugName = group.id;
      let scores = {
        time: 0,
        presence: 0,
        prechallenge: 0,
        dechallenge: 0,
        notoriety: 0,
        otherCause: 0,
      };

      let relevantStart = null;
      let relevantStop = null;

      group.intervals.forEach((iv) => {
        const tStart = normalizeDate(iv.startDate);
        if (tStart <= tIndex) {
          if (!relevantStart || tStart > relevantStart) {
            relevantStart = tStart;
            relevantStop = normalizeDate(iv.stopDate);
          }
        }
      });

      if (tIndex && relevantStart) {
        const diffDays = Math.ceil((tIndex - relevantStart) / 86400000);
        if (diffDays < 0) scores.time = -3;
        else if (diffDays >= 5 && diffDays <= 28) scores.time = 3;
        else if (diffDays >= 29 && diffDays <= 56) scores.time = 2;
        else if (diffDays >= 1 && diffDays <= 4) scores.time = 1;
        else scores.time = -1;
      } else {
        scores.time = -3;
      }

      const lowerName = drugName;
      if (HIGH_RISK_DRUGS.some((d) => lowerName.includes(d)))
        scores.notoriety = 3;
      else if (COMMON_SAFE_DRUGS.some((d) => lowerName.includes(d)))
        scores.notoriety = -1;

      if (relevantStop) {
        if ((tIndex - relevantStop) / 86400000 > 5) scores.presence = -1;
      }

      let isRechallengedSafe = false;
      const postOnsetIntervals = group.intervals.filter((iv) => {
        const tStop = iv.stopDate ? normalizeDate(iv.stopDate) : Date.now();
        return tStop > tIndex;
      });

      if (postOnsetIntervals.length > 0 && sortedLogs.length > 1) {
        const logsAfterOnset = sortedLogs.filter(
          (l) => normalizeDate(l.date) > tIndex
        );
        let improving = false;
        let worsening = false;

        for (let i = 1; i < logsAfterOnset.length; i++) {
          const curr = logsAfterOnset[i];
          const prev = logsAfterOnset[i - 1];
          const tCurr = normalizeDate(curr.date);

          const drugPresent = postOnsetIntervals.some((iv) => {
            const tStart = normalizeDate(iv.startDate);
            const tStop = iv.stopDate ? normalizeDate(iv.stopDate) : Date.now();
            return tCurr >= tStart && tCurr <= tStop;
          });

          if (drugPresent) {
            const bsaDown =
              (parseFloat(curr.detachment) || 0) <=
              (parseFloat(prev.detachment) || 0);
            if (bsaDown) improving = true;
            else worsening = true;
          }
        }
        if (improving && !worsening) isRechallengedSafe = true;
      }

      if (isRechallengedSafe) scores.prechallenge = -2;
      if (aldenScores[drugName])
        scores = { ...scores, ...aldenScores[drugName] };
      newScores[drugName] = scores;
    });

    const intermediateScores = {};
    Object.keys(newScores).forEach((id) => {
      const s = newScores[id];
      intermediateScores[id] =
        s.time + s.presence + s.prechallenge + s.dechallenge + s.notoriety;
    });
    const strongSuspectIds = Object.keys(intermediateScores).filter(
      (id) => intermediateScores[id] > 3
    );
    Object.keys(newScores).forEach((id) => {
      if (!strongSuspectIds.includes(id) && strongSuspectIds.length > 0)
        newScores[id].otherCause = -1;
      else newScores[id].otherCause = 0;
    });

    // Set Meta just to trigger render
    if (timelinePoints.length > 0) setTimelineMeta({ valid: true });

    setAldenScores(newScores);
    setShowResults(true);
    if (groupedDrugs.length > 0) setActiveTab(groupedDrugs[0].id);

    const rankedDrugs = groupedDrugs
      .map((g) => {
        const s = newScores[g.id];
        const total = Object.values(s).reduce(
          (a, b) => a + (parseInt(b) || 0),
          0
        );
        return { name: g.displayName, id: g.id, total };
      })
      .sort((a, b) => b.total - a.total);

    if (props.onAnalysisComplete) {
      props.onAnalysisComplete({
        scores: newScores,
        rankedDrugs: rankedDrugs,
        type: 'sjs',
      });
    }
  };

  // สร้างตัวแปรเช็คว่าเคยโหลดครั้งแรกไปหรือยัง
  const isInitialLoad = useRef(true);

  // 🟢 IMPROVED: Trigger Analysis Automatically when Data is Ready
  useEffect(() => {
    // เช็คว่ามีข้อมูลยาและวันที่มาครบแล้ว และยังเป็นการโหลดครั้งแรกอยู่
    if (isInitialLoad.current && drugList.length > 0 && indexDate) {
      performAnalysis();
      isInitialLoad.current = false; // ปิด flag เพื่อไม่ให้คำนวณอัตโนมัติเวลามีการแก้ไขข้อมูลทีหลัง
    }
  }, [drugList, indexDate]); // ใส่ dependency เพื่อให้ useEffect เฝ้าดูว่าข้อมูลมาหรือยัง

  // --- HANDLERS ---
  const handleScoreChange = (drugId, criteria, val) =>
    setAldenScores((prev) => ({
      ...prev,
      [drugId]: { ...prev[drugId], [criteria]: val },
    }));
  const handleAddDrug = () => {
    if (!currentDrug.name || !currentDrug.startDate)
      return alert('Need Name & Start Date');
    const newId = Date.now();
    setDrugList([...drugList, { ...currentDrug, id: newId }]);
    setCurrentDrug({ name: '', startDate: '', stopDate: '' });
    setShowResults(false); // Reset results on edit
  };
  const handleDeleteDrug = (id) => {
    setDrugList(drugList.filter((d) => d.id !== id));
    setShowResults(false); // Reset results on edit
  };
  const handleAddLog = () => {
    if (!currentLog.date) return;
    setSymptomLogs(
      [...symptomLogs, { ...currentLog, id: Date.now() }].sort(
        (a, b) => normalizeDate(a.date) - normalizeDate(b.date)
      )
    );
    setCurrentLog({
      date: '',
      detachment: '',
      temp: '',
      mucositis: { eye: false, mouth: false, genital: false },
      note: '',
    });
    setShowResults(false); // Reset results on edit
  };
  const handleDeleteLog = (id) => {
    setSymptomLogs(symptomLogs.filter((l) => l.id !== id));
    setShowResults(false); // Reset results on edit
  };

  const calculateTotal = (id) =>
    aldenScores[id]
      ? Object.values(aldenScores[id]).reduce(
          (a, b) => a + (parseInt(b) || 0),
          0
        )
      : 0;
  const getSmartDateTicks = () => timelinePoints.map((ts) => new Date(ts));

  // 🟢 SMART STACKING (Waterfall Logic)
  const stackedLogs = useMemo(() => {
    const logs = [...symptomLogs].sort(
      (a, b) => normalizeDate(a.date) - normalizeDate(b.date)
    );
    const result = [];
    if (logs.length === 0) return [];
    logs[0].level = 0;
    result.push(logs[0]);
    for (let i = 1; i < logs.length; i++) {
      const current = logs[i];
      const prev = result[i - 1];
      const currentPos = getTimelinePos(normalizeDate(current.date));
      const prevPos = getTimelinePos(normalizeDate(prev.date));
      if (Math.abs(currentPos - prevPos) < 8) {
        current.level = (prev.level + 1) % 4;
      } else {
        current.level = 0;
      }
      result.push(current);
    }
    return result;
  }, [symptomLogs, timelinePoints]);

  return (
    <div className="space-y-10 animate-fade-in font-sans p-4 max-w-5xl mx-auto">
      <style>{`
            @media print {
                .print-color-exact {
                    -webkit-print-color-adjust: exact !important;
                    print-color-adjust: exact !important;
                }
            }
        `}</style>

      {/* 1. INPUT SECTION */}
      <div className="bg-orange-50 p-6 rounded-xl border border-orange-100 shadow-sm print:hidden">
        <h2 className="text-orange-800 font-bold text-xl mb-6 flex items-center gap-2 border-b border-orange-200 pb-4">
          🔥 SJS/TEN Assessment (ALDEN)
        </h2>
        <div className="mb-8 flex items-center gap-4 bg-white p-4 rounded-lg border border-orange-200 shadow-sm max-w-md">
          <label className="font-bold text-slate-700 text-base">
            Index Day (Onset):
          </label>
          <input
            type="date"
            className="flex-1 border p-2 rounded shadow-sm focus:ring-2 focus:ring-orange-300 outline-none font-bold text-orange-600 text-lg"
            value={indexDate}
            onChange={(e) => {
              setIndexDate(e.target.value);
              setShowResults(false);
            }}
          />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col h-full">
            <h3 className="text-base font-bold text-slate-700 mb-4 border-b pb-2 flex items-center gap-2">
              💊 Culprit Drug
            </h3>
            <div className="space-y-4 flex-grow">
              <input
                placeholder="Drug Name"
                className="w-full border border-slate-300 p-2.5 rounded-lg text-base focus:ring-2 focus:ring-blue-100 outline-none"
                value={currentDrug.name}
                onChange={(e) =>
                  setCurrentDrug({ ...currentDrug, name: e.target.value })
                }
              />
              <div className="flex gap-3">
                <div className="flex-1">
                  <span className="text-xs font-bold text-slate-500 mb-1 block">
                    Start
                  </span>
                  <input
                    type="date"
                    className="w-full border p-2 rounded text-sm"
                    value={currentDrug.startDate}
                    onChange={(e) =>
                      setCurrentDrug({
                        ...currentDrug,
                        startDate: e.target.value,
                      })
                    }
                  />
                </div>
                <div className="flex-1">
                  <span className="text-xs font-bold text-slate-500 mb-1 block">
                    Stop (Opt)
                  </span>
                  <input
                    type="date"
                    className="w-full border p-2 rounded text-sm"
                    value={currentDrug.stopDate}
                    onChange={(e) =>
                      setCurrentDrug({
                        ...currentDrug,
                        stopDate: e.target.value,
                      })
                    }
                  />
                </div>
              </div>
              <button
                onClick={handleAddDrug}
                className="w-full bg-slate-700 text-white font-bold py-2.5 rounded-lg hover:bg-slate-800 transition shadow-sm hover:shadow"
              >
                + Add Drug
              </button>
              <div className="mt-6 space-y-3">
                {drugList.map((d) => (
                  <div
                    key={d.id}
                    className="w-full bg-white border border-slate-200 p-3 rounded-lg shadow-sm flex items-center justify-between group hover:border-orange-300 transition-all"
                  >
                    <div className="flex items-center gap-3 w-full overflow-hidden">
                      <strong className="text-slate-800 text-base min-w-[100px] truncate">
                        {d.name}
                      </strong>
                      <div className="flex items-center gap-1.5 text-slate-600 bg-slate-100 px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap border border-slate-200">
                        <span>
                          {new Date(d.startDate).toLocaleDateString('en-GB', {
                            day: 'numeric',
                            month: 'short',
                          })}
                        </span>
                        <span className="text-slate-400">→</span>
                        <span>
                          {d.stopDate
                            ? new Date(d.stopDate).toLocaleDateString('en-GB', {
                                day: 'numeric',
                                month: 'short',
                              })
                            : 'Ongoing'}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeleteDrug(d.id)}
                      className="text-slate-300 hover:text-red-500 font-bold px-2 text-lg ml-2"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
          {/* 🟢 FIXED: INPUT UI for Daily Log */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col h-full">
            <h3 className="text-base font-bold text-slate-700 mb-4 border-b pb-2 flex items-center gap-2">
              📝 Daily Clinical Log
            </h3>
            <div className="space-y-4 flex-grow">
              <div className="flex gap-3">
                <div className="flex-1">
                  <span className="text-xs font-bold text-slate-500 block mb-1">
                    Date
                  </span>
                  <input
                    type="date"
                    className="w-full border border-slate-300 p-2.5 rounded-lg text-base"
                    value={currentLog.date}
                    onChange={(e) =>
                      setCurrentLog({ ...currentLog, date: e.target.value })
                    }
                  />
                </div>
                <div className="w-1/3">
                  <span className="text-xs font-bold text-slate-500 block mb-1">
                    % Detachment
                  </span>
                  <input
                    type="number"
                    placeholder="%"
                    className="w-full border border-slate-300 p-2.5 rounded-lg text-base text-center font-bold text-red-600 bg-red-50 focus:bg-white transition-colors"
                    value={currentLog.detachment}
                    onChange={(e) =>
                      setCurrentLog({
                        ...currentLog,
                        detachment: e.target.value,
                      })
                    }
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 bg-slate-50 p-3 rounded-lg border border-slate-100">
                <div>
                  <span className="text-xs font-bold text-slate-500 block mb-1">
                    Max Temp (°C)
                  </span>
                  <input
                    type="number"
                    placeholder="37.0"
                    className={`w-full border p-2 rounded-lg text-base font-medium ${
                      parseFloat(currentLog.temp) > 38
                        ? 'border-red-300 bg-white text-red-700'
                        : 'border-slate-300'
                    }`}
                    value={currentLog.temp}
                    onChange={(e) =>
                      setCurrentLog({ ...currentLog, temp: e.target.value })
                    }
                  />
                </div>
                {/* 🟢 BEAUTIFUL CHECKBOX LAYOUT */}
                <div>
                  <span className="text-xs font-bold text-slate-500 block mb-1">
                    Mucosal Sites
                  </span>
                  <div className="flex gap-2 justify-between pt-2">
                    {['Eye', 'Mouth', 'Genital'].map((site) => (
                      <label
                        key={site}
                        className="flex flex-col items-center cursor-pointer group"
                      >
                        <div className="relative">
                          <input
                            type="checkbox"
                            className="peer sr-only"
                            checked={currentLog.mucositis[site.toLowerCase()]}
                            onChange={(e) =>
                              setCurrentLog({
                                ...currentLog,
                                mucositis: {
                                  ...currentLog.mucositis,
                                  [site.toLowerCase()]: e.target.checked,
                                },
                              })
                            }
                          />
                          <div className="w-5 h-5 border-2 border-slate-300 rounded peer-checked:bg-purple-500 peer-checked:border-purple-500 transition-all"></div>
                          <svg
                            className="absolute w-3 h-3 text-white hidden peer-checked:block top-1 left-1 pointer-events-none"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth="4"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M5 13l4 4L19 7"
                            />
                          </svg>
                        </div>
                        <span className="text-[10px] font-bold text-slate-400 mt-1 group-hover:text-purple-600 peer-checked:text-purple-600 transition-colors">
                          {site}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
              <input
                placeholder="Note (e.g. Hypotension)"
                className="w-full border border-slate-300 p-2.5 rounded-lg text-base"
                value={currentLog.note}
                onChange={(e) =>
                  setCurrentLog({ ...currentLog, note: e.target.value })
                }
              />
              <button
                onClick={handleAddLog}
                className="w-full bg-orange-100 text-orange-700 border border-orange-200 font-bold py-2.5 rounded-lg hover:bg-orange-200 transition"
              >
                + Add Log
              </button>
            </div>
            <div className="mt-4 max-h-48 overflow-y-auto space-y-2 pr-1">
              {symptomLogs.map((l) => {
                const activeSites = Object.entries(l.mucositis)
                  .filter(([k, v]) => v)
                  .map(([k]) => k.charAt(0).toUpperCase() + k.slice(1));
                return (
                  <div
                    key={l.id}
                    className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm flex flex-col gap-1.5 hover:border-blue-300 transition-colors"
                  >
                    <div className="flex justify-between items-center border-b border-slate-50 pb-1">
                      <span className="font-bold text-slate-800 text-sm">
                        {new Date(l.date).toLocaleDateString('en-GB', {
                          day: 'numeric',
                          month: 'short',
                        })}
                      </span>
                      <button
                        onClick={() => handleDeleteLog(l.id)}
                        className="text-slate-300 hover:text-red-500 font-bold text-lg"
                      >
                        ×
                      </button>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      {l.detachment && (
                        <span className="bg-red-100 text-red-800 px-2 py-0.5 rounded text-xs font-bold border border-red-200">
                          {l.detachment}% BSA
                        </span>
                      )}
                      {parseFloat(l.temp) > 38 && (
                        <span className="text-xs bg-red-50 text-red-600 px-2 py-0.5 rounded border border-red-100 font-bold">
                          🌡 Fever
                        </span>
                      )}
                      {/* 🟢 SHOW MUCOSITIS BADGES IN LIST */}
                      {activeSites.length > 0 && (
                        <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded border border-purple-200 font-bold">
                          {activeSites.join(', ')}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
        <button
          onClick={performAnalysis}
          disabled={!indexDate || drugList.length === 0}
          className={`w-full mt-8 text-white text-xl py-4 rounded-xl font-bold shadow-lg transition transform active:scale-95 flex justify-center gap-3 items-center ${
            !indexDate || drugList.length === 0
              ? 'bg-slate-300 cursor-not-allowed'
              : 'bg-orange-600 hover:bg-orange-700 hover:shadow-orange-200'
          }`}
        >
          <span>⚡</span> Update Timeline & Calculate
        </button>
        <div className="mt-8 bg-white p-5 rounded-xl border border-slate-200 shadow-sm text-left">
          <h3 className="text-base font-bold text-slate-700 mb-3 flex items-center gap-2">
            📝 Pharmacist Note
          </h3>
          <textarea
            className="w-full border border-slate-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-blue-100 outline-none resize-y min-h-[100px]"
            value={pharmacistNote}
            onChange={(e) => setPharmacistNote(e.target.value)}
          />
        </div>
      </div>

      {showResults && timelinePoints.length > 0 && (
        <>
          {/* 2. TIMELINE SECTION */}
          <div className="bg-white border border-slate-200 rounded-xl p-8 shadow-sm print:break-inside-avoid relative overflow-hidden">
            <h3 className="font-bold text-slate-700 mb-6 border-b pb-2 text-lg text-left">
              📅 Clinical Timeline
            </h3>

            <div className="relative w-full min-h-[200px] mb-6">
              {/* 🟢 2. DRUGS SECTION */}
              <div className="relative mb-0 pb-6 border-b border-slate-200 z-10">
                {/* 🟢 ย้ายเส้น ONSET มาไว้ตรงนี้ เพื่อให้ความยาวสุดแค่ขอบเขตของส่วนยา (เส้นสีเทา) */}
                <div className="absolute inset-0 pointer-events-none">
                  <div className="w-full h-full flex">
                    <div className="w-[15%]"></div>
                    <div className="w-[85%] relative h-full">
                      {indexDate && (
                        <div
                          className="absolute top-0 bottom-0 border-l-[2px] border-red-500 border-solid transform -translate-x-1/2 print:border-red-600 print-color-exact"
                          style={{
                            left: `${getTimelinePos(
                              normalizeDate(indexDate)
                            )}%`,
                          }}
                        >
                          <div className="absolute -top-7 -left-10 bg-red-500 text-white text-[10px] px-2 py-1 rounded shadow font-bold whitespace-nowrap z-20 print:bg-red-600 print-color-exact">
                            ONSET{' '}
                            {new Date(indexDate).toLocaleDateString('en-GB', {
                              day: 'numeric',
                              month: 'short',
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="space-y-6 relative">
                  {groupedDrugs.map((group, i) => (
                    <div key={i} className="flex w-full items-center h-6 group">
                      <div className="w-[15%] text-right pr-4 text-sm font-bold truncate text-slate-700 capitalize">
                        {group.displayName}
                      </div>
                      <div className="w-[85%] relative h-full flex items-center">
                        {group.intervals.map((iv, idx) => {
                          const barProps = getBarProps(
                            iv.startDate,
                            iv.stopDate
                          );
                          return (
                            <React.Fragment key={idx}>
                              <div
                                className="absolute h-1.5 bg-slate-400 rounded-full transition-colors print:bg-slate-500 print-color-exact"
                                style={{
                                  left: barProps.left,
                                  width: barProps.width,
                                }}
                              ></div>
                              {barProps.showStart && (
                                <div
                                  className="absolute w-3.5 h-3.5 bg-slate-400 rounded-full border border-white shadow z-10 transform -translate-x-1/2 print:bg-slate-500 print-color-exact"
                                  style={{
                                    left: `${getTimelinePos(
                                      normalizeDate(iv.startDate)
                                    )}%`,
                                  }}
                                  title={`Start: ${iv.startDate}`}
                                ></div>
                              )}
                              {barProps.showEnd && (
                                <div
                                  className="absolute w-3.5 h-3.5 bg-slate-400 rounded-full border border-white shadow z-10 transform -translate-x-1/2 print:bg-slate-500 print-color-exact"
                                  style={{
                                    left: `${getTimelinePos(
                                      normalizeDate(
                                        iv.stopDate || new Date().toISOString()
                                      )
                                    )}%`,
                                  }}
                                  title={`Stop: ${iv.stopDate || 'Ongoing'}`}
                                ></div>
                              )}
                            </React.Fragment>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 🟢 3. DETAILED CLINICAL DATA */}
              <div className="pt-4 space-y-4 relative z-10">
                {/* Detachment */}
                <div className="flex w-full items-center min-h-[40px] relative">
                  <div className="w-[15%] text-right pr-4 text-xs font-bold text-red-600">
                    Detachment
                  </div>
                  <div className="w-[85%] relative h-full">
                    {stackedLogs.map(
                      (l) =>
                        l.detachment && (
                          <div
                            key={l.id}
                            className={`absolute transform -translate-x-1/2 flex flex-col items-center`}
                            style={{
                              left: `${getTimelinePos(normalizeDate(l.date))}%`,
                              top: `${l.level * 24}px`,
                            }}
                          >
                            {l.level > 0 && (
                              <div
                                className="w-px bg-slate-200 mb-0.5 print:bg-slate-400 print-color-exact"
                                style={{ height: `${l.level * 24}px` }}
                              ></div>
                            )}
                            <span className="text-[10px] font-bold text-red-600 bg-white/90 px-1 rounded shadow-sm border border-slate-100 whitespace-nowrap print:border-slate-300 print-color-exact">
                              {l.detachment}%
                            </span>
                          </div>
                        )
                    )}
                  </div>
                </div>
                {/* Temp */}
                <div className="flex w-full items-center min-h-[40px] relative mt-4">
                  <div className="w-[15%] text-right pr-4 text-xs font-bold text-orange-600">
                    Temp
                  </div>
                  <div className="w-[85%] relative h-full">
                    {stackedLogs.map(
                      (l) =>
                        l.temp && (
                          <div
                            key={l.id}
                            className={`absolute transform -translate-x-1/2 flex flex-col items-center`}
                            style={{
                              left: `${getTimelinePos(normalizeDate(l.date))}%`,
                              top: `${l.level * 24}px`,
                            }}
                          >
                            {l.level > 0 && (
                              <div
                                className="w-px bg-slate-200 mb-0.5 print:bg-slate-400 print-color-exact"
                                style={{ height: `${l.level * 24}px` }}
                              ></div>
                            )}
                            <span
                              className={`text-[10px] font-bold bg-white/90 px-1 rounded shadow-sm border border-slate-100 whitespace-nowrap print:border-slate-300 print-color-exact ${
                                parseFloat(l.temp) > 38
                                  ? 'text-red-500'
                                  : 'text-slate-600'
                              }`}
                            >
                              {l.temp}
                            </span>
                          </div>
                        )
                    )}
                  </div>
                </div>

                {/* 🟢 NEW: Single Mucositis Row with Vertical Stack */}
                <div className="mt-6 border-t border-slate-100 pt-2 print:border-slate-300">
                  <div className="flex w-full items-start min-h-[40px] relative">
                    <div className="w-[15%] text-right pr-4 text-xs font-bold text-purple-700 pt-2">
                      Mucositis
                    </div>
                    <div className="w-[85%] relative h-full">
                      {symptomLogs.map((l) => {
                        // Collect active sites
                        const sites = [];
                        if (l.mucositis?.eye) sites.push('E');
                        if (l.mucositis?.mouth) sites.push('M');
                        if (l.mucositis?.genital) sites.push('G');

                        if (sites.length === 0) return null;

                        return (
                          <div
                            key={l.id}
                            className="absolute transform -translate-x-1/2 flex flex-col gap-1 top-0"
                            style={{
                              left: `${getTimelinePos(normalizeDate(l.date))}%`,
                            }}
                          >
                            {sites.map((s) => (
                              <div
                                key={s}
                                className="w-5 h-5 bg-purple-100 text-purple-700 rounded-full border border-purple-300 shadow-sm print:bg-purple-100 print:border-purple-300 print-color-exact flex items-center justify-center text-[9px] font-bold"
                              >
                                {s}
                              </div>
                            ))}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>

              {/* X-Axis */}
              <div className="flex w-full h-6 items-end mt-8 border-t border-slate-200 pt-2 relative z-10">
                <div className="w-[15%]"></div>
                <div className="w-[85%] relative h-full">
                  {getSmartDateTicks().map((date, i) => (
                    <div
                      key={i}
                      className="absolute top-0 text-[10px] text-slate-400 font-medium -translate-x-1/2 whitespace-nowrap origin-top"
                      style={{ left: `${getTimelinePos(date.getTime())}%` }}
                    >
                      {date.toLocaleDateString('en-GB', {
                        day: '2-digit',
                        month: '2-digit',
                        year: '2-digit',
                      })}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* 3. ALDEN CARDS RESULTS */}
          <div className="animate-slide-up pb-10">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-slate-800">
                Assessment Results
              </h3>
              <span className="text-xs text-slate-500 print:hidden bg-slate-100 px-2 py-1 rounded">
                Auto-calculated
              </span>
            </div>
            <div className="flex flex-wrap gap-2 mb-0 border-b border-slate-200 pb-0 print:hidden">
              {groupedDrugs.map((g) => (
                <button
                  key={g.id}
                  onClick={() => setActiveTab(g.id)}
                  className={`px-4 py-3 rounded-t-lg text-sm font-bold border-t border-x transition-all relative top-[1px] capitalize ${
                    activeTab === g.id
                      ? 'bg-white border-slate-300 border-b-white text-slate-800 shadow-sm z-10'
                      : 'bg-slate-50 border-transparent text-slate-400 hover:bg-slate-100'
                  }`}
                >
                  {/* 🟢 Modified: Show Score in Tab */}
                  <div className="flex items-center gap-2">
                    {g.displayName}
                    <span
                      className={
                        activeTab === g.id ? 'text-orange-600' : 'opacity-75'
                      }
                    >
                      ({calculateTotal(g.id)})
                    </span>
                  </div>
                </button>
              ))}
            </div>
            <div className="bg-white border-x border-b border-slate-200 rounded-b-xl rounded-tr-xl p-1 shadow-sm relative z-0">
              {activeTab && groupedDrugs.find((g) => g.id === activeTab) && (
                <AldenCard
                  key={activeTab}
                  drugName={
                    groupedDrugs.find((g) => g.id === activeTab).displayName
                  }
                  groupedData={groupedDrugs.find((g) => g.id === activeTab)}
                  score={aldenScores[activeTab] || {}}
                  onScoreChange={handleScoreChange}
                  indexDate={indexDate}
                />
              )}
            </div>
            <div className="hidden print:block space-y-6 mt-6">
              {groupedDrugs.map((g) => (
                <AldenCard
                  key={g.id}
                  drugName={g.displayName}
                  groupedData={g}
                  score={aldenScores[g.id] || {}}
                  onScoreChange={handleScoreChange}
                  indexDate={indexDate}
                />
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default SjsAssessment;
