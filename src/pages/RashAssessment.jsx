import React, { useState, useMemo, useEffect } from 'react';

// --- 1. CONFIGURATION ---
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

// --- HELPER ---
const formatDate = (d) => new Date(d).toLocaleDateString('th-TH', {day: 'numeric', month: 'short'});
const formatFullDate = (d) => new Date(d).toLocaleDateString('th-TH', {day: 'numeric', month: 'short', year: '2-digit'});

// --- CORE LOGIC ---
const calculateScores = (drugs, logs, onset, currentScores) => {
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
        
        // Q3: Dechallenge
        const stopped = g.periods.filter(p=>p.stopDate);
        if(stopped.length>0 && logs.length>0) {
            if(stopped.some(p=> logs.some(l=> new Date(l.date)>new Date(p.stopDate) && (l.status==='Better'||l.status==='No Symptoms')))) s3=1;
        }

        // Q4: Rechallenge Logic
        let isNegativeRechallenge = false; 
        let isPositiveRechallenge = false; 

        g.periods.forEach(p => {
            const pStart = new Date(p.startDate).getTime();
            const pEnd = p.stopDate ? new Date(p.stopDate).getTime() : new Date().getTime();
            const tolerated = logs.some(l => {
                const logTime = new Date(l.date).getTime();
                return logTime >= pStart && logTime <= pEnd && logTime >= on.getTime() && (l.status === 'Better' || l.status === 'No Symptoms');
            });
            if (tolerated) isNegativeRechallenge = true;
        });

        if (!isNegativeRechallenge && g.periods.length > 1) {
            for (let i = 1; i < g.periods.length; i++) {
                const restart = g.periods[i];
                const restartStart = new Date(restart.startDate).getTime();
                const restartEnd = restart.stopDate ? new Date(restart.stopDate).getTime() : new Date().getTime();
                const worsened = logs.some(l => {
                    const t = new Date(l.date).getTime();
                    return t >= restartStart && t <= restartEnd && l.status === 'Worse';
                });
                if (worsened) { isPositiveRechallenge = true; break; }
            }
        }

        if (isNegativeRechallenge) s4 = -1; 
        else if (isPositiveRechallenge) s4 = 2; 
        else s4 = 0; 

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
        else if (total >= 5) { interp = 'Probable'; color = 'bg-orange-500'; border = 'border-orange-500'; }
        else if (total >= 1) { interp = 'Possible'; color = 'bg-yellow-500'; border = 'border-yellow-500'; }
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

const CheckItem = ({ id, label, checked, onChange }) => (
    <label className="flex items-start gap-2 cursor-pointer hover:bg-[#faf9f7] p-1 rounded">
        <input 
            type="checkbox" 
            className="mt-1" 
            checked={!!checked} 
            onChange={() => onChange(id)} 
        />
        <span className="text-sm text-[#2d2926]">{label}</span>
    </label>
);

const ScarProdromeAssessment = ({ data, onChange }) => {
    const safeData = data || {};
    const handleCheckChange = (key) => {
        onChange({ ...safeData, [key]: !safeData[key] });
    };

    const interpretationList = useMemo(() => {
        const hasFever = safeData.fever || safeData.flu;
        const hasSJSOrgans = safeData.pain || safeData.mucosal || safeData.throat || safeData.ocular;
        const isSJSLatency = safeData.lat_sjs;
        const riskSJS = hasFever && hasSJSOrgans && isSJSLatency;

        const hasDRESSOrgans = safeData.face || safeData.nodes || safeData.itch || safeData.edema || safeData.eosinophilia;
        const isDRESSLatency = safeData.lat_dress;
        const riskDRESS = hasFever && hasDRESSOrgans && isDRESSLatency;

        const hasAGEPOrgans = safeData.pustules || safeData.pustule_fever || safeData.neutrophilia;
        const isAGEPLatency = safeData.lat_agep;
        const riskAGEP = hasFever && hasAGEPOrgans && isAGEPLatency;

        const results = [];
        if (riskSJS) results.push("SJS/TEN (Stevens-Johnson Syndrome / Toxic Epidermal Necrolysis)");
        if (riskDRESS) results.push("DRESS (Drug Reaction with Eosinophilia and Systemic Symptoms)");
        if (riskAGEP) results.push("AGEP (Acute Generalised Exanthematous Pustulosis)");

        return results;
    }, [safeData]);

    return (
        <div className="bg-white rounded-[10px] border border-[#ebe8e2] shadow-[0_1px_4px_rgba(0,0,0,0.05)] p-6 mb-6 print:border-black print:shadow-none break-inside-avoid">
            <div className="text-sm font-bold text-[#2d2926] border-b pb-3 mb-4 print:text-black print:border-black text-left uppercase tracking-wide">
                ⚠️ SCARs Prodrome Assessment Tool
            </div>
            <div className="space-y-6">
                <div className="bg-[#faf9f7] p-3 rounded border border-[#f4f2ee] print:bg-transparent print:border-[#d6d0c8]">
                    <h4 className="text-xs font-bold text-[#a8a099] mb-2 uppercase">1. General Prodromal Symptoms</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        <CheckItem id="fever" label="Fever (Temperature ≥ 38°C)" checked={safeData.fever} onChange={handleCheckChange} />
                        <CheckItem id="flu" label="Influenza-like illness (Fatigue, Muscle pain)" checked={safeData.flu} onChange={handleCheckChange} />
                        <CheckItem id="toxic" label="General physical deterioration" checked={safeData.toxic} onChange={handleCheckChange} />
                    </div>
                </div>
                <div className="bg-[#faf9f7] p-3 rounded border border-[#f4f2ee] print:bg-transparent print:border-[#d6d0c8]">
                    <h4 className="text-xs font-bold text-[#a8a099] mb-2 uppercase">2. Specific Warning Signs</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div>
                            <div className="text-[10px] font-bold text-[#e07060] mb-1">A. SJS/TEN Alert</div>
                            <div className="space-y-1">
                                <CheckItem id="pain" label="Skin Pain / Burning sensation" checked={safeData.pain} onChange={handleCheckChange} />
                                <CheckItem id="mucosal" label="Mucosal Involvement (Oral/Genital)" checked={safeData.mucosal} onChange={handleCheckChange} />
                                <CheckItem id="throat" label="Sore throat / Dysphagia" checked={safeData.throat} onChange={handleCheckChange} />
                                <CheckItem id="ocular" label="Ocular symptoms (Photophobia)" checked={safeData.ocular} onChange={handleCheckChange} />
                            </div>
                        </div>
                        <div>
                            <div className="text-[10px] font-bold text-purple-600 mb-1">B. DRESS Alert</div>
                            <div className="space-y-1">
                                <CheckItem id="face" label="Facial Edema" checked={safeData.face} onChange={handleCheckChange} />
                                <CheckItem id="nodes" label="Lymphadenopathy" checked={safeData.nodes} onChange={handleCheckChange} />
                                <CheckItem id="itch" label="Skin Pruritus (Itching)" checked={safeData.itch} onChange={handleCheckChange} />
                                <CheckItem id="edema" label="Peripheral Edema" checked={safeData.edema} onChange={handleCheckChange} />
                                <CheckItem id="eosinophilia" label="Eosinophilia (>700/µL or >10%)" checked={safeData.eosinophilia} onChange={handleCheckChange} />
                            </div>
                        </div>
                        <div>
                            <div className="text-[10px] font-bold text-teal-600 mb-1">C. AGEP Alert</div>
                            <div className="space-y-1">
                                <CheckItem id="pustules" label="Non-follicular pustules" checked={safeData.pustules} onChange={handleCheckChange} />
                                <CheckItem id="pustule_fever" label="Fever onset coincides with pustules" checked={safeData.pustule_fever} onChange={handleCheckChange} />
                                <CheckItem id="neutrophilia" label="Neutrophilia (≥7,000/µL)" checked={safeData.neutrophilia} onChange={handleCheckChange} />
                            </div>
                        </div>
                    </div>
                </div>
                <div className="bg-[#faf9f7] p-3 rounded border border-[#f4f2ee] print:bg-transparent print:border-[#d6d0c8]">
                    <h4 className="text-xs font-bold text-[#a8a099] mb-2 uppercase">3. Drug Exposure Timeline (Latency)</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <CheckItem id="lat_agep" label="1 - 11 Days (Suggests AGEP)" checked={safeData.lat_agep} onChange={handleCheckChange} />
                        <CheckItem id="lat_sjs" label="4 - 28 Days (Suggests SJS/TEN)" checked={safeData.lat_sjs} onChange={handleCheckChange} />
                        <CheckItem id="lat_dress" label="2 - 6 Weeks (Suggests DRESS)" checked={safeData.lat_dress} onChange={handleCheckChange} />
                    </div>
                </div>
                <div className="border-2 border-dashed border-red-300 bg-red-50 p-4 rounded print:border-red-500 print:bg-transparent text-left">
                    <div className="text-xs font-bold text-[#a8a099] mb-2 uppercase">Interpretation Result</div>
                    {interpretationList.length === 0 ? (
                        <div className="font-bold text-[#a8a099]">No specific SCAR pattern detected yet.</div>
                    ) : (
                        <div className="font-bold text-[#b83232] text-lg space-y-1">
                            <div className="mb-2 underline decoration-red-300">Suspected Risk:</div>
                            {interpretationList.map((text, idx) => (
                                <div key={idx} className="flex items-start gap-2"><span>•</span><span>{text}</span></div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

// --- MAIN COMPONENT ---
const RashAssessment = (props) => {
    const [drugs, setDrugs] = useState([]);
    const [logs, setLogs] = useState([]);
    const [onset, setOnset] = useState('');
    const [scores, setScores] = useState({});
    const [note, setNote] = useState('');
    const [prodrome, setProdrome] = useState({});
    const [hasAutoAnalyzed, setHasAutoAnalyzed] = useState(false);

    const [currentDrug, setCurrentDrug] = useState({ name: '', startDate: '', stopDate: '' });
    const [currentLog, setCurrentLog] = useState({ date: '', status: 'Stable' });
    const [isAnalyzed, setIsAnalyzed] = useState(false);
    const [activeTab, setActiveTab] = useState(null);

    useEffect(() => {
        const src = props.initialData?.savedData || props.initialData || {};
        const initDrugs = props.drugList || src.drugs || src.drugList || [];
        const initLogs = props.dailyLogs || src.dailyLogs || src.rashLogs || [];
        const initOnset = props.symptomDate || src.rashOnset || src.symptomDate || '';
        const initScores = props.naranjoScores || src.naranjoScores || src.scoresMap || {};
        const initNote = props.pharmacistNote || src.pharmacistNote || '';
        const initProdrome = props.prodromeData || src.prodromeData || {};

        setDrugs(initDrugs); setLogs(initLogs); setOnset(initOnset); setScores(initScores); setNote(initNote); 
        setProdrome(initProdrome);

        if (!hasAutoAnalyzed && props.initialData && initDrugs.length > 0) {
            const newScores = calculateScores(initDrugs, initLogs, initOnset, initScores);
            setScores(newScores);
            setIsAnalyzed(true);
            setHasAutoAnalyzed(true);
            if (!activeTab && initDrugs.length > 0) setActiveTab(initDrugs[0].name.trim().toLowerCase());
        }
    }, [props.initialData, props.prodromeData]);

    const syncToParent = (newDrugs, newLogs, newOnset, newScores, newProdrome) => {
        if(newDrugs!==undefined) { setDrugs(newDrugs); if(props.setDrugList) props.setDrugList(newDrugs); }
        if(newLogs!==undefined) { setLogs(newLogs); if(props.setDailyLogs) props.setDailyLogs(newLogs); }
        if(newOnset!==undefined) { setOnset(newOnset); if(props.setSymptomDate) props.setSymptomDate(newOnset); }
        if(newScores!==undefined) { setScores(newScores); if(props.setNaranjoScores) props.setNaranjoScores(newScores); }
        if(newProdrome!==undefined) { setProdrome(newProdrome); if (props.setProdromeData) props.setProdromeData(newProdrome); }

        if (props.onAnalysisComplete) {
            const d = newDrugs || drugs; const s = newScores || scores; const p = newProdrome || prodrome;
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
                rawData: { drugs: d, dailyLogs: newLogs || logs, rashOnset: newOnset || onset, naranjoScores: s, pharmacistNote: note, prodromeData: p }
            });
        }
    };

    const performAnalysis = () => {
        const newScores = calculateScores(drugs, logs, onset, scores);
        syncToParent(undefined, undefined, undefined, newScores);
        setIsAnalyzed(true);
        if(drugs.length > 0) setActiveTab(drugs[0].name.trim().toLowerCase());
    };

    const addDrug = () => { if(!currentDrug.name || !currentDrug.startDate) return; const n=[...drugs, {...currentDrug, id:Date.now()}]; syncToParent(n,undefined,undefined,undefined); setCurrentDrug({name:'',startDate:'',stopDate:''}); setIsAnalyzed(false); };
    const removeDrug = (id) => { const n=drugs.filter(d=>d.id!==id); syncToParent(n,undefined,undefined,undefined); setIsAnalyzed(false); };
    const addLog = () => { if(!currentLog.date) return; const isDuplicate = logs.some(l => l.date === currentLog.date); if (isDuplicate) { alert(`วันที่ ${formatDate(currentLog.date)} มีข้อมูลบันทึกไว้อยู่แล้ว กรุณาลบอันเก่าออกก่อนหากต้องการแก้ไข`); return; } const n=[...logs, {...currentLog, id:Date.now()}].sort((a,b)=>new Date(a.date)-new Date(b.date)); syncToParent(undefined,n,undefined,undefined); setCurrentLog({...currentLog, date:''}); setIsAnalyzed(false); };
    const removeLog = (id) => { const n=logs.filter(l=>l.id!==id); syncToParent(undefined,n,undefined,undefined); setIsAnalyzed(false); };
    const changeScore = (k,q,v) => { const n={...scores, [k]:{...(scores[k]||{}), [q]:parseInt(v)}}; syncToParent(undefined,undefined,undefined,n); };
    const handleNoteChange = (e) => { const val = e.target.value; setNote(val); if(props.setPharmacistNote) props.setPharmacistNote(val); };
    const handleProdromeChange = (newData) => { syncToParent(undefined, undefined, undefined, undefined, newData); };

    // Timeline Data
    const timelineData = useMemo(() => {
        if(!onset && drugs.length===0) return null;
        const msArr = [
            onset ? new Date(onset).getTime() : null,
            ...drugs.map(d => new Date(d.startDate).getTime()),
            ...drugs.map(d => d.stopDate ? new Date(d.stopDate).getTime() : new Date().getTime()),
            ...logs.map(l => new Date(l.date).getTime())
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
    }, [onset, drugs, logs]);

    const getLogColor = (s) => s==='Better'?'bg-green-500':s==='Worse'?'bg-red-500':s==='No Symptoms'?'bg-slate-400':'bg-yellow-400';
    const uniqueDrugs = useMemo(()=> [...new Set(drugs.map(d=>d.name.trim().toLowerCase()))].map(k=>drugs.find(d=>d.name.trim().toLowerCase()===k)), [drugs]);

    return (
        <div className="space-y-8 animate-fade-in pb-20">
            {/* INPUTS - No Changes */}
            <div className="bg-white rounded-[10px] border border-[#ebe8e2] shadow-[0_1px_4px_rgba(0,0,0,0.05)] p-6 mb-6 print:border-black print:shadow-none break-inside-avoid">
                <div className="text-sm font-bold text-[#2d2926] border-b pb-3 mb-4 flex justify-between print:text-black print:border-black">
                    <span>🏥 Clinical Data Entry</span>
                    {onset && <span className="text-[#9b3060] bg-[#fbeaf0] px-2 rounded border border-[#f4c0d1] print:text-black print:border-black print:bg-transparent">Onset: {formatDate(onset)}</span>}
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="space-y-4">
                        <div className="flex items-center gap-2"><label className="text-xs font-bold text-[#9b3060] uppercase w-24 print:text-black">RASH ONSET:</label><input type="date" value={onset} onChange={e=>{syncToParent(undefined,undefined,e.target.value,undefined); setIsAnalyzed(false);}} className="border rounded px-2 py-1 text-sm font-bold print:border-black"/></div>
                        <div className="bg-[#faf9f7] p-3 rounded-[8px] border border-[#ebe8e2] print:bg-transparent print:border-black">
                            <div className="flex flex-wrap gap-2 mb-2 print:hidden">
                                <input className="flex-1 min-w-[140px] border border-[#d6d0c8] rounded-[6px] px-2 py-1.5 text-sm focus:outline-none focus:border-[#2a9d8f]" placeholder="Drug Name" value={currentDrug.name} onChange={e=>setCurrentDrug({...currentDrug,name:e.target.value})}/>
                                <div className="min-w-[130px] flex-1"><label className="text-[10px] font-bold text-[#a8a099] block mb-1">Start date</label><input type="date" className="border rounded w-full px-1 py-1 text-sm" value={currentDrug.startDate} onChange={e=>setCurrentDrug({...currentDrug,startDate:e.target.value})}/></div>
                                <div className="min-w-[130px] flex-1"><label className="text-[10px] font-bold text-[#a8a099] block mb-1">Stop date</label><input type="date" className="border rounded w-full px-1 py-1 text-sm" value={currentDrug.stopDate} onChange={e=>setCurrentDrug({...currentDrug,stopDate:e.target.value})}/></div>
                            <button onClick={addDrug} className="col-span-1 bg-[#fff] text-[#2a9d8f] border border-[#b2ddd7] rounded-[6px] font-[500] h-8 flex items-center justify-center px-3">+</button>
                            </div>
                            <div className="space-y-1">{drugs.map(d=><div key={d.id} className="flex justify-between items-center bg-white border px-2 py-1 rounded text-xs print:border-black print:bg-transparent"><span className="font-bold w-1/3 truncate">{d.name}</span><span className="text-[#a8a099] print:text-black">{formatDate(d.startDate)} - {d.stopDate?formatDate(d.stopDate):'Ongoing'}</span><button onClick={()=>removeDrug(d.id)} className="text-[#e07060] font-bold px-2 print:hidden">×</button></div>)}</div>
                        </div>
                    </div>
                    <div className="space-y-4 bg-blue-50/30 p-4 rounded border border-blue-100 print:bg-transparent print:border-black">
                        <div className="text-xs font-bold text-blue-600 mb-2 print:text-black">DAILY SYMPTOM LOG</div>
                        <div className="flex gap-2 mb-2 print:hidden"><input type="date" className="border rounded px-2 py-1 text-sm w-full" value={currentLog.date} onChange={e=>setCurrentLog({...currentLog,date:e.target.value})}/><button onClick={addLog} className="bg-blue-600 text-white px-3 rounded text-sm">Add</button></div>
                        <select className="border rounded px-2 py-1.5 w-full text-sm mb-2 font-bold text-[#2d2926] print:hidden" value={currentLog.status} onChange={e=>setCurrentLog({...currentLog,status:e.target.value})}><option value="Stable">🟡 Stable (คงเดิม)</option><option value="Better">🟢 Better (ดีขึ้น)</option><option value="Worse">🔴 Worse (แย่ลง)</option><option value="No Symptoms">⚪ No Symptoms (ปกติ)</option></select>
                        <div className="space-y-1 max-h-32 overflow-y-auto print:max-h-none">{logs.map(l=><div key={l.id} className="flex justify-between items-center text-xs bg-white p-2 rounded border shadow-[0_1px_4px_rgba(0,0,0,0.05)] print:border-black print:bg-transparent print:shadow-none"><div className="flex items-center gap-2"><span className="font-mono">{formatDate(l.date)}</span><div className={`w-2 h-2 rounded-full ${getLogColor(l.status).split(' ')[0]} print:border print:border-black`}></div><span className="font-bold text-[#2d2926] print:text-black">{l.status}</span></div><button onClick={()=>removeLog(l.id)} className="text-slate-300 hover:text-[#e07060] print:hidden">×</button></div>)}</div>
                    </div>
                </div>
            </div>

            <ScarProdromeAssessment data={prodrome} onChange={handleProdromeChange} />
            
            {/* ✅ MOVED BUTTON - Full Width */}
            <div className="mb-6 print:hidden">
                <button onClick={performAnalysis} className="w-full bg-[#1a6b62] hover:bg-[#145a52] text-white py-3 rounded-[8px] font-[500]">
                    View Timeline & Score
                </button>
            </div>

            <div className="bg-white rounded-[10px] border border-[#ebe8e2] shadow-[0_1px_4px_rgba(0,0,0,0.05)] p-6 mb-6 print:border-black print:shadow-none break-inside-avoid">
                <div className="text-sm font-bold text-[#2d2926] border-b pb-3 mb-4 print:text-black print:border-black text-left">📝 Pharmacist Note</div>
                <textarea className="w-full h-32 border rounded p-3 text-sm focus:outline-blue-500 print:border-black print:h-auto" placeholder="Enter additional notes..." value={note} onChange={handleNoteChange}></textarea>
            </div>

            {/* RESULTS */}
            {isAnalyzed && timelineData && (
                <div className="animate-fade-in space-y-8">
                    <div className="bg-white rounded-[10px] border border-[#ebe8e2] shadow-[0_1px_4px_rgba(0,0,0,0.05)] p-6 overflow-hidden break-inside-avoid page-break-inside-avoid print:border-black print:shadow-none relative flex flex-col">
                        <div className="text-xs font-bold text-[#a8a099] uppercase mb-4 tracking-wider flex items-center gap-2 print:text-black"><span className="w-2 h-4 bg-[#fbeaf0] rounded-sm print:bg-black"></span> Timeline Visualization (Focus View)</div>
                        <div className="relative w-full pb-8 mt-8">
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

                            {/* ✅ (1) DRUG SECTION */}
                            <div className="relative z-10 border-b border-[#f4f2ee] pb-4 mb-4">
                                <div className="flex h-6 items-end pb-1">
                                    <div className="w-[150px] shrink-0 font-bold text-xs text-right pr-4 text-[#a8a099] print:text-black">DRUG</div>
                                    <div className="flex-1"></div>
                                </div>
                                
                                {/* ✅ (2) ONSET LINE: Limited to this container */}
                                {onset && (
                                    <div className="absolute top-0 bottom-0 left-[150px] right-0 pointer-events-none z-0">
                                        <div className="absolute top-[-30px] bottom-0 w-0.5 bg-red-500 border-l border-dashed border-red-500 print:border-black -translate-x-1/2" style={{left:`${timelineData.getPos(onset)}%`}}>
                                            <div className="absolute -top-6 -left-0 -translate-x-1/2 bg-[#b83232] text-white text-[9px] px-2 py-0.5 rounded shadow-[0_1px_4px_rgba(0,0,0,0.05)] font-bold whitespace-nowrap print:bg-transparent print:text-black print:border print:border-black" style={{WebkitPrintColorAdjust:'exact'}}>Onset {formatDate(onset)}</div>
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
                                                            {/* ✅ (3) CENTERED DOTS */}
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

                            {/* ✅ (4) SYMPTOM SECTION */}
                            <div className="relative z-10">
                                <div className="flex h-6 items-end pb-1">
                                    <div className="w-[150px] shrink-0 pr-4 text-right text-[10px] text-[#a8a099] print:text-black font-bold">SYMPTOMS</div>
                                    <div className="flex-1"></div>
                                </div>
                                <div className="flex items-center mt-2 h-10">
                                    <div className="w-[150px] shrink-0"></div> 
                                    <div className="flex-1 relative h-full">
                                        {logs.map((l, i) => { 
                                            let pos = timelineData.getPos(l.date); 
                                            if (pos < 0 || pos > 100) return null; 
                                            return (
                                                <div key={i} className="absolute top-1 -translate-x-1/2 flex flex-col items-center group cursor-pointer print:z-50" style={{left:`${pos}%`}}>
                                                    <div className={`w-3 h-3 rounded-full border border-white shadow-[0_1px_4px_rgba(0,0,0,0.05)] ${getLogColor(l.status)} print:border-black`} style={{WebkitPrintColorAdjust:'exact'}}></div>
                                                    <div className="hidden print:block absolute top-4 text-[8px] whitespace-nowrap font-bold">{l.status}</div>
                                                    <div className="opacity-0 group-hover:opacity-100 absolute top-4 bg-[#2d2926] text-white text-[9px] px-2 py-1 rounded whitespace-nowrap shadow-[0_4px_16px_rgba(0,0,0,0.08)] z-50 print:hidden">{formatDate(l.date)}: {l.status}</div>
                                                </div>
                                            )
                                        })}
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="flex justify-end gap-4 mt-10 text-[9px] text-[#a8a099] print:text-black font-medium border-t border-[#f4f2ee] pt-2 print:border-transparent">
                             <div className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded-full bg-green-500 border border-[#2e9e5b]" style={{WebkitPrintColorAdjust:'exact'}}></div> Better (ดีขึ้น)</div>
                             <div className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded-full bg-yellow-400 border border-yellow-500" style={{WebkitPrintColorAdjust:'exact'}}></div> Stable (คงเดิม)</div>
                             <div className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded-full bg-red-500 border border-[#b83232]" style={{WebkitPrintColorAdjust:'exact'}}></div> Worse (แย่ลง)</div>
                             <div className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded-full bg-white border-2 border-slate-400 print:border-black"></div> Normal (ปกติ)</div>
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

export default RashAssessment;