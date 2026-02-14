import React, { useState, useMemo, useRef } from 'react';
import {
  Activity,
  Calendar,
  Thermometer,
  AlertTriangle,
  Pill,
  Droplet,
  Trash2,
  Plus,
  PlayCircle,
  RotateCcw,
  CheckCircle,
  FileText,
  Clock,
  Info,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Save,
  Edit3,
  Printer,
} from 'lucide-react';

/* -------------------------------------------------------------------------- */
/* SUB-COMPONENTS */
/* -------------------------------------------------------------------------- */

const SmartTimeline = ({ drugs, labs, onsetDate }) => {
  const criticalDates = useMemo(() => {
    const rawDates = [
      onsetDate,
      ...drugs.map((d) => d.startDate),
      ...drugs.map((d) => d.endDate || d.startDate),
      ...labs.map((l) => l.date),
    ]
      .filter(Boolean)
      .map((d) => new Date(d).getTime());

    if (onsetDate && !isNaN(new Date(onsetDate).getTime())) {
      const o = new Date(onsetDate).getTime();
      rawDates.push(o - 86400000 * 2);
      rawDates.push(o + 86400000 * 2);
    }

    return [...new Set(rawDates)].sort((a, b) => a - b);
  }, [drugs, labs, onsetDate]);

  // Handle empty state inside the component render to avoid hooks issues
  const isEmpty = criticalDates.length === 0;

  const { timeMap, totalVisualDuration } = useMemo(() => {
    let map = [];
    let currentVisualPos = 0;
    const MAX_GAP_VISUAL = 86400000 * 2;

    if (criticalDates.length > 0) {
      map.push({ real: criticalDates[0], visual: 0 });
      for (let i = 1; i < criticalDates.length; i++) {
        const prev = criticalDates[i - 1];
        const curr = criticalDates[i];
        const realDiff = curr - prev;
        const visualStep = Math.min(realDiff, MAX_GAP_VISUAL);
        currentVisualPos += visualStep;
        map.push({ real: curr, visual: currentVisualPos });
      }
    }
    return { timeMap: map, totalVisualDuration: currentVisualPos || 1 };
  }, [criticalDates]);

  const getSmartPos = (dateStr) => {
    if (!dateStr || isNaN(new Date(dateStr).getTime())) return -10;
    const target = new Date(dateStr).getTime();

    const idx = timeMap.findIndex((t) => t.real >= target);
    if (idx === -1) return 100;
    if (idx === 0) return 0;

    const p2 = timeMap[idx];
    const p1 = timeMap[idx - 1];
    if (p2.real === p1.real) return (p1.visual / totalVisualDuration) * 100;
    const ratio = (target - p1.real) / (p2.real - p1.real);
    const visualVal = p1.visual + ratio * (p2.visual - p1.visual);

    return (visualVal / totalVisualDuration) * 100;
  };

  const axisTicks = timeMap.filter(
    (_, i) => i === 0 || i === timeMap.length - 1 || i % 3 === 0
  );

  const groupedDrugs = useMemo(() => {
    return drugs.reduce((acc, drug) => {
      if (!acc[drug.name]) acc[drug.name] = [];
      acc[drug.name].push(drug);
      return acc;
    }, {});
  }, [drugs]);

  const onsetPos = getSmartPos(onsetDate);

  // Dynamic Height Calculation
  const drugRows = Object.keys(groupedDrugs).length;
  // Base height 300px + 50px per drug row to prevent overlap
  const chartHeight = Math.max(300, 250 + drugRows * 50);

  if (isEmpty)
    return (
      <div className="h-[150px] flex items-center justify-center text-slate-400 border-2 border-dashed rounded-xl bg-slate-50 mt-6">
        Add drug or lab data to see timeline
      </div>
    );

  return (
    <div className="bg-white p-6 rounded-xl shadow-lg border border-slate-200 mb-8 font-sans animate-fade-in-up mt-8">
      <div className="flex items-center gap-2 mb-4 text-slate-800 font-bold border-b border-slate-100 pb-3">
        <Activity className="w-6 h-6 text-purple-600" />
        <h3 className="text-lg">Smart Clinical Timeline (Focus View)</h3>
      </div>

      <div
        className="relative w-full select-none pr-4 pt-12 transition-all duration-300"
        style={{ height: `${chartHeight}px` }}
      >
        <div className="absolute inset-0 pointer-events-none top-8">
          {onsetDate && !isNaN(new Date(onsetDate).getTime()) && (
            <div
              className="absolute top-0 bottom-12 border-l-2 border-red-500 border-dashed z-0 flex flex-col items-center opacity-80"
              style={{ left: `${onsetPos}%` }}
            >
              <div className="bg-red-600 text-white text-[10px] font-bold px-2 py-1 rounded shadow-md absolute -top-8 whitespace-nowrap z-20">
                ONSET{' '}
                {new Date(onsetDate).toLocaleDateString('en-GB', {
                  day: 'numeric',
                  month: 'short',
                })}
              </div>
            </div>
          )}
        </div>

        <div className="mb-8 space-y-8 relative z-10">
          {Object.entries(groupedDrugs).map(([name, segments], i) => (
            <div
              key={i}
              className="relative h-5 w-full flex items-center group"
            >
              <div className="absolute left-0 w-[15%] text-right pr-4 text-xs font-bold text-slate-700 truncate">
                {name}
              </div>
              <div className="absolute left-[15%] right-0 h-full flex items-center">
                {segments.map((seg, idx) => {
                  const start = getSmartPos(seg.startDate);
                  const end = seg.endDate ? getSmartPos(seg.endDate) : 100;
                  const width = Math.max(end - start, 0.5);
                  return (
                    <div
                      key={idx}
                      className="absolute h-1.5 bg-slate-400 rounded-full opacity-80"
                      style={{ left: `${start}%`, width: `${width}%` }}
                    >
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-2.5 h-2.5 bg-slate-600 border border-white rounded-full -ml-1"></div>
                      <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2.5 h-2.5 bg-slate-600 border border-white rounded-full -mr-1"></div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <div className="space-y-12 mt-12 border-t border-slate-100 pt-8 relative z-10">
          <div className="relative h-6 w-full flex items-center">
            <div className="absolute left-0 w-[15%] text-right pr-4 text-xs font-bold text-orange-500 uppercase">
              Temp
            </div>
            <div className="absolute left-[15%] right-0 h-full">
              {labs.map((lab, i) => (
                <div
                  key={i}
                  className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 text-[10px] font-bold px-1.5 py-0.5 rounded border shadow-sm bg-white z-20 ${
                    parseFloat(lab.temp) >= 38.5
                      ? 'text-red-600 border-red-200'
                      : 'text-slate-600 border-slate-200'
                  }`}
                  style={{ left: `${getSmartPos(lab.date)}%` }}
                >
                  {lab.temp}
                </div>
              ))}
            </div>
          </div>
          <div className="relative h-6 w-full flex items-center">
            <div className="absolute left-0 w-[15%] text-right pr-4 text-xs font-bold text-purple-600 uppercase">
              Eosin
            </div>
            <div className="absolute left-[15%] right-0 h-full">
              {labs.map((lab, i) => (
                <div
                  key={i}
                  className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 text-[10px] font-bold px-1.5 py-0.5 rounded border shadow-sm bg-white z-20 ${
                    parseFloat(lab.eosin) >= 700
                      ? 'text-purple-700 border-purple-200'
                      : 'text-slate-600 border-slate-200'
                  }`}
                  style={{ left: `${getSmartPos(lab.date)}%` }}
                >
                  {lab.eosin}
                </div>
              ))}
            </div>
          </div>
          <div className="relative h-6 w-full flex items-center">
            <div className="absolute left-0 w-[15%] text-right pr-4 text-xs font-bold text-blue-500 uppercase">
              ALT
            </div>
            <div className="absolute left-[15%] right-0 h-full">
              {labs
                .filter((l) => l.alt)
                .map((lab, i) => (
                  <div
                    key={i}
                    className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 min-w-[24px] h-6 px-1 flex items-center justify-center text-[9px] font-bold rounded-full border shadow-sm bg-white z-20 ${
                      parseFloat(lab.alt) > 100
                        ? 'text-blue-700 border-blue-300'
                        : 'text-blue-600 border-blue-200'
                    }`}
                    style={{ left: `${getSmartPos(lab.date)}%` }}
                  >
                    {lab.alt}
                  </div>
                ))}
            </div>
          </div>
        </div>

        <div className="absolute bottom-0 left-[15%] right-0 h-8 border-t border-slate-300 pt-3">
          {axisTicks.map((tick, i) => (
            <div
              key={i}
              className="absolute top-2 transform -translate-x-1/2 text-[10px] text-slate-500 font-mono font-bold"
              style={{ left: `${(tick.visual / totalVisualDuration) * 100}%` }}
            >
              {new Date(tick.real).toLocaleDateString('en-GB', {
                day: 'numeric',
                month: 'numeric',
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const DrugAnalysisSection = ({ drugs, onsetDate, labs }) => {
  const groupedDrugs = useMemo(() => {
    const groups = {};
    drugs.forEach((d) => {
      if (!groups[d.name]) groups[d.name] = [];
      groups[d.name].push(d);
    });
    return groups;
  }, [drugs]);

  if (Object.keys(groupedDrugs).length === 0) return null;

  return (
    <div className="bg-slate-800 text-white p-6 rounded-xl shadow-lg border border-slate-700 mt-6">
      <div className="flex items-center gap-3 mb-6 border-b border-slate-700 pb-4">
        <AlertTriangle className="text-yellow-400" size={24} />
        <div>
          <h3 className="font-bold text-lg">Suspected Drug Analysis</h3>
          <p className="text-sm text-slate-400">
            Based on Latency & Re-challenge/Tolerance Data
          </p>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {Object.entries(groupedDrugs).map(([name, segments]) => (
          <SingleDrugAnalysis
            key={name}
            name={name}
            segments={segments}
            onsetDate={onsetDate}
            labs={labs}
          />
        ))}
      </div>
    </div>
  );
};

const SingleDrugAnalysis = ({ name, segments, onsetDate, labs }) => {
  const sortedSegments = [...segments].sort(
    (a, b) => new Date(a.startDate) - new Date(b.startDate)
  );
  const firstExposure = sortedSegments[0];
  let latency = null;
  let riskLevel = 'Unknown';
  let riskColor = 'bg-white text-slate-800';
  let riskText = 'No Dates';

  if (
    onsetDate &&
    firstExposure.startDate &&
    !isNaN(new Date(onsetDate)) &&
    !isNaN(new Date(firstExposure.startDate))
  ) {
    const start = new Date(firstExposure.startDate);
    const onset = new Date(onsetDate);
    const diffTime = Math.ceil((onset - start) / (1000 * 60 * 60 * 24));
    latency = diffTime;

    if (diffTime >= 14 && diffTime <= 60) {
      riskLevel = 'High';
      riskColor = 'bg-rose-50 border-rose-200 text-rose-800';
      riskText = 'HIGH RISK (Typical 2-8 wks)';
    } else if (diffTime > 5 && diffTime < 14) {
      riskLevel = 'Medium';
      riskColor = 'bg-orange-50 border-orange-200 text-orange-800';
      riskText = 'Possible (Early)';
    } else if (diffTime > 60) {
      riskLevel = 'Low';
      riskColor = 'bg-yellow-50 border-yellow-200 text-yellow-800';
      riskText = 'Low Risk (>60 days)';
    } else if (diffTime <= 5) {
      riskLevel = 'Very Low';
      riskColor = 'bg-green-50 border-green-200 text-green-800';
      riskText = 'Unlikely (<5 days)';
    }
  }

  let toleranceFound = false;
  if (labs && labs.length > 0 && onsetDate && !isNaN(new Date(onsetDate))) {
    const onset = new Date(onsetDate);
    const recoveryLabs = labs.filter((l) => new Date(l.date) > onset);
    if (recoveryLabs.length > 0) {
      const lastLab = recoveryLabs[recoveryLabs.length - 1];
      const isImproved =
        parseFloat(lastLab.temp || 37) < 37.5 &&
        parseFloat(lastLab.eosin || 0) < 500 &&
        parseFloat(lastLab.alt || 0) < 50;
      if (isImproved) {
        const labDate = new Date(lastLab.date);
        const activeAtLab = sortedSegments.some((seg) => {
          const s = new Date(seg.startDate);
          const e = seg.endDate ? new Date(seg.endDate) : new Date();
          return labDate >= s && labDate <= e;
        });
        if (activeAtLab) toleranceFound = true;
      }
    }
  }
  if (toleranceFound) {
    riskColor = 'bg-emerald-50 border-emerald-200 text-emerald-800';
    riskText = 'UNLIKELY (Tolerated/Improved)';
  }

  return (
    <div
      className={`flex items-center justify-between p-4 rounded-lg border ${riskColor} mb-2`}
    >
      <div className="flex items-center gap-4">
        <div className={`p-2.5 rounded-full bg-white/50 border border-black/5`}>
          {' '}
          <Pill size={20} />{' '}
        </div>
        <div>
          <div className="font-bold text-base">{name}</div>
          <div className="text-xs opacity-80">
            Start: {firstExposure.startDate}{' '}
            {sortedSegments.length > 1 && (
              <span className="ml-2 bg-black/10 px-1.5 py-0.5 rounded text-[10px] font-bold">
                Multiple Exposures
              </span>
            )}
          </div>
        </div>
      </div>
      <div className="text-right">
        <div className="text-xs font-extrabold uppercase tracking-wide">
          {riskText}
        </div>
        <div className="text-xs opacity-70 mt-1">
          Latency: {latency !== null ? `${latency} days` : '-'}
        </div>
      </div>
    </div>
  );
};

const ScoreBadge = ({ score }) => {
  let color = 'bg-slate-100 text-slate-500';
  if (score > 0) color = 'bg-rose-100 text-rose-700 border-rose-200';
  if (score < 0) color = 'bg-blue-50 text-blue-600 border-blue-200';
  return (
    <span
      className={`inline-flex items-center justify-center min-w-[32px] px-2 py-0.5 rounded text-sm font-bold border ${color}`}
    >
      {score > 0 ? `+${score}` : score}
    </span>
  );
};

/* -------------------------------------------------------------------------- */
/* MAIN COMPONENT */
/* -------------------------------------------------------------------------- */

const DressAssessment = () => {
  const [analyzed, setAnalyzed] = useState(false);
  const resultsRef = useRef(null);

  // --- STATE ---
  const [onsetDate, setOnsetDate] = useState('');
  const [drugs, setDrugs] = useState([]);
  const [labs, setLabs] = useState([]);
  const [pharmacistNote, setPharmacistNote] = useState('');

  const [clinical, setClinical] = useState({
    fever: false,
    enlargedNodes: false,
    rashPresent: false,
    rashBSA: false,
    rashFeatures: [],
    selectedOrgans: [],
    atypicalLymph: false,
    resolutionDays: false,
    exclusions: false,
  });

  const [newLab, setNewLab] = useState({
    date: '',
    temp: '',
    eosin: '',
    alt: '',
  });
  const [newDrug, setNewDrug] = useState({
    name: '',
    startDate: '',
    endDate: '',
  });

  const organOptions = [
    { id: 'liver', label: 'Liver', detail: 'ALT > 2N' },
    { id: 'kidney', label: 'Kidney', detail: 'Cr > 1.5N' },
    { id: 'lung', label: 'Lung', detail: 'Pneumonitis' },
    { id: 'heart', label: 'Heart', detail: 'Myocarditis' },
    { id: 'muscle', label: 'Muscle', detail: 'CPK > 2N' },
    { id: 'pancreas', label: 'Pancreas', detail: 'Amylase > 2N' },
  ];

  const handleOrganToggle = (organId) => {
    setClinical((prev) => {
      const current = prev.selectedOrgans;
      const updated = current.includes(organId)
        ? current.filter((id) => id !== organId)
        : [...current, organId];
      return { ...prev, selectedOrgans: updated };
    });
  };

  const calculateScore = useMemo(() => {
    let breakdown = [];
    let total = 0;

    // 1. Fever
    const maxTemp = Math.max(0, ...labs.map((l) => parseFloat(l.temp) || 0));
    let feverScore = -1;
    let feverDetail = 'Absent (-1)';

    if (clinical.fever || maxTemp >= 38.5) {
      feverScore = 0;
      feverDetail = 'Present (0)';
    }

    breakdown.push({
      label: 'Fever ≥ 38.5°C',
      detail: feverDetail,
      score: feverScore,
    });
    total += feverScore;

    // 2. Nodes
    const nodeScore = clinical.enlargedNodes ? 1 : 0;
    breakdown.push({
      label: 'Lymph Nodes',
      detail: '>1cm, ≥2 sites',
      score: nodeScore,
    });
    total += nodeScore;

    // 3. Eosinophils
    const maxEosin = Math.max(0, ...labs.map((l) => parseFloat(l.eosin) || 0));
    let eosinScore = 0;
    let eosinTxt = '<700';
    if (maxEosin >= 1500) {
      eosinScore = 2;
      eosinTxt = '≥1500';
    } else if (maxEosin >= 700) {
      eosinScore = 1;
      eosinTxt = '700-1499';
    }
    breakdown.push({
      label: 'Eosinophilia',
      detail: eosinTxt,
      score: eosinScore,
    });
    total += eosinScore;

    // 4. Lymph
    const lymphScore = clinical.atypicalLymph ? 1 : 0;
    breakdown.push({
      label: 'Atypical Lymph',
      detail: clinical.atypicalLymph ? 'Present' : 'Absent',
      score: lymphScore,
    });
    total += lymphScore;

    // 5. Skin
    let skinScore = 0;
    let skinDetail = 'No rash';
    if (clinical.rashPresent) {
      const hasBSA = clinical.rashBSA ? 1 : 0;
      const hasFeat = clinical.rashFeatures.length >= 2 ? 1 : -1;
      skinScore = hasBSA + hasFeat;
      skinDetail = hasFeat === 1 ? 'Suggestive' : 'Non-suggestive';
      if (clinical.rashBSA) skinDetail += ', >50%';
    }
    breakdown.push({
      label: 'Skin Rash',
      detail: skinDetail,
      score: skinScore,
    });
    total += skinScore;

    // 6. Organs
    const organCount = clinical.selectedOrgans.length;
    let organScore = 0;
    if (organCount >= 2) organScore = 2;
    else if (organCount === 1) organScore = 1;
    breakdown.push({
      label: 'Internal Organs',
      detail: `${organCount} Involved`,
      score: organScore,
    });
    total += organScore;

    // 7. Resolution
    let resScore = -1;
    let resDetail = '< 15 days (-1)';
    if (clinical.resolutionDays) {
      resScore = 0;
      resDetail = '> 15 days (0)';
    }
    breakdown.push({ label: 'Resolution', detail: resDetail, score: resScore });
    total += resScore;

    // 8. Exclusion
    const exclScore = clinical.exclusions ? 1 : 0;
    breakdown.push({
      label: 'Exclusion Criteria Met',
      detail: clinical.exclusions ? 'Met' : 'Incomplete',
      score: exclScore,
    });
    total += exclScore;

    let interpretation = 'No DRESS';
    let color = 'text-slate-500';
    let bg = 'bg-slate-100';
    let border = 'border-slate-100';
    if (total >= 2) {
      interpretation = 'Possible';
      color = 'text-orange-600';
      bg = 'bg-orange-50';
      border = 'border-orange-100';
    }
    if (total >= 4) {
      interpretation = 'Probable';
      color = 'text-rose-600';
      bg = 'bg-rose-50';
      border = 'border-rose-100';
    }
    if (total > 5) {
      interpretation = 'Definite';
      color = 'text-red-800';
      bg = 'bg-red-100';
      border = 'border-red-300';
    }

    return { total, breakdown, interpretation, color, bg, border };
  }, [clinical, labs]);

  const addDrug = () => {
    if (
      newDrug.name &&
      newDrug.startDate &&
      !isNaN(new Date(newDrug.startDate).getTime())
    ) {
      setDrugs([...drugs, { ...newDrug, id: Date.now() }]);
      setNewDrug({ name: '', startDate: '', endDate: '' });
    }
  };
  const removeDrug = (id) => setDrugs(drugs.filter((d) => d.id !== id));

  const addLab = () => {
    if (newLab.date && !isNaN(new Date(newLab.date).getTime())) {
      const existingIdx = labs.findIndex((l) => l.date === newLab.date);
      if (existingIdx > -1) {
        const updatedLabs = [...labs];
        updatedLabs[existingIdx] = {
          ...newLab,
          id: updatedLabs[existingIdx].id,
        };
        setLabs(
          updatedLabs.sort((a, b) => new Date(a.date) - new Date(b.date))
        );
      } else {
        setLabs(
          [...labs, { ...newLab, id: Date.now() }].sort(
            (a, b) => new Date(a.date) - new Date(b.date)
          )
        );
      }
      setNewLab({ date: '', temp: '', eosin: '', alt: '' });
    }
  };
  const removeLab = (id) => setLabs(labs.filter((l) => l.id !== id));

  const handleSaveData = () => {
    alert('Data Saved Successfully! (Simulation)');
  };

  const handleAnalyze = () => {
    setAnalyzed(true);
    setTimeout(() => {
      resultsRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  return (
    <div className="max-w-[1600px] mx-auto p-6 bg-slate-50 min-h-screen font-sans text-slate-800">
      {/* 3 ROWS STACKED LAYOUT */}
      <div className="space-y-8">
        {/* ROW 1: DRUGS */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <h3 className="text-base font-bold text-purple-700 uppercase mb-4 flex items-center gap-2 border-b border-purple-50 pb-3">
            <Pill className="w-5 h-5" /> 1. Suspected Drugs & Onset
          </h3>

          <div className="flex flex-col lg:flex-row gap-4 mb-4">
            <div className="flex-1 bg-slate-50 p-3 rounded border border-slate-200">
              <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">
                Symptom Onset Date
              </label>
              <input
                type="date"
                className="w-full border-slate-300 rounded p-2 font-bold text-red-600 border text-sm"
                value={onsetDate}
                onChange={(e) => setOnsetDate(e.target.value)}
              />
            </div>
            <div className="flex-[3] bg-purple-50 p-3 rounded-lg border border-purple-100 flex flex-col md:flex-row gap-2 items-end">
              <div className="flex-1 w-full">
                <label className="text-xs font-bold text-purple-700 uppercase mb-1 block">
                  Drug Name
                </label>
                <input
                  className="text-sm border rounded p-2 w-full"
                  placeholder="Drug Name"
                  value={newDrug.name}
                  onChange={(e) =>
                    setNewDrug({ ...newDrug, name: e.target.value })
                  }
                />
              </div>
              <div className="w-full md:w-[160px]">
                <label className="text-[10px] font-bold text-slate-500 block mb-0.5">
                  Start Date
                </label>
                <input
                  type="date"
                  className="w-full text-xs border rounded p-2"
                  value={newDrug.startDate}
                  onChange={(e) =>
                    setNewDrug({ ...newDrug, startDate: e.target.value })
                  }
                />
              </div>
              <div className="w-full md:w-[160px]">
                <label className="text-[10px] font-bold text-slate-500 block mb-0.5">
                  End Date
                </label>
                <input
                  type="date"
                  className="w-full text-xs border rounded p-2"
                  value={newDrug.endDate}
                  onChange={(e) =>
                    setNewDrug({ ...newDrug, endDate: e.target.value })
                  }
                />
              </div>
              <button
                onClick={addDrug}
                className="w-full md:w-auto bg-purple-600 text-white text-sm font-bold py-2 px-6 rounded hover:bg-purple-700 shadow-sm h-[38px]"
              >
                + Add
              </button>
            </div>
          </div>

          <div className="h-[200px] overflow-y-auto border border-dashed border-slate-200 rounded-lg p-1 bg-slate-50/50 custom-scrollbar">
            {drugs.length === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-400 text-sm">
                No drugs added
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 p-1">
                {drugs.map((drug) => (
                  <div
                    key={drug.id}
                    className="flex justify-between items-center text-sm bg-white border border-slate-100 p-3 rounded shadow-sm"
                  >
                    <div>
                      <span className="font-bold block text-slate-700">
                        {drug.name}
                      </span>
                      <div className="text-xs text-slate-400 mt-0.5">
                        {drug.startDate} ➝ {drug.endDate || 'Ongoing'}
                      </div>
                    </div>
                    <button onClick={() => removeDrug(drug.id)}>
                      <Trash2
                        size={16}
                        className="text-slate-300 hover:text-red-500"
                      />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ROW 2: LABS */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <h3 className="text-base font-bold text-purple-700 uppercase mb-4 flex items-center gap-2 border-b border-purple-50 pb-3">
            <Droplet className="w-5 h-5" /> 2. Clinical Data Points
          </h3>

          <div className="bg-purple-50 p-3 rounded-lg border border-purple-100 mb-4 flex flex-col md:flex-row gap-4 items-end">
            <div className="w-full md:w-[200px]">
              <label className="text-xs font-bold text-purple-700 uppercase mb-1 block">
                Date
              </label>
              <input
                type="date"
                className="w-full text-xs border rounded p-2 bg-white"
                value={newLab.date}
                onChange={(e) => setNewLab({ ...newLab, date: e.target.value })}
              />
            </div>
            <div className="flex-1 flex gap-2 w-full">
              <div className="flex-1">
                <label className="text-[10px] font-bold text-slate-500 block mb-0.5">
                  Temp
                </label>
                <input
                  type="number"
                  className="w-full text-xs border rounded p-2"
                  placeholder="Temp"
                  value={newLab.temp}
                  onChange={(e) =>
                    setNewLab({ ...newLab, temp: e.target.value })
                  }
                />
              </div>
              <div className="flex-1">
                <label className="text-[10px] font-bold text-slate-500 block mb-0.5">
                  Eosin
                </label>
                <input
                  type="number"
                  className="w-full text-xs border rounded p-2"
                  placeholder="Eosin"
                  value={newLab.eosin}
                  onChange={(e) =>
                    setNewLab({ ...newLab, eosin: e.target.value })
                  }
                />
              </div>
              <div className="flex-1">
                <label className="text-[10px] font-bold text-slate-500 block mb-0.5">
                  ALT
                </label>
                <input
                  type="number"
                  className="w-full text-xs border rounded p-2"
                  placeholder="ALT"
                  value={newLab.alt}
                  onChange={(e) =>
                    setNewLab({ ...newLab, alt: e.target.value })
                  }
                />
              </div>
            </div>
            <button
              onClick={addLab}
              className="w-full md:w-auto bg-purple-600 text-white text-sm font-bold py-2 px-6 rounded hover:bg-purple-700 shadow-sm h-[36px]"
            >
              + Add / Update
            </button>
          </div>

          <div className="h-[200px] overflow-y-auto border border-dashed border-slate-200 rounded-lg p-1 bg-slate-50/50 custom-scrollbar">
            {labs.length === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-400 text-sm">
                No labs added
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 p-1">
                {labs.map((lab) => (
                  <div
                    key={lab.id}
                    className="grid grid-cols-12 gap-2 items-center bg-white border border-slate-100 p-2.5 rounded text-xs hover:border-purple-200 transition-colors shadow-sm"
                  >
                    <div className="col-span-3 font-mono text-slate-500">
                      {lab.date.slice(5)}
                    </div>
                    <div className="col-span-8 flex flex-wrap gap-1.5">
                      {lab.temp && (
                        <span
                          className={`px-1.5 py-0.5 rounded border ${
                            parseFloat(lab.temp) >= 38.5
                              ? 'bg-red-50 text-red-600 border-red-100 font-bold'
                              : 'bg-white text-slate-500'
                          }`}
                        >
                          T:{lab.temp}
                        </span>
                      )}
                      {lab.eosin && (
                        <span
                          className={`px-1.5 py-0.5 rounded border ${
                            parseFloat(lab.eosin) >= 700
                              ? 'bg-purple-50 text-purple-600 border-purple-100 font-bold'
                              : 'bg-white text-slate-500'
                          }`}
                        >
                          Eo:{lab.eosin}
                        </span>
                      )}
                      {lab.alt && (
                        <span className="px-1.5 py-0.5 rounded border bg-blue-50 text-blue-600 border-blue-100 font-bold">
                          ALT:{lab.alt}
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => removeLab(lab.id)}
                      className="col-span-1 text-right text-slate-300 hover:text-red-500"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ROW 3: CHECKLIST */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <h3 className="text-base font-bold text-purple-700 uppercase mb-6 flex items-center gap-2 border-b border-purple-50 pb-3">
            <CheckCircle className="w-5 h-5" /> 3. Detailed Clinical Checklist
            (RegiSCAR)
          </h3>
          <div className="grid grid-cols-12 gap-6">
            {/* 1. General */}
            <div className="col-span-12 md:col-span-3 space-y-4">
              <div className="font-bold text-sm text-slate-900 border-b pb-1 mb-2">
                General Criteria
              </div>
              <label className="flex items-center gap-3 cursor-pointer p-2 rounded hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-100">
                <input
                  type="checkbox"
                  className="w-4 h-4 accent-purple-600"
                  checked={clinical.fever}
                  onChange={(e) =>
                    setClinical({ ...clinical, fever: e.target.checked })
                  }
                />
                <span className="text-sm font-bold text-slate-700">
                  Fever ≥ 38.5°C (-1 if No)
                </span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer p-2 rounded hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-100">
                <input
                  type="checkbox"
                  className="w-4 h-4 accent-purple-600"
                  checked={clinical.enlargedNodes}
                  onChange={(e) =>
                    setClinical({
                      ...clinical,
                      enlargedNodes: e.target.checked,
                    })
                  }
                />
                <div>
                  <span className="text-sm block">Lymph Nodes (+1)</span>
                  <span className="text-xs text-slate-400">>1cm, ≥2 sites</span>
                </div>
              </label>
              <label className="flex items-center gap-3 cursor-pointer p-2 rounded hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-100">
                <input
                  type="checkbox"
                  className="w-4 h-4 accent-purple-600"
                  checked={clinical.atypicalLymph}
                  onChange={(e) =>
                    setClinical({
                      ...clinical,
                      atypicalLymph: e.target.checked,
                    })
                  }
                />
                <span className="text-sm">Atypical Lymphocytes (+1)</span>
              </label>
            </div>

            {/* 2. Skin */}
            <div className="col-span-12 md:col-span-5 space-y-4 border-x border-slate-50 px-4">
              <div className="font-bold text-sm text-slate-900 border-b pb-1 mb-2">
                Skin (Need 2 feats for +1)
              </div>
              <div className="flex gap-4 mb-2 items-center">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    className="w-4 h-4 accent-purple-600"
                    checked={clinical.rashPresent}
                    onChange={(e) =>
                      setClinical({
                        ...clinical,
                        rashPresent: e.target.checked,
                      })
                    }
                  />
                  <span className="text-sm font-bold">Rash Present</span>
                </label>
                {clinical.rashPresent && (
                  <label className="flex items-center gap-2 cursor-pointer bg-purple-50 px-2 py-1 rounded border border-purple-100">
                    <input
                      type="checkbox"
                      className="w-3.5 h-3.5 accent-purple-600"
                      checked={clinical.rashBSA}
                      onChange={(e) =>
                        setClinical({ ...clinical, rashBSA: e.target.checked })
                      }
                    />
                    <span className="text-xs text-purple-800 font-bold">
                      > 50% BSA (+1)
                    </span>
                  </label>
                )}
              </div>
              {clinical.rashPresent && (
                <div className="grid grid-cols-2 gap-2 p-2 bg-slate-50 rounded-lg border border-slate-100">
                  {['Facial Edema', 'Infiltration', 'Purpura', 'Scaling'].map(
                    (f) => (
                      <label
                        key={f}
                        className="text-xs flex items-center gap-2 cursor-pointer p-1"
                      >
                        <input
                          type="checkbox"
                          className="accent-purple-600"
                          checked={clinical.rashFeatures.includes(f)}
                          onChange={() => {
                            setClinical((prev) => ({
                              ...prev,
                              rashFeatures: prev.rashFeatures.includes(f)
                                ? prev.rashFeatures.filter((x) => x !== f)
                                : [...prev.rashFeatures, f],
                            }));
                          }}
                        />{' '}
                        {f}
                      </label>
                    )
                  )}
                </div>
              )}
            </div>

            {/* 3. Organs */}
            <div className="col-span-12 md:col-span-4 space-y-2">
              <div className="font-bold text-sm text-slate-900 border-b pb-1 mb-2">
                Organs (1 pt / ≥2 pts)
              </div>
              <div className="grid grid-cols-2 gap-2">
                {organOptions.map((org) => (
                  <label
                    key={org.id}
                    className="flex flex-col p-1.5 rounded hover:bg-slate-50 border border-slate-100 cursor-pointer"
                  >
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <input
                        type="checkbox"
                        className="w-3.5 h-3.5 accent-purple-600"
                        checked={clinical.selectedOrgans.includes(org.id)}
                        onChange={() => handleOrganToggle(org.id)}
                      />
                      <span className="text-xs font-bold text-slate-700">
                        {org.label}
                      </span>
                    </div>
                    <span className="text-[9px] text-slate-400 ml-5">
                      {org.detail}
                    </span>
                  </label>
                ))}
              </div>
              <div className="pt-2 border-t grid grid-cols-2 gap-2">
                <div className="col-span-2">
                  <label className="flex items-center gap-2 cursor-pointer p-2 rounded hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-100">
                    <input
                      type="checkbox"
                      className="w-4 h-4 accent-purple-600"
                      checked={clinical.resolutionDays}
                      onChange={(e) =>
                        setClinical({
                          ...clinical,
                          resolutionDays: e.target.checked,
                        })
                      }
                    />
                    <span className="text-sm font-bold text-slate-700">
                      Resolution > 15 Days
                    </span>
                  </label>
                </div>
                <div className="col-span-2 flex items-center p-2 bg-slate-50 rounded border border-slate-100">
                  <input
                    type="checkbox"
                    className="accent-purple-600 w-4 h-4 mr-2"
                    checked={clinical.exclusions}
                    onChange={(e) =>
                      setClinical({ ...clinical, exclusions: e.target.checked })
                    }
                  />
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-slate-700">
                      Exclusion Criteria Met (+1)
                    </span>
                    <span className="text-[9px] text-slate-400">
                      Viral, ANA, Blood Cx Negative
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* --- ANALYZE BUTTON --- */}
      <button
        onClick={handleAnalyze}
        className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold py-4 rounded-xl shadow-lg mb-6 hover:shadow-xl hover:scale-[1.01] transition-all text-lg flex items-center justify-center gap-2 mt-8"
      >
        <PlayCircle className="w-6 h-6" /> Analyze Case
      </button>

      {/* --- PHARMACIST NOTE --- */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 mb-8">
        <div className="flex items-center gap-2 mb-4 text-slate-800 font-bold border-b border-slate-100 pb-2">
          <Edit3 className="w-5 h-5 text-purple-600" />
          <h3>Pharmacist Note</h3>
        </div>
        <textarea
          className="w-full border border-slate-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-purple-200 focus:border-purple-400 outline-none h-24 resize-none"
          placeholder="Enter clinical observations, drug interactions, or recommendations..."
          value={pharmacistNote}
          onChange={(e) => setPharmacistNote(e.target.value)}
        ></textarea>
      </div>

      {/* --- BOTTOM ROW: ANALYSIS & SCORE --- */}
      {analyzed && (
        <div ref={resultsRef} className="animate-fade-in-up space-y-8">
          {/* SCORE (Wide Row) */}
          <div className="bg-white p-6 rounded-xl shadow-lg border border-purple-100">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
              <div
                className={`p-6 text-center rounded-xl ${calculateScore.bg} border ${calculateScore.border} min-w-[250px]`}
              >
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                  RegiSCAR Final Score
                </h3>
                <div className="flex items-baseline justify-center gap-2">
                  <span
                    className={`text-6xl font-black ${calculateScore.color} leading-none`}
                  >
                    {calculateScore.total}
                  </span>
                </div>
                <span
                  className={`inline-block px-4 py-1 mt-2 rounded-full text-sm font-bold bg-white border shadow-sm ${
                    calculateScore.color
                  } border-${calculateScore.color.split('-')[1]}-200`}
                >
                  {calculateScore.interpretation}
                </span>
              </div>

              <div className="flex-1 w-full">
                <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3">
                  Score Breakdown
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {calculateScore.breakdown.map((item, i) => (
                    <div
                      key={i}
                      className="flex justify-between items-center p-2 border border-slate-100 rounded bg-slate-50/50"
                    >
                      <div>
                        <span className="font-bold text-xs text-slate-700 block">
                          {item.label}
                        </span>
                        {item.detail && (
                          <span className="text-[10px] text-slate-400">
                            {item.detail}
                          </span>
                        )}
                      </div>
                      <ScoreBadge score={item.score} />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <SmartTimeline drugs={drugs} labs={labs} onsetDate={onsetDate} />
          <DrugAnalysisSection
            drugs={drugs}
            onsetDate={onsetDate}
            labs={labs}
          />
        </div>
      )}
    </div>
  );
};

export default DressAssessment;
