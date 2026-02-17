// src/pages/DrugFeverAssessment.jsx
import React, { useState, useEffect, useMemo } from 'react';

// --- 1. PHARMACIST NOTE COMPONENT ---
const PharmacistNoteSection = ({ note, setNote }) => (
    <div className="border border-slate-300 rounded-lg overflow-hidden bg-white print:border-black mb-6 shadow-sm">
        <div className="bg-slate-100 px-4 py-2 border-b border-slate-300 flex items-center gap-2 print:bg-slate-200 print:border-black">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            <span className="font-bold text-slate-700 text-sm">Pharmacist Note / ความเห็นเภสัชกร</span>
        </div>
        <textarea
            className="w-full p-4 text-sm text-slate-700 focus:outline-none min-h-[100px] resize-y print:text-black"
            placeholder="บันทึกความเห็นเพิ่มเติม..."
            value={note}
            onChange={(e) => setNote(e.target.value)}
        />
    </div>
);

// --- 2. SMART TIMELINE COMPONENT (Grouped & Connected) ---
const SmartVisualTimeline = ({ groupedDrugs, logs, feverOnset }) => {
    if ((!groupedDrugs.length && !logs.length)) return null;

    const allDates = new Set();
    if (feverOnset) allDates.add(new Date(feverOnset).toDateString());
    
    // Collect dates from all intervals
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

    // Fill gaps
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
    
    // Config
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
        <div className="overflow-x-auto border border-slate-200 rounded-xl bg-white shadow-sm mb-6 p-4">
            <h3 className="text-sm font-bold text-slate-700 mb-2 flex justify-between">
                <span>Timeline Analysis (Grouped & Time-based)</span>
                <div className="flex gap-4 text-xs">
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500"></span> Temp</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500"></span> Pulse</span>
                </div>
            </h3>
            <div style={{ width: '100%', minWidth: totalWidth }}>
                <svg width={totalWidth} height={chartHeight} className="font-sans text-xs">
                    
                    {/* Y-Axis Labels */}
                    <g className="text-[10px] fill-slate-400">
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

                    {/* Grid */}
                    {displayPoints.map((d, i) => {
                        const x = leftMargin + 20 + (i * pointWidth);
                        const isFever = feverOnset && new Date(feverOnset).toDateString() === d.toDateString();
                        return (
                            <g key={i}>
                                <line x1={x} y1={headerHeight} x2={x} y2={chartHeight} stroke={isFever ? "#fecaca" : "#f1f5f9"} strokeWidth={isFever?2:1} strokeDasharray={isFever?"":"4 4"} />
                                <line x1={x} y1={chartHeight} x2={x} y2={chartHeight+5} stroke="#cbd5e1" />
                                <text x={x + (pointWidth/2)} y={headerHeight - 10} textAnchor="middle" fill={isFever ? "#dc2626" : "#94a3b8"} fontWeight={isFever?"bold":"normal"}>{d.getDate()}/{d.getMonth()+1}</text>
                                {isFever && <text x={x} y={headerHeight - 22} textAnchor="middle" fill="#dc2626" fontSize="9" fontWeight="bold">FEVER</text>}
                            </g>
                        );
                    })}

                    {/* Pulse Graph (Connected Lines) */}
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

                    {/* Temp Graph (Connected Lines) */}
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

                    {/* Grouped Drugs (One row per drug name) */}
                    {groupedDrugs.map((group, i) => {
                        const y = chartHeight - footerHeight + 20 + (i * 30); 
                        return (
                            <g key={group.key}>
                                <text x={leftMargin + 10} y={y + 8} textAnchor="end" fill="#334155" fontSize="10" fontWeight="bold">{group.name}</text>
                                {group.intervals.map((inv, idx) => {
                                    const startX = getX(inv.start, false);
                                    let endX = inv.stop ? getX(inv.stop, false) : totalWidth - 20;
                                    if(endX === -1) endX = totalWidth - 20;
                                    if(startX === -1) return null;
                                    const width = Math.max(endX - startX, 10);
                                    return <rect key={idx} x={startX} y={y} width={width} height="16" rx="4" fill="#818cf8" opacity="0.8" />;
                                })}
                            </g>
                        );
                    })}
                </svg>
            </div>
        </div>
    );
};

// --- 3. DETAILED DRUG ASSESSMENT CARD (Grouped Logic) ---
const DrugAssessmentCard = ({ drugGroup, logs, feverDate, onChangeCriteria, onDelete }) => {
    
    // --- Helper to check Active Drug ---
    const isDrugActiveAt = (logDate) => {
        const logTime = new Date(logDate).getTime();
        return drugGroup.intervals.some(inv => {
            const start = new Date(inv.start).getTime();
            const stop = inv.stop ? new Date(inv.stop).getTime() : Infinity;
            return logTime >= start && logTime <= stop;
        });
    };

    // --- C1: Temporal (Earliest Start vs Fever) ---
    let c1_score = -2;
    let c1_text = "No (Start after fever or N/A)";
    const earliestStart = drugGroup.intervals.reduce((min, inv) => {
        if(!inv.start) return min;
        const d = new Date(inv.start);
        return (!min || d < min) ? d : min;
    }, null);

    if (earliestStart && feverDate) {
        const lag = Math.ceil((new Date(feverDate) - earliestStart) / 86400000);
        if (lag >= 0) { c1_score = 1; c1_text = `Yes (First start: ${earliestStart.toLocaleDateString()}, Lag: ${lag} days)`; }
    }

    // --- C2: Dechallenge (Any stop -> resolution?) ---
    let c2_score = 0;
    let c2_text = "N/A (Drug not stopped)";
    for (const inv of drugGroup.intervals) {
        if (inv.stop) {
            const stopTime = new Date(inv.stop).getTime();
            const validLogs = logs.filter(l => {
                const h = (new Date(l.date).getTime() - stopTime) / 3600000;
                return h > 0 && h <= 96;
            });
            if (validLogs.length > 0) {
                if (validLogs.some(l => parseFloat(l.temp) < 37.5)) { c2_score = 2; c2_text = "Yes (Resolved < 96h after stop)"; break; }
                else if (validLogs.every(l => parseFloat(l.temp) >= 37.5)) { c2_score = -2; c2_text = "No (Fever persisted)"; }
            } else { c2_text = "Insufficient Data (No logs after stop)"; }
        }
    }

    // --- C4: Rechallenge (Auto Negative Logic) ---
    let c4_score = drugGroup.manualC4 || 0;
    let c4_auto_override = false;
    
    // Check tolerance: Active drug + Normal Temp (after fever onset)
    const feverTime = feverDate ? new Date(feverDate).getTime() : 0;
    const toleratedLogs = logs.filter(l => 
        new Date(l.date).getTime() >= feverTime && 
        isDrugActiveAt(l.date) && 
        parseFloat(l.temp) < 37.5
    );

    if (toleratedLogs.length > 0) {
        c4_score = -2; // Negative Rechallenge (Tolerated)
        c4_auto_override = true;
    }

    const c3 = drugGroup.manualC3 || 0;
    const c5 = drugGroup.manualC5 || 0;
    const totalScore = c1_score + c2_score + c3 + c4_score + c5;
    
    let result = "Unlikely";
    let badgeColor = "bg-slate-100 text-slate-500";
    if (totalScore >= 5) { result = "Definite"; badgeColor = "bg-indigo-600 text-white"; }
    else if (totalScore >= 3) { result = "Probable"; badgeColor = "bg-indigo-100 text-indigo-700"; }
    else if (totalScore >= 1) { result = "Possible"; badgeColor = "bg-yellow-100 text-yellow-700"; }

    const handleManualChange = (field, val) => {
        drugGroup.ids.forEach(id => onChangeCriteria(id, field, val));
    };

    return (
        <div className="border border-indigo-100 rounded-b-xl rounded-tr-xl overflow-hidden bg-white shadow-sm mb-4 transition animate-fade-in p-5">
            {/* Header / Score Summary */}
            <div className="flex justify-between items-start mb-6 border-b pb-4">
                <div>
                    <h3 className="text-xl font-bold text-indigo-900 flex items-center gap-2">
                        {drugGroup.name}
                        <span className="text-base font-normal text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full ml-1">
                            (Score: {totalScore})
                        </span>
                    </h3>
                    <div className="flex flex-wrap gap-2 mt-2">
                        {drugGroup.intervals.map((inv, idx) => (
                            <span key={idx} className="text-xs text-slate-500 bg-slate-50 px-2 py-1 rounded border border-slate-200">
                                {inv.start} → {inv.stop || 'Ongoing'}
                            </span>
                        ))}
                    </div>
                </div>
                <div className={`px-4 py-2 rounded text-sm font-bold uppercase tracking-wide shadow-sm ${badgeColor} self-center`}>
                    {result}
                </div>
            </div>

            {/* Assessment Body - Larger Font */}
            <div className="space-y-4 text-left">
                {/* Q1 */}
                <div className="flex items-start gap-4 p-3 rounded bg-slate-50 border border-slate-100">
                    <div className={`mt-1 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-sm ${c1_score > 0 ? 'bg-green-500' : 'bg-red-500'}`}>1</div>
                    <div className="flex-1">
                        <div className="flex justify-between items-center mb-1">
                            <span className="text-sm font-bold text-slate-800">Temporal Relationship (Auto)</span>
                            <span className={`text-sm font-bold ${c1_score > 0 ? 'text-green-600' : 'text-red-600'}`}>{c1_score > 0 ? '+1' : '-2'}</span>
                        </div>
                        <p className="text-sm text-slate-600">ไข้เกิดขึ้นหลังจากเริ่มยา? : <span className="font-medium text-slate-800">{c1_text}</span></p>
                    </div>
                </div>

                {/* Q2 */}
                <div className="flex items-start gap-4 p-3 rounded bg-slate-50 border border-slate-100">
                    <div className={`mt-1 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-sm ${c2_score > 0 ? 'bg-green-500' : c2_score < 0 ? 'bg-red-500' : 'bg-slate-400'}`}>2</div>
                    <div className="flex-1">
                        <div className="flex justify-between items-center mb-1">
                            <span className="text-sm font-bold text-slate-800">Dechallenge (Auto)</span>
                            <span className={`text-sm font-bold ${c2_score > 0 ? 'text-green-600' : c2_score < 0 ? 'text-red-600' : 'text-slate-400'}`}>{c2_score > 0 ? '+2' : c2_score < 0 ? '-2' : '0'}</span>
                        </div>
                        <p className="text-sm text-slate-600">ไข้ลดลงภายใน 96 ชม. หลังหยุดยา? : <span className="font-medium text-slate-800">{c2_text}</span></p>
                    </div>
                </div>

                {/* Q3 */}
                <div className="flex items-start gap-4 p-3 rounded border border-slate-100 hover:bg-slate-50 transition">
                    <div className="mt-1 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-slate-500 bg-slate-200">3</div>
                    <div className="flex-1">
                        <div className="flex justify-between items-center mb-1">
                            <span className="text-sm font-bold text-slate-800">Exclusion of other causes</span>
                            <span className="text-sm font-bold text-indigo-600">{c3 > 0 ? `+${c3}` : c3}</span>
                        </div>
                        <p className="text-sm text-slate-600 mb-2">ไม่มีสาเหตุอื่นที่อธิบายไข้ได้ชัดเจน (Infection, Disease flare)?</p>
                        <div className="flex gap-4">
                            <label className="flex items-center gap-2 cursor-pointer hover:bg-white p-1 rounded"><input type="radio" name={`c3-${drugGroup.key}`} checked={c3 === 1} onChange={() => handleManualChange('manualC3', 1)} className="accent-indigo-600 w-4 h-4" /><span className="text-sm">Yes (+1)</span></label>
                            <label className="flex items-center gap-2 cursor-pointer hover:bg-white p-1 rounded"><input type="radio" name={`c3-${drugGroup.key}`} checked={c3 === 0} onChange={() => handleManualChange('manualC3', 0)} className="accent-red-500 w-4 h-4" /><span className="text-sm">No (0)</span></label>
                        </div>
                    </div>
                </div>

                {/* Q4 */}
                <div className="flex items-start gap-4 p-3 rounded border border-slate-100 hover:bg-slate-50 transition">
                    <div className="mt-1 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-slate-500 bg-slate-200">4</div>
                    <div className="flex-1">
                        <div className="flex justify-between items-center mb-1">
                            <span className="text-sm font-bold text-slate-800">Rechallenge {c4_auto_override && <span className="text-xs text-red-500 font-normal ml-2">(Auto: Negative due to tolerance)</span>}</span>
                            <span className={`text-sm font-bold ${c4_score > 0 ? 'text-green-600' : c4_score < 0 ? 'text-red-600' : 'text-slate-400'}`}>{c4_score > 0 ? `+${c4_score}` : c4_score}</span>
                        </div>
                        <p className="text-sm text-slate-600 mb-2">ได้รับยาซ้ำแล้วไข้กลับมา (Positive) หรือ ใช้ยาต่อแล้วไข้ลง (Negative)?</p>
                        {!c4_auto_override ? (
                            <div className="flex gap-4">
                                <label className="flex items-center gap-2 cursor-pointer hover:bg-white p-1 rounded"><input type="radio" name={`c4-${drugGroup.key}`} checked={c4_score === 2} onChange={() => handleManualChange('manualC4', 2)} className="accent-green-600 w-4 h-4" /><span className="text-sm font-bold text-green-700">Positive (+2)</span></label>
                                <label className="flex items-center gap-2 cursor-pointer hover:bg-white p-1 rounded"><input type="radio" name={`c4-${drugGroup.key}`} checked={c4_score === -2} onChange={() => handleManualChange('manualC4', -2)} className="accent-red-500 w-4 h-4" /><span className="text-sm font-bold text-red-700">Negative (-2)</span></label>
                                <label className="flex items-center gap-2 cursor-pointer hover:bg-white p-1 rounded"><input type="radio" name={`c4-${drugGroup.key}`} checked={c4_score === 0} onChange={() => handleManualChange('manualC4', 0)} className="accent-slate-400 w-4 h-4" /><span className="text-sm">Not Done (0)</span></label>
                            </div>
                        ) : (
                            <div className="text-sm text-red-600 italic bg-red-50 p-2 rounded border border-red-100">⚠ System detected normal temperature while drug was active. Auto-assessed as Negative (-2).</div>
                        )}
                    </div>
                </div>

                {/* Q5 */}
                <div className="flex items-start gap-4 p-3 rounded border border-slate-100 hover:bg-slate-50 transition">
                    <div className="mt-1 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-slate-500 bg-slate-200">5</div>
                    <div className="flex-1">
                        <div className="flex justify-between items-center mb-1">
                            <span className="text-sm font-bold text-slate-800">Supportive Findings</span>
                            <span className="text-sm font-bold text-indigo-600">{c5 > 0 ? `+${c5}` : c5}</span>
                        </div>
                        <p className="text-sm text-slate-600 mb-2">มี Relative Bradycardia หรือรู้สึกสบายดีแม้ไข้สูง?</p>
                        <div className="flex gap-4">
                            <label className="flex items-center gap-2 cursor-pointer hover:bg-white p-1 rounded"><input type="radio" name={`c5-${drugGroup.key}`} checked={c5 === 1} onChange={() => handleManualChange('manualC5', 1)} className="accent-indigo-600 w-4 h-4" /><span className="text-sm">Yes (+1)</span></label>
                            <label className="flex items-center gap-2 cursor-pointer hover:bg-white p-1 rounded"><input type="radio" name={`c5-${drugGroup.key}`} checked={c5 === 0} onChange={() => handleManualChange('manualC5', 0)} className="accent-red-500 w-4 h-4" /><span className="text-sm">No (0)</span></label>
                        </div>
                    </div>
                </div>

                <div className="flex justify-end pt-3 border-t mt-4">
                    <button onClick={() => drugGroup.ids.forEach(id => onDelete(id))} className="text-sm text-red-400 hover:text-red-600 font-bold flex items-center gap-1 px-2 py-1 rounded hover:bg-red-50">
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

    // Update Drug Criteria
    const updateDrugCriteria = (id, field, value) => {
        setDrugEntries(prev => prev.map(d => 
            d.id === id ? { ...d, [field]: value } : d
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
                    manualC3: d.manualC3,
                    manualC4: d.manualC4,
                    manualC5: d.manualC5
                };
            }
            groups[key].intervals.push({ start: d.startDate, stop: d.stopDate });
            groups[key].ids.push(d.id);
            // Sync scores
            if(d.manualC3 !== undefined) groups[key].manualC3 = d.manualC3;
            if(d.manualC4 !== undefined) groups[key].manualC4 = d.manualC4;
            if(d.manualC5 !== undefined) groups[key].manualC5 = d.manualC5;
        });
        return Object.values(groups);
    }, [drugEntries]);

    // Init active tab
    useEffect(() => {
        if (!activeDrugKey && groupedDrugs.length > 0) {
            setActiveDrugKey(groupedDrugs[0].key);
        }
    }, [groupedDrugs]);

    // Handlers
    const handleAddDrug = () => {
        if (!currentDrug.name || !currentDrug.startDate) return alert("ระบุชื่อยาและวันที่เริ่ม");
        const newId = Date.now();
        const newDrug = { 
            ...currentDrug, 
            id: newId,
            manualC3: 0, manualC4: 0, manualC5: 0
        };
        setDrugEntries([...drugEntries, newDrug].sort((a,b)=>new Date(a.startDate)-new Date(b.startDate)));
        setCurrentDrug({ name: '', startDate: '', stopDate: '' });
        setActiveDrugKey(currentDrug.name.toLowerCase().trim());
    };

    const handleAddLog = () => {
        if (!currentLog.date || !currentLog.temp) return alert("ระบุวันและอุณหภูมิ");
        if (!feverOnsetDate && parseFloat(currentLog.temp) >= 38.0) setFeverOnsetDate(currentLog.date.split('T')[0]);
        setDailyLogs([...dailyLogs, { ...currentLog, id: Date.now() }].sort((a,b)=>new Date(a.date)-new Date(b.date)));
        setCurrentLog({ date: '', temp: '', pulse: '', remark: '' });
    };

    const handleDeleteDrug = (id) => {
        setDrugEntries(prev => prev.filter(d => d.id !== id));
    };

    // Sync to Parent
    useEffect(() => {
        if (onAnalysisComplete) {
            onAnalysisComplete({
                rFactor: 0, // Simplified for now
                type: "Assessment",
                rankedDrugs: groupedDrugs.map(g => ({name: g.name, total: 'See Detail'})),
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
            {/* 1. INPUT PANEL */}
            <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100 print:hidden">
                <h3 className="text-sm font-bold text-indigo-800 mb-3 uppercase">1. Data Entry Panel</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-white p-3 rounded-lg border border-indigo-100">
                        <label className="text-xs font-bold text-slate-500 block mb-1">Fever Onset Date</label>
                        <input type="date" className="w-full border p-2 rounded text-sm font-bold text-indigo-700" value={feverOnsetDate} onChange={e=>setFeverOnsetDate(e.target.value)} />
                    </div>
                    <div className="bg-white p-3 rounded-lg border border-indigo-100">
                        <label className="text-xs font-bold text-slate-500 block mb-1">Add Suspected Drug</label>
                        <div className="flex gap-2">
                            <input type="text" placeholder="Name" className="w-1/3 border p-1 rounded text-xs" value={currentDrug.name} onChange={e=>setCurrentDrug({...currentDrug, name: e.target.value})} />
                            <input type="date" className="w-1/3 border p-1 rounded text-xs" value={currentDrug.startDate} onChange={e=>setCurrentDrug({...currentDrug, startDate: e.target.value})} />
                            <input type="date" placeholder="Stop" className="w-1/3 border p-1 rounded text-xs" value={currentDrug.stopDate} onChange={e=>setCurrentDrug({...currentDrug, stopDate: e.target.value})} />
                            <button onClick={handleAddDrug} className="bg-indigo-600 text-white rounded px-2 text-xs font-bold">+</button>
                        </div>
                    </div>
                </div>

                <div className="mt-2 bg-white p-3 rounded-lg border border-indigo-100">
                    <label className="text-xs font-bold text-slate-500 block mb-1">Add Clinical Log (Temp/Pulse)</label>
                    <div className="grid grid-cols-5 gap-2">
                        <input type="datetime-local" className="col-span-2 border p-1 rounded text-xs" value={currentLog.date} onChange={e=>setCurrentLog({...currentLog, date: e.target.value})} />
                        <input type="number" placeholder="Temp" step="0.1" className="border p-1 rounded text-xs" value={currentLog.temp} onChange={e=>setCurrentLog({...currentLog, temp: e.target.value})} />
                        <input type="number" placeholder="Pulse" className="border p-1 rounded text-xs" value={currentLog.pulse} onChange={e=>setCurrentLog({...currentLog, pulse: e.target.value})} />
                        <button onClick={handleAddLog} className="bg-indigo-600 text-white rounded px-2 text-xs font-bold">+ Add</button>
                    </div>
                </div>
            </div>

            {/* DATA DISPLAY (SIDE-BY-SIDE) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 print:hidden">
                
                {/* 1. Daily Logs */}
                <div className="border border-slate-200 rounded-lg overflow-hidden h-full flex flex-col">
                    <div className="bg-slate-50 px-3 py-2 border-b font-bold text-xs text-slate-600 flex justify-between items-center">
                        <span>Raw Data: Daily Logs</span>
                        <span className="text-[10px] text-slate-400">Add in Panel above</span>
                    </div>
                    <div className="flex-1 max-h-40 overflow-y-auto">
                        <table className="w-full text-xs text-left">
                            <thead className="bg-white sticky top-0"><tr><th className="p-2">Date</th><th className="p-2">T/P</th><th className="p-2">Act</th></tr></thead>
                            <tbody className="divide-y">
                                {dailyLogs.length === 0 ? (
                                    <tr><td colSpan="3" className="p-4 text-center text-slate-400 italic">No logs added.</td></tr>
                                ) : dailyLogs.map(l => (
                                    <tr key={l.id} className={l.temp>=38?'bg-red-50':''}>
                                        <td className="p-2">{new Date(l.date).toLocaleString()}</td>
                                        <td className="p-2 font-bold">{l.temp}° | <span className="text-blue-600">{l.pulse}</span></td>
                                        <td className="p-2 text-center"><button onClick={()=>setDailyLogs(dailyLogs.filter(x=>x.id!==l.id))} className="text-red-400 hover:text-red-600">×</button></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* 2. Suspected Drugs List */}
                <div className="border border-slate-200 rounded-lg overflow-hidden h-full flex flex-col">
                    <div className="bg-slate-50 px-3 py-2 border-b font-bold text-xs text-slate-600 flex justify-between items-center">
                        <span>Suspected Drugs List</span>
                        <span className="text-[10px] text-slate-400">Add in Panel above</span>
                    </div>
                    <div className="flex-1 max-h-40 overflow-y-auto">
                        <table className="w-full text-xs text-left">
                            <thead className="bg-white sticky top-0"><tr><th className="p-2">Drug Name</th><th className="p-2">Start - Stop</th><th className="p-2 text-center">Act</th></tr></thead>
                            <tbody className="divide-y">
                                {drugEntries.length === 0 ? (
                                    <tr><td colSpan="3" className="p-4 text-center text-slate-400 italic">No drugs added.</td></tr>
                                ) : drugEntries.map(d => (
                                    <tr key={d.id}>
                                        <td className="p-2 font-bold text-slate-700">{d.name}</td>
                                        <td className="p-2 text-slate-500">{d.startDate} → {d.stopDate || 'Ongoing'}</td>
                                        <td className="p-2 text-center">
                                            <button onClick={() => handleDeleteDrug(d.id)} className="text-red-400 hover:text-red-600 font-bold">×</button>
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
            <div className="flex justify-center print:hidden">
                 {!showAnalysis && <button onClick={() => setShowAnalysis(true)} className="text-indigo-600 text-xs font-bold hover:underline mb-2">Show Visual Timeline ▼</button>}
            </div>
            {showAnalysis && <div className="animate-fade-in"><SmartVisualTimeline groupedDrugs={groupedDrugs} logs={dailyLogs} feverOnset={feverOnsetDate} /></div>}

            {/* 4. INDIVIDUAL DRUG ASSESSMENT (TABBED) */}
            <div className="space-y-2">
                <div className="flex items-center justify-between border-b pb-2">
                    <h3 className="text-sm font-bold text-indigo-800 uppercase">Individual Drug Assessment Results</h3>
                </div>
                
                {groupedDrugs.length === 0 ? (
                    <div className="p-8 text-center border-2 border-dashed border-slate-200 rounded-xl text-slate-400">
                        No drugs added yet. Please add suspected drugs above.
                    </div>
                ) : (
                    <div>
                        {/* TABS */}
                        <div className="flex gap-1 overflow-x-auto pb-1 mb-0 no-scrollbar">
                            {groupedDrugs.map(g => (
                                <button
                                    key={g.key}
                                    onClick={() => setActiveDrugKey(g.key)}
                                    className={`px-4 py-2 rounded-t-lg text-xs font-bold whitespace-nowrap border-t border-l border-r transition-all
                                        ${activeDrugKey === g.key 
                                            ? 'bg-white border-indigo-200 text-indigo-700 relative top-[1px] shadow-sm z-10' 
                                            : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100'}`}
                                >
                                    {g.name}
                                </button>
                            ))}
                        </div>

                        {/* ACTIVE TAB CONTENT */}
                        {activeDrugKey && groupedDrugs.find(g => g.key === activeDrugKey) && (
                            <DrugAssessmentCard 
                                key={activeDrugKey}
                                drugGroup={groupedDrugs.find(g => g.key === activeDrugKey)}
                                logs={dailyLogs}
                                feverDate={feverOnsetDate}
                                onChangeCriteria={updateDrugCriteria}
                                onDelete={handleDeleteDrug}
                            />
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default DrugFeverAssessment;