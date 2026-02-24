import React, { useState, useMemo, useEffect, useRef } from 'react';

// --- 1. CONFIGURATION & REFERENCE RANGES (UPDATED TO WEISSMAN SCALE) ---
const QUESTIONS = [
    { id: 1, text: "1. มีรายงานตีพิมพ์ยืนยันว่ายานี้ทำให้เกิดตับอ่อนอักเสบเฉียบพลันหรือไม่? (Are there published reports...?)", scores: [1, 0, 0], required: true },
    { id: 2, text: "2. ระยะเวลาตั้งแต่เริ่มยาจนวินิจฉัยตับอ่อนอักเสบเฉียบพลัน สั้น (≤ 7 วัน) หรือไม่?", scores: [2, 0, 0], auto: true },
    { id: 3, text: "3. มีความสัมพันธ์ทางเวลา (≤ 1 เดือน) ระหว่างการเริ่มยาและเริ่มมีอาการหรือไม่?", scores: [1, -1, 0], auto: true },
    { id: 4, text: "4. ภาวะตับอ่อนอักเสบเฉียบพลันหายไปหลังจากหยุดยาหรือไม่?", scores: [1, -1, 0], auto: true },
    { id: 5, text: "5. หากมีการให้ยาซ้ำ (Re-challenge) ภาวะตับอ่อนอักเสบกลับมาเป็นซ้ำหรือไม่?", scores: [2, -1, 0], auto: true },
    { id: 6, text: "6. ตรวจแยกสาเหตุทั่วไปออกไปแล้วหรือไม่? (เช่น นิ่ว, แอลกอฮอล์, TG สูง, Ca สูง, ERCP)", scores: [1, -1, 0], required: true },
    { id: 7, text: "7. ได้มีการตรวจระดับ Serum IgG4 หรือไม่? (เพื่อแยก Autoimmune pancreatitis)", scores: [1, 0, 0], required: false },
    { id: 8, text: "8. ผู้ป่วยมี หรือเพิ่งได้รับการวินิจฉัยว่าติดเชื้อที่อาจทำให้เกิดตับอ่อนอักเสบได้หรือไม่?", scores: [-1, 1, 0], required: true }, // Note: Yes=-1, No=1
    { id: 9, text: "9. ได้ทำการตรวจ EUS และ/หรือ MRCP หรือไม่? (เช่น เพื่อแยกนิ่วขนาดเล็ก, มะเร็ง)", scores: [1, -1, 0], required: false },
    { id: 10, text: "10. ได้ทำการตรวจยีน (SPINK-1, CFTR, PRSS-1) หรือไม่? (ในผู้ป่วยอายุ < 30 ปี)", scores: [1, 0, 0], required: false }
];

const LAB_CONFIG = {
    Amylase: { label: "Serum Amylase", min: 30, max: 110, unit: "U/L", unl: 110 },
    Lipase: { label: "Serum Lipase", min: 0, max: 160, unit: "U/L", unl: 160 }
};

// --- HELPER ---
const formatDate = (d) => new Date(d).toLocaleDateString('th-TH', {day: 'numeric', month: 'short'});
const formatFullDate = (d) => new Date(d).toLocaleDateString('th-TH', {day: 'numeric', month: 'short', year: '2-digit'});

const analyzeLabValue = (type, value) => {
    const conf = LAB_CONFIG[type];
    if (!conf || !value || value === "") return { status: 'Unknown', deviation: 0, text: '-', color: 'text-slate-400', bg: 'bg-slate-50', border: 'border-slate-200' };
    
    const num = parseFloat(value);
    if (isNaN(num)) return { status: 'Unknown', deviation: 0, text: '-', color: 'text-slate-400', bg: 'bg-slate-50', border: 'border-slate-200' };

    const threshold3x = conf.max * 3;

    if (num >= threshold3x) {
        return { 
            status: 'Diagnostic', 
            deviation: num - conf.max, 
            text: `>3x UNL (${num})`, 
            color: 'text-rose-700 font-bold', 
            bg: 'bg-rose-100',
            border: 'border-rose-300'
        };
    } else if (num > conf.max) {
        return { 
            status: 'High', 
            deviation: num - conf.max, 
            text: `High (${num})`, 
            color: 'text-orange-600 font-bold', 
            bg: 'bg-orange-50',
            border: 'border-orange-200'
        };
    }
    return { 
        status: 'Normal', 
        deviation: 0, 
        text: `Normal (${num})`, 
        color: 'text-green-700', 
        bg: 'bg-green-50',
        border: 'border-green-200'
    };
};

// --- CORE LOGIC (UPDATED TIMELINE AUTO-CALCULATION) ---
const calculateScores = (drugs, labs, onset, currentScores, isApConfirmed) => {
    const newScores = { ...currentScores };
    const groups = {};
    drugs.forEach(d => {
        const k = d.name.trim().toLowerCase();
        if(!groups[k]) groups[k] = { key: k, periods: [] };
        groups[k].periods.push(d);
    });

    Object.values(groups).forEach(g => {
        g.periods.sort((a,b)=>new Date(a.startDate)-new Date(b.startDate));
        const start = new Date(g.periods[0].startDate);
        const on = onset ? new Date(onset) : null;
        const existing = newScores[g.key] || {};
        
        let s2=0, s3=0, s4=0, s5=0;

        // Auto-calculate Q2 (<= 7 days) & Q3 (<= 1 month ~ 30 days)
        if(on && g.periods[0].startDate) {
            const diffTime = on.getTime() - start.getTime();
            const diffDays = diffTime / (1000 * 3600 * 24);

            if (diffDays >= 0 && diffDays <= 7) {
                s2 = 2;
            } else if (diffDays > 7) {
                s2 = 0;
            }

            if (diffDays >= 0 && diffDays <= 30) {
                s3 = 1;
            } else if (diffDays > 30 || diffDays < 0) {
                s3 = -1;
            }
        }
        
        const drugPeriodLabs = labs.filter(l => {
            const lDate = new Date(l.date).getTime();
            const pStart = new Date(g.periods[0].startDate).getTime();
            const pEnd = g.periods[g.periods.length-1].stopDate ? new Date(g.periods[g.periods.length-1].stopDate).getTime() : new Date().getTime();
            return lDate >= pStart && lDate <= pEnd;
        });

        const maxDeviations = {};
        drugPeriodLabs.forEach(l => {
            const num = parseFloat(l.value);
            if (!isNaN(num)) {
                if (!maxDeviations[l.type] || num > maxDeviations[l.type]) {
                    maxDeviations[l.type] = num;
                }
            }
        });

        // Auto-calculate Q4 (Resolution after stopping)
        const stoppedPeriods = g.periods.filter(p => p.stopDate);
        if (stoppedPeriods.length > 0) {
            const lastStopDate = new Date(stoppedPeriods[stoppedPeriods.length-1].stopDate).getTime();
            const afterLabs = labs.filter(l => new Date(l.date).getTime() > lastStopDate);
            
            let improved = false;
            let worsenedOrUnchanged = false;

            Object.keys(maxDeviations).forEach(type => {
                const maxVal = maxDeviations[type];
                const followUpLabs = afterLabs.filter(l => l.type === type);
                
                if (followUpLabs.length > 0) {
                    const improvedLab = followUpLabs.find(l => {
                        const num = parseFloat(l.value);
                        if (isNaN(num)) return false;
                        const conf = LAB_CONFIG[type];
                        return (num <= conf.max) || (num < maxVal * 0.5); 
                    });
                    if (improvedLab) improved = true;
                    else worsenedOrUnchanged = true;
                }
            });
            
            if (improved) s4 = 1;
            else if (worsenedOrUnchanged) s4 = -1;
        }

        // Auto-calculate Q5 (Rechallenge)
        if (g.periods.length > 1) {
            let recurred = false;
            let hasLabCheck = false;
            for (let i = 1; i < g.periods.length; i++) {
                const period = g.periods[i];
                const pStart = new Date(period.startDate).getTime();
                const pEnd = period.stopDate ? new Date(period.stopDate).getTime() : new Date().getTime();
                
                const reLabs = labs.filter(l => {
                    const t = new Date(l.date).getTime();
                    return t >= pStart && t <= pEnd;
                });

                if (reLabs.length > 0) hasLabCheck = true;

                reLabs.forEach(l => {
                    const ans = analyzeLabValue(l.type, l.value);
                    if (ans.status === 'High' || ans.status === 'Diagnostic') recurred = true;
                });
            }
            
            if (recurred) s5 = 2;
            else if (hasLabCheck) s5 = -1;
        }

        newScores[g.key] = { 
            ...existing, 
            2: s2, 3: s3, 4: s4, 5: s5
        };
    });
    return newScores;
};

// --- UI COMPONENTS ---
const WeissmanScoreRow = ({ q, value, onChange }) => {
    let bgClass = "border-b border-slate-100 last:border-0 break-inside-avoid";
    if (q.required) bgClass += " bg-red-50 print:bg-red-50"; 

    return (
        <tr className={bgClass}>
            <td className="py-3 pl-4 w-[65%] align-top text-left print:py-1.5">
                <div className="font-medium text-slate-700 text-sm print:text-xs">{q.text}</div>
                <div className="flex gap-2 mt-1">
                    {q.auto && (<span className="text-[10px] text-slate-700 font-bold flex items-center gap-1 bg-slate-100 px-1 rounded print:text-black print:bg-transparent">✨ Auto-calculated</span>)}
                    {q.required && (<span className="text-[10px] text-red-600 font-bold flex items-center gap-1 bg-red-100/50 px-1 rounded print:text-red-600 print:bg-transparent">* Required</span>)}
                </div>
            </td>
            <td className="py-3 pr-4 w-[35%] align-top text-right print:py-1.5">
                <select 
                    className={`w-full text-right font-bold bg-transparent focus:outline-none cursor-pointer text-sm print:text-black print:text-xs ${value > 0 ? 'text-green-600' : value < 0 ? 'text-red-500' : 'text-slate-400'}`}
                    value={value !== undefined ? value : 0} onChange={onChange}
                >
                    <option value={0}>Unknown (0)</option>
                    <option value={q.scores[0]}>Yes ({q.scores[0] > 0 ? `+${q.scores[0]}` : q.scores[0]})</option>
                    <option value={q.scores[1]}>No ({q.scores[1] > 0 ? `+${q.scores[1]}` : q.scores[1]})</option>
                </select>
            </td>
        </tr>
    );
};

// UPDATED TO WEISSMAN INTERPRETATION
const WeissmanScoreCard = ({ group, scoreMap, total, onScoreChange }) => {
    let interp = 'Doubtful'; let color = 'bg-slate-500'; let border = 'border-slate-500';

    if (total > 9) { interp = 'Highly Probable'; color = 'bg-rose-900'; border = 'border-rose-900'; } 
    else if (total >= 6) { interp = 'Probable'; color = 'bg-rose-600'; border = 'border-rose-600'; }
    else if (total >= 3) { interp = 'Possible'; color = 'bg-rose-400'; border = 'border-rose-400'; }
    else { interp = 'Doubtful'; color = 'bg-slate-500'; border = 'border-slate-500'; }

    return (
        <div className={`print-section border-2 ${border} rounded-xl overflow-hidden shadow-sm bg-white mb-6 break-inside-avoid page-break-inside-avoid print:break-before-page`}>
            <div className={`${color} text-white px-5 py-3 flex justify-between items-center print:text-black print:border-b-2 print:border-black print:py-2`} style={{WebkitPrintColorAdjust: 'exact'}}>
                <div>
                    <h3 className="text-xl font-bold print:text-lg">{group.name}</h3>
                    <div className="text-xs opacity-90 mt-1"><span className="bg-white/20 px-2 py-0.5 rounded border border-white/20 print:border-black print:text-black">Start: {group.periods[0]?.startDate || '-'}</span></div>
                </div>
                <div className="text-right">
                    <div className="text-3xl font-bold print:text-2xl">{total}</div>
                    <div className="text-sm font-bold uppercase bg-black/20 px-2 py-1 rounded inline-block mt-1 print:bg-transparent print:border print:border-black">{interp}</div>
                </div>
            </div>
            <div className="bg-white p-2 print:p-1">
                <table className="w-full table-fixed border-collapse">
                    <tbody>
                        {QUESTIONS.map(q => (
                            <WeissmanScoreRow key={q.id} q={q} value={(scoreMap || {})[q.id] || 0} onChange={(e) => onScoreChange(group.key, q.id, parseInt(e.target.value))}/>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

// --- MAIN COMPONENT ---
const PancreatitisAssessment = (props) => {
    const [drugs, setDrugs] = useState([]);
    const [labs, setLabs] = useState([]); 
    const [onset, setOnset] = useState('');
    const [apCriteria, setApCriteria] = useState({ pain: false, lab: false, imaging: false }); 
    const [scores, setScores] = useState({});
    const [note, setNote] = useState('');
    const [hasAutoAnalyzed, setHasAutoAnalyzed] = useState(false);

    const [currentDrug, setCurrentDrug] = useState({ name: '', startDate: '', stopDate: '' });
    const [batchDate, setBatchDate] = useState('');
    const [batchValues, setBatchValues] = useState({}); 

    const [isAnalyzed, setIsAnalyzed] = useState(false);
    const [activeTab, setActiveTab] = useState(null);

    const isMounted = useRef(false);

    const isApConfirmed = (apCriteria.pain ? 1 : 0) + (apCriteria.lab ? 1 : 0) + (apCriteria.imaging ? 1 : 0) >= 2;

    useEffect(() => {
        const src = props.initialData?.savedData || props.initialData || {};
        const initDrugs = props.drugList || src.drugs || src.drugList || [];
        const initLabs = props.labList || src.labs || src.labList || [];
        const initOnset = props.onset || src.onset || src.symptomDate || ''; 
        const initScores = props.naranjoScores || src.naranjoScores || src.scoresMap || {};
        const initNote = props.pharmacistNote || src.pharmacistNote || '';

        if (!isMounted.current) {
            const initApCriteria = src.apCriteria || { pain: false, lab: false, imaging: false }; 
            setApCriteria(initApCriteria);
            isMounted.current = true;
        }

        setDrugs(initDrugs); setLabs(initLabs); setOnset(initOnset); setScores(initScores); setNote(initNote); 

        if (!hasAutoAnalyzed && initDrugs.length > 0) {
            const currentApCriteria = isMounted.current ? apCriteria : (src.apCriteria || { pain: false, lab: false, imaging: false });
            const isConfirmed = (currentApCriteria.pain ? 1 : 0) + (currentApCriteria.lab ? 1 : 0) + (currentApCriteria.imaging ? 1 : 0) >= 2;
            const newScores = calculateScores(initDrugs, initLabs, initOnset, initScores, isConfirmed);
            setScores(newScores);
            setIsAnalyzed(true);
            setHasAutoAnalyzed(true);
            if (!activeTab && initDrugs.length > 0) setActiveTab(initDrugs[0].name.trim().toLowerCase());
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [props.initialData, props.drugList, props.labList, props.onset, props.naranjoScores, props.pharmacistNote]);

    const syncToParent = (newDrugs, newLabs, newOnset, newScores, newApCriteria) => {
        if(newDrugs!==undefined) { setDrugs(newDrugs); if(props.setDrugList) props.setDrugList(newDrugs); }
        if(newLabs!==undefined) { setLabs(newLabs); if(props.setLabList) props.setLabList(newLabs); }
        if(newOnset!==undefined) { setOnset(newOnset); if(props.setOnset) props.setOnset(newOnset); }
        if(newScores!==undefined) { setScores(newScores); if(props.setNaranjoScores) props.setNaranjoScores(newScores); }
        
        const finalApCriteria = newApCriteria || apCriteria;

        if (props.onAnalysisComplete) {
            const d = newDrugs || drugs; const s = newScores || scores; const l = newLabs || labs; 
            const groups = {};
            d.forEach(obj => {
                const k = obj.name.trim().toLowerCase();
                if(!groups[k]) groups[k] = { name: obj.name, key: k, total: 0 };
                const sc = s[k] || {};
                groups[k].total = Object.values(sc).reduce((a,b)=>a+(parseInt(b)||0),0);
            });
            const ranked = Object.values(groups).sort((a,b)=>b.total-a.total);
            props.onAnalysisComplete({
                rFactor: ranked[0]?.total || 0, type: 'DIP Probability Assessment', rankedDrugs: ranked,
                rawData: { drugs: d, labs: l, onset: newOnset || onset, naranjoScores: s, pharmacistNote: note, apCriteria: finalApCriteria }
            });
        }
    };

    const performAnalysis = () => {
        const newScores = calculateScores(drugs, labs, onset, scores, isApConfirmed);
        syncToParent(undefined, undefined, undefined, newScores, undefined);
        setIsAnalyzed(true);
        if(drugs.length > 0) setActiveTab(drugs[0].name.trim().toLowerCase());
    };

    const addDrug = () => { if(!currentDrug.name || !currentDrug.startDate) return; const n=[...drugs, {...currentDrug, id:Date.now()}]; syncToParent(n,undefined,undefined,undefined,undefined); setCurrentDrug({name:'',startDate:'',stopDate:''}); setIsAnalyzed(false); };
    const removeDrug = (id) => { const n=drugs.filter(d=>d.id!==id); syncToParent(n,undefined,undefined,undefined,undefined); setIsAnalyzed(false); };
    
    const addBatchLabs = () => {
        if (!batchDate) return alert("กรุณาระบุวันที่เจาะเลือด");
        
        const newEntries = [];
        Object.entries(batchValues).forEach(([type, value]) => {
            if (value && value.trim() !== "") {
                newEntries.push({
                    id: Date.now() + Math.random(),
                    date: batchDate,
                    type: type,
                    value: value
                });
            }
        });

        if (newEntries.length === 0) return alert("กรุณากรอกค่า Lab อย่างน้อย 1 ค่า");

        const combinedLabs = [...labs, ...newEntries].sort((a,b)=>new Date(a.date)-new Date(b.date));
        syncToParent(undefined, combinedLabs, undefined, undefined, undefined);
        
        setBatchValues({});
        setIsAnalyzed(false);
    };

    const removeLab = (id) => { const n=labs.filter(l=>l.id!==id); syncToParent(undefined,n,undefined,undefined,undefined); setIsAnalyzed(false); };

    const changeScore = (k,q,v) => { const n={...scores, [k]:{...(scores[k]||{}), [q]:parseInt(v)}}; syncToParent(undefined,undefined,undefined,n,undefined); };
    const handleNoteChange = (e) => { const val = e.target.value; setNote(val); if(props.setPharmacistNote) props.setPharmacistNote(val); };

    const timelineData = useMemo(() => {
        if(!onset && drugs.length===0 && labs.length===0) return null;
        const msArr = [
            onset ? new Date(onset).getTime() : null,
            ...drugs.map(d => new Date(d.startDate).getTime()),
            ...drugs.map(d => d.stopDate ? new Date(d.stopDate).getTime() : new Date().getTime()),
            ...labs.map(l => new Date(l.date).getTime())
        ].filter(t => t && !isNaN(t));

        if(msArr.length === 0) return null;
        const points = [...new Set(msArr)].sort((a, b) => a - b);
        const totalPoints = points.length;
        const safeTotal = totalPoints > 1 ? totalPoints - 1 : 1;

        return {
            points, totalPoints,
            getPos: (d) => {
                if(!d) return 0;
                const t = new Date(d).getTime();
                const index = points.indexOf(t);
                if (index === -1) return 0;
                return (index / safeTotal) * 100;
            },
            getDateAtIndex: (i) => points[i]
        };
    }, [onset, drugs, labs]);

    const groupedLabs = useMemo(() => {
        const groups = {};
        labs.forEach(l => {
            if (!groups[l.date]) groups[l.date] = [];
            groups[l.date].push(l);
        });
        return groups;
    }, [labs]);

    const uniqueDrugs = useMemo(()=> [...new Set(drugs.map(d=>d.name.trim().toLowerCase()))].map(k=>drugs.find(d=>d.name.trim().toLowerCase()===k)), [drugs]);

    return (
        <div className="space-y-8 animate-fade-in pb-20 font-sans">
            {/* INPUTS */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 mb-6 print:border-black print:shadow-none break-inside-avoid">
                <div className="text-sm font-bold text-slate-700 border-b pb-3 mb-4 flex justify-between print:text-black print:border-black">
                    <span>Pancreatitis & Drug Data</span>
                    {onset && <span className="text-rose-600 bg-rose-50 px-2 rounded border border-rose-100 print:text-black print:border-black print:bg-transparent">Pancreatitis Onset: {formatDate(onset)}</span>}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                    {/* Drug Input & Disorder Type */}
                    <div className="md:col-span-6 space-y-4">
                        
                        {/* AP Criteria Checklist */}
                        <div className="flex flex-col gap-2 mb-4 bg-rose-50/50 p-4 rounded-lg border border-rose-100 print:border-black print:bg-transparent">
                            <label className="text-sm font-bold text-rose-700 uppercase print:text-black">Acute Pancreatitis Criteria</label>
                            <div className="text-xs text-slate-600 mb-2">Check at least 2 out of 3 to confirm diagnosis:</div>
                            
                            <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                                <input type="checkbox" checked={apCriteria.pain} onChange={(e) => { const n = {...apCriteria, pain: e.target.checked}; setApCriteria(n); syncToParent(undefined,undefined,undefined,undefined,n); }} className="w-4 h-4 text-rose-600 border-slate-300 rounded focus:ring-rose-500"/>
                                Abdominal pain consistent with AP
                            </label>
                            <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                                <input type="checkbox" checked={apCriteria.lab} onChange={(e) => { const n = {...apCriteria, lab: e.target.checked}; setApCriteria(n); syncToParent(undefined,undefined,undefined,undefined,n); }} className="w-4 h-4 text-rose-600 border-slate-300 rounded focus:ring-rose-500"/>
                                Serum lipase or amylase &gt; 3 times UNL
                            </label>
                            <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                                <input type="checkbox" checked={apCriteria.imaging} onChange={(e) => { const n = {...apCriteria, imaging: e.target.checked}; setApCriteria(n); syncToParent(undefined,undefined,undefined,undefined,n); }} className="w-4 h-4 text-rose-600 border-slate-300 rounded focus:ring-rose-500"/>
                                Characteristic findings from imaging (CECT or MRI)
                            </label>
                            
                            <div className={`mt-3 p-2 rounded text-xs font-bold text-center ${isApConfirmed ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-slate-100 text-slate-500 border border-slate-200'}`}>
                                {isApConfirmed ? '✅ Confirmed Acute Pancreatitis (≥ 2 criteria met)' : '❌ Not meeting Acute Pancreatitis criteria yet'}
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <label className="text-xs font-bold text-rose-600 uppercase w-28 print:text-black">ONSET DATE:</label>
                            <input type="date" value={onset} onChange={e=>{syncToParent(undefined,undefined,e.target.value,undefined,undefined); setIsAnalyzed(false);}} className="border rounded px-2 py-1 text-sm font-bold print:border-black"/>
                        </div>
                        <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 print:bg-transparent print:border-black">
                            <div className="grid grid-cols-12 gap-2 mb-2 items-end print:hidden">
                                <div className="col-span-5">
                                    <label className="text-[10px] font-bold text-slate-400 block mb-1 uppercase">Culprit Drug</label>
                                    <input className="border rounded w-full px-2 py-1 text-sm" placeholder="Drug Name" value={currentDrug.name} onChange={e=>setCurrentDrug({...currentDrug,name:e.target.value})}/>
                                </div>
                                <div className="col-span-3">
                                    <label className="text-[10px] font-bold text-slate-400 block mb-1 uppercase">Start Date</label>
                                    <input type="date" className="border rounded w-full px-1 py-1 text-sm" value={currentDrug.startDate} onChange={e=>setCurrentDrug({...currentDrug,startDate:e.target.value})}/>
                                </div>
                                <div className="col-span-3">
                                    <label className="text-[10px] font-bold text-slate-400 block mb-1 uppercase">Stop Date</label>
                                    <input type="date" className="border rounded w-full px-1 py-1 text-sm" value={currentDrug.stopDate} onChange={e=>setCurrentDrug({...currentDrug,stopDate:e.target.value})}/>
                                </div>
                                <button onClick={addDrug} className="col-span-1 bg-slate-800 text-white rounded font-bold h-8 flex items-center justify-center pb-0.5">+</button>
                            </div>
                            <div className="space-y-1">
                                {drugs.map(d=>(
                                    <div key={d.id} className="flex justify-between items-center bg-white border px-2 py-1 rounded text-xs print:border-black print:bg-transparent">
                                        <span className="font-bold w-1/3 truncate">{d.name}</span>
                                        <span className="text-slate-500 print:text-black">{formatDate(d.startDate)} - {d.stopDate?formatDate(d.stopDate):'Ongoing'}</span>
                                        <button onClick={()=>removeDrug(d.id)} className="text-red-500 font-bold px-2 print:hidden">×</button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Practical Lab Input Panel */}
                    <div className="md:col-span-6 bg-rose-50/30 p-4 rounded border border-rose-100 print:bg-transparent print:border-black">
                        <div className="text-xs font-bold text-rose-600 mb-2 print:text-black uppercase flex justify-between items-center">
                            <span>Pancreatic Panel Entry</span>
                        </div>
                        
                        {/* Batch Entry Form */}
                        <div className="print:hidden mb-4 border-b border-rose-200 pb-4">
                            <div className="flex items-center gap-2 mb-3">
                                <label className="text-xs font-bold w-20">Date:</label>
                                <input type="date" className="border rounded px-2 py-1 text-sm w-full font-bold" value={batchDate} onChange={e=>setBatchDate(e.target.value)}/>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-3 mb-3">
                                {Object.entries(LAB_CONFIG).map(([key, conf]) => {
                                    const val = batchValues[key] || '';
                                    const analysis = analyzeLabValue(key, val);
                                    return (
                                        <div key={key} className={`flex flex-col p-2 rounded border ${val ? `${analysis.border} ${analysis.bg}` : 'border-slate-200 bg-white'}`}>
                                            <div className="flex justify-between items-center mb-1">
                                                <label className="text-[10px] font-bold text-slate-600">{key}</label>
                                                <span className="text-[9px] text-slate-400">({conf.min}-{conf.max})</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <input 
                                                    type="number" step="0.1" 
                                                    className={`border rounded px-1 py-0.5 text-sm w-full text-center font-bold ${val ? analysis.color : ''}`}
                                                    placeholder="-" 
                                                    value={val}
                                                    onChange={e => setBatchValues({...batchValues, [key]: e.target.value})}
                                                />
                                                <span className="text-[10px] text-slate-500 w-10">{conf.unit}</span>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>

                            <button onClick={addBatchLabs} className="w-full bg-rose-600 text-white px-4 py-2 rounded text-sm font-bold hover:bg-rose-700 shadow-sm">
                                Record Lipase/Amylase Results
                            </button>
                        </div>

                        {/* Lab History Table */}
                        <div className="max-h-60 overflow-y-auto print:max-h-none bg-white rounded border border-slate-200">
                            <table className="w-full text-xs text-left">
                                <thead className="bg-slate-50 text-slate-500 font-bold sticky top-0">
                                    <tr>
                                        <th className="p-2 border-b">Date</th>
                                        <th className="p-2 border-b">Values Recorded</th>
                                        <th className="p-2 border-b w-8 print:hidden"></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {Object.entries(groupedLabs).sort((a,b)=>new Date(b[0])-new Date(a[0])).map(([date, items]) => (
                                        <tr key={date} className="border-b last:border-0 hover:bg-slate-50">
                                            <td className="p-2 font-mono align-top w-20">{formatDate(date)}</td>
                                            <td className="p-2 align-top">
                                                <div className="flex flex-wrap gap-1">
                                                    {items.map(l => {
                                                        const analysis = analyzeLabValue(l.type, l.value);
                                                        return (
                                                            <span key={l.id} className={`px-1.5 py-0.5 rounded border text-[10px] font-bold ${analysis.color} ${analysis.bg} ${analysis.border}`}>
                                                                {l.type}: {l.value}
                                                            </span>
                                                        )
                                                    })}
                                                </div>
                                            </td>
                                            <td className="p-2 text-right align-top print:hidden">
                                                <button onClick={() => items.forEach(i => removeLab(i.id))} className="text-slate-300 hover:text-red-500 font-bold">×</button>
                                            </td>
                                        </tr>
                                    ))}
                                    {labs.length === 0 && <tr><td colSpan="3" className="p-4 text-center text-slate-300">No lab data recorded</td></tr>}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>

            {/* BUTTON */}
            <div className="mb-6 print:hidden">
                <button onClick={performAnalysis} className="w-full bg-rose-600 text-white py-2 rounded shadow font-bold hover:bg-rose-700">
                    Run Analysis
                </button>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 mb-6 print:border-black print:shadow-none break-inside-avoid">
                <div className="text-sm font-bold text-slate-700 border-b pb-3 mb-4 print:text-black print:border-black text-left">📝 Pharmacist Note</div>
                <textarea className="w-full h-32 border rounded p-3 text-sm focus:outline-rose-500 print:border-black print:h-auto" placeholder="Enter clinical assessment notes..." value={note} onChange={handleNoteChange}></textarea>
            </div>

            {/* RESULTS & TIMELINE */}
            {isAnalyzed && timelineData && (
                <div className="animate-fade-in space-y-8">
                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 overflow-hidden break-inside-avoid page-break-inside-avoid print:break-before-page print:border-black print:shadow-none relative flex flex-col">
                        <div className="text-xs font-bold text-slate-400 uppercase mb-4 tracking-wider flex items-center gap-2 print:text-black"><span className="w-2 h-4 bg-rose-500 rounded-sm print:bg-black"></span> Timeline Visualization</div>
                        <div className="relative w-full pb-8 mt-8">
                            {/* Grid Lines */}
                            <div className="absolute inset-0 pl-[150px] pointer-events-none">
                                <div className="relative w-full h-full border-l border-slate-100 print:border-black">
                                    {timelineData.points.map((t, i) => {
                                        const pct = (i / (timelineData.totalPoints > 1 ? timelineData.totalPoints - 1 : 1)) * 100;
                                        return (
                                            <div key={i} className="absolute top-0 bottom-0 border-l border-slate-100 print:border-slate-300" style={{left:`${pct}%`}}>
                                                <div className="absolute -bottom-6 -translate-x-1/2 text-[9px] text-slate-400 print:text-black whitespace-nowrap">{formatFullDate(new Date(t))}</div>
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>

                            {/* (1) DRUG SECTION */}
                            <div className="relative z-10 border-b border-slate-100 pb-4 mb-4">
                                <div className="flex h-6 items-end pb-1">
                                    <div className="w-[150px] shrink-0 font-bold text-xs text-right pr-4 text-slate-400 print:text-black">DRUG</div>
                                    <div className="flex-1"></div>
                                </div>
                                
                                {/* Onset Line */}
                                {onset && (
                                    <div className="absolute top-0 bottom-0 left-[150px] right-0 pointer-events-none z-0">
                                        <div className="absolute top-[-30px] bottom-0 w-0.5 bg-rose-500 border-l border-dashed border-rose-500 print:border-black -translate-x-1/2" style={{left:`${timelineData.getPos(onset)}%`}}>
                                            <div className="absolute -top-6 -left-0 -translate-x-1/2 bg-rose-600 text-white text-[9px] px-2 py-0.5 rounded shadow-sm font-bold whitespace-nowrap print:bg-transparent print:text-black print:border print:border-black" style={{WebkitPrintColorAdjust:'exact'}}>Onset {formatDate(onset)}</div>
                                        </div>
                                    </div>
                                )}

                                {uniqueDrugs.map(g => {
                                    const periods = drugs.filter(d => d.name.trim().toLowerCase() === g.name.trim().toLowerCase());
                                    return (
                                        <div key={g.id} className="flex h-6 items-center group relative hover:bg-slate-50 rounded">
                                            <div className="w-[150px] shrink-0 pr-4 text-right text-xs font-bold text-slate-600 truncate print:text-black">{g.name}</div>
                                            <div className="flex-1 relative h-full">
                                                {periods.map((p, i) => { 
                                                    const s = timelineData.getPos(p.startDate); 
                                                    const e = p.stopDate ? timelineData.getPos(p.stopDate) : 100; 
                                                    const width = Math.max(0.5, e - s); 
                                                    return (
                                                        <div key={i} className="absolute h-1 top-2.5 bg-slate-500 print:bg-black opacity-80" style={{left:`${s}%`, width:`${width}%`, WebkitPrintColorAdjust:'exact'}}>
                                                            <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-slate-500 print:bg-black" style={{left: '0%'}}></div>
                                                            {p.stopDate && <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-slate-500 print:bg-black" style={{left: '100%'}}></div>}
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>

                            {/* (2) LAB VALUES SECTION */}
                            <div className="relative z-10">
                                <div className="flex h-6 items-end pb-1">
                                    <div className="w-[150px] shrink-0 pr-4 text-right text-[10px] text-slate-400 print:text-black font-bold">LAB VALUES</div>
                                    <div className="flex-1"></div>
                                </div>
                                <div className="flex items-center mt-12 h-16">
                                    <div className="w-[150px] shrink-0"></div> 
                                    <div className="flex-1 relative h-full">
                                        {Object.entries(groupedLabs).map(([date, dateLabs]) => {
                                            let pos = timelineData.getPos(date);
                                            if (pos < 0 || pos > 100) return null;
                                            
                                            return (
                                                <div key={date} className="absolute top-0 -translate-x-1/2 flex flex-col items-center group cursor-pointer print:z-50" style={{left:`${pos}%`}}>
                                                    {/* Values Stack */}
                                                    <div className="absolute bottom-2 flex flex-col-reverse gap-1 items-center">
                                                        {dateLabs.map((l, i) => {
                                                             const analysis = analyzeLabValue(l.type, l.value);
                                                             return (
                                                                <div key={i} className={`text-[9px] font-bold px-1 border rounded shadow-sm whitespace-nowrap print:border-black print:shadow-none opacity-90 hover:opacity-100 hover:scale-110 transition-transform ${analysis.bg} ${analysis.color} ${analysis.border}`}>
                                                                    {l.type}: {l.value}
                                                                </div>
                                                             )
                                                        })}
                                                    </div>
                                                    <div className="w-2 h-2 rounded-full bg-slate-300 ring-2 ring-white print:bg-black"></div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* SCORES */}
                    <div className="print:break-before-auto">
                        <div className="flex flex-wrap gap-2 mb-4 border-b pb-1 print:hidden">{uniqueDrugs.map(d=>{
                            const k = d.name.trim().toLowerCase(); const total=Object.values(scores[k]||{}).reduce((a,b)=>a+(parseInt(b)||0),0);
                            return <button key={d.id} onClick={()=>setActiveTab(k)} className={`px-4 py-2 rounded-t-lg border-t border-x border-b-0 text-sm font-bold ${activeTab===k?'bg-white text-rose-600 -mb-px z-10':'bg-slate-50 text-slate-500'}`}>{d.name} ({total})</button>
                        })}</div>
                        <div className="hidden print:block space-y-4">
                            {uniqueDrugs.map(d => {
                                const k = d.name.trim().toLowerCase();
                                const grp = {name: d.name, key: k, periods: drugs.filter(x=>x.name.trim().toLowerCase()===k)};
                                const tot = Object.values(scores[k]||{}).reduce((a,b)=>a+(parseInt(b)||0),0);
                                return <div key={k} style={{ pageBreakBefore: 'always' }} className="break-inside-avoid"><WeissmanScoreCard key={k} group={grp} scoreMap={scores[k]} total={tot} onScoreChange={()=>{}} /></div>
                            })}
                        </div>
                        <div className="print:hidden">
                            {activeTab && (
                                <WeissmanScoreCard group={{name: uniqueDrugs.find(d=>d.name.trim().toLowerCase()===activeTab)?.name, key:activeTab, periods:drugs.filter(d=>d.name.trim().toLowerCase()===activeTab)}} scoreMap={scores[activeTab]||{}} total={Object.values(scores[activeTab]||{}).reduce((a,b)=>a+(parseInt(b)||0),0)} onScoreChange={changeScore}/>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PancreatitisAssessment;