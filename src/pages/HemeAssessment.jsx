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

// ✅ Reference Ranges (Hematologic Parameters)
const LAB_CONFIG = {
    Hb: { label: "Hemoglobin (Hb)", min: 12.0, max: 16.0, unit: "g/dL" },
    Hct: { label: "Hematocrit (Hct)", min: 36.0, max: 50.0, unit: "%" },
    WBC: { label: "White Blood Cells", min: 4.0, max: 10.0, unit: "x10^3/µL" },
    Plt: { label: "Platelets (Plt)", min: 150, max: 450, unit: "x10^3/µL" },
    ANC: { label: "Abs Neutrophil Count", min: 1500, max: 8000, unit: "cells/µL" },
    Retic: { label: "Reticulocyte", min: 0.5, max: 2.5, unit: "%" },
    LDH: { label: "Lactate Dehydrogenase", min: 140, max: 280, unit: "U/L" }
};

// ✅ Types of Drug-Induced Hematologic Disorders
const DISORDER_TYPES = [
    "Immune Hemolytic Anemia (DIIHA)",
    "Immune Thrombocytopenia (DITP)",
    "Neutropenia / Agranulocytosis",
    "Aplastic Anemia",
    "Megaloblastic Anemia",
    "Methemoglobinemia",
    "Other Hematologic Disorder"
];

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
// ✅ เพิ่มพารามิเตอร์ disorderType
const calculateScores = (drugs, labs, onset, currentScores, disorderType) => {
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

        // ✅ กำหนดกรอบเวลา Dechallenge ตามชนิดของโรค
        let dechallengeWindowDays = 14; // ค่าเริ่มต้น
        if (disorderType && (disorderType.includes("DITP") || disorderType.includes("Thrombocytopenia"))) {
            dechallengeWindowDays = 7;
        } else if (disorderType && (disorderType.includes("Aplastic") || disorderType.includes("Megaloblastic"))) {
            dechallengeWindowDays = 30;
        } else if (disorderType && disorderType.includes("Hemolytic")) {
            dechallengeWindowDays = 14;
        }

        // Q3: Dechallenge (หยุดยาแล้วดีขึ้นไหม?)
        const stoppedPeriods = g.periods.filter(p => p.stopDate);
        if (stoppedPeriods.length > 0) {
            const lastStopDate = new Date(stoppedPeriods[stoppedPeriods.length-1].stopDate).getTime();
            
            // ✅ กรอง Lab เฉพาะที่อยู่ใน Window ที่กำหนด
            const afterLabs = labs.filter(l => {
                const labTime = new Date(l.date).getTime();
                const diffDays = (labTime - lastStopDate) / (1000 * 60 * 60 * 24);
                return diffDays > 0 && diffDays <= dechallengeWindowDays; 
            });
            
            let improved = false;
            Object.keys(maxDeviations).forEach(type => {
                const maxDev = maxDeviations[type];
                const improvedLab = afterLabs.find(l => {
                    if (l.type !== type) return false;
                    const ans = analyzeLabValue(l.type, l.value);
                    return ans.status === 'Normal' || ans.deviation < (maxDev * 0.5); 
                });
                if (improvedLab) improved = true;
            });
            if (improved) s3 = 1;
        }

        // Q4: Rechallenge (ได้รับยาซ้ำแล้วแย่ลงไหม?)
        if (g.periods.length > 1) {
            let recurred = false;
            for (let i = 1; i < g.periods.length; i++) {
                const period = g.periods[i];
                const pStart = new Date(period.startDate).getTime();
                const pEnd = period.stopDate ? new Date(period.stopDate).getTime() : new Date().getTime();
                
                const reLabs = labs.filter(l => {
                    const t = new Date(l.date).getTime();
                    return t >= pStart && t <= pEnd;
                });

                reLabs.forEach(l => {
                    const ans = analyzeLabValue(l.type, l.value);
                    if (ans.status !== 'Normal') recurred = true;
                });
            }
            
            if (recurred) s4 = 2;
            else {
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
    const n = parseInt(value) || 0;
    const sc = n > 0
        ? { text: '#1a6b62', bg: '#e6f4f1', border: '#b2ddd7' }
        : n < 0
        ? { text: '#8c3322', bg: '#fdf0ee', border: '#f5b8b8' }
        : { text: '#a8a099', bg: '#f4f2ee', border: '#ebe8e2' };

    return (
        <tr className={`border-b border-[#f4f2ee] last:border-0 print:border-[#d6d0c8] ${q.required ? 'bg-[#fef9f5] print:bg-transparent' : ''}`}>
            <td className="py-3 pl-4 align-middle text-left print:py-1">
                <div className="font-medium text-[#2d2926] text-sm leading-snug print:text-[11px] print:leading-tight">{q.text}</div>
                <div className="flex gap-2 mt-1">
                    {q.auto && <span className="text-[9px] font-semibold text-[#1a6b62] bg-[#e6f4f1] border border-[#b2ddd7] px-1.5 py-0.5 rounded uppercase tracking-wide print:hidden">Auto</span>}
                    {q.required && <span className="text-[9px] font-semibold text-[#c4620a] bg-[#fff0e4] border border-[#f5cfa8] px-1.5 py-0.5 rounded uppercase tracking-wide print:hidden">Required</span>}
                </div>
            </td>
            <td className="py-3 px-3 align-middle w-[38%] print:hidden">
                <select
                    className="w-full text-sm text-[#2d2926] bg-white border border-[#d6d0c8] rounded-[6px] px-2 py-1.5 focus:outline-none focus:border-[#2a9d8f] cursor-pointer"
                    value={value || 0} onChange={onChange}
                >
                    <option value={0}>Unknown — 0</option>
                    <option value={q.scores[0]}>Yes — {q.scores[0] > 0 ? `+${q.scores[0]}` : q.scores[0]}</option>
                    <option value={q.scores[1]}>No — {q.scores[1]}</option>
                </select>
            </td>
            <td className="py-3 pr-4 w-[10%] align-middle text-center print:hidden">
                <span className="inline-flex items-center justify-center min-w-[32px] px-1.5 py-1 rounded-[5px] text-xs font-bold border"
                    style={{ color: sc.text, background: sc.bg, borderColor: sc.border }}>
                    {n > 0 ? `+${n}` : n}
                </span>
            </td>
            <td className="hidden print:table-cell py-1 pr-4 text-right text-[10px] text-[#2d2926]">
                {n > 0 ? `+${n}` : n}
            </td>
        </tr>
    );
};

const NaranjoCard = ({ group, scoreMap, total, onScoreChange }) => {
    let interp = 'Doubtful'; let color = 'bg-[#6b6360]'; let border = 'border-[#6b6360]';
    const isExcluded = scoreMap && scoreMap[4] === -1;

    if (isExcluded) {
        interp = 'EXCLUDED'; color = 'bg-slate-400'; border = 'border-slate-400';
    } else {
        if (total >= 9) { interp = 'Definite'; color = 'bg-rose-900'; border = 'border-rose-900'; } 
        else if (total >= 5) { interp = 'Probable'; color = 'bg-[#2a9d8f]'; border = 'border-rose-600'; }
        else if (total >= 1) { interp = 'Possible'; color = 'bg-rose-400'; border = 'border-rose-400'; }
    }

    return (
        <div className={`print-section border-2 ${border} rounded-[10px] overflow-hidden bg-white mb-4 break-inside-avoid print:mb-3`}>
            <div className={`${color} text-white px-4 py-2 flex justify-between items-center print:text-black print:border-b-2 print:border-black print:py-1`} style={{WebkitPrintColorAdjust: 'exact'}}>
                <div><h3 className="text-base font-bold print:text-sm">{group.name}</h3><div className="text-xs opacity-90 mt-1"><span className="bg-white/20 px-2 py-0.5 rounded border border-white/20 print:border-black print:text-black">Start: {group.periods[0]?.startDate || '-'}</span></div></div>
                <div className="text-right"><div className="text-2xl font-bold print:text-xl">{total}</div><div className="text-sm font-bold uppercase bg-black/20 px-2 py-1 rounded inline-block mt-1 print:bg-transparent print:border print:border-black">{interp}</div></div>
            </div>
            <div className="bg-white p-1 print:p-0">
                <table className="w-full table-fixed border-collapse"><tbody>{QUESTIONS.map(q => (<NaranjoRow key={q.id} q={q} value={(scoreMap || {})[q.id] || 0} onChange={(e) => onScoreChange(group.key, q.id, e.target.value)}/>))}</tbody></table>
            </div>
        </div>
    );
};

// --- MAIN COMPONENT ---
const HemeAssessment = (props) => {
    const [drugs, setDrugs] = useState([]);
    const [labs, setLabs] = useState([]); 
    const [onset, setOnset] = useState('');
    const [disorderType, setDisorderType] = useState(DISORDER_TYPES[0]); // ✅ New State for Disorder Type
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

    // ✅ ฟังก์ชัน useEffect ถูกแก้ไขให้ดึงข้อมูลจาก rawData ได้อย่างถูกต้อง
    useEffect(() => {
        const src = props.initialData?.rawData || props.initialData?.savedData || props.initialData || {};
        const initDrugs = props.drugList || src.drugs || src.drugList || [];
        const initLabs = props.labList || src.labs || src.labList || [];
        const initOnset = props.onset || src.onset || src.symptomDate || ''; 
        const initScores = props.naranjoScores || src.naranjoScores || src.scoresMap || {};
        const initNote = props.pharmacistNote || src.pharmacistNote || '';
        const initDisorderType = src.disorderType || DISORDER_TYPES[0]; // Load saved disorder type

        setDrugs(initDrugs); 
        setLabs(initLabs); 
        setOnset(initOnset); 
        setScores(initScores); 
        setNote(initNote); 
        setDisorderType(initDisorderType);

        // ✅ ถ้ามีข้อมูลยาโหลดขึ้นมา ให้สั่งแสดงผลหน้าจอ (isAnalyzed) เสมอ
        if (initDrugs.length > 0) {
            setIsAnalyzed(true);
            
            if (!hasAutoAnalyzed) {
                const newScores = calculateScores(initDrugs, initLabs, initOnset, initScores, initDisorderType);
                setScores(newScores);
                setHasAutoAnalyzed(true);
            }
            if (!activeTab) {
                setActiveTab(initDrugs[0].name.trim().toLowerCase());
            }
        }
    }, [props.initialData, props.drugList, props.labList, props.onset, props.naranjoScores, props.pharmacistNote]);

    const syncToParent = (newDrugs, newLabs, newOnset, newScores, newDisorder) => {
        if(newDrugs!==undefined) { setDrugs(newDrugs); if(props.setDrugList) props.setDrugList(newDrugs); }
        if(newLabs!==undefined) { setLabs(newLabs); if(props.setLabList) props.setLabList(newLabs); }
        if(newOnset!==undefined) { setOnset(newOnset); if(props.setOnset) props.setOnset(newOnset); }
        if(newScores!==undefined) { setScores(newScores); if(props.setNaranjoScores) props.setNaranjoScores(newScores); }
        if(newDisorder!==undefined) { setDisorderType(newDisorder); }

        if (props.onAnalysisComplete) {
            const d = newDrugs || drugs; const s = newScores || scores; const l = newLabs || labs; const dt = newDisorder || disorderType;
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
                rawData: { drugs: d, labs: l, onset: newOnset || onset, naranjoScores: s, pharmacistNote: note, disorderType: dt }
            });
        }
    };

    const performAnalysis = () => {
        // ✅ ส่ง disorderType เข้าไปด้วย
        const newScores = calculateScores(drugs, labs, onset, scores, disorderType);
        syncToParent(undefined, undefined, undefined, newScores, undefined);
        setIsAnalyzed(true);
        if(drugs.length > 0) setActiveTab(drugs[0].name.trim().toLowerCase());
    };

    const addDrug = () => { if(!currentDrug.name || !currentDrug.startDate) return; const n=[...drugs, {...currentDrug, id:Date.now()}]; syncToParent(n,undefined,undefined,undefined,undefined); setCurrentDrug({name:'',startDate:'',stopDate:''}); setIsAnalyzed(false); };
    const removeDrug = (id) => { const n=drugs.filter(d=>d.id!==id); syncToParent(n,undefined,undefined,undefined,undefined); setIsAnalyzed(false); };
    
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
        syncToParent(undefined, combinedLabs, undefined, undefined, undefined);
        
        setBatchValues({});
        setIsAnalyzed(false);
    };

    const removeLab = (id) => { const n=labs.filter(l=>l.id!==id); syncToParent(undefined,n,undefined,undefined,undefined); setIsAnalyzed(false); };

    const changeScore = (k,q,v) => { const n={...scores, [k]:{...(scores[k]||{}), [q]:parseInt(v)}}; syncToParent(undefined,undefined,undefined,n,undefined); };
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
                    <span>🩸 Hematologic & Drug Data</span>
                    {onset && <span className="text-[#9b3060] bg-[#fbeaf0] px-2 rounded border border-[#f4c0d1] print:text-black print:border-black print:bg-transparent">Imbalance Onset: {formatDate(onset)}</span>}
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Drug Input & Disorder Type */}
                    <div className="space-y-4">
                        
                        {/* ✅ Disorder Type Selector */}
                        <div className="flex flex-col gap-1 mb-4 bg-[#fbeaf0] 50 p-3 rounded-[8px] border border-[#f4c0d1] print:border-black print:bg-transparent">
                            <label className="text-xs font-bold text-[#9b3060] uppercase print:text-black">Disorder Type:</label>
                            <select 
                                className="border border-rose-200 rounded px-2 py-1.5 text-sm font-bold text-[#2d2926] focus:outline-rose-500"
                                value={disorderType}
                                onChange={(e) => {
                                    setDisorderType(e.target.value);
                                    syncToParent(undefined, undefined, undefined, undefined, e.target.value);
                                }}
                            >
                                {DISORDER_TYPES.map(type => <option key={type} value={type}>{type}</option>)}
                            </select>
                        </div>

                        <div className="flex items-center gap-2">
                            <label className="text-xs font-bold text-[#9b3060] uppercase w-28 print:text-black">ONSET DATE:</label>
                            <input type="date" value={onset} onChange={e=>{syncToParent(undefined,undefined,e.target.value,undefined,undefined); setIsAnalyzed(false);}} className="border rounded px-2 py-1 text-sm font-bold print:border-black"/>
                        </div>
                        <div className="bg-[#faf9f7] p-3 rounded-[8px] border border-[#ebe8e2] print:bg-transparent print:border-black">
                            <div className="flex flex-wrap gap-2 mb-2 print:hidden">
                                <input className="flex-1 min-w-[140px] border border-[#d6d0c8] rounded-[6px] px-2 py-1.5 text-sm focus:outline-none focus:border-[#2a9d8f]" placeholder="Drug Name" value={currentDrug.name} onChange={e=>setCurrentDrug({...currentDrug,name:e.target.value})}/>
                                <div className="min-w-[120px] flex-1"><label className="text-[10px] font-bold text-[#a8a099] block mb-1">Start</label><input type="date" className="border rounded w-full px-1 py-1 text-sm" value={currentDrug.startDate} onChange={e=>setCurrentDrug({...currentDrug,startDate:e.target.value})}/></div>
                                <div className="min-w-[120px] flex-1"><label className="text-[10px] font-bold text-[#a8a099] block mb-1">Stop</label><input type="date" className="border rounded w-full px-1 py-1 text-sm" value={currentDrug.stopDate} onChange={e=>setCurrentDrug({...currentDrug,stopDate:e.target.value})}/></div>
                            <button onClick={addDrug} className="bg-white text-[#2a9d8f] border border-[#b2ddd7] rounded-[6px] font-[500] px-3 h-8 flex items-center justify-center self-end">+</button>
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

                    {/* Practical Lab Input Panel */}
                    <div className="bg-[#fbeaf0] 30 p-4 rounded border border-[#f4c0d1] print:bg-transparent print:border-black">
                        <div className="text-xs font-bold text-[#9b3060] mb-2 print:text-black uppercase flex justify-between items-center">
                            <span>Hematologic Panel Entry</span>
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
                                                <span className="text-[10px] text-[#a8a099] w-10">{conf.unit}</span>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>

                            <button onClick={addBatchLabs} className="w-full bg-[#2a9d8f] text-white px-4 py-2 rounded text-sm font-bold hover:bg-rose-700 shadow-[0_1px_4px_rgba(0,0,0,0.05)]">
                                Record CBC/Lab Results
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
                <button onClick={performAnalysis} className="w-full bg-[#1a6b62] hover:bg-[#145a52] text-white py-3 rounded-[8px] font-[500]">
                    View Timeline & Score
                </button>
            </div>

            <div className="bg-white rounded-[10px] border border-[#ebe8e2] shadow-[0_1px_4px_rgba(0,0,0,0.05)] p-6 mb-6 print:border-black print:shadow-none break-inside-avoid">
                <div className="text-sm font-bold text-[#2d2926] border-b pb-3 mb-4 print:text-black print:border-black text-left">📝 Pharmacist Note</div>
                <textarea className="w-full h-32 border rounded p-3 text-sm focus:outline-rose-500 print:border-black print:h-auto" placeholder="Enter clinical assessment notes..." value={note} onChange={handleNoteChange}></textarea>
            </div>

            {/* RESULTS & TIMELINE */}
            {isAnalyzed && timelineData && (
                <div className="animate-fade-in space-y-8">
                    <div className="bg-white rounded-[10px] border border-[#ebe8e2] shadow-[0_1px_4px_rgba(0,0,0,0.05)] p-6 overflow-hidden break-inside-avoid page-break-inside-avoid print:border-black print:shadow-none relative flex flex-col">
                        <div className="text-xs font-bold text-[#a8a099] uppercase mb-4 tracking-wider flex items-center gap-2 print:text-black"><span className="w-2 h-4 bg-[#fbeaf0] rounded-sm print:bg-black"></span> Timeline Visualization</div>
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
                                        <div className="absolute top-[-30px] bottom-0 w-0.5 bg-[#fbeaf0] border-l border-dashed border-rose-500 print:border-black -translate-x-1/2" style={{left:`${timelineData.getPos(onset)}%`}}>
                                            <div className="absolute -top-6 -left-0 -translate-x-1/2 bg-[#2a9d8f] text-white text-[9px] px-2 py-0.5 rounded shadow-[0_1px_4px_rgba(0,0,0,0.05)] font-bold whitespace-nowrap print:bg-transparent print:text-black print:border print:border-black" style={{WebkitPrintColorAdjust:'exact'}}>Onset {formatDate(onset)}</div>
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
                                                        <div key={i} className="absolute h-1.5 top-2.5 bg-[#2a9d8f] rounded-full opacity-80 print:bg-black" style={{left:`${s}%`, width:`${width}%`, WebkitPrintColorAdjust:'exact'}}>
                                                            <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-[#1a6b62] border-2 border-white shadow-sm print:bg-black" style={{left: '0%'}}></div>
                                                            {p.stopDate && <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-[#e07060] border-2 border-white shadow-sm print:bg-black" style={{left: '100%'}}></div>}
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>

                            {/* (2) LAB VALUES SECTION (Stacking Logic downwards) */}
                            <div className="relative z-10">
                                <div className="flex h-6 items-end pb-1">
                                    <div className="w-[150px] shrink-0 pr-4 text-right text-[10px] text-[#a8a099] print:text-black font-bold">LAB VALUES</div>
                                    <div className="flex-1"></div>
                                </div>
                                {/* ✅ ปรับเพิ่ม min-h และลบ mt-12 เดิมออก เพื่อให้มีที่งอกลงล่าง */}
                                <div className="flex items-start mt-2 min-h-[120px]">
                                    <div className="w-[150px] shrink-0"></div> 
                                    <div className="flex-1 relative h-full">
                                        {Object.entries(groupedLabs).map(([date, dateLabs]) => {
                                            let pos = timelineData.getPos(date);
                                            if (pos < 0 || pos > 100) return null;
                                            
                                            return (
                                                <div key={date} className="absolute top-0 -translate-x-1/2 flex flex-col items-center group cursor-pointer print:z-50" style={{left:`${pos}%`}}>
                                                    
                                                    {/* ✅ Single Neutral Anchor อยู่ด้านบนสุดของ Lab (ติดแกน x) */}
                                                    <div className="w-2 h-2 rounded-full bg-slate-300 ring-2 ring-white print:bg-black z-10"></div>
                                                    
                                                    {/* ✅ Values Stack งอกลงด้านล่างแทน */}
                                                    <div className="mt-1.5 flex flex-col gap-1 items-center">
                                                        {dateLabs.map((l, i) => {
                                                             const analysis = analyzeLabValue(l.type, l.value);
                                                             return (
                                                                <div key={i} className={`text-[9px] font-bold px-1 border rounded shadow-[0_1px_4px_rgba(0,0,0,0.05)] whitespace-nowrap print:border-black print:shadow-none opacity-90 hover:opacity-100 hover:scale-110 transition-transform ${analysis.bg} ${analysis.color} ${analysis.border}`}>
                                                                    {l.type}: {l.value}
                                                                </div>
                                                             )
                                                        })}
                                                    </div>
                                                    
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
                            return <button key={d.id} onClick={()=>setActiveTab(k)} className={`px-4 py-2 rounded-t-lg border-t border-x border-b-0 text-sm font-bold ${activeTab===k?'bg-white text-[#9b3060] -mb-px z-10':'bg-[#faf9f7] text-[#a8a099]'}`}>{d.name} ({total})</button>
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

export default HemeAssessment;