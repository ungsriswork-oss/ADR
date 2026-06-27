import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  Activity,
  AlertTriangle,
  Pill,
  Droplet,
  Trash2,
  Scale,
  Zap,
  Info,
  X
} from 'lucide-react';

// ✅ IMPORT รูปภาพจาก folder assets (ตรวจสอบชื่อไฟล์ให้ตรงกับที่มีใน src/assets)
import agepAlgoImg from '../assets/agep_algo.png'; 

// --- 1. TIMELINE COMPONENT (FIXED PRINT LINES) ---
const AgepTimeline = ({ drugs, labs, onsetDate }) => {
  const safeDrugs = Array.isArray(drugs) ? drugs : [];
  const safeLabs = Array.isArray(labs) ? labs : [];
  const LABEL_WIDTH_CLASS = "w-[140px]";

  const timelineData = useMemo(() => {
    let pivot = onsetDate ? new Date(onsetDate).getTime() : new Date().getTime();
    const DAY = 86400000;
    let minT = pivot - (21 * DAY);
    let maxT = pivot + (7 * DAY);

    const keyDates = [
        ...safeLabs.map(l => new Date(l.date).getTime()),
        ...safeDrugs.filter(d => d.endDate).map(d => new Date(d.endDate).getTime()), 
        ...safeDrugs.map(d => new Date(d.startDate).getTime()).filter(t => t > pivot - (60 * DAY))
    ];

    if (keyDates.length > 0) {
        const minKey = Math.min(...keyDates);
        const maxKey = Math.max(...keyDates);
        if (minKey < minT) minT = minKey - (2 * DAY);
        if (maxKey > maxT) maxT = maxKey + (2 * DAY);
    }

    const timeSpan = maxT - minT || 1;
    let gridPoints = [];
    const daysSpan = timeSpan / DAY;
    const step = daysSpan > 45 ? 5 : (daysSpan > 20 ? 2 : 1);
    const startGrid = Math.ceil(minT / DAY) * DAY;
    for (let t = startGrid; t <= maxT; t += step * DAY) {
        gridPoints.push(t);
    }

    return {
      minTime: minT, maxTime: maxT, timeSpan, gridPoints,
      getPos: (dateStr) => {
        if (!dateStr) return -999;
        const t = new Date(dateStr).getTime();
        return ((t - minT) / timeSpan) * 100;
      },
    };
  }, [safeDrugs, safeLabs, onsetDate]);

  if (safeDrugs.length === 0 && safeLabs.length === 0) 
      return <div className="h-24 flex items-center justify-center text-[#a8a099] border-dashed border-2 rounded-lg bg-[#faf9f7]">Add data to generate timeline</div>;

  return (
    // ✅ เพิ่ม print:print-color-adjust-exact เพื่อบังคับให้ Browser พิมพ์สีพื้นหลังและเส้น
    <div className="bg-white p-6 rounded-[10px] shadow-[0_1px_4px_rgba(0,0,0,0.05)] border border-[#ebe8e2] mb-8 print:border-0 print:shadow-none print:print-color-adjust-exact">
      <div className="flex items-center gap-2 mb-6 border-b border-[#b2ddd7] pb-3 print:border-slate-400">
        <Activity className="text-[#2a9d8f] print:text-black" size={24} />
        <h3 className="font-bold text-[#1a6b62] text-xl print:text-black">Clinical Timeline</h3>
      </div>

      <div className="relative w-full pb-8">
        
        {/* --- GRID LAYER (Fixed for Print Visibility) --- */}
        <div className={`absolute inset-0 pl-[140px] pointer-events-none`}>
            {/* ✅ เปลี่ยน border-[#ebe8e2] เป็น print:border-slate-400 เพื่อให้เส้นเข้มขึ้นตอนพิมพ์ */}
            <div className="relative w-full h-full border-l border-[#ebe8e2] print:border-slate-400">
                {timelineData.gridPoints.map((t, i) => {
                    const pct = ((t - timelineData.minTime) / timelineData.timeSpan) * 100;
                    if (pct < 0 || pct > 100) return null;
                    return (
                        <div key={i} className="absolute top-0 bottom-0 border-l border-[#f4f2ee] print:border-[#d6d0c8]" style={{ left: `${pct}%` }}>
                            <div className="absolute -bottom-6 -translate-x-1/2 text-[10px] text-[#a8a099] whitespace-nowrap print:text-black">
                                {new Date(t).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                            </div>
                        </div>
                    )
                })}
            </div>
        </div>

        {/* --- CONTENT LAYER --- */}
        <div className="relative z-10 space-y-4">
            
            {/* ONSET LINE */}
            {onsetDate && (
                <div className={`absolute top-0 bottom-[-10px] left-[140px] right-0 pointer-events-none z-0`}>
                    {/* ✅ เพิ่ม print:border-[#b83232] print:border-l-2 ให้เส้น Onset ชัดเจน */}
                    <div className="absolute top-[-20px] bottom-0 w-0.5 bg-red-500 border-l border-dashed border-red-500 opacity-70 print:opacity-100 print:border-[#b83232] print:border-l-2" 
                         style={{ left: `${timelineData.getPos(onsetDate)}%` }}>
                        <div className="bg-[#b83232] text-white text-[9px] px-2 py-0.5 rounded absolute -top-5 left-1/2 -translate-x-1/2 font-bold shadow-[0_1px_4px_rgba(0,0,0,0.05)] whitespace-nowrap z-50 print:text-[#b83232] print:bg-white print:border print:border-[#b83232]">
                            ONSET
                        </div>
                    </div>
                </div>
            )}

            {/* 1. HEADER ROW */}
            <div className="flex h-6 items-end pb-1 border-b border-[#f4f2ee] print:border-slate-400">
                <div className={`${LABEL_WIDTH_CLASS} shrink-0 font-bold text-xs text-right pr-6 text-[#a8a099] print:text-black`}>DRUG</div>
                <div className="flex-1"></div>
            </div>

            {/* 2. DRUGS ROWS */}
            <div className="space-y-2">
                {Object.entries(safeDrugs.reduce((acc, d) => ({...acc, [d.name]: [...(acc[d.name]||[]), d]}), {})).map(([name, segs], i) => (
                    <div key={i} className="flex h-8 items-center group hover:bg-[#faf9f7] rounded relative z-10">
                        <div className={`${LABEL_WIDTH_CLASS} shrink-0 pr-6 text-right text-xs font-bold text-[#2d2926] truncate print:text-black`} title={name}>
                            {name}
                        </div>
                        
                        <div className="flex-1 relative h-full">
                            {segs.map((s, idx) => {
                                const startPct = timelineData.getPos(s.startDate);
                                const endPct = s.endDate ? timelineData.getPos(s.endDate) : 100;
                                const displayStart = Math.max(0, startPct);
                                const displayEnd = Math.min(100, endPct);
                                if (displayStart >= 100 || displayEnd <= 0) return null;
                                const width = Math.max(displayEnd - displayStart, 0.5);
                                const isLongTerm = startPct < 0;

                                return (
                                    <React.Fragment key={idx}>
                                        {/* ✅ ปรับสีแท่งยาตอนพิมพ์ (print:bg-slate-600) */}
                                        <div className={`absolute h-1.5 top-[13px] bg-slate-400 opacity-70 group-hover:bg-[#e6f4f1]0 transition-colors
                                            ${isLongTerm ? 'rounded-r-full' : 'rounded-full'} print:bg-slate-600 print:opacity-100
                                        `} style={{ left: `${displayStart}%`, width: `${width}%` }}></div>

                                        {!isLongTerm && (
                                            <div className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-[#faf9f7]0 border-2 border-white shadow-[0_1px_4px_rgba(0,0,0,0.05)] group-hover:bg-[#2a9d8f] z-10 print:bg-black print:border-black" 
                                                 style={{ left: `${displayStart}%`, transform: 'translate(-50%, -50%)' }}></div>
                                        )}

                                        {s.endDate && (
                                            <div className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-[#faf9f7]0 border-2 border-white shadow-[0_1px_4px_rgba(0,0,0,0.05)] group-hover:bg-[#2a9d8f] z-10 print:bg-black print:border-black" 
                                                 style={{ left: `${displayEnd}%`, transform: 'translate(-50%, -50%)' }}></div>
                                        )}
                                    </React.Fragment>
                                )
                            })}
                        </div>
                    </div>
                ))}
            </div>

            {/* 3. LABS ROW */}
            <div className="pt-4">
                <div className="flex h-6 items-end pb-1 border-b border-[#f4f2ee] mb-2 print:border-slate-400">
                    <div className={`${LABEL_WIDTH_CLASS} shrink-0 font-bold text-xs text-right pr-6 text-[#a8a099] print:text-black`}>LAB DATA</div>
                    <div className="flex-1"></div>
                </div>
                
                <div className="flex h-12 items-center relative z-10">
                    <div className={`${LABEL_WIDTH_CLASS} shrink-0 pr-6 text-right text-[10px] text-[#a8a099] print:text-black`}>
                        <div>Temp / WBC / Neu</div>
                    </div>
                    <div className="flex-1 relative h-full">
                        {safeLabs.map((l, i) => {
                            const pos = timelineData.getPos(l.date);
                            if (pos < 0 || pos > 100) return null;
                            return (
                                <div key={i} className="absolute top-1/2 -translate-y-1/2 flex flex-col items-center group" style={{ left: `${pos}%`, transform: 'translateX(-50%)' }}>
                                    <div className="w-2.5 h-2.5 rounded-full bg-slate-400 border border-white shadow-[0_1px_4px_rgba(0,0,0,0.05)] group-hover:bg-[#2a9d8f] transition-colors print:bg-black print:border-black"></div>
                                    <div className="absolute top-4 bg-white/90 border border-[#ebe8e2] shadow-[0_1px_4px_rgba(0,0,0,0.05)] p-1.5 rounded text-[9px] leading-tight whitespace-nowrap text-center z-20 print:border-slate-400 print:bg-white">
                                        {l.temp && <div className={`${parseFloat(l.temp)>=38 ? 'text-[#b83232] font-bold' : 'text-[#6b6360]'} print:text-black`}>T: {l.temp}</div>}
                                        {l.wbc && <div className="text-[#1a6b62] font-bold print:text-black">W: {l.wbc}</div>}
                                        {l.neutrophil && <div className="text-emerald-600 font-bold print:text-black">N: {l.neutrophil}%</div>}
                                    </div>
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

/* --- 2. DRUG ANALYSIS (UPDATED LOGIC & WARNING) --- */
const AgepDrugAnalysis = ({ drugs, onsetDate, onMoreInfo }) => {
  const safeDrugs = Array.isArray(drugs) ? drugs : [];
  
  // ✅ รายชื่อยาที่มี Latency ยาวนาน (อ้างอิง AGEP 2026.pdf) 
  const PROLONGED_DRUGS = [
    'hydroxychloroquine', 'hcq', 'chloroquine', 
    'ipilimumab', 'nivolumab', 'pembrolizumab', 'atezolizumab', 
    'imatinib', 'icotinib', 'erlotinib', 'vemurafenib', 'gefitinib',
    'pfizer', 'moderna', 'vaccine', 'bnt162b2', 'mrna-1273', 'astrazeneca'
  ];

  const isProlongedDrug = (name) => {
      const n = name.toLowerCase();
      return PROLONGED_DRUGS.some(d => n.includes(d));
  };

  if (safeDrugs.length === 0) return null;

  return (
    <div className="bg-white p-6 rounded-[10px] shadow-[0_1px_4px_rgba(0,0,0,0.05)] border border-[#ebe8e2] mb-8 print:border-[#d6d0c8]">
       <div className="flex items-center gap-3 mb-6 border-b border-[#b2ddd7] pb-3 print:border-slate-400">
          <AlertTriangle className="text-[#2a9d8f] print:text-black" size={24} />
          <h3 className="font-bold text-[#2d2926] text-xl print:text-black">Latency Analysis</h3>
          <button 
              onClick={onMoreInfo}
              className="ml-auto flex items-center gap-1.5 text-xs font-bold text-[#2a9d8f] hover:text-[#1a6b62] bg-[#e6f4f1] hover:bg-[#e6f4f1] px-3 py-1.5 rounded-full transition-colors print:hidden"
          >
              <Info size={16} /> More Info
          </button>
       </div>
       <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Object.entries(safeDrugs.reduce((acc,d)=>({...acc, [d.name]: d}), {})).map(([name, drug], i) => {
             let risk = 'Unknown'; 
             let style = 'bg-[#faf9f7] text-[#6b6360]';
             
             if (onsetDate && drug.startDate) {
                 const diff = Math.ceil((new Date(onsetDate) - new Date(drug.startDate))/(86400000));
                 
                 // Standard AGEP Logic
                 if (diff >= 0 && diff <= 4) { 
                     risk = 'Very High (Antibiotics)'; 
                     style = 'bg-[#e6f4f1] text-[#0f4d48] border-teal-300 border font-bold'; 
                 }
                 else if (diff > 4 && diff <= 10) { 
                     risk = 'High (≤10 days)'; 
                     style = 'bg-[#e6f4f1] text-[#1a6b62] border-[#b2ddd7] border'; 
                 }
                 // ✅ Logic ใหม่: 11-30 วัน + เป็น Prolonged Drug = High [cite: 200, 243]
                 else if (diff > 10 && diff <= 30 && isProlongedDrug(name)) {
                     risk = 'High (Prolonged Latency)';
                     style = 'bg-[#e6f4f1] text-[#1a6b62] border-[#b2ddd7] border font-bold';
                 }
                 // ถ้าเกิน 30 วัน = Low (แม้จะเป็น Prolonged ก็ตาม ตามที่คุณขอ)
                 else if (diff > 10) { 
                     risk = 'Low (>10 days)'; 
                     style = 'bg-[#faf9f7] text-[#6b6360] border-[#ebe8e2] border'; 
                 }
                 else {
                     risk = 'Started After Onset';
                 }
             }
             return (
                 <div key={i} className={`p-4 rounded-lg flex justify-between items-center ${style} print:border-[#d6d0c8] print:bg-white print:text-black`}>
                     <div>
                        <div className="font-bold text-base">{name}</div>
                        <div className="text-xs opacity-90 mt-1">Start: {drug.startDate} {drug.endDate ? ` ➝ End: ${drug.endDate}` : ''}</div>
                     </div>
                     <div className="text-right"><div className="text-sm font-bold uppercase tracking-wide">{risk}</div></div>
                 </div>
             )
          })}
       </div>
       
       {/* ✅ คำเตือนสีแดง + ไอคอนตกใจ */}
       <div className="mt-4 pt-3 border-t border-[#f4f2ee] text-xs text-[#b83232] font-bold italic flex items-center gap-2 print:border-[#d6d0c8]">
           <AlertTriangle size={16} className="text-[#b83232]" />
           <span>คำเตือน: เป็นเพียงการประเมินเบื้องต้น มียาหลายชนิดที่มี Onset มากกว่า 10 วัน (เช่น Hydroxychloroquine, Targeted Therapies)</span>
       </div>
    </div>
  );
};

/* --- 3. MAIN COMPONENT --- */
const AgepAssessment = (props) => {
  const drugs = props.drugList || [];
  const setDrugs = props.setDrugList || (() => {});
  const labs = props.labEntries || [];
  const setLabs = props.setLabEntries || (() => {});
  const onsetDate = props.symptomDate || '';
  const setOnsetDate = props.setSymptomDate || (() => {});

  const [analyzed, setAnalyzed] = useState(false);
  const [bmi, setBmi] = useState('');
  const [showInfo, setShowInfo] = useState(false);
  
  const [clinical, setClinical] = useState({ 
      typicalPustules: false, 
      noMucosalInvolvement: false,
      acuteOnset: false, 
      isObese: false 
  });
  
  const [newLab, setNewLab] = useState({ date: '', temp: '', wbc: '', neutrophil: '' });
  const [newDrug, setNewDrug] = useState({ name: '', startDate: '', endDate: '' });
  const resultsRef = useRef(null);

  useEffect(() => { setClinical(p => ({ ...p, isObese: parseFloat(bmi) >= 30 })); }, [bmi]);
  useEffect(() => {
     if (onsetDate && drugs.length > 0) {
         const isAcute = drugs.some(d => {
             const diff = (new Date(onsetDate) - new Date(d.startDate)) / 86400000;
             return diff >= 0 && diff <= 10;
         });
         if (isAcute) setClinical(p => ({ ...p, acuteOnset: true }));
     }
  }, [drugs, onsetDate]);

  const score = useMemo(() => {
      let s = 0;
      if (clinical.typicalPustules) s++;
      if (clinical.noMucosalInvolvement) s++;
      if (clinical.acuteOnset) s++;
      if (clinical.isObese) s++;
      
      let interp = 'Unlikely';
      if (s === 4) interp = 'Very likely case';
      else if (s === 3) interp = 'Probable case';
      else if (s === 2) interp = 'Possible case';
      else if (s === 1) interp = 'Very improbable';
      else interp = 'No AGEP';
      
      return { total: s, interpretation: interp };
  }, [clinical]);

  const handleAnalyze = () => {
      setAnalyzed(true);
      if (props.onAnalysisComplete) {
          props.onAnalysisComplete({ type: 'Optimized AGEP 2025', score: score.total, interpretation: score.interpretation, rawData: { drugs, labs, onsetDate, clinical } });
      }
      setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-fade-in font-[Inter,system-ui,sans-serif]">
        {/* INPUT SECTION */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 print:hidden">
            {/* Drugs & Onset */}
            <div className="bg-white p-6 rounded-[10px] shadow-[0_1px_4px_rgba(0,0,0,0.05)] border border-[#ebe8e2]">
                <h3 className="font-bold text-[#1a6b62] mb-4 flex items-center gap-2 text-lg"><Pill size={24}/> Drugs & Onset</h3>
                <div className="mb-6">
                    <label className="text-xs font-bold text-[#a8a099] mb-1 block">ONSET DATE</label>
                    <input type="date" className="w-full border-2 border-[#ebe8e2] rounded-lg p-3 text-base font-bold text-[#1a6b62] focus:border-[#2a9d8f] focus:ring-teal-200" value={onsetDate} onChange={e => setOnsetDate(e.target.value)} />
                </div>
                <div className="flex flex-col gap-3 mb-4 bg-[#e6f4f1] p-4 rounded-[10px] border border-[#b2ddd7]">
                    <div><label className="text-xs text-[#a8a099] font-bold block mb-1">DRUG NAME</label><input className="w-full border border-[#d6d0c8] rounded-lg p-2.5 text-base" placeholder="Enter Drug Name..." value={newDrug.name} onChange={e => setNewDrug({...newDrug, name: e.target.value})} /></div>
                    <div className="flex gap-3">
                        <div className="flex-1"><label className="text-xs text-[#a8a099] font-bold block mb-1">START DATE</label><input type="date" className="w-full border border-[#d6d0c8] rounded-lg p-2.5 text-base" value={newDrug.startDate} onChange={e => setNewDrug({...newDrug, startDate: e.target.value})} /></div>
                        <div className="flex-1"><label className="text-xs text-[#a8a099] font-bold block mb-1">END DATE (Optional)</label><input type="date" className="w-full border border-[#d6d0c8] rounded-lg p-2.5 text-base" value={newDrug.endDate} onChange={e => setNewDrug({...newDrug, endDate: e.target.value})} /></div>
                    </div>
                    <button onClick={() => { if(newDrug.name && newDrug.startDate) { setDrugs([...drugs, {...newDrug, id: Date.now()}]); setNewDrug({name:'', startDate:'', endDate: ''}); } }} className="bg-[#2a9d8f] text-white py-3 rounded-lg text-base font-bold shadow-[0_1px_4px_rgba(0,0,0,0.05)] hover:bg-[#1a6b62] mt-2 w-full">+ Add Drug</button>
                </div>
                <div className="max-h-[300px] overflow-y-auto bg-white p-1 rounded space-y-2">
                    {drugs.length === 0 && <div className="text-center text-slate-300 py-6 italic">No drugs added yet</div>}
                    {drugs.map(d => (
                        <div key={d.id} className="flex justify-between border border-[#f4f2ee] p-3 rounded-lg items-center bg-[#faf9f7]">
                            <div><span className="font-bold block text-[#2d2926] text-base">{d.name}</span><span className="text-sm text-[#a8a099]">{d.startDate} {d.endDate ? `➝ ${d.endDate}` : '(Ongoing)'}</span></div>
                            <button onClick={() => setDrugs(drugs.filter(x => x.id !== d.id))} className="text-[#a8a099] hover:text-[#e07060] p-2"><Trash2 size={18}/></button>
                        </div>
                    ))}
                </div>
            </div>

            {/* Labs */}
            <div className="bg-white p-6 rounded-[10px] shadow-[0_1px_4px_rgba(0,0,0,0.05)] border border-[#ebe8e2]">
                <h3 className="font-bold text-[#1a6b62] mb-4 flex items-center gap-2 text-lg"><Droplet size={24}/> Labs (WBC/Neutro)</h3>
                <div className="bg-[#e6f4f1] p-4 rounded-[10px] border border-[#b2ddd7] mb-4">
                    <div className="flex gap-3 mb-3 items-end">
                        <div className="w-32"><label className="text-xs text-[#a8a099] font-bold block mb-1">DATE</label><input type="date" className="w-full border border-[#d6d0c8] rounded-lg p-2 text-sm" value={newLab.date} onChange={e => setNewLab({...newLab, date: e.target.value})} /></div>
                        <div className="flex-1 grid grid-cols-3 gap-2">
                            <div><label className="text-xs text-[#a8a099] font-bold block mb-1">TEMP</label><input type="number" className="w-full border border-[#d6d0c8] rounded-lg p-2 text-sm" placeholder="°C" value={newLab.temp} onChange={e => setNewLab({...newLab, temp: e.target.value})} /></div>
                            <div><label className="text-xs text-[#a8a099] font-bold block mb-1">WBC</label><input type="number" className="w-full border border-[#d6d0c8] rounded-lg p-2 text-sm" placeholder="x10³" value={newLab.wbc} onChange={e => setNewLab({...newLab, wbc: e.target.value})} /></div>
                            <div><label className="text-xs text-[#a8a099] font-bold block mb-1">NEU%</label><input type="number" className="w-full border border-[#d6d0c8] rounded-lg p-2 text-sm" placeholder="%" value={newLab.neutrophil} onChange={e => setNewLab({...newLab, neutrophil: e.target.value})} /></div>
                        </div>
                    </div>
                    <button onClick={() => { if(newLab.date) { setLabs([...labs, {...newLab, id: Date.now()}].sort((a,b)=>new Date(a.date)-new Date(b.date))); setNewLab({date:'', temp:'', wbc:'', neutrophil:''}); } }} className="bg-[#2a9d8f] text-white py-2.5 w-full rounded-lg text-base font-bold shadow-[0_1px_4px_rgba(0,0,0,0.05)] hover:bg-[#1a6b62]">+ Add Lab Entry</button>
                </div>
                <div className="max-h-[300px] overflow-y-auto bg-white p-1 rounded space-y-2">
                    {labs.length === 0 && <div className="text-center text-slate-300 py-6 italic">No labs added yet</div>}
                    {labs.map(l => <div key={l.id} className="flex justify-between border border-[#f4f2ee] p-3 rounded-lg items-center bg-[#faf9f7] text-base"><span><span className="font-mono text-[#a8a099] font-bold mr-2">{l.date}:</span> T{l.temp} W{l.wbc} N{l.neutrophil}</span> <button onClick={() => setLabs(labs.filter(x => x.id !== l.id))} className="text-[#a8a099] hover:text-[#e07060] p-2"><Trash2 size={18}/></button></div>)}
                </div>
            </div>
        </div>

        {/* CRITERIA CHECKLIST */}
        <div className="bg-white p-8 rounded-[10px] shadow-[0_1px_4px_rgba(0,0,0,0.05)] border border-[#ebe8e2] print:border-[#d6d0c8] print:p-4 print:mb-4 break-inside-avoid">
            <h3 className="font-bold text-[#1a6b62] mb-6 border-b border-[#b2ddd7] pb-3 text-xl print:text-black print:border-slate-400">Optimized AGEP Criteria (2025)</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 print:gap-4">
                <div className="space-y-4">
                    <label className="flex items-center gap-4 p-4 border border-[#ebe8e2] rounded-[10px] hover:bg-[#e6f4f1] cursor-pointer transition-colors bg-[#faf9f7]/50 print:bg-white print:border-slate-400 print:p-2">
                        <input type="checkbox" className="accent-[#2a9d8f] w-6 h-6 print:w-4 print:h-4" checked={clinical.typicalPustules} onChange={e => setClinical({...clinical, typicalPustules: e.target.checked})} />
                        <div><div className="font-bold text-lg text-[#2d2926] print:text-black print:text-sm">Typical Pustules (+1)</div><div className="text-sm text-[#a8a099] print:text-[#2d2926] print:text-xs">Non-follicular, &lt;5mm, numerous</div></div>
                    </label>
                    <div className="p-4 border border-[#ebe8e2] rounded-[10px] bg-[#faf9f7] flex items-center justify-between print:bg-white print:border-slate-400 print:p-2">
                        <div className="flex items-center gap-3 text-[#2d2926] print:text-black"><Scale size={24} className="print:w-5 print:h-5"/><span className="font-bold text-lg print:text-sm">BMI ≥ 30 (+1)</span></div>
                        <input type="number" placeholder="Enter BMI" className="w-28 border-2 border-[#d6d0c8] rounded-lg p-2 text-lg text-center focus:border-[#2a9d8f] font-bold print:border-slate-400 print:text-sm print:w-20 print:p-1" value={bmi} onChange={e => setBmi(e.target.value)} />
                    </div>
                </div>
                <div className="space-y-4">
                    <label className="flex items-center gap-4 p-4 border border-[#ebe8e2] rounded-[10px] hover:bg-[#e6f4f1] cursor-pointer transition-colors bg-[#faf9f7]/50 print:bg-white print:border-slate-400 print:p-2">
                        <input type="checkbox" className="accent-[#2a9d8f] w-6 h-6 print:w-4 print:h-4" checked={clinical.acuteOnset} onChange={e => setClinical({...clinical, acuteOnset: e.target.checked})} />
                        <div><div className="font-bold text-lg text-[#2d2926] print:text-black print:text-sm">Acute Onset (+1)</div><div className="text-sm text-[#a8a099] print:text-[#2d2926] print:text-xs">≤ 10 days latency from drug start</div></div>
                    </label>
                    <label className="flex items-center gap-4 p-4 border border-[#ebe8e2] rounded-[10px] hover:bg-[#e6f4f1] cursor-pointer transition-colors bg-[#faf9f7]/50 print:bg-white print:border-slate-400 print:p-2">
                        <input type="checkbox" className="accent-[#2a9d8f] w-6 h-6 print:w-4 print:h-4" checked={clinical.noMucosalInvolvement} onChange={e => setClinical({...clinical, noMucosalInvolvement: e.target.checked})} />
                        <div><div className="font-bold text-lg text-[#2d2926] print:text-black print:text-sm">No Mucosal Involvement (+1)</div><div className="text-sm text-[#2a9d8f] font-bold print:text-[#1a6b62] print:text-xs">Check if mucosa is SPARED (Not affected)</div></div>
                    </label>
                </div>
            </div>
        </div>

        {/* ANALYZE BUTTON */}
        <button onClick={handleAnalyze} className="w-full bg-from-[#2a9d8f] to-[#2a9d8f] text-white font-bold py-4 rounded-[10px] shadow-[0_4px_16px_rgba(0,0,0,0.08)] hover:scale-[1.01] transition-transform flex items-center justify-center gap-3 text-xl print:hidden">
            <Zap size={28} /> Analyze Score
        </button>

        {analyzed && (
            <div ref={resultsRef} className="space-y-8">
                {/* Result Card */}
                <div className="bg-white border-2 border-[#b2ddd7] p-8 rounded-[10px] text-center shadow-[0_4px_16px_rgba(0,0,0,0.08)] print:shadow-none print:border-[#d6d0c8] print:p-4 break-inside-avoid">
                    <div className="text-sm font-bold text-[#a8a099] uppercase tracking-widest mb-3 print:mb-1 print:text-black">Final Diagnosis Score</div>
                    <div className="text-7xl font-black text-[#1a6b62] print:text-black print:text-5xl">{score.total} <span className="text-3xl text-slate-300 font-normal print:text-[#a8a099]">/ 4</span></div>
                    <div className="inline-block px-6 py-2 bg-[#e6f4f1] text-[#0f4d48] rounded-full font-bold mt-4 text-lg border border-[#b2ddd7] print:bg-white print:border-slate-400 print:text-black print:text-sm print:mt-2">{score.interpretation}</div>
                </div>

                {/* Timeline - Force Page Break */}
                <div className="print:break-before-page">
                    <AgepTimeline drugs={drugs} labs={labs} onsetDate={onsetDate} />
                </div>
                
                {/* Drug Analysis - Force Page Break */}
                <div className="print:break-before-page">
                    <AgepDrugAnalysis drugs={drugs} onsetDate={onsetDate} onMoreInfo={() => setShowInfo(true)} />
                </div>
            </div>
        )}

        {/* Modal Popup */}
        {showInfo && (
            <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 print:hidden" onClick={() => setShowInfo(false)}>
                <div className="bg-white rounded-[14px] shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-auto relative animate-fade-in-up" onClick={e => e.stopPropagation()}>
                    <button onClick={() => setShowInfo(false)} className="absolute top-4 right-4 p-2 bg-[#f4f2ee] hover:bg-[#ebe8e2] rounded-full text-[#6b6360] transition-colors z-10"><X size={24} /></button>
                    <div className="p-8">
                        <h3 className="font-bold text-2xl mb-6 text-[#1a6b62] flex items-center gap-2 border-b pb-4"><Activity className="text-[#2a9d8f]" /> AGEP Diagnostic Algorithm</h3>
                        <div className="bg-[#faf9f7] border border-[#ebe8e2] rounded-[10px] p-2 flex items-center justify-center min-h-[300px]">
                            {/* ✅ แสดงรูปภาพที่ Import มา */}
                            <img 
                                src={agepAlgoImg} 
                                alt="AGEP Diagnostic Algorithm" 
                                className="max-w-full h-auto rounded shadow-[0_1px_4px_rgba(0,0,0,0.05)]"
                            />
                        </div>
                        <div className="mt-6 text-[#a8a099] text-sm border-t pt-4">
                            <p className="font-bold mb-1">Reference:</p>
                            <p>Optimizing the EuroSCAR criteria for acute generalized exanthematous pustulosis: A streamlined diagnostic model (JAAD 2025)</p>
                        </div>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};

export default AgepAssessment;