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
  Award, // เพิ่มไอคอนสำหรับ Top 3
} from 'lucide-react';

/* -------------------------------------------------------------------------- */
/* 1. HELPER: RISK CALCULATION LOGIC (New Addition) */
/* -------------------------------------------------------------------------- */
const calculateDrugRisk = (drugGroup, onsetDate, labs) => {
  // Use the earliest start date for the group
  const sortedSegments = [...drugGroup].sort((a, b) => new Date(a.startDate) - new Date(b.startDate));
  const firstExposure = sortedSegments[0];
  
  if (!onsetDate || !firstExposure.startDate) {
    return { score: -1, level: 'Unknown', text: 'No Data', color: 'bg-slate-100 border-slate-200' };
  }

  const start = new Date(firstExposure.startDate);
  const onset = new Date(onsetDate);
  const diffTime = Math.ceil((onset - start) / (1000 * 60 * 60 * 24));

  // 1. Check Tolerance (If lab improved while drug was ACTIVE)
  let toleranceFound = false;
  if (labs && labs.length > 0) {
    const recoveryLabs = labs.filter((l) => new Date(l.date) > onset);
    if (recoveryLabs.length > 0) {
      const lastLab = recoveryLabs[recoveryLabs.length - 1];
      // Simple criteria for improvement
      const isImproved = parseFloat(lastLab.temp || 37) < 37.5 && parseFloat(lastLab.eosin || 0) < 500 && parseFloat(lastLab.alt || 0) < 50;
      
      if (isImproved) {
        const labDate = new Date(lastLab.date);
        // Check if drug was active during this improved lab
        const activeAtLab = sortedSegments.some((seg) => {
          const s = new Date(seg.startDate);
          const e = seg.endDate ? new Date(seg.endDate) : new Date(); // If no end date, assume ongoing
          return labDate >= s && labDate <= e;
        });
        if (activeAtLab) toleranceFound = true;
      }
    }
  }

  if (toleranceFound) {
    return { score: 0, level: 'Unlikely', text: 'Tolerated (Improved on drug)', color: 'bg-emerald-50 border-emerald-200 text-emerald-800' };
  }

  // 2. Latency Logic for DRESS (Typical 2-8 weeks)
  if (diffTime >= 14 && diffTime <= 60) {
    return { score: 10, level: 'High', text: 'High Risk (2-8 wks)', color: 'bg-rose-50 border-rose-200 text-rose-800' };
  } else if (diffTime > 5 && diffTime < 14) {
    return { score: 5, level: 'Medium', text: 'Possible (Early)', color: 'bg-orange-50 border-orange-200 text-orange-800' };
  } else if (diffTime > 60) {
    return { score: 2, level: 'Low', text: 'Low Risk (>60 days)', color: 'bg-yellow-50 border-yellow-200 text-yellow-800' };
  } else {
    return { score: 1, level: 'Very Low', text: 'Unlikely (<5 days)', color: 'bg-slate-50 border-slate-200 text-slate-600' };
  }
};

/* -------------------------------------------------------------------------- */
/* 2. TOP 3 SUSPECTS COMPONENT */
/* -------------------------------------------------------------------------- */
const TopSuspects = ({ drugs, labs, onsetDate }) => {
  const safeDrugs = Array.isArray(drugs) ? drugs : [];
  
  const rankedDrugs = useMemo(() => {
    const groups = {};
    safeDrugs.forEach(d => {
      if(!groups[d.name]) groups[d.name] = [];
      groups[d.name].push(d);
    });

    const analyzed = Object.entries(groups).map(([name, segments]) => {
      const risk = calculateDrugRisk(segments, onsetDate, labs);
      const start = new Date(segments[0].startDate);
      const onset = new Date(onsetDate);
      const latency = !isNaN(start) && !isNaN(onset) ? Math.ceil((onset - start)/(1000*60*60*24)) : '?';
      return { name, segments, risk, latency };
    });

    // Sort by Score (Desc) -> Latency
    return analyzed.sort((a, b) => b.risk.score - a.risk.score).slice(0, 3);
  }, [safeDrugs, labs, onsetDate]);

  if (rankedDrugs.length === 0) return null;

  return (
    <div className="bg-gradient-to-br from-white to-slate-50 p-6 rounded-xl shadow-lg border border-slate-200 mb-8 animate-fade-in-up">
      <div className="flex items-center gap-3 mb-4 border-b border-slate-200 pb-3">
        <Award className="w-6 h-6 text-orange-500" />
        <h3 className="text-lg font-bold text-slate-800">Top 3 Suspected Drugs</h3>
      </div>
      <div className="space-y-3">
        {rankedDrugs.map((item, index) => (
          <div key={item.name} className={`flex items-center justify-between p-3 rounded-lg border ${item.risk.color} bg-white/80 shadow-sm`}>
            <div className="flex items-center gap-4">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-slate-100 border font-bold text-slate-600 shadow-sm">
                #{index + 1}
              </div>
              <div>
                <div className="font-bold text-slate-800">{item.name}</div>
                <div className="text-xs text-slate-500">Latency: {item.latency} days</div>
              </div>
            </div>
            <div className="text-right">
              <span className={`inline-block px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${item.risk.color.replace('border', 'text').replace('bg', 'bg-opacity-20')}`}>
                {item.risk.level}
              </span>
              <div className="text-[10px] text-slate-400 mt-0.5">{item.risk.text}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/* 3. TIMELINE COMPONENT (Improved Layout & Style) */
/* -------------------------------------------------------------------------- */

const RevisedTimeline = ({ drugs, labs, onsetDate }) => {
  const safeDrugs = Array.isArray(drugs) ? drugs : [];
  const safeLabs = Array.isArray(labs) ? labs : [];

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
    
    if (onsetDate && !isNaN(new Date(onsetDate).getTime())) {
      const o = new Date(onsetDate).getTime();
      rawDates.push(o - 86400000 * 2);
      rawDates.push(o + 86400000 * 2);
    }

    const uniquePoints = [...new Set(rawDates)].sort((a, b) => a - b);
    
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
      <div className="h-[150px] flex items-center justify-center text-slate-400 border-2 border-dashed rounded-xl bg-slate-50 mt-6">
        Add drug or lab data to see timeline
      </div>
    );

  const groupedDrugs = safeDrugs.reduce((acc, drug) => {
    if (!acc[drug.name]) acc[drug.name] = [];
    acc[drug.name].push(drug);
    return acc;
  }, {});

  return (
    <div className="bg-white p-6 rounded-xl shadow-lg border border-slate-200 mb-8 font-sans animate-fade-in-up mt-8">
      <div className="flex items-center gap-2 mb-4 text-slate-800 font-bold border-b border-slate-100 pb-3">
        <Activity className="w-6 h-6 text-purple-600" />
        <h3 className="text-lg">Clinical Timeline (Focus View)</h3>
      </div>

      <div className="relative w-full pb-8 overflow-visible"> 
        <div className={`absolute inset-0 ${PADDING_LEFT_CLASS} pointer-events-none z-0`}>
             <div className="relative w-full h-full">
                {timelineData.points.map((t, i) => {
                   const pct = (i / (timelineData.totalPoints > 1 ? timelineData.totalPoints - 1 : 1)) * 100;
                   const isInteresting = timelineData.interestingDates.has(t);
                   return (
                      <div key={i} className="absolute top-0 bottom-0 border-l border-slate-100" style={{ left: `${pct}%` }}>
                         {isInteresting && (
                             <div className="absolute -bottom-6 -translate-x-1/2 text-[10px] font-bold text-slate-500 whitespace-nowrap bg-white/80 px-1 rounded z-10">
                                {new Date(t).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                             </div>
                         )}
                      </div>
                   )
                })}
             </div>
        </div>

        <div className="relative z-10 space-y-4">
            <div className="relative border-b border-slate-200 pb-4">
                 {onsetDate && !isNaN(new Date(onsetDate).getTime()) && (
                    <div className={`absolute inset-y-0 right-0 pointer-events-none z-20 overflow-visible ${LEFT_OFFSET_CLASS}`}>
                       <div className="absolute top-0 bottom-0 w-0.5 bg-red-500 border-l border-dashed border-red-500 opacity-80" style={{ left: `${timelineData.getPos(onsetDate)}%` }}>
                           <div className="bg-red-600 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow-sm absolute -top-4 left-0 -translate-x-1/2 whitespace-nowrap z-50">ONSET</div>
                       </div>
                    </div>
                 )}

                 <div className="flex h-6 items-end pb-1 border-b border-slate-100 mb-2">
                     <div className={`${LABEL_WIDTH_CLASS} shrink-0 font-bold text-xs text-right pr-6 text-slate-400`}>DRUG</div>
                     <div className="flex-1"></div>
                 </div>
                 {Object.entries(groupedDrugs).map(([name, segments], i) => (
                    <div key={i} className="flex h-8 items-center group hover:bg-slate-50 rounded relative z-10">
                        <div className={`${LABEL_WIDTH_CLASS} shrink-0 pr-6 text-right text-xs font-bold text-slate-700 truncate`} title={name}>{name}</div>
                        <div className="flex-1 relative h-full">
                            {segments.map((seg, idx) => {
                                const start = timelineData.getPos(seg.startDate);
                                const end = seg.endDate ? timelineData.getPos(seg.endDate) : 100; 
                                const width = Math.max(end - start, 0.5);
                                return (
                                    <div key={idx} className="absolute h-2.5 bg-slate-500 rounded-full opacity-80 top-[11px]" style={{ left: `${start}%`, width: `${width}%` }}>
                                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-3.5 h-3.5 bg-slate-700 rounded-full border-2 border-white shadow-sm -ml-1.5"></div>
                                        {seg.endDate && <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3.5 h-3.5 bg-slate-700 rounded-full border-2 border-white shadow-sm -mr-1.5"></div>}
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                 ))}
            </div>

            <div className="pt-2">
                 <div className="flex h-6 items-end pb-1 mb-2">
                     <div className={`${LABEL_WIDTH_CLASS} shrink-0 font-bold text-xs text-right pr-6 text-slate-400`}>CLINICAL DATA</div>
                     <div className="flex-1"></div>
                 </div>
                 <div className="flex h-8 items-center">
                    <div className={`${LABEL_WIDTH_CLASS} shrink-0 pr-6 text-right text-xs font-bold text-orange-500 uppercase`}>Temp (°C)</div>
                    <div className="flex-1 relative h-full">
                        {safeLabs.map((lab, i) => {
                            const pos = timelineData.getPos(lab.date);
                            return <div key={i} className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 text-[10px] font-bold px-2 py-0.5 rounded-full border shadow-sm z-10 ${parseFloat(lab.temp) >= 38.5 ? 'bg-red-50 text-red-600 border-red-200' : 'bg-white text-slate-600 border-slate-200'}`} style={{ left: `${pos}%` }}>{lab.temp}</div>
                        })}
                    </div>
                 </div>
                 <div className="flex h-8 items-center">
                    <div className={`${LABEL_WIDTH_CLASS} shrink-0 pr-6 text-right text-xs font-bold text-purple-600 uppercase`}>Eosinophil</div>
                    <div className="flex-1 relative h-full">
                        {safeLabs.map((lab, i) => {
                            const pos = timelineData.getPos(lab.date);
                            return <div key={i} className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 text-[10px] font-bold px-2 py-0.5 rounded-full border shadow-sm z-10 ${parseFloat(lab.eosin) >= 700 ? 'bg-purple-50 text-purple-700 border-purple-200' : 'bg-white text-slate-600 border-slate-200'}`} style={{ left: `${pos}%` }}>{lab.eosin}</div>
                        })}
                    </div>
                 </div>
                 <div className="flex h-8 items-center">
                    <div className={`${LABEL_WIDTH_CLASS} shrink-0 pr-6 text-right text-xs font-bold text-blue-500 uppercase`}>ALT (U/L)</div>
                    <div className="flex-1 relative h-full">
                        {safeLabs.filter(l => l.alt).map((lab, i) => {
                            const pos = timelineData.getPos(lab.date);
                            return <div key={i} className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 min-w-[24px] px-2 py-0.5 text-center text-[10px] font-bold rounded-full border shadow-sm z-10 ${parseFloat(lab.alt) > 100 ? 'bg-blue-50 text-blue-700 border-blue-300' : 'bg-white text-blue-600 border-slate-200'}`} style={{ left: `${pos}%` }}>{lab.alt}</div>
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
/* 4. DRUG ANALYSIS COMPONENT */
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
    <div className="bg-slate-800 text-white p-6 rounded-xl shadow-lg border border-slate-700 mt-6">
      <div className="flex items-center gap-3 mb-6 border-b border-slate-700 pb-4">
        <AlertTriangle className="text-yellow-400" size={24} />
        <div>
          <h3 className="font-bold text-lg">Detailed Suspected Drug Analysis</h3>
          <p className="text-sm text-slate-400">Based on Latency & Re-challenge/Tolerance Data</p>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {Object.entries(groupedDrugs).map(([name, segments]) => {
           const risk = calculateDrugRisk(segments, onsetDate, labs);
           return (
             <div key={name} className={`flex items-center justify-between p-4 rounded-lg border ${risk.color} mb-2`}>
                <div className="flex items-center gap-4">
                  <div className={`p-2.5 rounded-full bg-white/50 border border-black/5`}> <Pill size={20} /> </div>
                  <div>
                    <div className="font-bold text-base">{name}</div>
                    <div className="text-xs opacity-80">Start: {segments[0].startDate} {segments.length > 1 && (<span className="ml-2 bg-black/10 px-1.5 py-0.5 rounded text-[10px] font-bold">Multiple Exposures</span>)}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs font-extrabold uppercase tracking-wide">{risk.text}</div>
                </div>
             </div>
           );
        })}
      </div>
    </div>
  );
};

const ScoreBadge = ({ score }) => {
  let color = 'bg-slate-100 text-slate-500';
  if (score > 0) color = 'bg-rose-100 text-rose-700 border-rose-200';
  if (score < 0) color = 'bg-blue-50 text-blue-600 border-blue-200';
  return <span className={`inline-flex items-center justify-center min-w-[32px] px-2 py-0.5 rounded text-sm font-bold border ${color}`}>{score > 0 ? `+${score}` : score}</span>;
};

/* -------------------------------------------------------------------------- */
/* 5. MAIN DRESS ASSESSMENT COMPONENT */
/* -------------------------------------------------------------------------- */

const DressAssessment = (props) => {
  const location = useLocation();
  
  const drugs = props.drugList || [];
  const setDrugs = props.setDrugList || (() => {});
  const labs = props.labEntries || [];
  const setLabs = props.setLabEntries || (() => {});
  const onsetDate = props.symptomDate || '';
  const setOnsetDate = props.setSymptomDate || (() => {});

  const [analyzed, setAnalyzed] = useState(false);
  const [pharmacistNote, setPharmacistNote] = useState('');
  const [clinical, setClinical] = useState({
    fever: false, enlargedNodes: false, rashPresent: false, rashBSA: false, rashFeatures: [], selectedOrgans: [], atypicalLymph: false, resolutionDays: false, exclusions: false,
  });

  const [newLab, setNewLab] = useState({ date: '', temp: '', eosin: '', alt: '' });
  const [newDrug, setNewDrug] = useState({ name: '', startDate: '', endDate: '' });
  const resultsRef = useRef(null);
  const hasAutoShownRef = useRef(false);

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
    const isSavedCase = !!location.state?.caseData;
    if (isSavedCase && !hasAutoShownRef.current) {
        if (drugs.length > 0 || labs.length > 0) {
            // Delay to prevent race conditions
            setTimeout(() => {
                setAnalyzed(true);
                hasAutoShownRef.current = true;
                resultsRef.current?.scrollIntoView({ behavior: 'smooth' });
            }, 300);
        }
    }
  }, [drugs, labs, location.state]);

  // --- 3. CALCULATE SCORE & RANK DRUGS ---
  const { scoreData, rankedDrugs } = useMemo(() => {
    // A. Calculate RegiSCAR Score
    let breakdown = [];
    let total = 0;
    const safeLabs = Array.isArray(labs) ? labs : [];

    const maxTemp = Math.max(0, ...safeLabs.map((l) => parseFloat(l.temp) || 0));
    let feverScore = -1; let feverDetail = 'Absent (-1)';
    if (clinical.fever || maxTemp >= 38.5) { feverScore = 0; feverDetail = 'Present (0)'; }
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

    let interpretation = 'No DRESS'; let color = 'text-slate-500'; let bg = 'bg-slate-100'; let border = 'border-slate-100';
    if (total >= 2) { interpretation = 'Possible'; color = 'text-orange-600'; bg = 'bg-orange-50'; border = 'border-orange-100'; }
    if (total >= 4) { interpretation = 'Probable'; color = 'text-rose-600'; bg = 'bg-rose-50'; border = 'border-rose-100'; }
    if (total > 5) { interpretation = 'Definite'; color = 'text-red-800'; bg = 'bg-red-100'; border = 'border-red-300'; }

    // B. Calculate Ranked Drugs
    const groups = {};
    const safeDrugs = Array.isArray(drugs) ? drugs : [];
    safeDrugs.forEach(d => {
        if(!groups[d.name]) groups[d.name] = [];
        groups[d.name].push(d);
    });
    
    const analyzedDrugs = Object.entries(groups).map(([name, segments]) => {
        const risk = calculateDrugRisk(segments, onsetDate, labs);
        return { name, score: risk.score, risk }; 
    });
    // Sort by risk score descending
    const sortedDrugs = analyzedDrugs.sort((a, b) => b.score - a.score);

    return {
        scoreData: { total, breakdown, interpretation, color, bg, border },
        rankedDrugs: sortedDrugs
    };
  }, [clinical, labs, drugs, onsetDate]);

  // --- 4. SYNC TO PARENT (WITH BREAK LOOP FIX) ---
  const lastResultRef = useRef(null);
  
  // Use stringify to compare deep objects effectively without loop
  const resultString = JSON.stringify({
      score: scoreData.total,
      interpretation: scoreData.interpretation,
      rankedDrugs, // Including ranked drugs here allows Parent to see the changes
      drugs, labs, onsetDate, clinical, pharmacistNote
  });

  useEffect(() => {
    if(props.onAnalysisComplete) {
       const newResult = {
          type: 'RegiSCAR',
          score: scoreData.total,
          interpretation: scoreData.interpretation,
          rankedDrugs: rankedDrugs, // ✅ Send Sorted Drugs to Parent
          rawData: { drugs, labs, onsetDate, clinical, pharmacistNote }
       };

       if (resultString !== lastResultRef.current) {
           lastResultRef.current = resultString;
           // Break Loop:
           const t = setTimeout(() => { props.onAnalysisComplete(newResult); }, 50);
           return () => clearTimeout(t);
       }
    }
  }, [resultString, props.onAnalysisComplete]); // Dependency on the String rep

  // --- HANDLERS ---
  const handleAnalyze = () => {
    setAnalyzed(true);
    setTimeout(() => { resultsRef.current?.scrollIntoView({ behavior: 'smooth' }); }, 100);
  };

  const addDrug = () => {
    if (newDrug.name && newDrug.startDate && !isNaN(new Date(newDrug.startDate).getTime())) {
      setDrugs([...drugs, { ...newDrug, id: Date.now() }]);
      setNewDrug({ name: '', startDate: '', endDate: '' });
      setAnalyzed(false);
    }
  };
  const removeDrug = (id) => { setDrugs(drugs.filter((d) => d.id !== id)); setAnalyzed(false); };

  const addLab = () => {
    if (newLab.date && !isNaN(new Date(newLab.date).getTime())) {
      const existingIdx = labs.findIndex((l) => l.date === newLab.date);
      let updatedLabs = existingIdx > -1 ? [...labs] : [...labs, { ...newLab, id: Date.now() }];
      if (existingIdx > -1) updatedLabs[existingIdx] = { ...newLab, id: updatedLabs[existingIdx].id };
      updatedLabs.sort((a, b) => new Date(a.date) - new Date(b.date));
      setLabs(updatedLabs);
      setNewLab({ date: '', temp: '', eosin: '', alt: '' });
      setAnalyzed(false);
    }
  };
  const removeLab = (id) => { setLabs(labs.filter((l) => l.id !== id)); setAnalyzed(false); };

  const handleOrganToggle = (organId) => {
    setClinical((prev) => {
      const updated = prev.selectedOrgans.includes(organId) ? prev.selectedOrgans.filter((id) => id !== organId) : [...prev.selectedOrgans, organId];
      return { ...prev, selectedOrgans: updated };
    });
    setAnalyzed(false);
  };

  const handleClinicalChange = (key, value) => { setClinical({ ...clinical, [key]: value }); setAnalyzed(false); };

  const handleRashFeature = (feature) => {
      setClinical((prev) => ({ ...prev, rashFeatures: prev.rashFeatures.includes(feature) ? prev.rashFeatures.filter((x) => x !== feature) : [...prev.rashFeatures, feature] }));
      setAnalyzed(false);
  };

  const hasData = drugs.length > 0 || labs.length > 0;

  return (
    <div className="max-w-[1600px] mx-auto p-6 bg-slate-50 min-h-screen font-sans text-slate-800">
      <div className="space-y-8">
        {/* ROW 1: DRUGS */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <h3 className="text-base font-bold text-purple-700 uppercase mb-4 flex items-center gap-2 border-b border-purple-50 pb-3">
            <Pill className="w-5 h-5" /> 1. Suspected Drugs & Onset
          </h3>
          <div className="flex flex-col lg:flex-row gap-4 mb-4">
            <div className="flex-1 bg-slate-50 p-3 rounded border border-slate-200">
              <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Symptom Onset Date</label>
              <input type="date" className="w-full border-slate-300 rounded p-2 font-bold text-red-600 border text-sm" value={onsetDate} 
                onChange={(e) => { setOnsetDate(e.target.value); setAnalyzed(false); }} 
              />
            </div>
            <div className="flex-[3] bg-purple-50 p-3 rounded-lg border border-purple-100 flex flex-col md:flex-row gap-2 items-end">
              <div className="flex-1 w-full"><label className="text-xs font-bold text-purple-700 uppercase mb-1 block">Drug Name</label><input className="text-sm border rounded p-2 w-full" placeholder="Drug Name" value={newDrug.name} onChange={(e) => setNewDrug({ ...newDrug, name: e.target.value })} /></div>
              <div className="w-full md:w-[160px]"><label className="text-[10px] font-bold text-slate-500 block mb-0.5">Start Date</label><input type="date" className="w-full text-xs border rounded p-2" value={newDrug.startDate} onChange={(e) => setNewDrug({ ...newDrug, startDate: e.target.value })} /></div>
              <div className="w-full md:w-[160px]"><label className="text-[10px] font-bold text-slate-500 block mb-0.5">End Date</label><input type="date" className="w-full text-xs border rounded p-2" value={newDrug.endDate} onChange={(e) => setNewDrug({ ...newDrug, endDate: e.target.value })} /></div>
              <button onClick={addDrug} className="w-full md:w-auto bg-purple-600 text-white text-sm font-bold py-2 px-6 rounded hover:bg-purple-700 shadow-sm h-[38px]">+ Add</button>
            </div>
          </div>
          <div className="h-[200px] overflow-y-auto border border-dashed border-slate-200 rounded-lg p-1 bg-slate-50/50 custom-scrollbar">
            {drugs.length === 0 ? <div className="h-full flex items-center justify-center text-slate-400 text-sm">No drugs added</div> : 
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 p-1">
                {drugs.map((drug) => (
                  <div key={drug.id} className="flex justify-between items-center text-sm bg-white border border-slate-100 p-3 rounded shadow-sm">
                    <div><span className="font-bold block text-slate-700">{drug.name}</span><div className="text-xs text-slate-400 mt-0.5">{drug.startDate} ➝ {drug.endDate || 'Ongoing'}</div></div>
                    <button onClick={() => removeDrug(drug.id)}><Trash2 size={16} className="text-slate-300 hover:text-red-500" /></button>
                  </div>
                ))}
              </div>
            }
          </div>
        </div>

        {/* ROW 2: LABS */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <h3 className="text-base font-bold text-purple-700 uppercase mb-4 flex items-center gap-2 border-b border-purple-50 pb-3"><Droplet className="w-5 h-5" /> 2. Clinical Data Points</h3>
          <div className="bg-purple-50 p-3 rounded-lg border border-purple-100 mb-4 flex flex-col md:flex-row gap-4 items-end">
            <div className="w-full md:w-[200px]"><label className="text-xs font-bold text-purple-700 uppercase mb-1 block">Date</label><input type="date" className="w-full text-xs border rounded p-2 bg-white" value={newLab.date} onChange={(e) => setNewLab({ ...newLab, date: e.target.value })} /></div>
            <div className="flex-1 flex gap-2 w-full">
              <div className="flex-1"><label className="text-[10px] font-bold text-slate-500 block mb-0.5">Temp</label><input type="number" className="w-full text-xs border rounded p-2" placeholder="Temp" value={newLab.temp} onChange={(e) => setNewLab({ ...newLab, temp: e.target.value })} /></div>
              <div className="flex-1"><label className="text-[10px] font-bold text-slate-500 block mb-0.5">Eosin</label><input type="number" className="w-full text-xs border rounded p-2" placeholder="Eosin" value={newLab.eosin} onChange={(e) => setNewLab({ ...newLab, eosin: e.target.value })} /></div>
              <div className="flex-1"><label className="text-[10px] font-bold text-slate-500 block mb-0.5">ALT</label><input type="number" className="w-full text-xs border rounded p-2" placeholder="ALT" value={newLab.alt} onChange={(e) => setNewLab({ ...newLab, alt: e.target.value })} /></div>
            </div>
            <button onClick={addLab} className="w-full md:w-auto bg-purple-600 text-white text-sm font-bold py-2 px-6 rounded hover:bg-purple-700 shadow-sm h-[36px]">+ Add / Update</button>
          </div>
          <div className="h-[200px] overflow-y-auto border border-dashed border-slate-200 rounded-lg p-1 bg-slate-50/50 custom-scrollbar">
            {labs.length === 0 ? <div className="h-full flex items-center justify-center text-slate-400 text-sm">No labs added</div> : 
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 p-1">
                {labs.map((lab) => (
                  <div key={lab.id} className="grid grid-cols-12 gap-2 items-center bg-white border border-slate-100 p-2.5 rounded text-xs hover:border-purple-200 transition-colors shadow-sm">
                    <div className="col-span-3 font-mono text-slate-500">{lab.date.slice(5)}</div>
                    <div className="col-span-8 flex flex-wrap gap-1.5">
                      {lab.temp && <span className={`px-1.5 py-0.5 rounded border ${parseFloat(lab.temp) >= 38.5 ? 'bg-red-50 text-red-600 border-red-100 font-bold' : 'bg-white text-slate-500'}`}>T:{lab.temp}</span>}
                      {lab.eosin && <span className={`px-1.5 py-0.5 rounded border ${parseFloat(lab.eosin) >= 700 ? 'bg-purple-50 text-purple-600 border-purple-100 font-bold' : 'bg-white text-slate-500'}`}>Eo:{lab.eosin}</span>}
                      {lab.alt && <span className="px-1.5 py-0.5 rounded border bg-blue-50 text-blue-600 border-blue-100 font-bold">ALT:{lab.alt}</span>}
                    </div>
                    <button onClick={() => removeLab(lab.id)} className="col-span-1 text-right text-slate-300 hover:text-red-500"><Trash2 size={14} /></button>
                  </div>
                ))}
              </div>
            }
          </div>
        </div>

        {/* ROW 3: CHECKLIST */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <h3 className="text-base font-bold text-purple-700 uppercase mb-6 flex items-center gap-2 border-b border-purple-50 pb-3"><CheckCircle className="w-5 h-5" /> 3. Detailed Clinical Checklist (RegiSCAR)</h3>
          <div className="grid grid-cols-12 gap-6">
            <div className="col-span-12 md:col-span-3 space-y-4">
              <div className="font-bold text-sm text-slate-900 border-b pb-1 mb-2">General Criteria</div>
              <label className="flex items-center gap-3 cursor-pointer p-2 rounded hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-100">
                <input type="checkbox" className="w-4 h-4 accent-purple-600" checked={clinical.fever} onChange={(e) => handleClinicalChange('fever', e.target.checked)} />
                <span className="text-sm font-bold text-slate-700">Fever ≥ 38.5°C (-1 if No)</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer p-2 rounded hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-100">
                <input type="checkbox" className="w-4 h-4 accent-purple-600" checked={clinical.enlargedNodes} onChange={(e) => handleClinicalChange('enlargedNodes', e.target.checked)} />
                <div><span className="text-sm block">Lymph Nodes (+1)</span><span className="text-xs text-slate-400">{">"}1cm, ≥2 sites</span></div>
              </label>
              <label className="flex items-center gap-3 cursor-pointer p-2 rounded hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-100">
                <input type="checkbox" className="w-4 h-4 accent-purple-600" checked={clinical.atypicalLymph} onChange={(e) => handleClinicalChange('atypicalLymph', e.target.checked)} />
                <span className="text-sm">Atypical Lymphocytes (+1)</span>
              </label>
            </div>
            <div className="col-span-12 md:col-span-5 space-y-4 border-x border-slate-50 px-4">
              <div className="font-bold text-sm text-slate-900 border-b pb-1 mb-2">Skin (Need 2 feats for +1)</div>
              <div className="flex gap-4 mb-2 items-center">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" className="w-4 h-4 accent-purple-600" checked={clinical.rashPresent} onChange={(e) => handleClinicalChange('rashPresent', e.target.checked)} />
                  <span className="text-sm font-bold">Rash Present</span>
                </label>
                {clinical.rashPresent && (
                  <label className="flex items-center gap-2 cursor-pointer bg-purple-50 px-2 py-1 rounded border border-purple-100">
                    <input type="checkbox" className="w-3.5 h-3.5 accent-purple-600" checked={clinical.rashBSA} onChange={(e) => handleClinicalChange('rashBSA', e.target.checked)} />
                    <span className="text-xs text-purple-800 font-bold">{">"} 50% BSA (+1)</span>
                  </label>
                )}
              </div>
              {clinical.rashPresent && (
                <div className="grid grid-cols-2 gap-2 p-2 bg-slate-50 rounded-lg border border-slate-100">
                  {['Facial Edema', 'Infiltration', 'Purpura', 'Scaling'].map((f) => (
                    <label key={f} className="text-xs flex items-center gap-2 cursor-pointer p-1">
                      <input type="checkbox" className="accent-purple-600" checked={clinical.rashFeatures.includes(f)} onChange={() => handleRashFeature(f)} /> {f}
                    </label>
                  ))}
                </div>
              )}
            </div>
            <div className="col-span-12 md:col-span-4 space-y-2">
              <div className="font-bold text-sm text-slate-900 border-b pb-1 mb-2">Organs (1 pt / ≥2 pts)</div>
              <div className="grid grid-cols-2 gap-2">
                {organOptions.map((org) => (
                  <label key={org.id} className="flex flex-col p-1.5 rounded hover:bg-slate-50 border border-slate-100 cursor-pointer">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <input type="checkbox" className="w-3.5 h-3.5 accent-purple-600" checked={clinical.selectedOrgans.includes(org.id)} onChange={() => handleOrganToggle(org.id)} />
                      <span className="text-xs font-bold text-slate-700">{org.label}</span>
                    </div>
                    <span className="text-[9px] text-slate-400 ml-5">{org.detail}</span>
                  </label>
                ))}
              </div>
              <div className="pt-2 border-t grid grid-cols-2 gap-2">
                <div className="col-span-2">
                  <label className="flex items-center gap-2 cursor-pointer p-2 rounded hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-100">
                    <input type="checkbox" className="w-4 h-4 accent-purple-600" checked={clinical.resolutionDays} onChange={(e) => handleClinicalChange('resolutionDays', e.target.checked)} />
                    <span className="text-sm font-bold text-slate-700">Resolution {">"} 15 Days</span>
                  </label>
                </div>
                <div className="col-span-2 flex items-center p-2 bg-slate-50 rounded border border-slate-100">
                  <input type="checkbox" className="accent-purple-600 w-4 h-4 mr-2" checked={clinical.exclusions} onChange={(e) => handleClinicalChange('exclusions', e.target.checked)} />
                  <div className="flex flex-col"><span className="text-xs font-bold text-slate-700">Exclusion Criteria Met (+1)</span><span className="text-[9px] text-slate-400">Viral, ANA, Blood Cx Negative</span></div>
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
          Analyze
        </button>

        {/* --- PHARMACIST NOTE --- */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 mt-8 mb-8">
          <div className="flex items-center gap-2 mb-4 text-slate-800 font-bold border-b border-slate-100 pb-2"><Edit3 className="w-5 h-5 text-purple-600" /><h3>Pharmacist Note</h3></div>
          <textarea className="w-full border border-slate-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-purple-200 focus:border-purple-400 outline-none h-24 resize-none" placeholder="Enter clinical observations, drug interactions, or recommendations..." value={pharmacistNote} onChange={(e) => setPharmacistNote(e.target.value)}></textarea>
        </div>

        {/* --- RESULTS (Hidden until analyzed) --- */}
        {analyzed && (
          <div ref={resultsRef} className="animate-fade-in-up space-y-8 pb-12">
            {/* SCORE */}
            <div className="bg-white p-6 rounded-xl shadow-lg border border-purple-100">
              <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                <div className={`p-6 text-center rounded-xl ${scoreData.bg} border ${scoreData.border} min-w-[250px]`}>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">RegiSCAR Final Score</h3>
                  <div className="flex items-baseline justify-center gap-2"><span className={`text-6xl font-black ${scoreData.color} leading-none`}>{scoreData.total}</span></div>
                  <span className={`inline-block px-4 py-1 mt-2 rounded-full text-sm font-bold bg-white border shadow-sm ${scoreData.color} border-${scoreData.color.split('-')[1]}-200`}>{scoreData.interpretation}</span>
                </div>
                <div className="flex-1 w-full">
                  <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3">Score Breakdown</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {scoreData.breakdown.map((item, i) => (
                      <div key={i} className="flex justify-between items-center p-2 border border-slate-100 rounded bg-slate-50/50">
                        <div><span className="font-bold text-xs text-slate-700 block">{item.label}</span>{item.detail && (<span className="text-[10px] text-slate-400">{item.detail}</span>)}</div>
                        <ScoreBadge score={item.score} />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            
            {/* TOP 3 SUSPECTS (NEW) */}
            <TopSuspects drugs={drugs} labs={labs} onsetDate={onsetDate} />

            {/* TIMELINE */}
            <RevisedTimeline drugs={drugs} labs={labs} onsetDate={onsetDate} />
            
            {/* DRUG ANALYSIS */}
            <DrugAnalysisSection drugs={drugs} onsetDate={onsetDate} labs={labs} />
          </div>
        )}
      </div>
    </div>
  );
};

export default DressAssessment;