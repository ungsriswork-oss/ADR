// src/pages/DrugFeverAssessment.jsx
import React, { useState, useEffect, useMemo } from 'react';

// --- IMPORT IMAGE ---
// ⚠️ ตรวจสอบชื่อไฟล์ในโฟลเดอร์ src/assets ว่ามี 's' หรือไม่ แล้วแก้บรรทัดนี้ให้ตรงกัน
import drugFeverCauseImg from '../assets/drug_fever_causes.png'; 

// --- 1. PHARMACIST NOTE COMPONENT ---
const PharmacistNoteSection = ({ note, setNote }) => (
    <div className="border border-[#d6d0c8] rounded-[8px] overflow-hidden bg-white print:border-black mb-6 shadow-[0_1px_4px_rgba(0,0,0,0.05)] print:break-inside-avoid">
        <div className="bg-[#f4f2ee] px-4 py-2 border-b border-[#d6d0c8] flex items-center gap-2 print:bg-[#ebe8e2] print:border-black">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-[#6b6360]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            <span className="font-bold text-[#2d2926] text-sm">Pharmacist Note / ความเห็นเภสัชกร</span>
        </div>
        <textarea
            className="w-full p-4 text-sm text-[#2d2926] focus:outline-none min-h-[100px] resize-y print:text-black"
            placeholder="บันทึกความเห็นเพิ่มเติม..."
            value={note}
            onChange={(e) => setNote(e.target.value)}
        />
    </div>
);

// --- 2. MODAL COMPONENT (COMMON CAUSES) ---
const CommonCausesModal = ({ isOpen, onClose }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 print:hidden backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-[10px] shadow-[0_4px_16px_rgba(0,0,0,0.10)] p-6 max-w-4xl w-full mx-4 relative border border-[#ebe8e2]">
                <button 
                    onClick={onClose} 
                    className="absolute top-4 right-4 text-[#a8a099] hover:text-[#6b6360] w-8 h-8 flex items-center justify-center rounded-full hover:bg-[#f4f2ee] transition"
                >
                    ✕
                </button>
                <h3 className="text-lg font-bold text-[#2d2926] mb-4 border-b pb-2">Drug Fever Common Causes</h3>
                
                <div className="overflow-auto max-h-[70vh] flex justify-center bg-[#faf9f7] rounded border border-[#f4f2ee] p-4">
                    {/* ใช้ตัวแปรที่ import มา */}
                    <img 
                        src={drugFeverCauseImg} 
                        alt="Common Causes Table" 
                        className="max-w-full h-auto object-contain"
                        onError={(e) => {
                            e.target.onerror = null; 
                            e.target.style.display = 'none'; 
                            e.target.parentNode.innerHTML = '<div class="text-center p-10 text-[#a8a099] text-sm">Image load failed.<br/>Please check filename in src/assets/</div>';
                        }}
                    />
                </div>
                
                <div className="mt-4 text-right">
                    <button onClick={onClose} className="px-4 py-2 bg-[#ebe8e2] hover:bg-slate-300 text-[#2d2926] rounded-[8px] text-sm font-bold transition">
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
};

// --- 2.5 STEP INDICATOR COMPONENT ---
const StepIndicator = ({ currentStep }) => {
  const steps = [
    { n: 1, label: 'Fever onset date' },
    { n: 2, label: 'Add suspected drugs' },
    { n: 3, label: 'View timeline & score' },
  ];
  return (
    <div className="flex items-center gap-0 mb-6 print:hidden">
      {steps.map((s, i) => (
        <React.Fragment key={s.n}>
          <div className="flex items-center gap-2">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 transition-all ${
              currentStep > s.n ? 'bg-[#2a9d8f] text-white' :
              currentStep === s.n ? 'bg-[#1a6b62] text-white' :
              'bg-[#f4f2ee] text-[#a8a099]'
            }`}>{currentStep > s.n ? '✓' : s.n}</div>
            <span className={`text-xs font-medium whitespace-nowrap ${currentStep >= s.n ? 'text-[#2d2926]' : 'text-[#a8a099]'}`}>{s.label}</span>
          </div>
          {i < steps.length - 1 && (
            <div className={`flex-1 h-px mx-3 transition-all ${currentStep > s.n ? 'bg-[#2a9d8f]' : 'bg-[#ebe8e2]'}`} />
          )}
        </React.Fragment>
      ))}
    </div>
  );
};

// --- 3. SMART TIMELINE COMPONENT ---
const SmartVisualTimeline = ({ groupedDrugs, logs, feverOnset }) => {
    if ((!groupedDrugs.length && !logs.length)) return null;

    const allDates = new Set();
    if (feverOnset) allDates.add(new Date(feverOnset).toDateString());
    
    groupedDrugs.forEach(g => {
        g.intervals.forEach(inv => {
            if(inv.start) allDates.add(new Date(inv.start).toDateString());
            if(inv.stop) allDates.add(new Date(inv.stop).toDateString());
        });
    });
    logs.forEach(l => {
        if(l.date) allDates.add(new Date(l.date).toDateString());
    });

    let sortedDates = Array.from(allDates).map(d => new Date(d)).sort((a, b) => a - b);
    if (sortedDates.length === 0) return null;

    const displayPoints = [];
    for (let i = 0; i < sortedDates.length; i++) {
        displayPoints.push(sortedDates[i]);
        if (i < sortedDates.length - 1) {
            const diff = (sortedDates[i+1] - sortedDates[i]) / 86400000;
            if (diff > 1 && diff <= 3) {
                for(let j=1; j<diff; j++) {
                    const nextDate = new Date(sortedDates[i]);
                    nextDate.setDate(nextDate.getDate() + j);
                    displayPoints.push(nextDate);
                }
            }
        }
    }
    
    const pointWidth = 80;
    const chartHeight = 450;
    const headerHeight = 40;
    const footerHeight = 120;
    const leftMargin = 90; 
    const graphHeight = chartHeight - headerHeight - footerHeight;
    const totalWidth = Math.max(700, displayPoints.length * pointWidth + leftMargin + 50);
    
    const getX = (dateStr, isTimeSensitive = false) => {
        const dObj = new Date(dateStr);
        const dStr = dObj.toDateString();
        const idx = displayPoints.findIndex(p => p.toDateString() === dStr);
        if (idx === -1) return -1;
        
        const baseX = leftMargin + 20 + (idx * pointWidth);
        let offset = 0;
        
        if (isTimeSensitive) {
            const h = dObj.getHours();
            const m = dObj.getMinutes();
            offset = ((h + m/60) / 24) * pointWidth;
        }
        return baseX + offset;
    };

    const getTempY = (val) => {
        const min = 36, max = 41;
        const norm = (val - min) / (max - min);
        return headerHeight + graphHeight - (Math.max(0, Math.min(1, norm)) * graphHeight);
    };
    const getPulseY = (val) => {
        const min = 60, max = 140;
        const norm = (val - min) / (max - min);
        return headerHeight + graphHeight - (Math.max(0, Math.min(1, norm)) * graphHeight);
    };

    return (
        <div className="overflow-x-auto border border-[#ebe8e2] rounded-[10px] bg-white shadow-[0_1px_4px_rgba(0,0,0,0.05)] mb-6 p-4 print:border-none print:shadow-none print:p-0">
            <h3 className="text-sm font-bold text-[#2d2926] mb-2 flex justify-between print:text-black">
                <span>Timeline Analysis (Time-based Plot)</span>
                <div className="flex gap-4 text-xs">
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500 print:bg-[#b83232]"></span> Temp</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500 print:bg-blue-600"></span> Pulse</span>
                </div>
            </h3>
            <div style={{ width: '100%', minWidth: totalWidth }}>
                <svg width={totalWidth} height={chartHeight} className="font-[Inter,system-ui,sans-serif] text-xs">
                    <g className="text-[10px] fill-slate-400 print:fill-black">
                         {[36, 37, 38, 39, 40, 41].map(t => (
                            <text key={`ty-${t}`} x={leftMargin - 10} y={getTempY(t) + 4} textAnchor="end" fill="#ef4444" fontWeight="bold">{t}°</text>
                        ))}
                        {[60, 80, 100, 120, 140].map(p => (
                            <text key={`py-${p}`} x={leftMargin - 45} y={getPulseY(p) + 4} textAnchor="end" fill="#3b82f6">{p}</text>
                        ))}
                        <text x={leftMargin-5} y={headerHeight - 15} textAnchor="end" fontWeight="bold" fill="#ef4444">Temp</text>
                        <text x={leftMargin-45} y={headerHeight - 15} textAnchor="end" fontWeight="bold" fill="#3b82f6">Pulse</text>
                        <line x1={leftMargin} y1={headerHeight} x2={leftMargin} y2={chartHeight} stroke="#e2e8f0" strokeWidth="1" />
                    </g>

                    {displayPoints.map((d, i) => {
                        const x = leftMargin + 20 + (i * pointWidth);
                        return (
                            <g key={i}>
                                <line x1={x} y1={headerHeight} x2={x} y2={chartHeight} stroke="#f1f5f9" strokeWidth="1" strokeDasharray="4 4" className="print:stroke-slate-300" />
                                <line x1={x} y1={chartHeight} x2={x} y2={chartHeight+5} stroke="#cbd5e1" />
                                <text x={x + (pointWidth/2)} y={headerHeight - 10} textAnchor="middle" fill="#94a3b8" fontWeight="normal" className="print:fill-black">{d.getDate()}/{d.getMonth()+1}</text>
                            </g>
                        );
                    })}

                    {(() => {
                        if (!feverOnset) return null;
                        const x = getX(feverOnset, true);
                        if (x === -1) return null;
                        return (
                            <g>
                                <line x1={x} y1={headerHeight} x2={x} y2={chartHeight} stroke="#f87171" strokeWidth="2" strokeDasharray="5 3" />
                                <text x={x} y={headerHeight - 22} textAnchor="middle" fill="#dc2626" fontSize="9" fontWeight="bold">FEVER</text>
                            </g>
                        );
                    })()}

                    <path d={(() => {
                        const sorted = [...logs].filter(l=>l.pulse).sort((a,b)=>new Date(a.date)-new Date(b.date));
                        let d = ""; let first = true;
                        sorted.forEach((l) => { 
                            const x = getX(l.date, true); 
                            if(x !== -1) { d += `${first ? 'M' : 'L'} ${x} ${getPulseY(l.pulse)} `; first = false; }
                        });
                        return d;
                    })()} fill="none" stroke="#3b82f6" strokeWidth="2" opacity="0.6" />
                    {logs.filter(l=>l.pulse).map((l,i) => {
                        const x = getX(l.date, true); if(x===-1) return null; const y = getPulseY(l.pulse);
                        return <g key={`p-${i}`}><circle cx={x} cy={y} r="3" fill="white" stroke="#3b82f6" strokeWidth="2" /><text x={x} y={y-6} textAnchor="middle" fill="#3b82f6" fontSize="8" fontWeight="bold">{l.pulse}</text></g>;
                    })}

                    <path d={(() => {
                        const sorted = [...logs].filter(l=>l.temp).sort((a,b)=>new Date(a.date)-new Date(b.date));
                        let d = ""; let first = true;
                        sorted.forEach((l) => { 
                            const x = getX(l.date, true); 
                            if(x !== -1) { d += `${first ? 'M' : 'L'} ${x} ${getTempY(l.temp)} `; first = false; }
                        });
                        return d;
                    })()} fill="none" stroke="#ef4444" strokeWidth="2" />
                    {logs.filter(l=>l.temp).map((l,i) => {
                        const x = getX(l.date, true); if(x===-1) return null; const y = getTempY(l.temp);
                        return <g key={`t-${i}`}><circle cx={x} cy={y} r="3" fill="white" stroke="#ef4444" strokeWidth="2" /><text x={x} y={y-8} textAnchor="middle" fill="#ef4444" fontSize="9" fontWeight="bold">{l.temp}</text></g>;
                    })}

                    {groupedDrugs.map((group, i) => {
                        const y = chartHeight - footerHeight + 20 + (i * 30); 
                        return (
                            <g key={group.key}>
                                <text x={leftMargin + 10} y={y + 8} textAnchor="end" fill="#334155" fontSize="10" fontWeight="bold" className="print:fill-black">{group.name}</text>
                                {group.intervals.map((inv, idx) => {
                                    const startX = getX(inv.start, false);
                                    let endX = inv.stop ? getX(inv.stop, false) : totalWidth - 20;
                                    if(endX === -1) endX = totalWidth - 20;
                                    if(startX === -1) return null;
                                    const width = Math.max(endX - startX, 10);
                                    return <rect key={idx} x={startX} y={y} width={width} height="16" rx="4" fill="#818cf8" opacity="0.8" className="print:fill-indigo-400 print:opacity-100" />;
                                })}
                            </g>
                        );
                    })}
                </svg>
            </div>
        </div>
    );
};

// --- 4. DETAILED DRUG ASSESSMENT CARD ---
const DrugAssessmentCard = ({ drugGroup, logs, feverDate, onChangeCriteria, onDelete }) => {
    
    // Auto Calculation Logic
    const isDrugActiveAt = (logDate) => {
        const logTime = new Date(logDate).getTime();
        return drugGroup.intervals.some(inv => {
            const start = new Date(inv.start).getTime();
            const stop = inv.stop ? new Date(inv.stop).getTime() : Infinity;
            return logTime >= start && logTime <= stop;
        });
    };

    // C1
    let autoC1 = -2;
    const earliestStart = drugGroup.intervals.reduce((min, inv) => {
        if(!inv.start) return min;
        const d = new Date(inv.start);
        return (!min || d < min) ? d : min;
    }, null);
    if (earliestStart && feverDate) {
        const fDate = new Date(feverDate); const sDate = new Date(earliestStart);
        fDate.setHours(0,0,0,0); sDate.setHours(0,0,0,0);
        const lag = Math.ceil((fDate - sDate) / 86400000);
        if (lag >= 0) autoC1 = 1;
    }

    // C2
    let autoC2 = 0; 
    for (const inv of drugGroup.intervals) {
        if (inv.stop) {
            const stopTime = new Date(inv.stop).getTime();
            const validLogs = logs.filter(l => {
                const h = (new Date(l.date).getTime() - stopTime) / 3600000;
                return h > 0 && h <= 96;
            });
            if (validLogs.length > 0) {
                if (validLogs.some(l => parseFloat(l.temp) < 37.5)) { autoC2 = 2; break; }
                else if (validLogs.every(l => parseFloat(l.temp) >= 37.5)) { autoC2 = -2; }
            }
        }
    }

    // C4
    let autoC4 = 0;
    let c4_auto_triggered = false;
    const feverTime = feverDate ? new Date(feverDate).getTime() : 0;
    const toleratedLogs = logs.filter(l => 
        new Date(l.date).getTime() >= feverTime && 
        isDrugActiveAt(l.date) && 
        parseFloat(l.temp) < 37.5
    );
    if (toleratedLogs.length > 0) { autoC4 = -2; c4_auto_triggered = true; }

    const c1 = drugGroup.manualC1 !== undefined ? drugGroup.manualC1 : autoC1;
    const c2 = drugGroup.manualC2 !== undefined ? drugGroup.manualC2 : autoC2;
    const c3 = drugGroup.manualC3 || 0;
    const c4 = drugGroup.manualC4 !== undefined ? drugGroup.manualC4 : autoC4;
    const c5 = drugGroup.manualC5 || 0;

    const totalScore = c1 + c2 + c3 + c4 + c5;
    
    let result = "Unlikely";
    let badgeColor = "bg-[#f4f2ee] text-[#a8a099] print:border print:border-slate-400";
    if (totalScore >= 5) { result = "Definite"; badgeColor = "bg-[#2a9d8f] text-white print:text-black print:bg-transparent print:border-black"; }
    else if (totalScore >= 3) { result = "Probable"; badgeColor = "bg-indigo-100 text-[#4a3ab8] print:text-black print:bg-transparent"; }
    else if (totalScore >= 1) { result = "Possible"; badgeColor = "bg-yellow-100 text-yellow-700 print:text-black print:bg-transparent"; }

    const handleManualChange = (field, val) => {
        onChangeCriteria(drugGroup.ids, field, val);
    };

    return (
        <div className="border border-[#cec8f6] rounded-b-xl rounded-tr-xl overflow-hidden bg-white shadow-[0_1px_4px_rgba(0,0,0,0.05)] mb-4 transition animate-fade-in p-5 print:shadow-none print:border print:border-slate-400 print:rounded-[10px] print:mb-8 print:break-inside-avoid">
            <div className="flex justify-between items-start mb-6 border-b pb-4">
                <div>
                    <h3 className="text-xl font-bold text-indigo-900 flex items-center gap-2 print:text-black">
                        {drugGroup.name}
                        <span className="text-base font-normal text-[#a8a099] bg-[#f4f2ee] px-2 py-0.5 rounded-full ml-1 print:bg-transparent print:border print:border-[#d6d0c8] print:text-black">
                            (Score: {totalScore})
                        </span>
                    </h3>
                    <div className="flex flex-wrap gap-2 mt-2">
                        {drugGroup.intervals.map((inv, idx) => (
                            <span key={idx} className="text-xs text-[#a8a099] bg-[#f4f2ee] px-2 py-1 rounded border border-[#ebe8e2] print:border-slate-400 print:text-black">
                                {inv.start} → {inv.stop || 'Ongoing'}
                            </span>
                        ))}
                    </div>
                </div>
                <div className={`px-4 py-2 rounded text-sm font-bold uppercase tracking-wide shadow-[0_1px_4px_rgba(0,0,0,0.05)] ${badgeColor} self-center`}>
                    {result}
                </div>
            </div>

            <div className="space-y-4 text-left">
                <div className="flex items-start gap-4 p-3 rounded border border-[#f4f2ee] hover:bg-[#faf9f7] transition print:bg-white print:border-[#d6d0c8]">
                    <div className={`mt-1 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${c1 > 0 ? 'bg-green-500 text-white' : 'bg-red-500 text-white'} print:text-black print:bg-transparent print:border print:border-black`}>1</div>
                    <div className="flex-1">
                        <div className="flex justify-between items-center mb-1">
                            <span className="text-sm font-bold text-[#2d2926]">Temporal Relationship</span>
                            <span className={`text-sm font-bold ${c1 > 0 ? 'text-green-600 print:text-black' : 'text-[#b83232] print:text-black'}`}>{c1 > 0 ? '+1' : '-2'}</span>
                        </div>
                        <p className="text-sm text-[#6b6360] mb-2 print:text-black">ไข้เกิดขึ้นหลังจากเริ่มยา?</p>
                        <div className="flex gap-4 print:hidden">
                            <label className="flex items-center gap-2 cursor-pointer hover:bg-white p-1 rounded"><input type="radio" checked={c1 === 1} onChange={() => handleManualChange('manualC1', 1)} className="accent-green-600 w-4 h-4" /><span className="text-sm">Yes (+1)</span></label>
                            <label className="flex items-center gap-2 cursor-pointer hover:bg-white p-1 rounded"><input type="radio" checked={c1 === -2} onChange={() => handleManualChange('manualC1', -2)} className="accent-red-500 w-4 h-4" /><span className="text-sm">No (-2)</span></label>
                        </div>
                        <div className="hidden print:block text-sm font-bold">Answer: {c1 === 1 ? 'Yes (+1)' : 'No (-2)'}</div>
                    </div>
                </div>

                <div className="flex items-start gap-4 p-3 rounded border border-[#f4f2ee] hover:bg-[#faf9f7] transition print:bg-white print:border-[#d6d0c8]">
                    <div className={`mt-1 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${c2 > 0 ? 'bg-green-500 text-white' : c2 < 0 ? 'bg-red-500 text-white' : 'bg-slate-400 text-white'} print:text-black print:bg-transparent print:border print:border-black`}>2</div>
                    <div className="flex-1">
                        <div className="flex justify-between items-center mb-1">
                            <span className="text-sm font-bold text-[#2d2926]">Dechallenge</span>
                            <span className={`text-sm font-bold ${c2 > 0 ? 'text-green-600 print:text-black' : c2 < 0 ? 'text-[#b83232] print:text-black' : 'text-[#a8a099] print:text-black'}`}>{c2 > 0 ? '+2' : c2 < 0 ? '-2' : '0'}</span>
                        </div>
                        <p className="text-sm text-[#6b6360] mb-2 print:text-black">ไข้ลดลงภายใน 96 ชม. หลังหยุดยา?</p>
                        <div className="flex gap-4 print:hidden">
                            <label className="flex items-center gap-2 cursor-pointer hover:bg-white p-1 rounded"><input type="radio" checked={c2 === 2} onChange={() => handleManualChange('manualC2', 2)} className="accent-green-600 w-4 h-4" /><span className="text-sm">Yes (+2)</span></label>
                            <label className="flex items-center gap-2 cursor-pointer hover:bg-white p-1 rounded"><input type="radio" checked={c2 === -2} onChange={() => handleManualChange('manualC2', -2)} className="accent-red-500 w-4 h-4" /><span className="text-sm">No (-2)</span></label>
                            <label className="flex items-center gap-2 cursor-pointer hover:bg-white p-1 rounded"><input type="radio" checked={c2 === 0} onChange={() => handleManualChange('manualC2', 0)} className="accent-slate-400 w-4 h-4" /><span className="text-sm">N/A (0)</span></label>
                        </div>
                        <div className="hidden print:block text-sm font-bold">Answer: {c2 === 2 ? 'Yes (+2)' : c2 === -2 ? 'No (-2)' : 'N/A (0)'}</div>
                    </div>
                </div>

                <div className="flex items-start gap-4 p-3 rounded border border-[#f4f2ee] hover:bg-[#faf9f7] transition print:bg-white print:border-[#d6d0c8]">
                    <div className="mt-1 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-[#a8a099] bg-[#ebe8e2] print:text-black print:bg-transparent print:border print:border-black">3</div>
                    <div className="flex-1">
                        <div className="flex justify-between items-center mb-1">
                            <span className="text-sm font-bold text-[#2d2926]">Exclusion of other causes</span>
                            <span className="text-sm font-bold text-[#4a3ab8] print:text-black">{c3 > 0 ? `+${c3}` : c3}</span>
                        </div>
                        <p className="text-sm text-[#6b6360] mb-2 print:text-black">ไม่มีสาเหตุอื่นที่อธิบายไข้ได้ชัดเจน (Infection, Disease flare)?</p>
                        <div className="flex gap-4 print:hidden">
                            <label className="flex items-center gap-2 cursor-pointer hover:bg-white p-1 rounded"><input type="radio" checked={c3 === 1} onChange={() => handleManualChange('manualC3', 1)} className="accent-indigo-600 w-4 h-4" /><span className="text-sm">Yes (+1)</span></label>
                            <label className="flex items-center gap-2 cursor-pointer hover:bg-white p-1 rounded"><input type="radio" checked={c3 === 0} onChange={() => handleManualChange('manualC3', 0)} className="accent-red-500 w-4 h-4" /><span className="text-sm">No (0)</span></label>
                        </div>
                        <div className="hidden print:block text-sm font-bold">Answer: {c3 === 1 ? 'Yes (+1)' : 'No (0)'}</div>
                    </div>
                </div>

                <div className="flex items-start gap-4 p-3 rounded border border-[#f4f2ee] hover:bg-[#faf9f7] transition print:bg-white print:border-[#d6d0c8]">
                    <div className="mt-1 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-[#a8a099] bg-[#ebe8e2] print:text-black print:bg-transparent print:border print:border-black">4</div>
                    <div className="flex-1">
                        <div className="flex justify-between items-center mb-1">
                            <span className="text-sm font-bold text-[#2d2926]">Rechallenge {c4_auto_triggered && <span className="text-xs text-[#e07060] font-normal ml-2">(Auto: Negative due to tolerance)</span>}</span>
                            <span className={`text-sm font-bold ${c4 > 0 ? 'text-green-600 print:text-black' : c4 < 0 ? 'text-[#b83232] print:text-black' : 'text-[#a8a099] print:text-black'}`}>{c4 > 0 ? `+${c4}` : c4}</span>
                        </div>
                        <p className="text-sm text-[#6b6360] mb-2 print:text-black">ได้รับยาซ้ำแล้วไข้กลับมา (Positive) หรือ ใช้ยาต่อแล้วไข้ลง (Negative)?</p>
                        <div className="flex gap-4 print:hidden">
                            <label className="flex items-center gap-2 cursor-pointer hover:bg-white p-1 rounded"><input type="radio" checked={c4 === 2} onChange={() => handleManualChange('manualC4', 2)} className="accent-green-600 w-4 h-4" /><span className="text-sm">Positive (+2)</span></label>
                            <label className="flex items-center gap-2 cursor-pointer hover:bg-white p-1 rounded"><input type="radio" checked={c4 === -2} onChange={() => handleManualChange('manualC4', -2)} className="accent-red-500 w-4 h-4" /><span className="text-sm">Negative (-2)</span></label>
                            <label className="flex items-center gap-2 cursor-pointer hover:bg-white p-1 rounded"><input type="radio" checked={c4 === 0} onChange={() => handleManualChange('manualC4', 0)} className="accent-slate-400 w-4 h-4" /><span className="text-sm">Not Done (0)</span></label>
                        </div>
                        <div className="hidden print:block text-sm font-bold">Answer: {c4 === 2 ? 'Positive (+2)' : c4 === -2 ? 'Negative (-2)' : 'Not Done (0)'}</div>
                    </div>
                </div>

                <div className="flex items-start gap-4 p-3 rounded border border-[#f4f2ee] hover:bg-[#faf9f7] transition print:bg-white print:border-[#d6d0c8]">
                    <div className="mt-1 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-[#a8a099] bg-[#ebe8e2] print:text-black print:bg-transparent print:border print:border-black">5</div>
                    <div className="flex-1">
                        <div className="flex justify-between items-center mb-1">
                            <span className="text-sm font-bold text-[#2d2926]">Supportive Findings</span>
                            <span className="text-sm font-bold text-[#4a3ab8] print:text-black">{c5 > 0 ? `+${c5}` : c5}</span>
                        </div>
                        <p className="text-sm text-[#6b6360] mb-2 print:text-black">มี Relative Bradycardia หรือรู้สึกสบายดีแม้ไข้สูง?</p>
                        <div className="flex gap-4 print:hidden">
                            <label className="flex items-center gap-2 cursor-pointer hover:bg-white p-1 rounded"><input type="radio" checked={c5 === 1} onChange={() => handleManualChange('manualC5', 1)} className="accent-indigo-600 w-4 h-4" /><span className="text-sm">Yes (+1)</span></label>
                            <label className="flex items-center gap-2 cursor-pointer hover:bg-white p-1 rounded"><input type="radio" checked={c5 === 0} onChange={() => handleManualChange('manualC5', 0)} className="accent-red-500 w-4 h-4" /><span className="text-sm">No (0)</span></label>
                        </div>
                        <div className="hidden print:block text-sm font-bold">Answer: {c5 === 1 ? 'Yes (+1)' : 'No (0)'}</div>
                    </div>
                </div>

                <div className="flex justify-end pt-3 border-t mt-4 print:hidden">
                    <button onClick={() => drugGroup.ids.forEach(id => onDelete(id))} className="text-sm text-red-400 hover:text-[#b83232] font-bold flex items-center gap-1 px-2 py-1 rounded hover:bg-red-50">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                        Remove Drug Group
                    </button>
                </div>
            </div>
        </div>
    );
};

// --- MAIN COMPONENT ---
const DrugFeverAssessment = ({ onAnalysisComplete, initialData }) => {
    // State
    const [feverOnsetDate, setFeverOnsetDate] = useState('');
    const [drugEntries, setDrugEntries] = useState([]);
    const [dailyLogs, setDailyLogs] = useState([]);
    const [activeDrugKey, setActiveDrugKey] = useState(null); 
    const [showCausesModal, setShowCausesModal] = useState(false); 
    
    // Inputs
    const [currentDrug, setCurrentDrug] = useState({ name: '', startDate: '', stopDate: '' });
    const [currentLog, setCurrentLog] = useState({ date: '', temp: '', pulse: '', remark: '' });
    const [pharmacistNote, setPharmacistNote] = useState('');
    const [showAnalysis, setShowAnalysis] = useState(false);

    // --- Load Data ---
    useEffect(() => {
        if (initialData?.savedData) {
            const saved = initialData.savedData;
            if (saved.drugEntries) setDrugEntries(saved.drugEntries);
            if (saved.dailyLogs) setDailyLogs(saved.dailyLogs);
            if (saved.feverOnsetDate) setFeverOnsetDate(saved.feverOnsetDate);
            if (saved.pharmacistNote) setPharmacistNote(saved.pharmacistNote);
            if (saved.drugEntries?.length || saved.dailyLogs?.length) setShowAnalysis(true);
        }
    }, [initialData]);

    const updateDrugGroupCriteria = (ids, field, value) => {
        setDrugEntries(prev => prev.map(d => 
            ids.includes(d.id) ? { ...d, [field]: value } : d
        ));
    };

    // --- GROUPING LOGIC ---
    const groupedDrugs = useMemo(() => {
        const groups = {};
        drugEntries.forEach(d => {
            const key = d.name.toLowerCase().trim();
            if (!groups[key]) {
                groups[key] = {
                    key: key,
                    name: d.name, 
                    intervals: [],
                    ids: [],
                    manualC1: d.manualC1,
                    manualC2: d.manualC2,
                    manualC3: d.manualC3,
                    manualC4: d.manualC4,
                    manualC5: d.manualC5
                };
            }
            groups[key].intervals.push({ start: d.startDate, stop: d.stopDate });
            groups[key].ids.push(d.id);
            if(d.manualC1 !== undefined) groups[key].manualC1 = d.manualC1;
            if(d.manualC2 !== undefined) groups[key].manualC2 = d.manualC2;
            if(d.manualC3 !== undefined) groups[key].manualC3 = d.manualC3;
            if(d.manualC4 !== undefined) groups[key].manualC4 = d.manualC4;
            if(d.manualC5 !== undefined) groups[key].manualC5 = d.manualC5;
        });
        return Object.values(groups);
    }, [drugEntries]);

    useEffect(() => {
        if (!activeDrugKey && groupedDrugs.length > 0) {
            setActiveDrugKey(groupedDrugs[0].key);
        }
    }, [groupedDrugs]);

    // --- PARENT SCORING LOGIC ---
    const calculateScoreForGroup = (group) => {
        const isDrugActiveAt = (logDate) => {
            const logTime = new Date(logDate).getTime();
            return group.intervals.some(inv => {
                const start = new Date(inv.start).getTime();
                const stop = inv.stop ? new Date(inv.stop).getTime() : Infinity;
                return logTime >= start && logTime <= stop;
            });
        };

        let autoC1 = -2;
        const earliestStart = group.intervals.reduce((min, inv) => {
            if(!inv.start) return min;
            const d = new Date(inv.start);
            return (!min || d < min) ? d : min;
        }, null);
        if (earliestStart && feverOnsetDate) {
            const fDate = new Date(feverOnsetDate); const sDate = new Date(earliestStart);
            fDate.setHours(0,0,0,0); sDate.setHours(0,0,0,0);
            const lag = Math.ceil((fDate - sDate) / 86400000);
            if (lag >= 0) autoC1 = 1;
        }

        let autoC2 = 0; 
        for (const inv of group.intervals) {
            if (inv.stop) {
                const stopTime = new Date(inv.stop).getTime();
                const validLogs = dailyLogs.filter(l => {
                    const h = (new Date(l.date).getTime() - stopTime) / 3600000;
                    return h > 0 && h <= 96;
                });
                if (validLogs.length > 0) {
                    if (validLogs.some(l => parseFloat(l.temp) < 37.5)) { autoC2 = 2; break; }
                    else if (validLogs.every(l => parseFloat(l.temp) >= 37.5)) { autoC2 = -2; }
                }
            }
        }

        let autoC4 = 0;
        const feverTime = feverOnsetDate ? new Date(feverOnsetDate).getTime() : 0;
        const toleratedLogs = dailyLogs.filter(l => 
            new Date(l.date).getTime() >= feverTime && 
            isDrugActiveAt(l.date) && 
            parseFloat(l.temp) < 37.5
        );
        if (toleratedLogs.length > 0) { autoC4 = -2; }

        const c1 = group.manualC1 !== undefined ? group.manualC1 : autoC1;
        const c2 = group.manualC2 !== undefined ? group.manualC2 : autoC2;
        const c3 = group.manualC3 || 0;
        const c4 = group.manualC4 !== undefined ? group.manualC4 : autoC4;
        const c5 = group.manualC5 || 0;

        return c1 + c2 + c3 + c4 + c5;
    };

    const handleAddDrug = () => {
        if (!currentDrug.name || !currentDrug.startDate) return alert("ระบุชื่อยาและวันที่เริ่ม");
        const newId = Date.now();
        const newDrug = { ...currentDrug, id: newId };
        setDrugEntries([...drugEntries, newDrug].sort((a,b)=>new Date(a.startDate)-new Date(b.startDate)));
        setCurrentDrug({ name: '', startDate: '', stopDate: '' });
        setActiveDrugKey(currentDrug.name.toLowerCase().trim());
        setShowAnalysis(true); 
    };

    const handleAddLog = () => {
        if (!currentLog.date || !currentLog.temp) return alert("ระบุวันและอุณหภูมิ");
        setDailyLogs([...dailyLogs, { ...currentLog, id: Date.now() }].sort((a,b)=>new Date(a.date)-new Date(b.date)));
        setCurrentLog({ date: '', temp: '', pulse: '', remark: '' });
        setShowAnalysis(true); 
    };

    const handleDeleteDrug = (id) => {
        setDrugEntries(prev => prev.filter(d => d.id !== id));
    };

    useEffect(() => {
        if (onAnalysisComplete) {
            const rankedDrugs = groupedDrugs.map(g => ({
                name: g.name,
                total: calculateScoreForGroup(g)
            })).sort((a, b) => b.total - a.total);

            onAnalysisComplete({
                rFactor: rankedDrugs.length > 0 ? rankedDrugs[0].total : 0, 
                type: "Assessment",
                rankedDrugs: rankedDrugs,
                drugEntries,
                dailyLogs,
                feverOnsetDate,
                pharmacistNote,
                answers: {}
            });
        }
    }, [drugEntries, dailyLogs, feverOnsetDate, pharmacistNote]);

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Step Indicator */}
            <StepIndicator currentStep={!feverOnsetDate ? 1 : drugEntries.length === 0 ? 2 : 3} />
            {/* 1. INPUT PANEL */}
            <div className="bg-[#f0eeff] p-4 rounded-[10px] border border-[#cec8f6] print:hidden">
                <h3 className="text-sm font-bold text-indigo-800 mb-3 uppercase">1. Data Entry Panel</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-white p-3 rounded-[8px] border border-[#cec8f6]">
                        <label className="text-xs font-bold text-[#a8a099] block mb-2">Add Suspected Drug</label>
                        <div className="flex gap-2 items-end">
                            <div className="flex-1">
                                <label className="text-[10px] text-[#a8a099] block mb-1">Drug name</label>
                                <input type="text" placeholder="Name" className="w-full border p-1 rounded text-xs" value={currentDrug.name} onChange={e=>setCurrentDrug({...currentDrug, name: e.target.value})} />
                            </div>
                            <div className="flex-1">
                                <label className="text-[10px] text-[#a8a099] block mb-1">Start date</label>
                                <input type="date" className="w-full border p-1 rounded text-xs" value={currentDrug.startDate} onChange={e=>setCurrentDrug({...currentDrug, startDate: e.target.value})} />
                            </div>
                            <div className="flex-1">
                                <label className="text-[10px] text-[#a8a099] block mb-1">Stop date</label>
                                <input type="date" placeholder="Stop" className="w-full border p-1 rounded text-xs" value={currentDrug.stopDate} onChange={e=>setCurrentDrug({...currentDrug, stopDate: e.target.value})} />
                            </div>
                            <button onClick={handleAddDrug} className="bg-white text-[#2a9d8f] border border-[#b2ddd7] rounded-[6px] px-3 py-1.5 text-xs font-[500] mb-[1px] hover:bg-[#e6f4f1]">+</button>
                        </div>
                    </div>
                    <div className="bg-white p-3 rounded-[8px] border border-[#cec8f6]">
                        <label className="text-xs font-bold text-[#a8a099] block mb-2">Fever Onset (Time Specific)</label>
                        <div className="flex flex-col gap-2">
                            <label className="text-[10px] text-[#a8a099]">Select Date & Time:</label>
                            <input type="datetime-local" className="w-full border p-1.5 rounded text-sm font-bold text-[#4a3ab8]" value={feverOnsetDate} onChange={e=>setFeverOnsetDate(e.target.value)} />
                        </div>
                    </div>
                </div>

                <div className="mt-2 bg-white p-3 rounded-[8px] border border-[#cec8f6]">
                    <label className="text-xs font-bold text-[#a8a099] block mb-1">Add Clinical Log (Temp/Pulse)</label>
                    <div className="grid grid-cols-5 gap-2">
                        <input type="datetime-local" className="col-span-2 border p-1 rounded text-xs" value={currentLog.date} onChange={e=>setCurrentLog({...currentLog, date: e.target.value})} />
                        <input type="number" placeholder="Temp" step="0.1" className="border p-1 rounded text-xs" value={currentLog.temp} onChange={e=>setCurrentLog({...currentLog, temp: e.target.value})} />
                        <input type="number" placeholder="Pulse" className="border p-1 rounded text-xs" value={currentLog.pulse} onChange={e=>setCurrentLog({...currentLog, pulse: e.target.value})} />
                        <button onClick={handleAddLog} className="bg-[#2a9d8f] text-white rounded px-2 text-xs font-bold">+ Add</button>
                    </div>
                </div>
            </div>

            {/* DATA DISPLAY */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 print:hidden">
                <div className="border border-[#ebe8e2] rounded-[8px] overflow-hidden h-full flex flex-col">
                    <div className="bg-[#faf9f7] px-3 py-2 border-b font-bold text-xs text-[#6b6360] flex justify-between items-center">
                        <span>Raw Data: Daily Logs</span>
                        <span className="text-[10px] text-[#a8a099]">Add in Panel above</span>
                    </div>
                    <div className="flex-1 max-h-40 overflow-y-auto">
                        <table className="w-full text-xs text-left">
                            <thead className="bg-white sticky top-0"><tr><th className="p-2">Date</th><th className="p-2">T/P</th><th className="p-2">Act</th></tr></thead>
                            <tbody className="divide-y">
                                {dailyLogs.length === 0 ? (
                                    <tr><td colSpan="3" className="p-4 text-center text-[#a8a099] italic">No logs added.</td></tr>
                                ) : dailyLogs.map(l => (
                                    <tr key={l.id} className={l.temp>=38?'bg-red-50':''}>
                                        <td className="p-2">{new Date(l.date).toLocaleString()}</td>
                                        <td className="p-2 font-bold">{l.temp}° | <span className="text-blue-600">{l.pulse}</span></td>
                                        <td className="p-2 text-center"><button onClick={()=>setDailyLogs(dailyLogs.filter(x=>x.id!==l.id))} className="text-red-400 hover:text-[#b83232]">×</button></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="border border-[#ebe8e2] rounded-[8px] overflow-hidden h-full flex flex-col">
                    <div className="bg-[#faf9f7] px-3 py-2 border-b font-bold text-xs text-[#6b6360] flex justify-between items-center">
                        <span>Suspected Drugs List</span>
                        <span className="text-[10px] text-[#a8a099]">Add in Panel above</span>
                    </div>
                    <div className="flex-1 max-h-40 overflow-y-auto">
                        <table className="w-full text-xs text-left">
                            <thead className="bg-white sticky top-0"><tr><th className="p-2">Drug Name</th><th className="p-2">Start - Stop</th><th className="p-2 text-center">Act</th></tr></thead>
                            <tbody className="divide-y">
                                {drugEntries.length === 0 ? (
                                    <tr><td colSpan="3" className="p-4 text-center text-[#a8a099] italic">No drugs added.</td></tr>
                                ) : drugEntries.map(d => (
                                    <tr key={d.id}>
                                        <td className="p-2 font-bold text-[#2d2926]">{d.name}</td>
                                        <td className="p-2 text-[#a8a099]">{d.startDate} → {d.stopDate || 'Ongoing'}</td>
                                        <td className="p-2 text-center">
                                            <button onClick={() => handleDeleteDrug(d.id)} className="text-red-400 hover:text-[#b83232] font-bold">×</button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* 2. PHARMACIST NOTE */}
            <PharmacistNoteSection note={pharmacistNote} setNote={setPharmacistNote} />

            {/* 3. TIMELINE */}
            <div className="print:break-after-page print:landscape">
                <div className="flex justify-center print:hidden">
                     {!showAnalysis && <button onClick={() => setShowAnalysis(true)} className="text-[#4a3ab8] text-xs font-bold hover:underline mb-2">Show Visual Timeline ▼</button>}
                </div>
                {showAnalysis && <div className="animate-fade-in"><SmartVisualTimeline groupedDrugs={groupedDrugs} logs={dailyLogs} feverOnset={feverOnsetDate} /></div>}
            </div>

            {/* 4. INDIVIDUAL DRUG ASSESSMENT */}
            <div className="space-y-2">
                <div className="flex items-center justify-between border-b pb-2">
                    <h3 className="text-sm font-bold text-indigo-800 uppercase">Individual Drug Assessment Results</h3>
                    
                    <button 
                        onClick={() => setShowCausesModal(true)} 
                        className="text-[10px] bg-[#f4f2ee] hover:bg-[#ebe8e2] text-[#6b6360] px-2 py-1 rounded border border-[#ebe8e2] print:hidden flex items-center gap-1"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        Show Common Causes
                    </button>
                </div>
                
                {groupedDrugs.length === 0 ? (
                    <div className="p-8 text-center border-2 border-dashed border-[#ebe8e2] rounded-[10px] text-[#a8a099]">
                        No drugs added yet. Please add suspected drugs above.
                    </div>
                ) : (
                    <>
                        <div className="print:hidden">
                            <div className="flex gap-1 overflow-x-auto pb-1 mb-0 no-scrollbar">
                                {groupedDrugs.map(g => (
                                    <button
                                        key={g.key}
                                        onClick={() => setActiveDrugKey(g.key)}
                                        className={`px-4 py-2 rounded-t-lg text-xs font-bold whitespace-nowrap border-t border-l border-r transition-all
                                            ${activeDrugKey === g.key 
                                                ? 'bg-white border-indigo-200 text-[#4a3ab8] relative top-[1px] shadow-[0_1px_4px_rgba(0,0,0,0.05)] z-10' 
                                                : 'bg-[#faf9f7] border-[#ebe8e2] text-[#a8a099] hover:bg-[#f4f2ee]'}`}
                                    >
                                        {g.name}
                                    </button>
                                ))}
                            </div>
                            {activeDrugKey && groupedDrugs.find(g => g.key === activeDrugKey) && (
                                <DrugAssessmentCard 
                                    key={activeDrugKey}
                                    drugGroup={groupedDrugs.find(g => g.key === activeDrugKey)}
                                    logs={dailyLogs}
                                    feverDate={feverOnsetDate}
                                    onChangeCriteria={updateDrugGroupCriteria}
                                    onDelete={handleDeleteDrug}
                                />
                            )}
                        </div>

                        <div className="hidden print:block">
                            {groupedDrugs.map(g => (
                                <div key={g.key} className="print:break-after-page">
                                    <DrugAssessmentCard 
                                        drugGroup={g}
                                        logs={dailyLogs}
                                        feverDate={feverOnsetDate}
                                        onChangeCriteria={updateDrugGroupCriteria}
                                        onDelete={handleDeleteDrug}
                                    />
                                </div>
                            ))}
                        </div>
                    </>
                )}
            </div>

            <CommonCausesModal isOpen={showCausesModal} onClose={() => setShowCausesModal(false)} />
        </div>
    );
};

export default DrugFeverAssessment;