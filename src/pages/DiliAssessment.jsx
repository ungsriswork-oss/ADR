import React, { useState, useEffect, useRef } from 'react';

// --- 1. CONFIGURATION ---
const criteriaOptions = {
  time: [
    { value: 2, label: '5 - 90 days (Best fit)' },
    { value: 1, label: '< 5 days OR > 90 days' },
    { value: 0, label: 'Other / Unknown' },
    { value: -2, label: 'Incompatible (Start > Onset)' },
  ],
  course: [
    { value: 3, label: 'ALT decr ≥50% in 8d' },
    { value: 2, label: 'ALT decr ≥50% in 30d' },
    { value: 1, label: 'ALT decr <50% in 30d' },
    { value: 0, label: 'No significant decrease' },
  ],
  risk: [
    { value: 2, label: 'Age >55 + Alcohol/Preg' },
    { value: 1, label: 'Age >55 or Alcohol/Preg' },
    { value: 0, label: 'None' },
  ],
  concomitant: [
    { value: 0, label: 'None / No overlap' },
    { value: -1, label: 'Concomitant drug present' },
    { value: -2, label: 'Inconclusive cause' },
  ],
  nonDrug: [
    { value: 2, label: 'Ruled out (Group I & II)' },
    { value: 1, label: 'Ruled out (Group I only)' },
    { value: 0, label: 'Not ruled out / Possible' },
    { value: -2, label: 'Non-drug cause identified' },
  ],
  previous: [
    { value: 2, label: 'Reaction labeled' },
    { value: 1, label: 'Reaction published' },
    { value: 0, label: 'Unknown / No info' },
  ],
  rechallenge: [
    { value: 3, label: 'Positive (Recurrence)' },
    { value: 0, label: 'Not done / No data' },
    { value: -2, label: 'Negative (No Recurrence / Adaptation)' },
  ],
};

// --- 2. SUB-COMPONENTS ---
const RucamRow = ({
  label,
  subLabel,
  value,
  onChange,
  optionsArr,
  isRequired,
}) => {
  const selectedOption = optionsArr.find(
    (o) => o.value === (parseInt(value) ?? 0)
  );
  const displayValue = selectedOption ? selectedOption.label : 'Unknown';
  const safeValue = value ?? 0;

  return (
    <tr
      className={`border-b border-slate-100 last:border-0 break-inside-avoid ${
        isRequired ? 'bg-yellow-50' : ''
      }`}
    >
      <td className="py-2 pl-4 w-[35%] align-top font-bold text-slate-700 text-sm text-left">
        {label} {isRequired && <span className="text-red-500 ml-1">*</span>}
      </td>
      <td className="py-2 px-2 w-[25%] align-top text-slate-500 text-xs text-left">
        {subLabel}
      </td>
      <td className="py-2 pr-4 w-[40%] align-top text-right">
        <div className="hidden print:flex flex-col items-end w-full">
          <span className="text-[10px] text-slate-500 text-right w-full whitespace-normal break-words leading-tight">
            {displayValue}
          </span>
          <span className="font-bold text-slate-800 text-sm mt-1 border border-slate-200 px-2 rounded inline-block">
            {safeValue > 0 ? `+${safeValue}` : safeValue}
          </span>
        </div>
        <div className="w-full print:hidden">
          <select
            className="w-full text-right font-bold bg-transparent focus:outline-none cursor-pointer text-sm truncate"
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

const RucamCard = ({
  drugKey,
  group,
  score,
  total,
  result,
  onScoreChange,
  patientAge,
}) => {
  const safeScore = score || {
    time: 0,
    course: 0,
    risk: 0,
    concomitant: 0,
    nonDrug: 0,
    previous: 0,
    rechallenge: 0,
  };

  return (
    <div
      className={`print-section border-2 ${result.border} rounded-xl overflow-hidden shadow-sm bg-white mb-6 break-inside-avoid`}
    >
      <div
        className={`${result.color} text-white px-5 py-3 flex justify-between items-center`}
        style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}
      >
        <div>
          <h3 className="text-xl font-bold">{group.name}</h3>
          <div className="flex gap-2 text-xs opacity-90 mt-1">
            <span className="bg-white/20 px-2 py-0.5 rounded border border-white/20">
              Latency: {group.latency}
            </span>
            {group.hasRechallenge && (
              <span className="bg-white/20 px-2 py-0.5 rounded border border-white/30 font-bold">
                Re-challenged
              </span>
            )}
          </div>
        </div>
        <div className="text-right">
          {!result.isExcluded && (
            <div className="text-3xl font-bold">{total}</div>
          )}
          <div className="text-sm font-bold uppercase tracking-wide opacity-95 bg-black/20 px-2 py-1 rounded inline-block mt-1">
            {result.text}
          </div>
        </div>
      </div>
      <div className="bg-white p-2">
        <table className="w-full table-fixed border-collapse">
          <tbody>
            <RucamRow
              label="1. Time to Onset"
              subLabel={group.latencyText || `Diff = ${group.latency} days`}
              value={safeScore.time}
              onChange={(e) => onScoreChange(drugKey, 'time', e.target.value)}
              optionsArr={criteriaOptions.time}
            />
            <RucamRow
              label="2. Dechallenge"
              subLabel={group.courseLabel}
              value={safeScore.course}
              onChange={(e) => onScoreChange(drugKey, 'course', e.target.value)}
              optionsArr={criteriaOptions.course}
            />
            <RucamRow
              label="3. Risk Factors"
              subLabel={`Age: ${patientAge || 'N/A'}`}
              value={safeScore.risk}
              onChange={(e) => onScoreChange(drugKey, 'risk', e.target.value)}
              optionsArr={criteriaOptions.risk}
            />
            <RucamRow
              label="4. Concomitant"
              subLabel="Overlap check"
              value={safeScore.concomitant}
              onChange={(e) =>
                onScoreChange(drugKey, 'concomitant', e.target.value)
              }
              optionsArr={criteriaOptions.concomitant}
            />
            <RucamRow
              label="5. Non-Drug Causes"
              subLabel="Rule out causes"
              value={safeScore.nonDrug}
              onChange={(e) =>
                onScoreChange(drugKey, 'nonDrug', e.target.value)
              }
              optionsArr={criteriaOptions.nonDrug}
              isRequired={true}
            />
            <RucamRow
              label="6. Previous Info"
              subLabel="Known toxicity"
              value={safeScore.previous}
              onChange={(e) =>
                onScoreChange(drugKey, 'previous', e.target.value)
              }
              optionsArr={criteriaOptions.previous}
              isRequired={true}
            />
            <RucamRow
              label="7. Re-challenge"
              subLabel={
                group.hasRechallenge
                  ? group.rechallengeStatus
                  : 'No re-exposure'
              }
              value={safeScore.rechallenge}
              onChange={(e) =>
                onScoreChange(drugKey, 'rechallenge', e.target.value)
              }
              optionsArr={criteriaOptions.rechallenge}
            />
          </tbody>
        </table>
      </div>
    </div>
  );
};

// --- 3. MAIN COMPONENT ---
const DiliAssessment = ({
  patientData,
  labEntries,
  setLabEntries,
  drugList,
  setDrugList,
  symptomDate,
  setSymptomDate,
  onAnalysisComplete,
  initialAnalysisResult,
  pharmacistNote,
  onPharmacistNoteChange,
  analyzeCount,
}) => {
  const [currentLab, setCurrentLab] = useState({
    date: '',
    ast: '',
    alt: '',
    alp: '',
    tbil: '',
  });
  const [currentDrug, setCurrentDrug] = useState({
    name: '',
    startDate: '',
    stopDate: '',
  });
  const [analysisResult, setAnalysisResult] = useState(
    initialAnalysisResult || null
  );
  const [rucamScores, setRucamScores] = useState(
    initialAnalysisResult?.scores || {}
  );
  const [showRLogic, setShowRLogic] = useState(false);
  const [activeTab, setActiveTab] = useState(null);
  const prevDataRef = useRef('');

  useEffect(() => {
    if (initialAnalysisResult) {
      setAnalysisResult(initialAnalysisResult);
      setRucamScores(initialAnalysisResult.scores || {});
      prevDataRef.current = JSON.stringify({
        labEntries,
        drugList,
        symptomDate,
      });

      if (initialAnalysisResult.groupedDrugs) {
        const keys = Object.keys(initialAnalysisResult.groupedDrugs);
        if (keys.length > 0) setActiveTab(keys[0]);
      }
    }
  }, [initialAnalysisResult]);

  useEffect(() => {
    const currentDataStr = JSON.stringify({
      labEntries,
      drugList,
      symptomDate,
    });
    if (prevDataRef.current && prevDataRef.current !== currentDataStr) {
      setAnalysisResult(null);
    }
    prevDataRef.current = currentDataStr;
  }, [labEntries, drugList, symptomDate]);

  const handleAddLab = () => {
    if (!currentLab.date || !currentLab.alt)
      return alert('กรุณากรอกข้อมูล Lab');
    setLabEntries(
      [...labEntries, { ...currentLab, id: Date.now() }].sort(
        (a, b) => new Date(a.date) - new Date(b.date)
      )
    );
    setCurrentLab({ date: '', ast: '', alt: '', alp: '', tbil: '' });
  };
  const handleDeleteLab = (id) =>
    setLabEntries(labEntries.filter((lab) => lab.id !== id));

  const handleAddDrug = () => {
    if (!currentDrug.name || !currentDrug.startDate)
      return alert('กรุณากรอกข้อมูลยา');
    setDrugList([
      ...drugList,
      {
        ...currentDrug,
        id: Date.now(),
        normalizedName: currentDrug.name.trim().toLowerCase(),
      },
    ]);
    setCurrentDrug({ name: '', startDate: '', stopDate: '' });
  };
  const handleDeleteDrug = (id) =>
    setDrugList(drugList.filter((d) => d.id !== id));

  const handleRucamChange = (drugName, criteria, value) => {
    setRucamScores((prev) => {
      const newScores = {
        ...prev,
        [drugName]: { ...prev[drugName], [criteria]: parseInt(value) },
      };
      if (analysisResult) {
        const updatedRankedDrugs = Object.keys(analysisResult.groupedDrugs)
          .map((key) => {
            const s = newScores[key];
            const total = s
              ? Object.values(s).reduce((a, b) => a + (Number(b) || 0), 0)
              : 0;
            return {
              name: analysisResult.groupedDrugs[key].name,
              total: total,
            };
          })
          .sort((a, b) => b.total - a.total);

        const newResult = {
          ...analysisResult,
          scores: newScores,
          rankedDrugs: updatedRankedDrugs,
        };
        setAnalysisResult(newResult);
        if (onAnalysisComplete) onAnalysisComplete(newResult);
      }
      return newScores;
    });
  };

  // --- ANALYSIS LOGIC ---
  useEffect(() => {
    if (analyzeCount > 0) performAnalysis();
  }, [analyzeCount]);

  const performAnalysis = () => {
    let rFactor = 0,
      type = 'Inconclusive',
      altRatio = 0,
      alpRatio = 0,
      usedALT = 0,
      usedALP = 0;

    if (labEntries.length > 0) {
      usedALT = Math.max(...labEntries.map((l) => parseFloat(l.alt || 0)));
      const maxALP = Math.max(...labEntries.map((l) => parseFloat(l.alp || 0)));
      usedALP = maxALP;
      altRatio = (usedALT / 40).toFixed(2);
      alpRatio = (maxALP / 120).toFixed(2);
      if (parseFloat(alpRatio) > 0) {
        rFactor = (altRatio / alpRatio).toFixed(2);
        if (rFactor >= 5) type = 'Hepatocellular';
        else if (rFactor > 2 && rFactor < 5) type = 'Mixed';
        else type = 'Cholestatic';
      }
    }

    const groupedDrugs = {};
    drugList.forEach((drug) => {
      const key = drug.normalizedName;
      if (!groupedDrugs[key]) {
        groupedDrugs[key] = {
          name: drug.name,
          segments: [],
          latency: 'N/A',
          latencyText: '',
          timeScore: 0,
          ageScore: parseInt(patientData?.age || 0) > 55 ? 1 : 0,
          rechallengeScore: 0,
          hasRechallenge: false,
          rechallengeStatus: 'None',
          concomitantScore: 0,
          dechallengeScore: 0,
          courseLabel: 'Unknown',
          isExcludedTime: false,
        };
      }
      groupedDrugs[key].segments.push(drug);
    });

    const updatedRucamScores = { ...rucamScores };

    Object.keys(groupedDrugs).forEach((key) => {
      const group = groupedDrugs[key];
      group.segments.sort(
        (a, b) => new Date(a.startDate) - new Date(b.startDate)
      );

      // 2. Latency & Timing Check
      if (symptomDate) {
        const onsetT = new Date(symptomDate).getTime();
        const firstStartStr = group.segments[0].startDate;

        // Strict date check (YYYY-MM-DD)
        if (firstStartStr > symptomDate) {
          group.latency = 'Post-onset';
          group.latencyText = 'Started after symptoms';
          group.timeScore = -2; // Exclude score
          group.isExcludedTime = true;
        } else {
          const relevantSegment = group.segments.find(
            (seg) => new Date(seg.startDate).getTime() <= onsetT
          );
          if (relevantSegment) {
            const diffDays = Math.ceil(
              (onsetT - new Date(relevantSegment.startDate).getTime()) /
                86400000
            );
            group.latency = diffDays;
            if (diffDays >= 5 && diffDays <= 90) group.timeScore = 2;
            else if (diffDays >= 1 && diffDays < 5) group.timeScore = 1;
            else if (diffDays > 90) group.timeScore = 1;
            else group.timeScore = 0;
          }
        }
      }

      // 3. Rechallenge Logic
      let hasReChal = false;
      let reChalSegmentIndex = -1;

      // A. Explicit Rechallenge (Gap > 1 day)
      if (group.segments.length > 1) {
        for (let i = 1; i < group.segments.length; i++) {
          const prevStop = group.segments[i - 1].stopDate
            ? new Date(group.segments[i - 1].stopDate).getTime()
            : 0;
          const currStart = new Date(group.segments[i].startDate).getTime();
          if (prevStop > 0 && currStart - prevStop > 86400000) {
            hasReChal = true;
            reChalSegmentIndex = i;
            break;
          }
        }
      }

      const peakALT = Math.max(
        ...labEntries.map((l) => parseFloat(l.alt || 0))
      );

      if (hasReChal) {
        group.hasRechallenge = true;
        const reStartT = new Date(
          group.segments[reChalSegmentIndex].startDate
        ).getTime();
        const labsAfterRechal = labEntries.filter(
          (l) => new Date(l.date).getTime() >= reStartT
        );

        let score = 0;
        let status = 'No Lab Data';

        if (labsAfterRechal.length > 0) {
          const maxReChalALT = Math.max(
            ...labsAfterRechal.map((l) => parseFloat(l.alt || 0))
          );
          if (maxReChalALT < 80) {
            score = -2; // Negative
            status = 'Negative (No spike)';
          } else {
            score = 3; // Positive
            status = 'Positive (Recurrence)';
          }
        }
        group.rechallengeScore = score;
        group.rechallengeStatus = status;
      } else {
        // B. Adaptation Logic
        if (labEntries.length > 0 && peakALT > 0) {
          const peakLab = labEntries.find((l) => parseFloat(l.alt) === peakALT);
          if (peakLab) {
            const peakTime = new Date(peakLab.date).getTime();
            const postPeakLabs = labEntries.filter(
              (l) => new Date(l.date).getTime() > peakTime
            );

            if (postPeakLabs.length > 0) {
              const lowestPostPeakALT = Math.min(
                ...postPeakLabs.map((l) => parseFloat(l.alt))
              );
              const lowestLab = postPeakLabs.find(
                (l) => parseFloat(l.alt) === lowestPostPeakALT
              );
              const lowestTime = new Date(lowestLab.date).getTime();

              // Check if active continuously from Peak to Lowest point
              const isOngoingDuringDrop = group.segments.some((seg) => {
                const s = new Date(seg.startDate).getTime();
                const e = seg.stopDate
                  ? new Date(seg.stopDate).getTime()
                  : Infinity;
                return s <= peakTime && e >= lowestTime;
              });

              if (isOngoingDuringDrop) {
                const decreasePct =
                  ((peakALT - lowestPostPeakALT) / peakALT) * 100;
                if (decreasePct >= 50) {
                  group.hasRechallenge = true;
                  group.rechallengeScore = -2;
                  group.rechallengeStatus = `Negative (Adaptation: Decr ${decreasePct.toFixed(
                    0
                  )}%)`;
                }
              }
            }
          }
        }
      }

      // 4. Dechallenge Logic
      const lastSegment = group.segments[group.segments.length - 1];

      if (lastSegment.stopDate && labEntries.length > 0 && peakALT > 0) {
        const stopT = new Date(lastSegment.stopDate).getTime();
        const postLabs = labEntries
          .filter((l) => new Date(l.date).getTime() > stopT)
          .sort((a, b) => new Date(a.date) - new Date(b.date));

        if (postLabs.length > 0) {
          const firstPost = postLabs[0];
          const daysAfter = Math.ceil(
            (new Date(firstPost.date).getTime() - stopT) / 86400000
          );
          const decreasePct =
            ((peakALT - parseFloat(firstPost.alt)) / peakALT) * 100;

          if (decreasePct >= 50 && daysAfter <= 8) {
            group.dechallengeScore = 3;
            group.courseLabel = `Decr ${decreasePct.toFixed(
              0
            )}% in ${daysAfter}d`;
          } else if (decreasePct >= 50 && daysAfter <= 30) {
            group.dechallengeScore = 2;
            group.courseLabel = `Decr ${decreasePct.toFixed(
              0
            )}% in ${daysAfter}d`;
          } else if (decreasePct < 50 && daysAfter <= 30) {
            group.dechallengeScore = 1;
            group.courseLabel = `Decr <50% (${decreasePct.toFixed(0)}%)`;
          } else {
            group.dechallengeScore = 0;
            group.courseLabel = 'No significant decrease';
          }
        }
      } else {
        group.dechallengeScore = 0;
        group.courseLabel = lastSegment.stopDate ? 'Unknown' : 'Ongoing';
      }

      // 5. Concomitant
      let hasOverlap = false;
      Object.keys(groupedDrugs).forEach((otherKey) => {
        if (otherKey !== key) hasOverlap = true;
      });
      if (hasOverlap) group.concomitantScore = -1;

      // 6. Known Toxicity
      const knownToxins = [
        'isoniazid',
        'rifampicin',
        'pyrazinamide',
        'meropenem',
        'amoxicillin',
        'clavulanate',
        'ethambutol',
      ];
      let knownScore = 0;
      if (knownToxins.some((t) => group.name.toLowerCase().includes(t))) {
        knownScore = 2;
      }

      const existingScore = updatedRucamScores[key] || {};

      updatedRucamScores[key] = {
        ...existingScore,
        time: group.timeScore,
        risk: group.ageScore,
        rechallenge: group.rechallengeScore,
        course: group.dechallengeScore,
        concomitant: group.concomitantScore,
        nonDrug:
          existingScore.nonDrug !== undefined ? existingScore.nonDrug : 0,
        previous: knownScore,
      };
    });

    // Timeline Metadata
    const allDates = [
      ...drugList.map((d) => new Date(d.startDate).getTime()),
      ...drugList.map((d) =>
        d.stopDate
          ? new Date(d.stopDate).getTime()
          : new Date(d.startDate).getTime()
      ),
      symptomDate ? new Date(symptomDate).getTime() : null,
      ...labEntries.map((l) => new Date(l.date).getTime()),
    ].filter((d) => d && !isNaN(d));

    let timelineMeta = { min: 0, max: 0, totalDuration: 1 };
    if (allDates.length > 0) {
      let minTime = Math.min(...allDates);
      let maxTime = Math.max(...allDates);
      maxTime = maxTime || minTime + 86400000;
      const range = maxTime - minTime;
      const padding = range > 0 ? range * 0.05 : 86400000 * 5;
      timelineMeta = {
        min: minTime - padding,
        max: maxTime + padding,
        totalDuration: maxTime + padding - (minTime - padding),
      };
    }

    setRucamScores(updatedRucamScores);

    const rankedDrugs = Object.keys(groupedDrugs)
      .map((key) => {
        const s = updatedRucamScores[key];
        const total = s
          ? Object.values(s).reduce((a, b) => a + (Number(b) || 0), 0)
          : 0;
        return { name: groupedDrugs[key].name, total };
      })
      .sort((a, b) => b.total - a.total);

    const result = {
      rFactor,
      type,
      altRatio,
      alpRatio,
      usedALT,
      usedALP,
      timelineMeta,
      groupedDrugs,
      scores: updatedRucamScores,
      rankedDrugs,
    };
    setAnalysisResult(result);
    if (onAnalysisComplete) onAnalysisComplete(result);
    if (Object.keys(groupedDrugs).length > 0 && !activeTab)
      setActiveTab(Object.keys(groupedDrugs)[0]);
  };

  const calculateTotalRucam = (scores) =>
    scores
      ? Object.values(scores).reduce((a, b) => a + (parseInt(b) || 0), 0)
      : 0;

  const interpretRucam = (score, rechallengeScore, isExcludedTime) => {
    if (isExcludedTime || rechallengeScore === -2 || score <= 0) {
      return {
        text: 'Excluded',
        color: 'bg-slate-300',
        textCol: 'text-slate-500',
        border: 'border-slate-300',
        light: 'bg-slate-100',
        isExcluded: true,
      };
    }
    if (score >= 9)
      return {
        text: 'Highly Probable',
        color: 'bg-red-600',
        textCol: 'text-red-600',
        border: 'border-red-600',
        light: 'bg-red-50',
      };
    if (score >= 6)
      return {
        text: 'Probable',
        color: 'bg-orange-500',
        textCol: 'text-orange-600',
        border: 'border-orange-500',
        light: 'bg-orange-50',
      };
    if (score >= 3)
      return {
        text: 'Possible',
        color: 'bg-yellow-500',
        textCol: 'text-yellow-600',
        border: 'border-yellow-500',
        light: 'bg-yellow-50',
      };
    return {
      text: 'Unlikely',
      color: 'bg-slate-400',
      textCol: 'text-slate-500',
      border: 'border-slate-400',
      light: 'bg-slate-50',
    };
  };

  const getRelativeDay = (dateStr) => {
    if (!symptomDate || !dateStr) return '';
    const diff = Math.ceil(
      (new Date(dateStr) - new Date(symptomDate)) / 86400000
    );
    return diff > 0 ? `Day +${diff}` : `Day ${diff}`;
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="mb-10">
        <h2 className="text-sm font-bold text-orange-600 uppercase tracking-wider mb-4 border-b border-orange-100 pb-2 text-left">
          DILI Assessment Data
        </h2>

        <div className="print-section mb-6">
          <h3 className="text-xs font-bold text-slate-500 mb-2 text-left print:text-black">
            Serial Lab Monitoring
          </h3>
          <div
            className="grid grid-cols-1 md:grid-cols-6 gap-2 mb-2 no-print"
            data-html2canvas-ignore
          >
            <input
              type="date"
              className="border p-1 rounded"
              value={currentLab.date}
              onChange={(e) =>
                setCurrentLab({ ...currentLab, date: e.target.value })
              }
            />
            <input
              type="number"
              placeholder="AST"
              className="border p-1 rounded"
              value={currentLab.ast}
              onChange={(e) =>
                setCurrentLab({ ...currentLab, ast: e.target.value })
              }
            />
            <input
              type="number"
              placeholder="ALT"
              className="border p-1 rounded"
              value={currentLab.alt}
              onChange={(e) =>
                setCurrentLab({ ...currentLab, alt: e.target.value })
              }
            />
            <input
              type="number"
              placeholder="ALP"
              className="border p-1 rounded"
              value={currentLab.alp}
              onChange={(e) =>
                setCurrentLab({ ...currentLab, alp: e.target.value })
              }
            />
            <input
              type="number"
              placeholder="T.Bil"
              className="border p-1 rounded"
              value={currentLab.tbil}
              onChange={(e) =>
                setCurrentLab({ ...currentLab, tbil: e.target.value })
              }
            />
            <button
              onClick={handleAddLab}
              className="bg-orange-500 text-white rounded font-bold hover:bg-orange-600"
            >
              + Add
            </button>
          </div>
          <div className="w-full overflow-hidden border border-slate-200 rounded-lg print:border-black">
            <table className="w-full text-sm text-left border-collapse table-fixed">
              <thead className="bg-slate-100 print:bg-slate-200">
                <tr>
                  <th className="p-2 border border-slate-200 print:border-black w-1/5">
                    Date
                  </th>
                  <th className="p-2 border border-slate-200 print:border-black">
                    AST
                  </th>
                  <th className="p-2 border border-slate-200 print:border-black">
                    ALT
                  </th>
                  <th className="p-2 border border-slate-200 print:border-black">
                    ALP
                  </th>
                  <th className="p-2 border border-slate-200 print:border-black">
                    T.Bil
                  </th>
                  <th className="p-2 border border-slate-200 text-center print:hidden w-16">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody>
                {labEntries.map((l) => (
                  <tr
                    key={l.id}
                    className="border-b border-slate-200 print:border-black"
                  >
                    <td className="p-2 border-r border-slate-200 print:border-black">
                      {l.date}
                    </td>
                    <td className="p-2 border-r border-slate-200 print:border-black">
                      {l.ast}
                    </td>
                    <td className="p-2 border-r border-slate-200 print:border-black">
                      {l.alt}
                    </td>
                    <td className="p-2 border-r border-slate-200 print:border-black">
                      {l.alp}
                    </td>
                    <td className="p-2 border-r border-slate-200 print:border-black">
                      {l.tbil}
                    </td>
                    <td
                      className="p-2 text-center text-red-500 cursor-pointer font-bold print:hidden"
                      onClick={() => handleDeleteLab(l.id)}
                    >
                      ×
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="print-section">
          <h3 className="text-xs font-bold text-slate-500 mb-2 text-left print:text-black">
            Culprit Drugs & Onset
          </h3>
          <div className="flex items-center gap-4 mb-4 bg-slate-50 p-3 rounded border border-slate-200 print:bg-transparent print:border-black">
            <label className="text-sm font-bold text-red-600 print:text-black">
              Symptom Onset Date:
            </label>
            <input
              type="date"
              value={symptomDate}
              onChange={(e) => setSymptomDate(e.target.value)}
              className="border p-1 rounded print:border-0 print:p-0 print:font-bold"
            />
          </div>
          <div className="w-full overflow-hidden mb-4 border border-slate-200 rounded-lg print:border-black">
            <table className="w-full text-sm text-left border-collapse table-fixed">
              <thead className="bg-slate-100 print:bg-slate-200">
                <tr>
                  <th className="p-2 border border-slate-200 print:border-black w-1/3">
                    Suspected Drug
                  </th>
                  <th className="p-2 border border-slate-200 print:border-black">
                    Start Date
                  </th>
                  <th className="p-2 border border-slate-200 print:border-black">
                    Stop Date
                  </th>
                  <th className="p-2 border border-slate-200 text-center print:hidden w-16">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody>
                {drugList.map((d) => (
                  <tr
                    key={d.id}
                    className="border-b border-slate-200 print:border-black"
                  >
                    <td className="p-2 border-r border-slate-200 print:border-black font-medium">
                      {d.name}
                    </td>
                    <td className="p-2 border-r border-slate-200 print:border-black">
                      {d.startDate}
                    </td>
                    <td className="p-2 border-r border-slate-200 print:border-black">
                      {d.stopDate || 'Ongoing'}
                    </td>
                    <td
                      className="p-2 text-center text-red-500 cursor-pointer font-bold print:hidden"
                      onClick={() => handleDeleteDrug(d.id)}
                    >
                      ×
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div
            className="grid grid-cols-4 gap-2 mb-2 no-print items-end"
            data-html2canvas-ignore
          >
            <div>
              <label className="text-xs text-slate-500 block">Drug Name</label>
              <input
                type="text"
                className="border p-1 rounded w-full"
                value={currentDrug.name}
                onChange={(e) =>
                  setCurrentDrug({ ...currentDrug, name: e.target.value })
                }
              />
            </div>
            <div>
              <label className="text-xs text-slate-500 block">Start Date</label>
              <input
                type="date"
                className="border p-1 rounded w-full"
                value={currentDrug.startDate}
                onChange={(e) =>
                  setCurrentDrug({ ...currentDrug, startDate: e.target.value })
                }
              />
            </div>
            <div>
              <label className="text-xs text-slate-500 block">Stop Date</label>
              <input
                type="date"
                className="border p-1 rounded w-full"
                value={currentDrug.stopDate}
                onChange={(e) =>
                  setCurrentDrug({ ...currentDrug, stopDate: e.target.value })
                }
              />
            </div>
            <button
              onClick={handleAddDrug}
              className="bg-slate-700 text-white rounded font-bold hover:bg-slate-800 py-1.5 h-auto"
            >
              + Add Drug
            </button>
          </div>

          <div className="mt-6 flex flex-col gap-4 no-print">
            <button
              onClick={performAnalysis}
              className="w-full bg-orange-500 hover:bg-orange-600 text-white text-lg px-8 py-3 rounded-lg font-bold shadow hover:shadow-lg transition-all transform active:scale-95 flex items-center justify-center gap-2"
            >
              <span className="text-xl">⚡</span> Analyze Assessment
            </button>

            {/* --- Pharmacist Note Section --- */}
            <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-4 text-left">
              <div className="flex items-center gap-2 mb-3 border-b border-slate-100 pb-2">
                <span className="text-lg">📝</span>
                <h3 className="font-bold text-slate-700">Pharmacist Note</h3>
              </div>
              <textarea
                className="w-full p-3 border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-orange-200 focus:border-orange-400 transition-all placeholder:text-slate-400 resize-none"
                rows="4"
                placeholder="Enter additional notes..."
                value={pharmacistNote}
                onChange={(e) =>
                  onPharmacistNoteChange &&
                  onPharmacistNoteChange(e.target.value)
                }
              />
            </div>
          </div>
        </div>
      </div>

      {analysisResult && (
        <div className="animate-fade-in">
          <h2 className="text-sm font-bold text-orange-600 uppercase tracking-wider mb-4 border-b border-orange-100 pb-2 text-left print:text-black print:border-black">
            Clinical Timeline & Assessment
          </h2>

          <div className="print-section mb-8 p-6 border border-slate-200 rounded-xl bg-white break-inside-avoid relative print:border-black">
            {symptomDate && analysisResult.timelineMeta ? (
              <div className="w-full relative">
                <div className="flex items-end pb-2 mb-2 border-b border-slate-100">
                  <div className="w-[15%] text-right pr-4 font-bold text-slate-400 text-xs uppercase tracking-wider">
                    TIMELINE
                  </div>
                  <div className="w-[85%] relative"></div>
                </div>

                <div className="relative">
                  <div className="absolute inset-0 flex pointer-events-none z-0">
                    <div className="w-[15%] border-r border-slate-100 h-full bg-slate-50/30"></div>
                    <div className="w-[85%] relative h-full">
                      <div className="absolute inset-0 flex justify-between opacity-20">
                        <div className="w-px bg-slate-400 h-full border-l border-dashed"></div>
                        <div className="w-px bg-slate-400 h-full border-l border-dashed"></div>
                        <div className="w-px bg-slate-400 h-full border-l border-dashed"></div>
                      </div>
                    </div>
                  </div>

                  <div className="relative z-10">
                    {/* DRUGS */}
                    <div className="mb-6 relative">
                      {/* Red Line INSIDE Drug section */}
                      <div
                        className="absolute top-0 bottom-0 w-0.5 bg-red-400/80 z-30 shadow-[0_0_8px_rgba(248,113,113,0.4)] pointer-events-none"
                        style={{
                          left: `calc(15% + ${
                            ((new Date(symptomDate).getTime() -
                              analysisResult.timelineMeta.min) /
                              analysisResult.timelineMeta.totalDuration) *
                            85
                          }%)`,
                          height: '100%',
                          WebkitPrintColorAdjust: 'exact',
                          printColorAdjust: 'exact',
                        }}
                      ></div>
                      <div
                        className="absolute -top-3 z-40 pointer-events-none transform -translate-x-1/2"
                        style={{
                          left: `calc(15% + ${
                            ((new Date(symptomDate).getTime() -
                              analysisResult.timelineMeta.min) /
                              analysisResult.timelineMeta.totalDuration) *
                            85
                          }%)`,
                        }}
                      >
                        <span
                          className="text-[9px] font-bold text-white bg-red-500 px-2 py-0.5 rounded shadow border border-white whitespace-nowrap"
                          style={{
                            WebkitPrintColorAdjust: 'exact',
                            printColorAdjust: 'exact',
                          }}
                        >
                          Onset
                        </span>
                      </div>

                      <div className="flex w-full mb-2">
                        <div className="w-[15%] text-right pr-4 font-bold text-slate-400 text-[10px]">
                          DRUGS
                        </div>
                      </div>
                      {Object.values(analysisResult.groupedDrugs).map(
                        (group, idx) => (
                          <div
                            key={idx}
                            className="flex items-center h-10 w-full mb-1 group/row hover:bg-slate-50 transition-colors rounded relative z-10"
                          >
                            <div className="w-[15%] text-right pr-4 flex flex-col items-end justify-center">
                              <span className="font-bold text-slate-700 text-sm truncate w-full">
                                {group.name}
                              </span>
                              {group.hasRechallenge && (
                                <span className="text-[8px] text-red-500 bg-red-50 px-1 rounded border border-red-100 mt-0.5">
                                  Re-chal
                                </span>
                              )}
                            </div>
                            <div className="w-[85%] relative h-full flex items-center">
                              {group.segments.map((seg, i) => {
                                const startT = new Date(
                                  seg.startDate
                                ).getTime();
                                const stopT = seg.stopDate
                                  ? new Date(seg.stopDate).getTime()
                                  : new Date(symptomDate).getTime() +
                                    30 * 86400000;
                                const leftPct =
                                  ((startT - analysisResult.timelineMeta.min) /
                                    analysisResult.timelineMeta.totalDuration) *
                                  100;
                                const widthPct =
                                  ((stopT - startT) /
                                    analysisResult.timelineMeta.totalDuration) *
                                  100;
                                return (
                                  <div
                                    key={i}
                                    className="absolute h-1 top-1/2 -translate-y-1/2 bg-slate-400 rounded-full shadow-sm group-hover/row:bg-slate-500 transition-colors"
                                    style={{
                                      left: `${Math.max(0, leftPct)}%`,
                                      width: `${Math.max(1, widthPct)}%`,
                                      WebkitPrintColorAdjust: 'exact',
                                      printColorAdjust: 'exact',
                                    }}
                                  >
                                    <div
                                      className="absolute -left-1.5 top-1/2 -translate-y-1/2 w-3 h-3 bg-slate-400 rounded-full"
                                      style={{
                                        WebkitPrintColorAdjust: 'exact',
                                        printColorAdjust: 'exact',
                                      }}
                                    ></div>
                                    <div
                                      className="absolute -right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 bg-slate-400 rounded-full"
                                      style={{
                                        WebkitPrintColorAdjust: 'exact',
                                        printColorAdjust: 'exact',
                                      }}
                                    ></div>
                                    <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-[9px] font-medium text-slate-500 bg-white border border-slate-200 px-1.5 rounded opacity-0 group-hover/row:opacity-100 transition-opacity z-50 whitespace-nowrap pointer-events-none shadow-sm">
                                      {getRelativeDay(seg.startDate)} -{' '}
                                      {seg.stopDate
                                        ? getRelativeDay(seg.stopDate)
                                        : 'Ongoing'}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )
                      )}
                    </div>

                    {/* LFT */}
                    <div className="w-full relative z-20">
                      <div className="flex w-full h-8 items-center border-t border-slate-100">
                        <div className="w-[15%] text-right pr-4">
                          <span className="font-bold text-slate-700 text-sm bg-orange-100 text-orange-800 px-2 py-0.5 rounded">
                            LFT
                          </span>
                        </div>
                        <div className="w-[85%] relative h-full">
                          {labEntries.map((l, idx) => {
                            const labTime = new Date(l.date).getTime();
                            if (
                              labTime < analysisResult.timelineMeta.min ||
                              labTime > analysisResult.timelineMeta.max
                            )
                              return null;
                            const leftPct =
                              ((labTime - analysisResult.timelineMeta.min) /
                                analysisResult.timelineMeta.totalDuration) *
                              100;
                            return (
                              <div
                                key={idx}
                                className="absolute top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-orange-400 border border-white shadow-sm"
                                style={{
                                  left: `${leftPct}%`,
                                  transform: 'translateX(-50%)',
                                  WebkitPrintColorAdjust: 'exact',
                                  printColorAdjust: 'exact',
                                }}
                              ></div>
                            );
                          })}
                        </div>
                      </div>

                      {['AST', 'ALT', 'ALP', 'T.Bil'].map((test) => (
                        <div
                          key={test}
                          className="flex w-full h-8 items-center border-b border-slate-50"
                        >
                          <div className="w-[15%] text-right pr-4 text-xs font-bold text-slate-500">
                            {test}
                          </div>
                          <div className="w-[85%] relative h-full">
                            {labEntries.map((l, idx) => {
                              const labTime = new Date(l.date).getTime();
                              const val =
                                l[test.toLowerCase().replace('.', '')];
                              if (
                                labTime < analysisResult.timelineMeta.min ||
                                labTime > analysisResult.timelineMeta.max
                              )
                                return null;
                              const leftPct =
                                ((labTime - analysisResult.timelineMeta.min) /
                                  analysisResult.timelineMeta.totalDuration) *
                                100;
                              return (
                                <div
                                  key={idx}
                                  className={`absolute top-1/2 -translate-y-1/2 text-[10px] font-bold ${
                                    parseFloat(val) > 40
                                      ? 'text-red-500'
                                      : 'text-slate-600'
                                  }`}
                                  style={{
                                    left: `${leftPct}%`,
                                    transform: 'translate(-50%, -50%)',
                                  }}
                                >
                                  {val}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}

                      {/* DATE */}
                      <div className="flex w-full h-10 items-end mt-1 border-t border-slate-200 pt-1">
                        <div className="w-[15%] text-right pr-4 text-[10px] font-bold text-slate-400 pb-2">
                          Date
                        </div>
                        <div className="w-[85%] relative h-full">
                          {labEntries.map((l, idx) => {
                            const labTime = new Date(l.date).getTime();
                            if (
                              labTime < analysisResult.timelineMeta.min ||
                              labTime > analysisResult.timelineMeta.max
                            )
                              return null;
                            const leftPct =
                              ((labTime - analysisResult.timelineMeta.min) /
                                analysisResult.timelineMeta.totalDuration) *
                              100;
                            return (
                              <div
                                key={idx}
                                className="absolute bottom-2 text-[10px] text-slate-500 font-medium -rotate-45 origin-bottom-left"
                                style={{
                                  left: `${leftPct}%`,
                                  transform: 'translateX(-50%) rotate(-45deg)',
                                }}
                              >
                                {new Date(l.date).toLocaleDateString('en-GB', {
                                  day: '2-digit',
                                  month: '2-digit',
                                  year: '2-digit',
                                })}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center text-slate-400 py-10">
                Set Onset Date to view Timeline
              </div>
            )}
          </div>

          <div className="mb-8 break-inside-avoid">
            <div
              className="flex items-center gap-4 bg-orange-50 p-4 rounded-lg border border-orange-100 cursor-pointer hover:bg-orange-100 transition print:border-black print:bg-transparent"
              onClick={() => setShowRLogic(!showRLogic)}
            >
              <div className="text-center">
                <div className="text-3xl font-extrabold text-orange-600 print:text-black">
                  {analysisResult.rFactor}
                </div>
                <div className="text-[10px] uppercase text-orange-400 font-bold print:text-black">
                  R-Factor Score
                </div>
              </div>
              <div className="h-10 w-px bg-orange-200 mx-2 print:bg-black"></div>
              <div className="flex-1">
                <div className="text-lg font-bold text-slate-700 print:text-black">
                  {analysisResult.type} Pattern
                </div>
                <div className="text-xs text-slate-500 print:hidden">
                  Click to see calculation details
                </div>
              </div>
            </div>
            {(showRLogic || true) && (
              <div
                className={`mt-2 p-4 bg-white border border-slate-200 rounded shadow-inner text-sm text-slate-600 print:block print:border-black print:text-black`}
              >
                <p className="font-bold mb-2 border-b pb-1 print:border-black">
                  Calculation Method:
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs font-bold text-slate-500 print:text-black">
                      Formulas:
                    </p>
                    <p className="font-mono bg-slate-50 p-1 print:bg-transparent">
                      R = (ALT / ULN) ÷ (ALP / ULN)
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-500 print:text-black">
                      Values:
                    </p>
                    <p>
                      ALT: {analysisResult.usedALT}/40 ={' '}
                      {analysisResult.altRatio}
                    </p>
                    <p>
                      ALP: {analysisResult.usedALP}/120 ={' '}
                      {analysisResult.alpRatio}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div>
            <div className="hidden print:block space-y-6">
              {Object.keys(analysisResult.groupedDrugs).map((key) => (
                <RucamCard
                  key={key}
                  drugKey={key}
                  group={analysisResult.groupedDrugs[key]}
                  score={rucamScores[key]}
                  total={calculateTotalRucam(rucamScores[key])}
                  result={interpretRucam(
                    calculateTotalRucam(rucamScores[key]),
                    rucamScores[key]?.rechallenge,
                    analysisResult.groupedDrugs[key].isExcludedTime
                  )}
                  onScoreChange={handleRucamChange}
                  patientAge={patientData?.age}
                />
              ))}
            </div>
            <div className="print:hidden">
              <div className="flex flex-wrap gap-2 mb-4 border-b border-slate-200 pb-1">
                {Object.keys(analysisResult.groupedDrugs).map((key) => {
                  const total = calculateTotalRucam(rucamScores[key]);
                  const group = analysisResult.groupedDrugs[key];
                  const result = interpretRucam(
                    total,
                    rucamScores[key]?.rechallenge,
                    group.isExcludedTime
                  );
                  const isActive = activeTab === key;
                  return (
                    <button
                      key={key}
                      onClick={() => setActiveTab(key)}
                      className={`px-4 py-2 rounded-t-lg border-t border-x border-b-0 text-sm font-bold transition-all ${
                        isActive
                          ? 'bg-white border-slate-300 text-slate-800 -mb-[1px] z-10 shadow-sm'
                          : 'bg-slate-50 border-transparent text-slate-500 hover:bg-slate-100'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span>{analysisResult.groupedDrugs[key].name}</span>
                        <span
                          className={`text-[10px] px-1.5 rounded-full ${result.light} ${result.textCol} border ${result.border}`}
                        >
                          {result.isExcluded ? 'Excl.' : total}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
              {activeTab && analysisResult.groupedDrugs[activeTab] && (
                <RucamCard
                  drugKey={activeTab}
                  group={analysisResult.groupedDrugs[activeTab]}
                  score={rucamScores[activeTab]}
                  total={calculateTotalRucam(rucamScores[activeTab])}
                  result={interpretRucam(
                    calculateTotalRucam(rucamScores[activeTab]),
                    rucamScores[activeTab]?.rechallenge,
                    analysisResult.groupedDrugs[activeTab].isExcludedTime
                  )}
                  onScoreChange={handleRucamChange}
                  patientAge={patientData?.age}
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DiliAssessment;
