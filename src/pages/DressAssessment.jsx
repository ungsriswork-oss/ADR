import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import {
  Activity,
  AlertTriangle,
  Pill,
  Droplet,
  Trash2,
  CheckCircle,
  Edit3,
} from 'lucide-react';

/* -------------------------------------------------------------------------- */
/* 1. TIMELINE COMPONENT (Improved Layout & Style) */
/* -------------------------------------------------------------------------- */

const RevisedTimeline = ({ drugs, labs, onsetDate }) => {
  const safeDrugs = Array.isArray(drugs) ? drugs : [];
  const safeLabs = Array.isArray(labs) ? labs : [];

  // Configuration for Layout (Wider labels to prevent overlap)
  const LABEL_WIDTH_CLASS = "w-[220px]"; 
  const LEFT_OFFSET_CLASS = "left-[220px]";
  const PADDING_LEFT_CLASS = "pl-[220px]";

  const timelineData = useMemo(() => {
    const rawDates = [
      onsetDate,
      ...safeDrugs.map((d) => d.startDate),
      ...safeDrugs.map((d) => d.endDate || d.startDate),
      ...safeLabs.map((l) => l.date),
    ]
      .filter((d) => d && !isNaN(new Date(d).getTime()))
      .map((d) => new Date(d).getTime());
    
    // Add buffer
    if (onsetDate && !isNaN(new Date(onsetDate).getTime())) {
      const o = new Date(onsetDate).getTime();
      rawDates.push(o - 86400000 * 2);
      rawDates.push(o + 86400000 * 2);
    }

    const uniquePoints = [...new Set(rawDates)].sort((a, b) => a - b);
    
    // Filter interesting dates for labeling
    const interestingDates = new Set([
        onsetDate,
        ...safeDrugs.map(d => d.startDate),
        ...safeDrugs.map(d => d.endDate),
        ...safeLabs.map(l => l.date)
    ].filter(d => d).map(d => new Date(d).getTime()));

    const totalPoints = uniquePoints.length;
    const safeTotal = totalPoints > 1 ? totalPoints - 1 : 1;

    return {
      points: uniquePoints,
      interestingDates,
      totalPoints,
      getPos: (dateStr) => {
        if (!dateStr) return -10;
        const t = new Date(dateStr).getTime();
        const index = uniquePoints.indexOf(t);
        if (index === -1) { 
             let closestIdx = 0;
             for(let i=0; i<uniquePoints.length; i++) {
                 if(uniquePoints[i] > t) { closestIdx = i; break; }
                 closestIdx = i;
             }
             return (closestIdx / safeTotal) * 100;
        }
        return (index / safeTotal) * 100;
      },
    };
  }, [safeDrugs, safeLabs, onsetDate]);

  if (timelineData.points.length === 0)
    return (
      <div className="h-[150px] flex items-center justify-center text-[#a8a099] border-2 border-dashed rounded-[10px] bg-[#faf9f7] mt-6">
        Add drug or lab data to see timeline
      </div>
    );

  const groupedDrugs = safeDrugs.reduce((acc, drug) => {
    if (!acc[drug.name]) acc[drug.name] = [];
    acc[drug.name].push(drug);
    return acc;
  }, {});

  return (
    // Added print:print-color-adjust-exact to force background colors in print
    <div className="bg-white p-6 rounded-[10px] shadow-[0_4px_16px_rgba(0,0,0,0.08)] border border-[#ebe8e2] mb-8 font-[Inter,system-ui,sans-serif] animate-fade-in-up mt-8 print:shadow-none print:border-0 print:mt-4 print:print-color-adjust-exact">
      <div className="flex items-center gap-2 mb-4 text-[#2d2926] font-bold border-b border-[#f4f2ee] pb-3">
        <Activity className="w-6 h-6 text-[#534ab7]" />
        <h3 className="text-lg">Clinical Timeline (Focus View)</h3>
      </div>

      <div className="relative w-full pb-8 overflow-visible"> 
        {/* Grid Background */}
        <div className={`absolute inset-0 ${PADDING_LEFT_CLASS} pointer-events-none z-0`}>
             <div className="relative w-full h-full">
                {timelineData.points.map((t, i) => {
                   const pct = (i / (timelineData.totalPoints > 1 ? timelineData.totalPoints - 1 : 1)) * 100;
                   const isInteresting = timelineData.interestingDates.has(t);
                   return (
                      <div key={i} className="absolute top-0 bottom-0 border-l border-[#f4f2ee]" style={{ left: `${pct}%` }}>
                         {isInteresting && (
                             <div className="absolute -bottom-6 -translate-x-1/2 text-[10px] font-bold text-[#a8a099] whitespace-nowrap bg-white/80 px-1 rounded z-10">
                                {new Date(t).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                             </div>
                         )}
                      </div>
                   )
                })}
             </div>
        </div>

        <div className="relative z-10 space-y-4">
            {/* --- SECTION 1: DRUGS & ONSET --- */}
            <div className="relative border-b border-[#ebe8e2] pb-4">
                 {/* ONSET LINE */}
                 {onsetDate && !isNaN(new Date(onsetDate).getTime()) && (
                    <div className={`absolute inset-y-0 right-0 pointer-events-none z-20 overflow-visible ${LEFT_OFFSET_CLASS}`}>
                       <div 
                          className="absolute top-0 bottom-0 w-0.5 bg-red-500 border-l border-dashed border-red-500 opacity-80"
                          style={{ left: `${timelineData.getPos(onsetDate)}%` }}
                       >
                           <div className="bg-[#b83232] text-white text-[10px] font-bold px-2 py-0.5 rounded shadow-[0_1px_4px_rgba(0,0,0,0.05)] absolute -top-4 left-0 -translate-x-1/2 whitespace-nowrap z-50">
                              ONSET
                           </div>
                       </div>
                    </div>
                 )}

                 <div className="flex h-6 items-end pb-1 border-b border-[#f4f2ee] mb-2">
                     <div className={`${LABEL_WIDTH_CLASS} shrink-0 font-bold text-xs text-right pr-6 text-[#a8a099]`}>DRUG</div>
                     <div className="flex-1"></div>
                 </div>
                 {Object.entries(groupedDrugs).map(([name, segments], i) => (
                    <div key={i} className="flex h-8 items-center group hover:bg-[#faf9f7] rounded relative z-10">
                        <div className={`${LABEL_WIDTH_CLASS} shrink-0 pr-6 text-right text-xs font-bold text-[#2d2926] truncate`} title={name}>
                            {name}
                        </div>
                        <div className="flex-1 relative h-full">
                            {segments.map((seg, idx) => {
                                const start = timelineData.getPos(seg.startDate);
                                const end = seg.endDate ? timelineData.getPos(seg.endDate) : 100; 
                                const width = Math.max(end - start, 0.5);
                                return (
                                    // *** FIXED HERE: Added print classes to force visibility ***
                                    <div key={idx} className="absolute h-2.5 bg-[#faf9f7] rounded-full opacity-80 top-[11px] print:bg-[#2d2926] print:opacity-100 print:border print:border-[#ebe8e2]" style={{ left: `${start}%`, width: `${width}%` }}>
                                        {/* ✅ Dots Larger & Styled */}
                                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-3.5 h-3.5 bg-[#2d2926] rounded-full border-2 border-white shadow-[0_1px_4px_rgba(0,0,0,0.05)] -ml-1.5 print:bg-black print:border-black"></div>
                                        {seg.endDate && <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3.5 h-3.5 bg-[#2d2926] rounded-full border-2 border-white shadow-[0_1px_4px_rgba(0,0,0,0.05)] -mr-1.5 print:bg-black print:border-black"></div>}
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                 ))}
            </div>

            {/* --- SECTION 2: LABS --- */}
            <div className="pt-2">
                 <div className="flex h-6 items-end pb-1 mb-2">
                     <div className={`${LABEL_WIDTH_CLASS} shrink-0 font-bold text-xs text-right pr-6 text-[#a8a099]`}>CLINICAL DATA</div>
                     <div className="flex-1"></div>
                 </div>
                 
                 {/* Temp */}
                 <div className="flex h-8 items-center">
                    <div className={`${LABEL_WIDTH_CLASS} shrink-0 pr-6 text-right text-xs font-bold text-orange-500 uppercase`}>Temp (°C)</div>
                    <div className="flex-1 relative h-full">
                        {safeLabs.map((lab, i) => {
                            const pos = timelineData.getPos(lab.date);
                            return (
                                <div key={i} className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 text-[10px] font-bold px-2 py-0.5 rounded-full border shadow-[0_1px_4px_rgba(0,0,0,0.05)] z-10 ${parseFloat(lab.temp) >= 38.5 ? 'bg-red-50 text-[#b83232] border-red-200' : 'bg-white text-[#6b6360] border-[#ebe8e2]'}`} style={{ left: `${pos}%` }}>
                                    {lab.temp}
                                </div>
                            )
                        })}
                    </div>
                 </div>

                 {/* Eosin */}
                 <div className="flex h-8 items-center">
                    <div className={`${LABEL_WIDTH_CLASS} shrink-0 pr-6 text-right text-xs font-bold text-[#534ab7] uppercase`}>Eosinophil</div>
                    <div className="flex-1 relative h-full">
                        {safeLabs.map((lab, i) => {
                            const pos = timelineData.getPos(lab.date);
                            return (
                                <div key={i} className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 text-[10px] font-bold px-2 py-0.5 rounded-full border shadow-[0_1px_4px_rgba(0,0,0,0.05)] z-10 ${parseFloat(lab.eosin) >= 700 ? 'bg-[#f0eeff] text-[#4a3ab8] border-[#cec8f6]' : 'bg-white text-[#6b6360] border-[#ebe8e2]'}`} style={{ left: `${pos}%` }}>
                                    {lab.eosin}
                                </div>
                            )
                        })}
                    </div>
                 </div>

                 {/* ALT */}
                 <div className="flex h-8 items-center">
                    <div className={`${LABEL_WIDTH_CLASS} shrink-0 pr-6 text-right text-xs font-bold text-[#2a9d8f] uppercase`}>ALT (U/L)</div>
                    <div className="flex-1 relative h-full">
                        {safeLabs.filter(l => l.alt).map((lab, i) => {
                            const pos = timelineData.getPos(lab.date);
                            return (
                                <div key={i} className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 min-w-[24px] px-2 py-0.5 text-center text-[10px] font-bold rounded-full border shadow-[0_1px_4px_rgba(0,0,0,0.05)] z-10 ${parseFloat(lab.alt) > 100 ? 'bg-blue-50 text-blue-700 border-blue-300' : 'bg-white text-[#2a9d8f] border-[#ebe8e2]'}`} style={{ left: `${pos}%` }}>
                                    {lab.alt}
                                </div>
                            )
                        })}
                    </div>
                 </div>
            </div>
        </div>
      </div>
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/* 2. DRUG ANALYSIS COMPONENT */
/* -------------------------------------------------------------------------- */

const DrugAnalysisSection = ({ drugs, onsetDate, labs }) => {
  const safeDrugs = Array.isArray(drugs) ? drugs : [];
  const safeLabs = Array.isArray(labs) ? labs : [];

  const groupedDrugs = useMemo(() => {
    const groups = {};
    safeDrugs.forEach((d) => {
      if (!groups[d.name]) groups[d.name] = [];
      groups[d.name].push(d);
    });
    return groups;
  }, [safeDrugs]);

  if (Object.keys(groupedDrugs).length === 0) return null;

  return (
    // Added print classes for proper sizing and color
    <div className="bg-[#2d2926] text-white p-6 rounded-[10px] border border-[#3d3532] mt-6 print:bg-white print:text-black print:border-[#d6d0c8] print:mt-4">
      <div className="flex items-center gap-3 mb-6 border-b border-[#ebe8e2] pb-4 print:border-[#d6d0c8]">
        <AlertTriangle className="text-yellow-400 print:text-black" size={24} />
        <div>
          <h3 className="font-bold text-lg">Suspected Drug Analysis</h3>
          <p className="text-sm text-[#a8a099] print:text-[#6b6360]">Based on Latency & Re-challenge/Tolerance Data</p>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {Object.entries(groupedDrugs).map(([name, segments]) => (
          <SingleDrugAnalysis key={name} name={name} segments={segments} onsetDate={onsetDate} labs={safeLabs} />
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
  let riskColor = 'bg-white text-[#2d2926]';
  let riskText = 'No Dates';

  if (onsetDate && firstExposure.startDate && !isNaN(new Date(onsetDate)) && !isNaN(new Date(firstExposure.startDate))) {
    const start = new Date(firstExposure.startDate);
    const onset = new Date(onsetDate);
    const diffTime = Math.ceil((onset - start) / (1000 * 60 * 60 * 24));
    latency = diffTime;

    if (diffTime >= 14 && diffTime <= 60) {
      riskLevel = 'High'; riskColor = 'bg-rose-50 border-rose-200 text-rose-800'; riskText = 'HIGH RISK (Typical 2-8 wks)';
    } else if (diffTime > 5 && diffTime < 14) {
      riskLevel = 'Medium'; riskColor = 'bg-orange-50 border-orange-200 text-orange-800'; riskText = 'Possible (Early)';
    } else if (diffTime > 60) {
      riskLevel = 'Low'; riskColor = 'bg-yellow-50 border-yellow-200 text-yellow-800'; riskText = 'Low Risk (>60 days)';
    } else if (diffTime <= 5) {
      riskLevel = 'Very Low'; riskColor = 'bg-green-50 border-green-200 text-green-800'; riskText = 'Unlikely (<5 days)';
    }
  }

  let toleranceFound = false;
  if (labs && labs.length > 0 && onsetDate && !isNaN(new Date(onsetDate))) {
    const onset = new Date(onsetDate);
    const recoveryLabs = labs.filter((l) => new Date(l.date) > onset);
    if (recoveryLabs.length > 0) {
      const lastLab = recoveryLabs[recoveryLabs.length - 1];
      const isImproved = parseFloat(lastLab.temp || 37) < 37.5 && parseFloat(lastLab.eosin || 0) < 500 && parseFloat(lastLab.alt || 0) < 50;
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
    <div className={`flex items-center justify-between p-4 rounded-[8px] border ${riskColor} mb-2 print:border-[#d6d0c8] print:text-black`}>
      <div className="flex items-center gap-4">
        <div className={`p-2.5 rounded-full bg-white/50 border border-black/5`}> <Pill size={20} /> </div>
        <div>
          <div className="font-bold text-base">{name}</div>
          <div className="text-xs opacity-80">Start: {firstExposure.startDate} {sortedSegments.length > 1 && (<span className="ml-2 bg-black/10 px-1.5 py-0.5 rounded text-[10px] font-bold">Multiple Exposures</span>)}</div>
        </div>
      </div>
      <div className="text-right">
        <div className="text-xs font-extrabold uppercase tracking-wide">{riskText}</div>
        <div className="text-xs opacity-70 mt-1">Latency: {latency !== null ? `${latency} days` : '-'}</div>
      </div>
    </div>
  );
};

const ScoreBadge = ({ score }) => {
  let color = 'bg-[#f4f2ee] text-[#a8a099]';
  if (score > 0) color = 'bg-rose-100 text-rose-700 border-rose-200';
  if (score < 0) color = 'bg-blue-50 text-[#2a9d8f] border-blue-200';
  return <span className={`inline-flex items-center justify-center min-w-[32px] px-2 py-0.5 rounded text-sm font-bold border ${color} print:border-[#d6d0c8] print:bg-white print:text-black`}>{score > 0 ? `+${score}` : score}</span>;
};

/* -------------------------------------------------------------------------- */
/* 3. MAIN DRESS ASSESSMENT COMPONENT */
/* -------------------------------------------------------------------------- */

const DressAssessment = (props) => {
  const location = useLocation(); // ✅ Access router state to detect Saved Case
  
  const drugs = props.drugList || [];
  const setDrugs = props.setDrugList || (() => {});
  const labs = props.labEntries || [];
  const setLabs = props.setLabEntries || (() => {});
  const onsetDate = props.symptomDate || '';
  const setOnsetDate = props.setSymptomDate || (() => {});

  const [analyzed, setAnalyzed] = useState(false);
  const [pharmacistNote, setPharmacistNote] = useState('');
  const [clinical, setClinical] = useState({
    fever: null, enlargedNodes: false, rashPresent: false, rashBSA: false, rashFeatures: [], selectedOrgans: [], atypicalLymph: false, resolutionDays: false, exclusions: false,
  });

  const [newLab, setNewLab] = useState({ date: '', temp: '', eosin: '', alt: '' });
  const [newDrug, setNewDrug] = useState({ name: '', startDate: '', endDate: '' });
  const resultsRef = useRef(null);
  const hasAutoShownRef = useRef(false); // Track if we've already auto-shown

  // --- 1. LOAD LOCAL DATA ---
  useEffect(() => {
    const src = props.initialData?.savedData || props.initialData || {};
    if (Object.keys(src).length > 0) {
        if(src.clinical) setClinical(src.clinical);
        if(src.pharmacistNote) setPharmacistNote(src.pharmacistNote);
    }
  }, []); 

  // --- 2. AUTO-SHOW SAVED CASE LOGIC ---
  useEffect(() => {
    // Check if we are in "Saved Case Mode" (via Router state)
    const isSavedCase = !!location.state?.caseData;
    
    // Only auto-show if:
    // 1. It IS a saved case
    // 2. We haven't auto-shown yet (prevent re-showing on edits)
    // 3. We actually have data to show
    if (isSavedCase && !hasAutoShownRef.current) {
        if (drugs.length > 0 || labs.length > 0) {
            setAnalyzed(true);
            hasAutoShownRef.current = true;
            setTimeout(() => { resultsRef.current?.scrollIntoView({ behavior: 'smooth' }); }, 100);
        }
    }
  }, [drugs, labs, location.state]);

  // --- 3. CALCULATE SCORE ---
  const calculateScore = useMemo(() => {
    let breakdown = [];
    let total = 0;
    const safeLabs = Array.isArray(labs) ? labs : [];

    const maxTemp = Math.max(0, ...safeLabs.map((l) => parseFloat(l.temp) || 0));
    let feverScore = 0; let feverDetail = 'Unknown (0)';
    if (clinical.fever === true || maxTemp >= 38.5) { feverScore = 0; feverDetail = 'Present (0)'; }
    else if (clinical.fever === false) { feverScore = -1; feverDetail = 'Absent (-1)'; }
    breakdown.push({ label: 'Fever ≥ 38.5°C', detail: feverDetail, score: feverScore });
    total += feverScore;

    const nodeScore = clinical.enlargedNodes ? 1 : 0;
    breakdown.push({ label: 'Lymph Nodes', detail: '>1cm, ≥2 sites', score: nodeScore });
    total += nodeScore;

    const maxEosin = Math.max(0, ...safeLabs.map((l) => parseFloat(l.eosin) || 0));
    let eosinScore = 0; let eosinTxt = '<700';
    if (maxEosin >= 1500) { eosinScore = 2; eosinTxt = '≥1500'; } 
    else if (maxEosin >= 700) { eosinScore = 1; eosinTxt = '700-1499'; }
    breakdown.push({ label: 'Eosinophilia', detail: eosinTxt, score: eosinScore });
    total += eosinScore;

    const lymphScore = clinical.atypicalLymph ? 1 : 0;
    breakdown.push({ label: 'Atypical Lymph', detail: clinical.atypicalLymph ? 'Present' : 'Absent', score: lymphScore });
    total += lymphScore;

    let skinScore = 0; let skinDetail = 'No rash';
    if (clinical.rashPresent) {
      const hasBSA = clinical.rashBSA ? 1 : 0;
      const hasFeat = clinical.rashFeatures.length >= 2 ? 1 : -1;
      skinScore = hasBSA + hasFeat;
      skinDetail = hasFeat === 1 ? 'Suggestive' : 'Non-suggestive';
      if (clinical.rashBSA) skinDetail += ', >50%';
    }
    breakdown.push({ label: 'Skin Rash', detail: skinDetail, score: skinScore });
    total += skinScore;

    const organCount = clinical.selectedOrgans.length;
    let organScore = 0;
    if (organCount >= 2) organScore = 2; else if (organCount === 1) organScore = 1;
    breakdown.push({ label: 'Internal Organs', detail: `${organCount} Involved`, score: organScore });
    total += organScore;

    let resScore = -1; let resDetail = '< 15 days (-1)';
    if (clinical.resolutionDays) { resScore = 0; resDetail = '> 15 days (0)'; }
    breakdown.push({ label: 'Resolution', detail: resDetail, score: resScore });
    total += resScore;

    const exclScore = clinical.exclusions ? 1 : 0;
    breakdown.push({ label: 'Exclusion Criteria Met', detail: clinical.exclusions ? 'Met' : 'Incomplete', score: exclScore });
    total += exclScore;

    let interpretation = 'No DRESS'; let color = 'text-[#a8a099]'; let bg = 'bg-[#f4f2ee]'; let border = 'border-[#f4f2ee]';
    if (total >= 2) { interpretation = 'Possible'; color = 'text-orange-600'; bg = 'bg-orange-50'; border = 'border-orange-100'; }
    if (total >= 4) { interpretation = 'Probable'; color = 'text-rose-600'; bg = 'bg-rose-50'; border = 'border-rose-100'; }
    if (total >= 5) { interpretation = 'Definite'; color = 'text-red-800'; bg = 'bg-red-100'; border = 'border-red-300'; }

    return { total, breakdown, interpretation, color, bg, border };
  }, [clinical, labs]);

  // --- 4. SYNC TO PARENT (BREAK LOOP) ---
  const lastResultRef = useRef(null);
  useEffect(() => {
    if(props.onAnalysisComplete) {
       const newResult = {
          type: 'RegiSCAR',
          score: calculateScore.total,
          interpretation: calculateScore.interpretation,
          rawData: { drugs, labs, onsetDate, clinical, pharmacistNote }
       };
       if (JSON.stringify(newResult) !== JSON.stringify(lastResultRef.current)) {
           lastResultRef.current = newResult;
           setTimeout(() => { props.onAnalysisComplete(newResult); }, 0);
       }
    }
  }, [drugs, labs, onsetDate, clinical, pharmacistNote, calculateScore]);

  // --- HANDLERS ---
  const handleAnalyze = () => {
    setAnalyzed(true);
    setTimeout(() => { resultsRef.current?.scrollIntoView({ behavior: 'smooth' }); }, 100);
  };

  const addDrug = () => {
    if (newDrug.name && newDrug.startDate && !isNaN(new Date(newDrug.startDate).getTime())) {
      setDrugs([...drugs, { ...newDrug, id: Date.now() }]);
      setNewDrug({ name: '', startDate: '', endDate: '' });
      setAnalyzed(false); // Reset
    }
  };
  const removeDrug = (id) => {
      setDrugs(drugs.filter((d) => d.id !== id));
      setAnalyzed(false); // Reset
  };

  const addLab = () => {
    if (newLab.date && !isNaN(new Date(newLab.date).getTime())) {
      const existingIdx = labs.findIndex((l) => l.date === newLab.date);
      let updatedLabs = existingIdx > -1 ? [...labs] : [...labs, { ...newLab, id: Date.now() }];
      if (existingIdx > -1) updatedLabs[existingIdx] = { ...newLab, id: updatedLabs[existingIdx].id };
      updatedLabs.sort((a, b) => new Date(a.date) - new Date(b.date));
      setLabs(updatedLabs);
      setNewLab({ date: '', temp: '', eosin: '', alt: '' });
      setAnalyzed(false); // Reset
    }
  };
  const removeLab = (id) => {
      setLabs(labs.filter((l) => l.id !== id));
      setAnalyzed(false); // Reset
  };

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
      const updated = prev.selectedOrgans.includes(organId) ? prev.selectedOrgans.filter((id) => id !== organId) : [...prev.selectedOrgans, organId];
      return { ...prev, selectedOrgans: updated };
    });
    setAnalyzed(false);
  };

  const handleClinicalChange = (key, value) => {
      setClinical({ ...clinical, [key]: value });
      setAnalyzed(false);
  };

  const handleRashFeature = (feature) => {
      setClinical((prev) => ({ ...prev, rashFeatures: prev.rashFeatures.includes(feature) ? prev.rashFeatures.filter((x) => x !== feature) : [...prev.rashFeatures, feature] }));
      setAnalyzed(false);
  };

  return (
    <div className="w-full font-[Inter,system-ui,sans-serif] text-[#2d2926] print:p-0">
      <div className="space-y-8 print:space-y-0">
        
        {/* ROW 1: DRUGS - HIDDEN ON PRINT */}
        <div className="bg-white p-6 rounded-[10px] shadow-[0_1px_4px_rgba(0,0,0,0.05)] border border-[#ebe8e2] print:hidden">
          <h3 className="text-base font-bold text-[#4a3ab8] uppercase mb-4 flex items-center gap-2 border-b border-purple-50 pb-3">
            <Pill className="w-5 h-5" /> 1. Suspected Drugs & Onset
          </h3>
          <div className="flex flex-col gap-3 mb-4">
            <div className="flex-1 bg-[#faf9f7] p-3 rounded border border-[#ebe8e2]">
              <label className="text-xs font-bold text-[#a8a099] uppercase mb-1 block">Symptom Onset Date</label>
              <input type="date" className="w-full border-[#d6d0c8] rounded p-2 font-bold text-[#b83232] border text-sm" value={onsetDate} 
                onChange={(e) => { setOnsetDate(e.target.value); setAnalyzed(false); }} 
              />
            </div>
            <div className="bg-[#f0eeff] p-3 rounded-[8px] border border-[#cec8f6] flex flex-col gap-2">
              <div className="flex-1 w-full"><label className="text-xs font-bold text-[#4a3ab8] uppercase mb-1 block">Drug Name</label><input className="text-sm border rounded p-2 w-full" placeholder="Drug Name" value={newDrug.name} onChange={(e) => setNewDrug({ ...newDrug, name: e.target.value })} /></div>
              <div className="w-full md:w-[160px]"><label className="text-[10px] font-bold text-[#a8a099] block mb-0.5">Start Date</label><input type="date" className="w-full text-xs border rounded p-2" value={newDrug.startDate} onChange={(e) => setNewDrug({ ...newDrug, startDate: e.target.value })} /></div>
              <div className="w-full md:w-[160px]"><label className="text-[10px] font-bold text-[#a8a099] block mb-0.5">End Date</label><input type="date" className="w-full text-xs border rounded p-2" value={newDrug.endDate} onChange={(e) => setNewDrug({ ...newDrug, endDate: e.target.value })} /></div>
              <button onClick={addDrug} className="w-full md:w-auto bg-[#534ab7] text-white text-sm font-bold py-2 px-6 rounded hover:bg-[#3d3499] shadow-[0_1px_4px_rgba(0,0,0,0.05)] h-[38px]">+ Add</button>
            </div>
          </div>
          <div className="h-[200px] overflow-y-auto border border-dashed border-[#ebe8e2] rounded-[8px] p-1 bg-[#faf9f7] 50 custom-scrollbar">
            {drugs.length === 0 ? <div className="h-full flex items-center justify-center text-[#a8a099] text-sm">No drugs added</div> : 
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-1">
                {drugs.map((drug) => (
                  <div key={drug.id} className="flex justify-between items-center text-sm bg-white border border-[#f4f2ee] p-3 rounded shadow-[0_1px_4px_rgba(0,0,0,0.05)]">
                    <div><span className="font-bold block text-[#2d2926]">{drug.name}</span><div className="text-xs text-[#a8a099] mt-0.5">{drug.startDate} ➝ {drug.endDate || 'Ongoing'}</div></div>
                    <button onClick={() => removeDrug(drug.id)}><Trash2 size={16} className="text-[#d6d0c8] hover:text-[#e07060]" /></button>
                  </div>
                ))}
              </div>
            }
          </div>
        </div>

        {/* ROW 2: LABS - HIDDEN ON PRINT */}
        <div className="bg-white p-6 rounded-[10px] shadow-[0_1px_4px_rgba(0,0,0,0.05)] border border-[#ebe8e2] print:hidden">
          <h3 className="text-base font-bold text-[#4a3ab8] uppercase mb-4 flex items-center gap-2 border-b border-purple-50 pb-3"><Droplet className="w-5 h-5" /> 2. Clinical Data Points</h3>
          <div className="bg-[#f0eeff] p-3 rounded-[8px] border border-[#cec8f6] mb-4 flex flex-col gap-3">
            <div className="w-full md:w-[200px]"><label className="text-xs font-bold text-[#4a3ab8] uppercase mb-1 block">Date</label><input type="date" className="w-full text-xs border rounded p-2 bg-white" value={newLab.date} onChange={(e) => setNewLab({ ...newLab, date: e.target.value })} /></div>
            <div className="flex-1 flex gap-2 w-full">
              <div className="flex-1"><label className="text-[10px] font-bold text-[#a8a099] block mb-0.5">Temp</label><input type="number" className="w-full text-xs border rounded p-2" placeholder="Temp" value={newLab.temp} onChange={(e) => setNewLab({ ...newLab, temp: e.target.value })} /></div>
              <div className="flex-1"><label className="text-[10px] font-bold text-[#a8a099] block mb-0.5">Eosin</label><input type="number" className="w-full text-xs border rounded p-2" placeholder="Eosin" value={newLab.eosin} onChange={(e) => setNewLab({ ...newLab, eosin: e.target.value })} /></div>
              <div className="flex-1"><label className="text-[10px] font-bold text-[#a8a099] block mb-0.5">ALT</label><input type="number" className="w-full text-xs border rounded p-2" placeholder="ALT" value={newLab.alt} onChange={(e) => setNewLab({ ...newLab, alt: e.target.value })} /></div>
            </div>
            <button onClick={addLab} className="w-full md:w-auto bg-[#534ab7] text-white text-sm font-bold py-2 px-6 rounded hover:bg-[#3d3499] shadow-[0_1px_4px_rgba(0,0,0,0.05)] h-[36px]">+ Add / Update</button>
          </div>
          <div className="h-[200px] overflow-y-auto border border-dashed border-[#ebe8e2] rounded-[8px] p-1 bg-[#faf9f7] 50 custom-scrollbar">
            {labs.length === 0 ? <div className="h-full flex items-center justify-center text-[#a8a099] text-sm">No labs added</div> : 
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-1">
                {labs.map((lab) => (
                  <div key={lab.id} className="grid grid-cols-12 gap-2 items-center bg-white border border-[#f4f2ee] p-2.5 rounded text-xs hover:border-[#cec8f6] transition-colors shadow-[0_1px_4px_rgba(0,0,0,0.05)]">
                    <div className="col-span-3 font-mono text-[#a8a099]">{lab.date.slice(5)}</div>
                    <div className="col-span-8 flex flex-wrap gap-1.5">
                      {lab.temp && <span className={`px-1.5 py-0.5 rounded border ${parseFloat(lab.temp) >= 38.5 ? 'bg-red-50 text-[#b83232] border-red-100 font-bold' : 'bg-white text-[#a8a099]'}`}>T:{lab.temp}</span>}
                      {lab.eosin && <span className={`px-1.5 py-0.5 rounded border ${parseFloat(lab.eosin) >= 700 ? 'bg-[#f0eeff] text-[#534ab7] border-[#cec8f6] font-bold' : 'bg-white text-[#a8a099]'}`}>Eo:{lab.eosin}</span>}
                      {lab.alt && <span className="px-1.5 py-0.5 rounded border bg-blue-50 text-[#2a9d8f] border-blue-100 font-bold">ALT:{lab.alt}</span>}
                    </div>
                    <button onClick={() => removeLab(lab.id)} className="col-span-1 text-right text-[#d6d0c8] hover:text-[#e07060]"><Trash2 size={14} /></button>
                  </div>
                ))}
              </div>
            }
          </div>
        </div>

        {/* ROW 3: CHECKLIST - HIDDEN ON PRINT */}
        <div className="bg-white p-6 rounded-[10px] shadow-[0_1px_4px_rgba(0,0,0,0.05)] border border-[#ebe8e2] print:hidden">
          <h3 className="text-base font-bold text-[#4a3ab8] uppercase mb-6 flex items-center gap-2 border-b border-purple-50 pb-3"><CheckCircle className="w-5 h-5" /> 3. Detailed Clinical Checklist (RegiSCAR)</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-4">
              <div className="font-bold text-sm text-[#2d2926] border-b pb-1 mb-2">General Criteria</div>
              <label className="flex items-center gap-3 cursor-pointer p-2 rounded hover:bg-[#faf9f7] transition-colors border border-transparent hover:border-[#f4f2ee]">
                <span className="text-sm font-semibold text-[#2d2926]">Fever ≥ 38.5°C</span>
                <span className="text-xs text-[#a8a099] ml-1">(Yes=0, No=−1, Unknown=0)</span>
                <div className="flex gap-1 mt-1.5">
                  {[['yes', true, '+0'], ['no', false, '−1'], ['unknown', null, '0']].map(([label, val, sc]) => (
                    <button key={label}
                      onClick={() => handleClinicalChange('fever', val)}
                      className={`px-3 py-1 rounded-[5px] text-xs font-semibold border transition-all ${
                        clinical.fever === val
                          ? val === false
                            ? 'bg-[#fdf0ee] text-[#8c3322] border-[#f5b8b8]'
                            : val === true
                            ? 'bg-[#e6f4f1] text-[#1a6b62] border-[#b2ddd7]'
                            : 'bg-[#f4f2ee] text-[#6b6360] border-[#d6d0c8]'
                          : 'bg-white text-[#a8a099] border-[#ebe8e2]'
                      }`}
                    >
                      {label.charAt(0).toUpperCase() + label.slice(1)} <span className="opacity-60">({sc})</span>
                    </button>
                  ))}
                </div>
              </label>
              <label className="flex items-center gap-3 cursor-pointer p-2 rounded hover:bg-[#faf9f7] transition-colors border border-transparent hover:border-[#f4f2ee]">
                <input type="checkbox" className="w-4 h-4 accent-[#534ab7]" checked={clinical.enlargedNodes} onChange={(e) => handleClinicalChange('enlargedNodes', e.target.checked)} />
                <div><span className="text-sm block">Lymph Nodes (+1)</span><span className="text-xs text-[#a8a099]">{">"}1cm, ≥2 sites</span></div>
              </label>
              <label className="flex items-center gap-3 cursor-pointer p-2 rounded hover:bg-[#faf9f7] transition-colors border border-transparent hover:border-[#f4f2ee]">
                <input type="checkbox" className="w-4 h-4 accent-[#534ab7]" checked={clinical.atypicalLymph} onChange={(e) => handleClinicalChange('atypicalLymph', e.target.checked)} />
                <span className="text-sm">Atypical Lymphocytes (+1)</span>
              </label>
            </div>
            <div className="space-y-4 border-t md:border-t-0 md:border-x border-[#f4f2ee] px-0 md:px-4 pt-4 md:pt-0">
              <div className="font-bold text-sm text-[#2d2926] border-b pb-1 mb-2">Skin (Need 2 feats for +1)</div>
              <div className="flex gap-4 mb-2 items-center">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" className="w-4 h-4 accent-[#534ab7]" checked={clinical.rashPresent} onChange={(e) => handleClinicalChange('rashPresent', e.target.checked)} />
                  <span className="text-sm font-bold">Rash Present</span>
                </label>
                {clinical.rashPresent && (
                  <label className="flex items-center gap-2 cursor-pointer bg-[#f0eeff] px-2 py-1 rounded border border-[#cec8f6]">
                    <input type="checkbox" className="w-3.5 h-3.5 accent-[#534ab7]" checked={clinical.rashBSA} onChange={(e) => handleClinicalChange('rashBSA', e.target.checked)} />
                    <span className="text-xs text-[#3d3499] font-bold">{">"} 50% BSA (+1)</span>
                  </label>
                )}
              </div>
              {clinical.rashPresent && (
                <div className="grid grid-cols-2 gap-2 p-2 bg-[#faf9f7] rounded-[8px] border border-[#f4f2ee]">
                  {['Facial Edema', 'Infiltration', 'Purpura', 'Scaling'].map((f) => (
                    <label key={f} className="text-xs flex items-center gap-2 cursor-pointer p-1">
                      <input type="checkbox" className="accent-[#534ab7]" checked={clinical.rashFeatures.includes(f)} onChange={() => handleRashFeature(f)} /> {f}
                    </label>
                  ))}
                </div>
              )}
            </div>
            <div className="space-y-2">
              <div className="font-bold text-sm text-[#2d2926] border-b pb-1 mb-2">Organs (1 pt / ≥2 pts)</div>
              <div className="grid grid-cols-2 gap-2">
                {organOptions.map((org) => (
                  <label key={org.id} className="flex flex-col p-1.5 rounded hover:bg-[#faf9f7] border border-[#f4f2ee] cursor-pointer">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <input type="checkbox" className="w-3.5 h-3.5 accent-[#534ab7]" checked={clinical.selectedOrgans.includes(org.id)} onChange={() => handleOrganToggle(org.id)} />
                      <span className="text-xs font-bold text-[#2d2926]">{org.label}</span>
                    </div>
                    <span className="text-[9px] text-[#a8a099] ml-5">{org.detail}</span>
                  </label>
                ))}
              </div>
              <div className="pt-2 border-t grid grid-cols-2 gap-2">
                <div className="col-span-2">
                  <label className="flex items-center gap-2 cursor-pointer p-2 rounded hover:bg-[#faf9f7] transition-colors border border-transparent hover:border-[#f4f2ee]">
                    <input type="checkbox" className="w-4 h-4 accent-[#534ab7]" checked={clinical.resolutionDays} onChange={(e) => handleClinicalChange('resolutionDays', e.target.checked)} />
                    <span className="text-sm font-bold text-[#2d2926]">Resolution {">"} 15 Days</span>
                  </label>
                </div>
                <div className="col-span-2 flex items-center p-2 bg-[#faf9f7] rounded border border-[#f4f2ee]">
                  <input type="checkbox" className="accent-[#534ab7] w-4 h-4 mr-2" checked={clinical.exclusions} onChange={(e) => handleClinicalChange('exclusions', e.target.checked)} />
                  <div className="flex flex-col"><span className="text-xs font-bold text-[#2d2926]">Exclusion Criteria Met (+1)</span><span className="text-[9px] text-[#a8a099]">Viral, ANA, Blood Cx Negative</span></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* --- ANALYZE BUTTON (Trigger) - HIDDEN ON PRINT --- */}
                {/* Live score bar — updates as checkboxes change */}
        <div className="bg-white border border-[#ebe8e2] rounded-[10px] p-4 mt-6 mb-2 print:hidden">
          <div className="flex items-center gap-4">
            <div>
              <div className="text-[10px] font-semibold text-[#a8a099] uppercase tracking-wider mb-0.5">RegiSCAR score</div>
              <div className="flex items-baseline gap-2">
                <span className={`text-3xl font-bold ${calculateScore.color}`}>{calculateScore.total}</span>
                <span className="text-xs text-[#a8a099]">/ 9</span>
              </div>
            </div>
            <div className={`px-3 py-1.5 rounded-[7px] text-sm font-semibold ${calculateScore.bg} ${calculateScore.color} border ${calculateScore.border}`}>
              {calculateScore.interpretation}
            </div>
            <div className="flex-1 mx-2">
              <div className="h-1.5 bg-[#f4f2ee] rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all duration-300"
                  style={{ width: `${Math.max(0, Math.min(100, (calculateScore.total / 9) * 100))}%`, background: '#2a9d8f' }} />
              </div>
            </div>
            <button
              onClick={handleAnalyze}
              className="bg-[#1a6b62] hover:bg-[#145a52] text-white font-[500] py-2.5 px-6 rounded-[8px] text-sm flex-shrink-0 transition"
            >
              View Timeline & Score
            </button>
          </div>
        </div>

        {/* --- PHARMACIST NOTE - HIDDEN ON PRINT --- */}
        <div className="bg-white p-6 rounded-[10px] shadow-[0_1px_4px_rgba(0,0,0,0.05)] border border-[#ebe8e2] mt-8 mb-8 print:hidden">
          <div className="flex items-center gap-2 mb-4 text-[#2d2926] font-bold border-b border-[#f4f2ee] pb-2"><Edit3 className="w-5 h-5 text-[#534ab7]" /><h3>Pharmacist Note</h3></div>
          <textarea className="w-full border border-[#d6d0c8] rounded-[8px] p-3 text-sm focus:outline-none focus:ring-[3px] focus:ring-[rgba(42,157,143,0.18)] focus:border-[#2a9d8f] focus:border-[#2a9d8f] outline-none h-24 resize-none" placeholder="Enter clinical observations, drug interactions, or recommendations..." value={pharmacistNote} onChange={(e) => setPharmacistNote(e.target.value)}></textarea>
        </div>

        {/* --- RESULTS (Hidden until analyzed, VISIBLE ON PRINT) --- */}
        {analyzed && (
          <div ref={resultsRef} className="animate-fade-in-up space-y-8 pb-12 print:space-y-0 print:block">
            {/* SCORE - Page 1 */}
            <div className="bg-white p-6 rounded-[10px] shadow-[0_4px_16px_rgba(0,0,0,0.08)] border border-[#cec8f6] print:shadow-none print:border-[#ebe8e2]">
              <div className="flex flex-col gap-5">
                <div className={`p-6 text-center rounded-[10px] ${calculateScore.bg} border ${calculateScore.border} min-w-[250px] print:bg-white print:border-[#d6d0c8]`}>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#a8a099] mb-2">RegiSCAR Final Score</h3>
                  <div className="flex items-baseline justify-center gap-2"><span className={`text-6xl font-black print:text-2xl ${calculateScore.color} leading-none print:text-black`}>{calculateScore.total}</span></div>
                  <span className={`inline-block px-4 py-1 mt-2 rounded-full text-sm font-bold bg-white border shadow-[0_1px_4px_rgba(0,0,0,0.05)] ${calculateScore.color} border-${calculateScore.color.split('-')[1]}-200 print:text-black print:border-black`}>{calculateScore.interpretation}</span>
                </div>
                <div className="flex-1 w-full">
                  <h4 className="text-sm font-bold text-[#a8a099] uppercase tracking-wider mb-3 print:text-black">Score Breakdown</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {calculateScore.breakdown.map((item, i) => (
                      <div key={i} className="flex justify-between items-center p-2 border border-[#f4f2ee] rounded bg-[#faf9f7] 50 print:bg-white print:border-[#ebe8e2]">
                        <div><span className="font-bold text-xs text-[#2d2926] block">{item.label}</span>{item.detail && (<span className="text-[10px] text-[#a8a099]">{item.detail}</span>)}</div>
                        <ScoreBadge score={item.score} />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            
            {/* TIMELINE - Page 2 (Forced Break) */}
            <div className="">
              <RevisedTimeline drugs={drugs} labs={labs} onsetDate={onsetDate} />
            </div>
            
            {/* DRUG ANALYSIS - Page 3 (Forced Break) */}
            <div className="">
              <DrugAnalysisSection drugs={drugs} onsetDate={onsetDate} labs={labs} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DressAssessment;