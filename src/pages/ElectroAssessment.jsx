import React, { useState, useMemo, useEffect } from 'react';

// --- 1. CONFIGURATION & REFERENCE RANGES ---
const QUESTIONS = [
    { id: 1, text: "1. มีรายงานสรุปเกี่ยวกับปฏิกิริยานี้มาก่อนหรือไม่?", scores: [1, 0, 0], required: true },
    { id: 2, text: "2. อาการไม่พึงประสงค์เกิดขึ้นหลังจากได้รับยาที่สงสัยหรือไม่?", scores: [2, -1, 0], auto: true },
    { id: 3, text: "3. อาการไม่พึงประสงค์ดีขึ้นเมื่อหยุดยาหรือไม่ (Dechallenge)?", scores: [1, 0, 0], auto: true },
    { id: 4, text: "4. อาการไม่พึงประสงค์กลับมาเป็นซ้ำเมื่อได้รับยาอีกครั้งหรือไม่ (Rechallenge)?", scores: [2, -1, 0], auto: true },
    { id: 5, text: "5. มีสาเหตุอื่น (นอกจากยา) ที่ทำให้เกิดปฏิกิริยานี้ได้หรือไม่?", scores: [-1, 2, 0], required: true },
    { id: 6, text: "6. ปฏิกิริยากลับมาเป็นซ้ำเมื่อได้รับยาหลอก (Placebo) หรือไม่?", scores: [-1, 1, 0], auto: true },
    { id: 7, text: "7. ตรวจพบยาในเลือด (หรือของเหลวอื่น) ในระดับที่เป็นพิษหรือไม่?", scores: [1, 0, 0], auto: true },
    { id: 8, text: "8. ปฏิกิริยารุนแรงขึ้นเมื่อเพิ่มขนาดยา หรือลดลงเมื่อลดขนาดยาหรือไม่?", scores: [1, 0, 0], auto: true },
    { id: 9, text: "9. ผู้ป่วยเคยมีปฏิกิริยาคล้ายกันกับยาเดิมหรือยาที่คล้ายกันมาก่อนหรือไม่?", scores: [1, 0, 0], required: true },
    { id: 10, text: "10. อาการไม่พึงประสงค์ได้รับการยืนยันด้วยหลักฐานเชิงประจักษ์หรือไม่?", scores: [1, 0, 0], required: true }
];

// ✅ Reference Ranges (Adult)
const LAB_CONFIG = {
    Na: { label: "Sodium (Na)", min: 135, max: 145, unit: "mEq/L" },
    K: { label: "Potassium (K)", min: 3.5, max: 5.0, unit: "mEq/L" },
    Cl: { label: "Chloride (Cl)", min: 96, max: 106, unit: "mEq/L" },
    HCO3: { label: "Bicarb (HCO3)", min: 22, max: 29, unit: "mEq/L" },
    Mg: { label: "Magnesium (Mg)", min: 1.7, max: 2.2, unit: "mg/dL" },
    Ca: { label: "Calcium (Ca)", min: 8.5, max: 10.5, unit: "mg/dL" },
    PO4: { label: "Phosphate (PO4)", min: 2.5, max: 4.5, unit: "mg/dL" }
};

// --- HELPER ---
const formatDate = (d) => new Date(d).toLocaleDateString('th-TH', {day: 'numeric', month: 'short'});
const formatFullDate = (d) => new Date(d).toLocaleDateString('th-TH', {day: 'numeric', month: 'short', year: '2-digit'});

// Function to check lab value against reference (Return deviation info)
const analyzeLabValue = (type, value) => {
    const conf = LAB_CONFIG[type];
    if (!conf || !value || value === "") return { status: 'Unknown', deviation: 0, text: '-', color: 'text-[#a8a099]', bg: 'bg-[#faf9f7]', border: 'border-[#ebe8e2]' };
    
    const num = parseFloat(value);
    if (isNaN(num)) return { status: 'Unknown', deviation: 0, text: '-', color: 'text-[#a8a099]', bg: 'bg-[#faf9f7]', border: 'border-[#ebe8e2]' };

    // Deviation: ยิ่งมากยิ่งผิดปกติ (0 = ปกติ)
    if (num < conf.min) {
        return { 
            status: 'Low', 
            deviation: conf.min - num, 
            text: `Low (${num})`, 
            color: 'text-red-700 font-bold', 
            bg: 'bg-red-50',
            border: 'border-red-200'
        };
    }
    if (num > conf.max) {
        return { 
            status: 'High', 
            deviation: num - conf.max, 
            text: `High (${num})`, 
            color: 'text-red-700 font-bold', 
            bg: 'bg-red-50',
            border: 'border-red-200'
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

// --- CORE LOGIC (AUTOMATED SCORE CALCULATION) ---
const calculateScores = (drugs, labs, onset, currentScores) => {
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
        const on = new Date(onset);
        const existing = newScores[g.key] || {};
        
        let s2=0, s3=0, s4=0;

        // Q2: Onset
        if(onset && g.periods[0].startDate) {
            s2 = start.getTime() <= on.getTime() ? 2 : -1;
        }
        
        // --- 🧠 AUTOMATED LOGIC FROM LAB VALUES ---
        
        // 1. หาว่า "ปัญหาหลัก" คืออะไร (Electrolyte ตัวไหนที่ผิดปกติช่วงได้รับยา)
        const drugPeriodLabs = labs.filter(l => {
            const lDate = new Date(l.date).getTime();
            const pStart = new Date(g.periods[0].startDate).getTime();
            const pEnd = g.periods[g.periods.length-1].stopDate ? new Date(g.periods[g.periods.length-1].stopDate).getTime() : new Date().getTime();
            return lDate >= pStart && lDate <= pEnd;
        });

        // หา Max Deviation ของแต่ละ Type ในช่วงได้รับยา
        const maxDeviations = {};
        drugPeriodLabs.forEach(l => {
            const analysis = analyzeLabValue(l.type, l.value);
            if (analysis.status !== 'Normal') {
                if (!maxDeviations[l.type] || analysis.deviation > maxDeviations[l.type]) {
                    maxDeviations[l.type] = analysis.deviation;
                }
            }
        });

        // Q3: Dechallenge (หยุดยาแล้วดีขึ้นไหม?)
        const stoppedPeriods = g.periods.filter(p => p.stopDate);
        if (stoppedPeriods.length > 0) {
            const lastStopDate = new Date(stoppedPeriods[stoppedPeriods.length-1].stopDate).getTime();
            const afterLabs = labs.filter(l => new Date(l.date).getTime() > lastStopDate);
            
            let improved = false;
            // เช็ค Lab ทุกตัวที่มีปัญหา
            Object.keys(maxDeviations).forEach(type => {
                const maxDev = maxDeviations[type];
                // ดูว่ามีค่า Lab หลังหยุดยาที่ Deviation น้อยลงกว่าตอนเป็นหนักๆ ไหม
                const improvedLab = afterLabs.find(l => {
                    if (l.type !== type) return false;
                    const ans = analyzeLabValue(l.type, l.value);
                    // ดีขึ้นคือ กลับมา Normal (dev=0) หรือ Deviation ลดลงอย่างชัดเจน (เช่น ลดลงครึ่งนึง)
                    return ans.status === 'Normal' || ans.deviation < (maxDev * 0.5); 
                });
                if (improvedLab) improved = true;
            });
            if (improved) s3 = 1;
        }

        // Q4: Rechallenge (ได้รับยาซ้ำแล้วแย่ลงไหม?)
        if (g.periods.length > 1) {
            let recurred = false;
            // วนดูการเริ่มยาครั้งที่ 2, 3...
            for (let i = 1; i < g.periods.length; i++) {
                const period = g.periods[i];
                const pStart = new Date(period.startDate).getTime();
                const pEnd = period.stopDate ? new Date(period.stopDate).getTime() : new Date().getTime();
                
                // หา Lab ในช่วง Period นี้
                const reLabs = labs.filter(l => {
                    const t = new Date(l.date).getTime();
                    return t >= pStart && t <= pEnd;
                });

                // ดูว่ามันแย่ลงไหม (Deviation สูงขึ้น หรือ กลับมา High/Low)
                reLabs.forEach(l => {
                    const ans = analyzeLabValue(l.type, l.value);
                    if (ans.status !== 'Normal') {
                        // ถ้ามีความผิดปกติเกิดขึ้นในช่วงนี้ ถือว่า Positive Rechallenge
                        recurred = true;
                    }
                });
            }
            
            if (recurred) s4 = 2;
            else {
                 // เช็คว่ามี Lab ตรวจในช่วงนี้ไหม ถ้ามีตรวจแล้วไม่เจอผิดปกติ ให้ -1
                 let hasLabCheck = false;
                 for (let i = 1; i < g.periods.length; i++) {
                    const period = g.periods[i];
                    const pStart = new Date(period.startDate).getTime();
                    const pEnd = period.stopDate ? new Date(period.stopDate).getTime() : new Date().getTime();
                    if (labs.some(l => {const t=new Date(l.date).getTime(); return t>=pStart && t<=pEnd;})) hasLabCheck = true;
                 }
                 if (hasLabCheck) s4 = -1;
            }
        }

        newScores[g.key] = { 
            ...existing, 
            2: s2, 3: s3, 4: s4,
            6: existing[6] || 0, 7: existing[7] || 0, 8: existing[8] || 0 
        };
    });
    return newScores;
};

// --- UI COMPONENTS ---
const NaranjoRow = ({ q, value, onChange }) => {
    let bgClass = "border-b border-[#f4f2ee] last:border-0 break-inside-avoid";
    if (q.required) bgClass += " bg-red-50 print:bg-red-50"; 

    return (
        <tr className={bgClass}>
            <td className="py-3 pl-4 w-[65%] align-top text-left print:py-1.5">
                <div className="font-medium text-[#2d2926] text-sm print:text-xs">{q.text}</div>
                <div className="flex gap-2 mt-1">
                    {q.auto && (<span className="text-[10px] text-[#2d2926] font-bold flex items-center gap-1 bg-[#f4f2ee] px-1 rounded print:text-black print:bg-transparent">✨ Auto-calculated</span>)}
                    {q.required && (<span className="text-[10px] text-[#b83232] font-bold flex items-center gap-1 bg-red-100/50 px-1 rounded print:text-[#b83232] print:bg-transparent">* Required</span>)}
                </div>
            </td>
            <td className="py-3 pr-4 w-[35%] align-top text-right print:py-1.5">
                <select 
                    className={`w-full text-right font-bold bg-transparent focus:outline-none cursor-pointer text-sm print:text-black print:text-xs ${value > 0 ? 'text-green-600' : value < 0 ? 'text-[#e07060]' : 'text-[#a8a099]'}`}
                    value={value || 0} onChange={onChange}
                >
                    <option value={0}>Unknown (0)</option>
                    <option value={q.scores[0]}>Yes ({q.scores[0] > 0 ? `+${q.scores[0]}` : q.scores[0]})</option>
                    <option value={q.scores[1]}>No ({q.scores[1]})</option>
                </select>
            </td>
        </tr>
    );
};

const NaranjoCard = ({ group, scoreMap, total, onScoreChange }) => {
    let interp = 'Doubtful'; let color = 'bg-[#faf9f7]0'; let border = 'border-slate-500';
    const isExcluded = scoreMap && scoreMap[4] === -1;

    if (isExcluded) {
        interp = 'EXCLUDED'; color = 'bg-slate-400'; border = 'border-slate-400';
    } else {
        if (total >= 9) { interp = 'Definite'; color = 'bg-indigo-900'; border = 'border-indigo-900'; } 
        else if (total >= 5) { interp = 'Probable'; color = 'bg-blue-600'; border = 'border-blue-600'; }
        else if (total >= 1) { interp = 'Possible'; color = 'bg-sky-500'; border = 'border-sky-500'; }
    }

    return (
        <div className={`print-section border-2 ${border} rounded-[10px] overflow-hidden shadow-[0_1px_4px_rgba(0,0,0,0.05)] bg-white mb-6 break-inside-avoid page-break-inside-avoid print:break-before-page`}>
            <div className={`${color} text-white px-5 py-3 flex justify-between items-center print:text-black print:border-b-2 print:border-black print:py-2`} style={{WebkitPrintColorAdjust: 'exact'}}>
                <div><h3 className="text-xl font-bold print:text-lg">{group.name}</h3><div className="text-xs opacity-90 mt-1"><span className="bg-white/20 px-2 py-0.5 rounded border border-white/20 print:border-black print:text-black">Start: {group.periods[0]?.startDate || '-'}</span></div></div>
                <div className="text-right"><div className="text-3xl font-bold print:text-2xl">{total}</div><div className="text-sm font-bold uppercase bg-black/20 px-2 py-1 rounded inline-block mt-1 print:bg-transparent print:border print:border-black">{interp}</div></div>
            </div>
            <div className="bg-white p-2 print:p-1">
                <table className="w-full table-fixed border-collapse"><tbody>{QUESTIONS.map(q => (<NaranjoRow key={q.id} q={q} value={(scoreMap || {})[q.id] || 0} onChange={(e) => onScoreChange(group.key, q.id, e.target.value)}/>))}</tbody></table>
            </div>
        </div>
    );
};

// --- MAIN COMPONENT ---
const ElectroAssessment = (props) => {
    const [drugs, setDrugs] = useState([]);
    const [labs, setLabs] = useState([]); 
    const [onset, setOnset] = useState('');
    const [scores, setScores] = useState({});
    const [note, setNote] = useState('');
    const [hasAutoAnalyzed, setHasAutoAnalyzed] = useState(false);

    // Inputs
    const [currentDrug, setCurrentDrug] = useState({ name: '', startDate: '', stopDate: '' });
    
    // Batch Input State
    const [batchDate, setBatchDate] = useState('');
    const [batchValues, setBatchValues] = useState({}); 

    const [isAnalyzed, setIsAnalyzed] = useState(false);
    const [activeTab, setActiveTab] = useState(null);

    useEffect(() => {
        const src = props.initialData?.savedData || props.initialData || {};
        const initDrugs = props.drugList || src.drugs || src.drugList || [];
        const initLabs = props.labList || src.labs || src.labList || [];
        const initOnset = props.onset || src.onset || src.rashOnset || ''; 
        const initScores = props.naranjoScores || src.naranjoScores || src.scoresMap || {};
        const initNote = props.pharmacistNote || src.pharmacistNote || '';

        setDrugs(initDrugs); setLabs(initLabs); setOnset(initOnset); setScores(initScores); setNote(initNote); 

        if (!hasAutoAnalyzed && initDrugs.length > 0) {
            const newScores = calculateScores(initDrugs, initLabs, initOnset, initScores);
            setScores(newScores);
            setIsAnalyzed(true);
            setHasAutoAnalyzed(true);
            if (!activeTab && initDrugs.length > 0) setActiveTab(initDrugs[0].name.trim().toLowerCase());
        }
    }, [props.initialData, props.drugList, props.labList, props.onset, props.naranjoScores, props.pharmacistNote]);

    const syncToParent = (newDrugs, newLabs, newOnset, newScores) => {
        if(newDrugs!==undefined) { setDrugs(newDrugs); if(props.setDrugList) props.setDrugList(newDrugs); }
        if(newLabs!==undefined) { setLabs(newLabs); if(props.setLabList) props.setLabList(newLabs); }
        if(newOnset!==undefined) { setOnset(newOnset); if(props.setOnset) props.setOnset(newOnset); }
        if(newScores!==undefined) { setScores(newScores); if(props.setNaranjoScores) props.setNaranjoScores(newScores); }

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
                rFactor: ranked[0]?.total || 0, type: 'Naranjo', rankedDrugs: ranked,
                rawData: { drugs: d, labs: l, onset: newOnset || onset, naranjoScores: s, pharmacistNote: note }
            });
        }
    };

    const performAnalysis = () => {
        const newScores = calculateScores(drugs, labs, onset, scores);
        syncToParent(undefined, undefined, undefined, newScores);
        setIsAnalyzed(true);
        if(drugs.length > 0) setActiveTab(drugs[0].name.trim().toLowerCase());
    };

    const addDrug = () => { if(!currentDrug.name || !currentDrug.startDate) return; const n=[...drugs, {...currentDrug, id:Date.now()}]; syncToParent(n,undefined,undefined,undefined); setCurrentDrug({name:'',startDate:'',stopDate:''}); setIsAnalyzed(false); };
    const removeDrug = (id) => { const n=drugs.filter(d=>d.id!==id); syncToParent(n,undefined,undefined,undefined); setIsAnalyzed(false); };
    
    // ADD BATCH LABS
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
        syncToParent(undefined, combinedLabs, undefined, undefined);
        
        setBatchValues({});
        setIsAnalyzed(false);
    };

    const removeLab = (id) => { const n=labs.filter(l=>l.id!==id); syncToParent(undefined,n,undefined,undefined); setIsAnalyzed(false); };

    const changeScore = (k,q,v) => { const n={...scores, [k]:{...(scores[k]||{}), [q]:parseInt(v)}}; syncToParent(undefined,undefined,undefined,n); };
    const handleNoteChange = (e) => { const val = e.target.value; setNote(val); if(props.setPharmacistNote) props.setPharmacistNote(val); };

    // Timeline Data
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
        <div className="space-y-8 animate-fade-in pb-20">
            {/* INPUTS */}
            <div className="bg-white rounded-[10px] border border-[#ebe8e2] shadow-[0_1px_4px_rgba(0,0,0,0.05)] p-6 mb-6 print:border-black print:shadow-none break-inside-avoid">
                <div className="text-sm font-bold text-[#2d2926] border-b pb-3 mb-4 flex justify-between print:text-black print:border-black">
                    <span>🧪 Electrolyte & Drug Data</span>
                    {onset && <span className="text-indigo-600 bg-indigo-50 px-2 rounded border border-indigo-100 print:text-black print:border-black print:bg-transparent">Imbalance Onset: {formatDate(onset)}</span>}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                    {/* Drug Input */}
                    <div className="md:col-span-6 space-y-4">
                        <div className="flex items-center gap-2">
                            <label className="text-xs font-bold text-indigo-600 uppercase w-28 print:text-black">ONSET DATE:</label>
                            <input type="date" value={onset} onChange={e=>{syncToParent(undefined,undefined,e.target.value,undefined); setIsAnalyzed(false);}} className="border rounded px-2 py-1 text-sm font-bold print:border-black"/>
                        </div>
                        <div className="bg-[#faf9f7] p-3 rounded-lg border border-[#ebe8e2] print:bg-transparent print:border-black">
                            <div className="grid grid-cols-12 gap-2 mb-2 items-end print:hidden">
                                <input className="col-span-5 border rounded px-2 py-1 text-sm" placeholder="Drug Name" value={currentDrug.name} onChange={e=>setCurrentDrug({...currentDrug,name:e.target.value})}/>
                                <div className="col-span-3"><label className="text-[10px] font-bold text-[#a8a099] block mb-1">Start</label><input type="date" className="border rounded w-full px-1 py-1 text-sm" value={currentDrug.startDate} onChange={e=>setCurrentDrug({...currentDrug,startDate:e.target.value})}/></div>
                                <div className="col-span-3"><label className="text-[10px] font-bold text-[#a8a099] block mb-1">Stop</label><input type="date" className="border rounded w-full px-1 py-1 text-sm" value={currentDrug.stopDate} onChange={e=>setCurrentDrug({...currentDrug,stopDate:e.target.value})}/></div>
                                <button onClick={addDrug} className="col-span-1 bg-[#2d2926] text-white rounded font-bold h-8 flex items-center justify-center pb-0.5">+</button>
                            </div>
                            <div className="space-y-1">
                                {drugs.map(d=>(
                                    <div key={d.id} className="flex justify-between items-center bg-white border px-2 py-1 rounded text-xs print:border-black print:bg-transparent">
                                        <span className="font-bold w-1/3 truncate">{d.name}</span>
                                        <span className="text-[#a8a099] print:text-black">{formatDate(d.startDate)} - {d.stopDate?formatDate(d.stopDate):'Ongoing'}</span>
                                        <button onClick={()=>removeDrug(d.id)} className="text-[#e07060] font-bold px-2 print:hidden">×</button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Practical Lab Input Panel (No Clinical Trend) */}
                    <div className="md:col-span-6 bg-blue-50/30 p-4 rounded border border-blue-100 print:bg-transparent print:border-black">
                        <div className="text-xs font-bold text-blue-600 mb-2 print:text-black uppercase flex justify-between items-center">
                            <span>Electrolyte Panel Entry</span>
                        </div>
                        
                        {/* Batch Entry Form */}
                        <div className="print:hidden mb-4 border-b border-blue-200 pb-4">
                            <div className="flex items-center gap-2 mb-3">
                                <label className="text-xs font-bold w-20">Date:</label>
                                <input type="date" className="border rounded px-2 py-1 text-sm w-full font-bold" value={batchDate} onChange={e=>setBatchDate(e.target.value)}/>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-3 mb-3">
                                {Object.entries(LAB_CONFIG).map(([key, conf]) => {
                                    const val = batchValues[key] || '';
                                    const analysis = analyzeLabValue(key, val);
                                    return (
                                        <div key={key} className={`flex flex-col p-2 rounded border ${val ? `${analysis.border} ${analysis.bg}` : 'border-[#ebe8e2] bg-white'}`}>
                                            <div className="flex justify-between items-center mb-1">
                                                <label className="text-[10px] font-bold text-[#6b6360]">{key}</label>
                                                <span className="text-[9px] text-[#a8a099]">({conf.min}-{conf.max})</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <input 
                                                    type="number" step="0.1" 
                                                    className={`border rounded px-1 py-0.5 text-sm w-full text-center font-bold ${val ? analysis.color : ''}`}
                                                    placeholder="-" 
                                                    value={val}
                                                    onChange={e => setBatchValues({...batchValues, [key]: e.target.value})}
                                                />
                                                <span className="text-[10px] text-[#a8a099] w-8">{conf.unit.split('/')[0]}</span>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>

                            <button onClick={addBatchLabs} className="w-full bg-blue-600 text-white px-4 py-2 rounded text-sm font-bold hover:bg-blue-700 shadow-[0_1px_4px_rgba(0,0,0,0.05)]">
                                Record Lab Results
                            </button>
                        </div>

                        {/* Lab History Table */}
                        <div className="max-h-60 overflow-y-auto print:max-h-none bg-white rounded border border-[#ebe8e2]">
                            <table className="w-full text-xs text-left">
                                <thead className="bg-[#faf9f7] text-[#a8a099] font-bold sticky top-0">
                                    <tr>
                                        <th className="p-2 border-b">Date</th>
                                        <th className="p-2 border-b">Values Recorded</th>
                                        <th className="p-2 border-b w-8 print:hidden"></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {Object.entries(groupedLabs).sort((a,b)=>new Date(b[0])-new Date(a[0])).map(([date, items]) => (
                                        <tr key={date} className="border-b last:border-0 hover:bg-[#faf9f7]">
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
                                                <button onClick={() => items.forEach(i => removeLab(i.id))} className="text-slate-300 hover:text-[#e07060] font-bold">×</button>
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
                <button onClick={performAnalysis} className="w-full bg-indigo-600 text-white py-2 rounded shadow font-bold hover:bg-indigo-700">
                    Run Naranjo Analysis
                </button>
            </div>

            <div className="bg-white rounded-[10px] border border-[#ebe8e2] shadow-[0_1px_4px_rgba(0,0,0,0.05)] p-6 mb-6 print:border-black print:shadow-none break-inside-avoid">
                <div className="text-sm font-bold text-[#2d2926] border-b pb-3 mb-4 print:text-black print:border-black text-left">📝 Pharmacist Note</div>
                <textarea className="w-full h-32 border rounded p-3 text-sm focus:outline-blue-500 print:border-black print:h-auto" placeholder="Enter clinical assessment notes..." value={note} onChange={handleNoteChange}></textarea>
            </div>

            {/* RESULTS & TIMELINE */}
            {isAnalyzed && timelineData && (
                <div className="animate-fade-in space-y-8">
                    <div className="bg-white rounded-[10px] border border-[#ebe8e2] shadow-[0_1px_4px_rgba(0,0,0,0.05)] p-6 overflow-hidden break-inside-avoid page-break-inside-avoid print:break-before-page print:border-black print:shadow-none relative flex flex-col">
                        <div className="text-xs font-bold text-[#a8a099] uppercase mb-4 tracking-wider flex items-center gap-2 print:text-black"><span className="w-2 h-4 bg-indigo-500 rounded-sm print:bg-black"></span> Timeline Visualization</div>
                        <div className="relative w-full pb-8 mt-8">
                            {/* Grid Lines */}
                            <div className="absolute inset-0 pl-[150px] pointer-events-none">
                                <div className="relative w-full h-full border-l border-[#f4f2ee] print:border-black">
                                    {timelineData.points.map((t, i) => {
                                        const pct = (i / (timelineData.totalPoints > 1 ? timelineData.totalPoints - 1 : 1)) * 100;
                                        return (
                                            <div key={i} className="absolute top-0 bottom-0 border-l border-[#f4f2ee] print:border-[#d6d0c8]" style={{left:`${pct}%`}}>
                                                <div className="absolute -bottom-6 -translate-x-1/2 text-[9px] text-[#a8a099] print:text-black whitespace-nowrap">{formatFullDate(new Date(t))}</div>
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>

                            {/* (1) DRUG SECTION */}
                            <div className="relative z-10 border-b border-[#f4f2ee] pb-4 mb-4">
                                <div className="flex h-6 items-end pb-1">
                                    <div className="w-[150px] shrink-0 font-bold text-xs text-right pr-4 text-[#a8a099] print:text-black">DRUG</div>
                                    <div className="flex-1"></div>
                                </div>
                                
                                {/* Onset Line */}
                                {onset && (
                                    <div className="absolute top-0 bottom-0 left-[150px] right-0 pointer-events-none z-0">
                                        <div className="absolute top-[-30px] bottom-0 w-0.5 bg-indigo-500 border-l border-dashed border-indigo-500 print:border-black -translate-x-1/2" style={{left:`${timelineData.getPos(onset)}%`}}>
                                            <div className="absolute -top-6 -left-0 -translate-x-1/2 bg-indigo-600 text-white text-[9px] px-2 py-0.5 rounded shadow-[0_1px_4px_rgba(0,0,0,0.05)] font-bold whitespace-nowrap print:bg-transparent print:text-black print:border print:border-black" style={{WebkitPrintColorAdjust:'exact'}}>Onset {formatDate(onset)}</div>
                                        </div>
                                    </div>
                                )}

                                {uniqueDrugs.map(g => {
                                    const periods = drugs.filter(d => d.name.trim().toLowerCase() === g.name.trim().toLowerCase());
                                    return (
                                        <div key={g.id} className="flex h-6 items-center group relative hover:bg-[#faf9f7] rounded">
                                            <div className="w-[150px] shrink-0 pr-4 text-right text-xs font-bold text-[#6b6360] truncate print:text-black">{g.name}</div>
                                            <div className="flex-1 relative h-full">
                                                {periods.map((p, i) => { 
                                                    const s = timelineData.getPos(p.startDate); 
                                                    const e = p.stopDate ? timelineData.getPos(p.stopDate) : 100; 
                                                    const width = Math.max(0.5, e - s); 
                                                    return (
                                                        <div key={i} className="absolute h-1 top-2.5 bg-[#faf9f7]0 print:bg-black opacity-80" style={{left:`${s}%`, width:`${width}%`, WebkitPrintColorAdjust:'exact'}}>
                                                            <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-[#faf9f7]0 print:bg-black" style={{left: '0%'}}></div>
                                                            {p.stopDate && <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-[#faf9f7]0 print:bg-black" style={{left: '100%'}}></div>}
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>

                            {/* (2) LAB VALUES SECTION (Stacking Logic without Dots) */}
                            <div className="relative z-10">
                                <div className="flex h-6 items-end pb-1">
                                    <div className="w-[150px] shrink-0 pr-4 text-right text-[10px] text-[#a8a099] print:text-black font-bold">LAB VALUES</div>
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
                                                                <div key={i} className={`text-[9px] font-bold px-1 border rounded shadow-[0_1px_4px_rgba(0,0,0,0.05)] whitespace-nowrap print:border-black print:shadow-none opacity-90 hover:opacity-100 hover:scale-110 transition-transform ${analysis.bg} ${analysis.color} ${analysis.border}`}>
                                                                    {l.type}: {l.value}
                                                                </div>
                                                             )
                                                        })}
                                                    </div>
                                                    
                                                    {/* ✅ Single Neutral Anchor (No Colored Dots) */}
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
                            return <button key={d.id} onClick={()=>setActiveTab(k)} className={`px-4 py-2 rounded-t-lg border-t border-x border-b-0 text-sm font-bold ${activeTab===k?'bg-white text-indigo-600 -mb-px z-10':'bg-[#faf9f7] text-[#a8a099]'}`}>{d.name} ({total})</button>
                        })}</div>
                        <div className="hidden print:block space-y-4">
                            {uniqueDrugs.map(d => {
                                const k = d.name.trim().toLowerCase();
                                const grp = {name: d.name, key: k, periods: drugs.filter(x=>x.name.trim().toLowerCase()===k)};
                                const tot = Object.values(scores[k]||{}).reduce((a,b)=>a+(parseInt(b)||0),0);
                                return <div key={k} style={{ pageBreakBefore: 'always' }} className="break-inside-avoid"><NaranjoCard key={k} group={grp} scoreMap={scores[k]} total={tot} onScoreChange={()=>{}} /></div>
                            })}
                        </div>
                        <div className="print:hidden">
                            {activeTab && (
                                <NaranjoCard group={{name: uniqueDrugs.find(d=>d.name.trim().toLowerCase()===activeTab)?.name, key:activeTab, periods:drugs.filter(d=>d.name.trim().toLowerCase()===activeTab)}} scoreMap={scores[activeTab]||{}} total={Object.values(scores[activeTab]||{}).reduce((a,b)=>a+(parseInt(b)||0),0)} onScoreChange={changeScore}/>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ElectroAssessment;