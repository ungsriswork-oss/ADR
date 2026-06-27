import React, { useState, useEffect } from 'react';
import { 
  Calendar, 
  Activity, 
  AlertCircle, 
  CheckCircle, 
  PlayCircle, 
  StopCircle, 
  RefreshCw,
  Plus,
  Trash2
} from 'lucide-react';

// --- 1. CONFIGURATION: SAMS-CI Criteria ---
const samsCriteria = {
    distribution: {
        3: "Symmetric, hip flexors or thighs",
        2: "Symmetric, calves",
        2.1: "Symmetric, upper proximal extremities", 
        1: "Not specific to any area, asymmetric or intermittent"
    },
    onset: {
        3: "< 4 weeks",
        2: "4-12 weeks", 
        1: "> 12 weeks"
    },
    dechallenge: {
        2: "Improvement < 2 weeks",
        1: "Improvement 2-4 weeks",
        0: "No improvement > 4 weeks"
    },
    rechallenge: {
        3: "Recurrence < 4 weeks",
        1: "Recurrence 4-12 weeks",
        0: "Recurrence > 12 weeks or Do not recur"
    }
};

const SamsAssessment = ({ onAnalysisComplete, initialData }) => {
    // --- STATE: Clinical Data ---
    const [clinicalData, setClinicalData] = useState({
        suspectedDrug: '',
        startDate: '',
        symptomDate: '',
        stopDate: '',
        improvementDate: '',
        hasRechallenge: false,
        restartDate: '',
        recurrenceDate: ''
    });

    // --- STATE: CPK Data (Array of { date, value }) ---
    const [cpkEntries, setCpkEntries] = useState([]);
    const [newCpk, setNewCpk] = useState({ date: '', value: '' });

    // --- STATE: Scores (Answers) ---
    const [answers, setAnswers] = useState({
        distribution: 3,
        onset: 3,
        dechallenge: 2,
        rechallenge: 0
    });

    const [isAnalyzed, setIsAnalyzed] = useState(false);
    const [result, setResult] = useState(null);

    // --- EFFECT: Load Initial Data (For View/Edit Mode) ---
    useEffect(() => {
        if (initialData) {
            // ดึงข้อมูลจาก savedData หรือ structure ที่ส่งเข้ามา
            const src = initialData.savedData || initialData;
            
            // 1. Clinical Data
            if (src.clinicalData) {
                setClinicalData(prev => ({ ...prev, ...src.clinicalData }));
            } else {
                // Fallback กรณีข้อมูลกระจัดกระจาย
                setClinicalData(prev => ({
                    ...prev,
                    suspectedDrug: src.suspectedDrug || '',
                    startDate: src.startDate || '',
                    symptomDate: src.symptomDate || '',
                    stopDate: src.stopDate || '',
                    improvementDate: src.improvementDate || '',
                    hasRechallenge: src.hasRechallenge || false,
                    restartDate: src.restartDate || '',
                    recurrenceDate: src.recurrenceDate || ''
                }));
            }

            // 2. CPK Data
            if (src.cpkData && Array.isArray(src.cpkData)) {
                setCpkEntries(src.cpkData);
            }

            // 3. Answers & Result
            if (src.answers) {
                setAnswers(src.answers);
                // ถ้ามีคำตอบอยู่แล้ว ให้คำนวณผลลัพธ์เพื่อแสดงผลทันที
                setTimeout(() => handleAnalyze(src.answers, src.clinicalData), 100);
            } else if (initialData.analysisResultFull) {
                 // กรณีโหลดจาก analysisResultFull
                 setResult(initialData.analysisResultFull);
                 setIsAnalyzed(true);
            }
        }
    }, [initialData]);

    // --- HELPER: Date Diff ---
    const getDaysDiff = (d1, d2) => {
        if (!d1 || !d2) return null;
        const date1 = new Date(d1);
        const date2 = new Date(d2);
        if (isNaN(date1.getTime()) || isNaN(date2.getTime())) return null;
        const diffTime = Math.abs(date2 - date1);
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    };

    // --- HANDLER: CPK Management ---
    const handleAddCpk = () => {
        if (newCpk.date && newCpk.value) {
            const updated = [...cpkEntries, newCpk].sort((a,b) => new Date(a.date) - new Date(b.date));
            setCpkEntries(updated);
            setNewCpk({ date: '', value: '' });
            setIsAnalyzed(false);
        }
    };

    const removeCpk = (index) => {
        const updated = [...cpkEntries];
        updated.splice(index, 1);
        setCpkEntries(updated);
        setIsAnalyzed(false);
    };

    // --- HANDLER: Auto-Calculate & Analyze ---
    // รับ parameters แบบ optional เพื่อรองรับการเรียกจาก useEffect
    const handleAnalyze = (manualAnswers = null, manualClinical = null) => {
        const currentData = manualClinical || clinicalData;
        let newAnswers = manualAnswers ? { ...manualAnswers } : { ...answers };

        // ถ้าไม่ได้ Manual Answers มา ให้คำนวณใหม่จากวันที่
        if (!manualAnswers) {
            // Logic 1: Onset
            const onsetDays = getDaysDiff(currentData.startDate, currentData.symptomDate);
            if (onsetDays !== null) {
                if (onsetDays < 28) newAnswers.onset = 3;
                else if (onsetDays <= 84) newAnswers.onset = 2; 
                else newAnswers.onset = 1;
            }

            // Logic 2: Dechallenge
            if (currentData.stopDate && currentData.improvementDate) {
                const dechallengeDays = getDaysDiff(currentData.stopDate, currentData.improvementDate);
                if (dechallengeDays !== null) {
                    if (dechallengeDays < 14) newAnswers.dechallenge = 2;
                    else if (dechallengeDays <= 28) newAnswers.dechallenge = 1; 
                    else newAnswers.dechallenge = 0;
                }
            }

            // Logic 3: Rechallenge
            if (currentData.hasRechallenge && currentData.restartDate && currentData.recurrenceDate) {
                const rechallengeDays = getDaysDiff(currentData.restartDate, currentData.recurrenceDate);
                if (rechallengeDays !== null) {
                    if (rechallengeDays < 28) newAnswers.rechallenge = 3;
                    else if (rechallengeDays <= 84) newAnswers.rechallenge = 1;
                    else newAnswers.rechallenge = 0;
                }
            } else if (!currentData.hasRechallenge) {
                newAnswers.rechallenge = 0;
            }
            
            setAnswers(newAnswers);
        }

        // Calculate Total Score
        // หมายเหตุ: Math.floor ใช้จัดการกรณีคะแนนเป็นทศนิยม เช่น 2.1 ให้คิดเป็น 2 แต้มตามเกณฑ์ทั่วไป (หรือเอาออกถ้าต้องการทศนิยม)
        const getScore = (val) => Math.floor(parseFloat(val));
        const breakdown = {
            distribution: getScore(newAnswers.distribution),
            onset: getScore(newAnswers.onset),
            dechallenge: getScore(newAnswers.dechallenge),
            rechallenge: getScore(newAnswers.rechallenge)
        };
        const total = Object.values(breakdown).reduce((a, b) => a + b, 0);

        let text = "Unlikely (< 7)";
        let colorClass = "bg-[#faf9f7]0";
        if (total >= 9) {
            text = "Probable (9-11)";
            colorClass = "bg-teal-600";
        } else if (total >= 7) {
            text = "Possible (7-8)";
            colorClass = "bg-yellow-500";
        }

        const calculatedResult = { total, text, breakdown, colorClass, type: 'SAMS-CI' };
        setResult(calculatedResult);
        setIsAnalyzed(true);

        if (onAnalysisComplete) {
            onAnalysisComplete({
                ...calculatedResult,
                answers: newAnswers,
                clinicalData: currentData, // ส่งข้อมูล Clinical กลับไปบันทึก
                cpkData: cpkEntries // ส่งข้อมูล CPK กลับไปบันทึก
            });
        }
    };

    const handleChange = (field, value) => {
        setClinicalData(prev => ({ ...prev, [field]: value }));
        setIsAnalyzed(false);
    };

    const handleScoreChange = (field, value) => {
        setAnswers(prev => ({ ...prev, [field]: value }));
        // เมื่อเปลี่ยนคะแนน Manual ให้ Analyzed ใหม่แต่ใช้ค่า Date เดิม
        setIsAnalyzed(false); 
    };

    // --- TIMELINE COMPONENT (With CPK) ---
    const Timeline = () => {
        if (!clinicalData.startDate || !clinicalData.symptomDate) return null;
        
        // 1. Gather all dates to find Range (Min/Max)
        const eventDates = [
            clinicalData.startDate, 
            clinicalData.symptomDate, 
            clinicalData.stopDate, 
            clinicalData.improvementDate,
            clinicalData.restartDate,
            clinicalData.recurrenceDate,
            ...cpkEntries.map(c => c.date)
        ].filter(d => d && !isNaN(new Date(d).getTime())).map(d => new Date(d).getTime());

        if (eventDates.length === 0) return null;

        const minTime = Math.min(...eventDates);
        const maxTime = Math.max(...eventDates);
        const totalDuration = maxTime - minTime || 86400000; // Avoid div/0, default 1 day
        // Add buffer (10% on each side)
        const buffer = totalDuration * 0.1;
        const timelineStart = minTime - buffer;
        const timelineEnd = maxTime + buffer;
        const timelineRange = timelineEnd - timelineStart;

        const getPos = (dateStr) => {
            if (!dateStr) return -999;
            const time = new Date(dateStr).getTime();
            if (isNaN(time)) return -999;
            return ((time - timelineStart) / timelineRange) * 100;
        };

        return (
            <div className="mt-8 mb-8 p-6 bg-white rounded-[10px] border border-[#ebe8e2] shadow-[0_1px_4px_rgba(0,0,0,0.05)] print:shadow-none print:border break-inside-avoid">
                <h3 className="text-sm font-bold text-[#2d2926] mb-6 flex items-center gap-2">
                    <Activity className="w-4 h-4 text-teal-600" /> CLINICAL TIMELINE & CPK TREND
                </h3>
                
                <div className="relative w-full h-48">
                    {/* Grid Lines (Background) */}
                    <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
                        <div className="border-b border-[#f4f2ee] h-full w-full"></div>
                    </div>

                    {/* 1. Drug Duration Bar (Main Statin) */}
                    {clinicalData.startDate && (
                        <div 
                            className="absolute h-3 bg-teal-200 rounded-full top-10 opacity-80 print:bg-teal-300 print:opacity-100"
                            style={{ 
                                left: `${Math.max(0, getPos(clinicalData.startDate))}%`, 
                                right: clinicalData.stopDate ? `${Math.max(0, 100 - getPos(clinicalData.stopDate))}%` : '0%',
                                minWidth: '4px'
                            }}
                        >
                             <span className="absolute -top-5 left-0 text-[10px] font-bold text-teal-700 whitespace-nowrap print:text-black">
                                {clinicalData.suspectedDrug || 'Suspected Drug'}
                             </span>
                        </div>
                    )}

                    {/* 2. Key Events (Icons) */}
                    {[
                        { date: clinicalData.startDate, icon: PlayCircle, color: 'text-green-500', label: 'Start' },
                        { date: clinicalData.symptomDate, icon: AlertCircle, color: 'text-[#e07060]', label: 'Symptom' },
                        { date: clinicalData.stopDate, icon: StopCircle, color: 'text-[#a8a099]', label: 'Stop' },
                        { date: clinicalData.improvementDate, icon: CheckCircle, color: 'text-blue-500', label: 'Improved' },
                    ].map((ev, i) => {
                        const pos = getPos(ev.date);
                        if (pos < 0 || pos > 100) return null;
                        const Icon = ev.icon;
                        return (
                            <div key={i} className="absolute top-8 flex flex-col items-center group z-10" style={{ left: `${pos}%`, transform: 'translateX(-50%)' }}>
                                <Icon className={`w-5 h-5 bg-white rounded-full ${ev.color} shadow-[0_1px_4px_rgba(0,0,0,0.05)] print:text-black print:border print:border-black`} />
                                <div className="text-[9px] font-bold text-[#a8a099] mt-1 uppercase print:text-black">{ev.label}</div>
                                <div className="text-[9px] text-[#a8a099] print:hidden">{new Date(ev.date).toLocaleDateString(undefined, {month:'short', day:'numeric'})}</div>
                                {/* Tooltip Line */}
                                <div className="h-24 w-px border-l border-dashed border-[#d6d0c8] absolute top-5 -z-10 print:border-slate-400"></div>
                            </div>
                        );
                    })}

                    {/* 3. CPK Graph Points */}
                    {cpkEntries.map((cpk, i) => {
                        const pos = getPos(cpk.date);
                        if (pos < 0 || pos > 100) return null;
                        return (
                            <div key={`cpk-${i}`} className="absolute top-28 flex flex-col items-center z-20" style={{ left: `${pos}%`, transform: 'translateX(-50%)' }}>
                                <div className="w-3 h-3 bg-purple-500 rounded-full border-2 border-white shadow-md hover:scale-125 transition-transform cursor-pointer print:bg-black print:border-black"></div>
                                <div className="bg-purple-100 text-purple-800 text-[10px] font-bold px-1.5 py-0.5 rounded mt-1 shadow-[0_1px_4px_rgba(0,0,0,0.05)] whitespace-nowrap print:bg-white print:border print:border-black print:text-black">
                                    {cpk.value} <span className="text-[8px] opacity-70">U/L</span>
                                </div>
                                <div className="text-[8px] text-[#a8a099] mt-0.5 print:hidden">{new Date(cpk.date).toLocaleDateString(undefined, {month:'short', day:'numeric'})}</div>
                            </div>
                        );
                    })}
                    
                    {/* Label for CPK Row */}
                    {cpkEntries.length > 0 && (
                        <div className="absolute top-32 left-0 text-[10px] font-bold text-purple-400 -translate-x-full pr-2 print:text-black">
                            CPK Level
                        </div>
                    )}
                </div>
            </div>
        );
    };

    return (
        <div className="space-y-6 animate-fade-in">
            
            {/* 1. CLINICAL DATA FORM */}
            <div className="bg-white p-6 rounded-[10px] border border-[#ebe8e2] shadow-[0_1px_4px_rgba(0,0,0,0.05)] print:shadow-none print:border-0 print:p-0">
                <h2 className="text-sm font-bold text-teal-600 uppercase tracking-wider mb-4 border-b border-teal-100 pb-2 flex items-center gap-2 print:text-black print:border-black">
                    <Calendar className="w-4 h-4" /> 1. Clinical Data & Dates
                </h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 print:grid-cols-2">
                    {/* Suspected Drug */}
                    <div className="md:col-span-2">
                        <label className="text-xs text-[#a8a099] font-bold block mb-1">SUSPECTED STATIN / DRUG</label>
                        <input 
                            type="text" 
                            className="w-full text-sm border-[#d6d0c8] rounded-md p-2 focus:ring-teal-500 focus:border-teal-500 placeholder:text-slate-300"
                            placeholder="e.g. Atorvastatin 40mg"
                            value={clinicalData.suspectedDrug}
                            onChange={e => handleChange('suspectedDrug', e.target.value)}
                        />
                    </div>

                    {/* Onset Phase */}
                    <div className="bg-teal-50/50 p-4 rounded-lg border border-teal-100 space-y-3 print:bg-white print:border-[#d6d0c8]">
                        <div className="flex items-center gap-2 text-teal-700 font-bold text-xs mb-2 print:text-black">
                            <PlayCircle className="w-4 h-4" /> ONSET PHASE
                        </div>
                        <div>
                            <label className="text-xs text-[#a8a099] font-bold block mb-1">Date Started</label>
                            <input type="date" className="w-full text-sm border-[#d6d0c8] rounded-md" value={clinicalData.startDate} onChange={e => handleChange('startDate', e.target.value)} />
                        </div>
                        <div>
                            <label className="text-xs text-[#a8a099] font-bold block mb-1">Date Symptom Started</label>
                            <input type="date" className="w-full text-sm border-[#d6d0c8] rounded-md" value={clinicalData.symptomDate} onChange={e => handleChange('symptomDate', e.target.value)} />
                        </div>
                    </div>

                    {/* Dechallenge Phase */}
                    <div className="bg-[#faf9f7] p-4 rounded-lg border border-[#ebe8e2] space-y-3 print:bg-white print:border-[#d6d0c8]">
                        <div className="flex items-center gap-2 text-[#6b6360] font-bold text-xs mb-2 print:text-black">
                            <StopCircle className="w-4 h-4" /> DECHALLENGE PHASE
                        </div>
                        <div>
                            <label className="text-xs text-[#a8a099] font-bold block mb-1">Date Stopped</label>
                            <input type="date" className="w-full text-sm border-[#d6d0c8] rounded-md" value={clinicalData.stopDate} onChange={e => handleChange('stopDate', e.target.value)} />
                        </div>
                        <div>
                            <label className="text-xs text-[#a8a099] font-bold block mb-1">Date Improved</label>
                            <input type="date" className="w-full text-sm border-[#d6d0c8] rounded-md" value={clinicalData.improvementDate} onChange={e => handleChange('improvementDate', e.target.value)} />
                        </div>
                    </div>

                    {/* CPK Data Entry */}
                    <div className="md:col-span-2 bg-purple-50 p-4 rounded-lg border border-purple-100 print:bg-white print:border-[#d6d0c8]">
                         <div className="flex items-center justify-between mb-3">
                            <label className="text-xs font-bold text-purple-700 flex items-center gap-2 print:text-black">
                                <Activity className="w-4 h-4" /> CPK DATA (Creatine Phosphokinase)
                            </label>
                         </div>
                         
                         <div className="flex gap-3 mb-3 items-end print:hidden">
                            <div className="flex-1">
                                <label className="text-[10px] text-[#a8a099] block mb-1">Date</label>
                                <input 
                                    type="date" 
                                    className="w-full text-xs border-[#d6d0c8] rounded"
                                    value={newCpk.date}
                                    onChange={e => setNewCpk({...newCpk, date: e.target.value})} 
                                />
                            </div>
                            <div className="flex-1">
                                <label className="text-[10px] text-[#a8a099] block mb-1">CPK Value (U/L)</label>
                                <input 
                                    type="number" 
                                    className="w-full text-xs border-[#d6d0c8] rounded"
                                    placeholder="e.g. 2500"
                                    value={newCpk.value}
                                    onChange={e => setNewCpk({...newCpk, value: e.target.value})} 
                                />
                            </div>
                            <button 
                                onClick={handleAddCpk}
                                className="bg-purple-600 hover:bg-purple-700 text-white p-1.5 rounded transition shadow-[0_1px_4px_rgba(0,0,0,0.05)]"
                                title="Add CPK"
                            >
                                <Plus className="w-4 h-4" />
                            </button>
                         </div>

                         {/* CPK List */}
                         {cpkEntries.length > 0 && (
                             <div className="bg-white rounded border border-purple-100 overflow-hidden print:border-[#d6d0c8]">
                                 <table className="w-full text-xs text-left">
                                     <thead className="bg-purple-100/50 text-purple-700 font-bold print:bg-[#ebe8e2] print:text-black">
                                         <tr>
                                             <th className="p-2">Date</th>
                                             <th className="p-2">Value (U/L)</th>
                                             <th className="p-2 text-right print:hidden">Action</th>
                                         </tr>
                                     </thead>
                                     <tbody className="divide-y divide-purple-50 print:divide-slate-200">
                                         {cpkEntries.map((cpk, i) => (
                                             <tr key={i}>
                                                 <td className="p-2 text-[#6b6360]">{new Date(cpk.date).toLocaleDateString()}</td>
                                                 <td className="p-2 font-mono font-bold text-purple-600 print:text-black">{cpk.value}</td>
                                                 <td className="p-2 text-right print:hidden">
                                                     <button onClick={() => removeCpk(i)} className="text-[#a8a099] hover:text-[#e07060]">
                                                         <Trash2 className="w-3 h-3" />
                                                     </button>
                                                 </td>
                                             </tr>
                                         ))}
                                     </tbody>
                                 </table>
                             </div>
                         )}
                    </div>

                    {/* Rechallenge Checkbox */}
                    <div className="md:col-span-2 border-t pt-4">
                        <div className="flex items-center gap-2 mb-3">
                            <input 
                                type="checkbox" 
                                id="hasRechallenge" 
                                className="rounded text-teal-600 focus:ring-teal-500"
                                checked={clinicalData.hasRechallenge}
                                onChange={e => handleChange('hasRechallenge', e.target.checked)}
                            />
                            <label htmlFor="hasRechallenge" className="text-sm font-bold text-[#2d2926] cursor-pointer flex items-center gap-2">
                                <RefreshCw className="w-4 h-4" /> Rechallenge (Did the patient restart the drug?)
                            </label>
                        </div>
                        
                        {clinicalData.hasRechallenge && (
                            <div className="grid grid-cols-2 gap-4 bg-orange-50 p-4 rounded-lg border border-orange-100 animate-fade-in print:bg-white print:border-[#d6d0c8]">
                                <div>
                                    <label className="text-xs text-[#a8a099] font-bold block mb-1">Date Restarted</label>
                                    <input type="date" className="w-full text-sm border-[#d6d0c8] rounded-md" value={clinicalData.restartDate} onChange={e => handleChange('restartDate', e.target.value)} />
                                </div>
                                <div>
                                    <label className="text-xs text-[#a8a099] font-bold block mb-1">Date Recurred</label>
                                    <input type="date" className="w-full text-sm border-[#d6d0c8] rounded-md" value={clinicalData.recurrenceDate} onChange={e => handleChange('recurrenceDate', e.target.value)} />
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* ANALYZE BUTTON (Hidden on Print) */}
                <div className="mt-6 flex justify-center print:hidden">
                    <button 
                        onClick={() => handleAnalyze()}
                        className="bg-teal-600 text-white px-8 py-3 rounded-full shadow-md hover:bg-teal-700 hover:shadow-[0_4px_16px_rgba(0,0,0,0.08)] transition-all flex items-center gap-2 font-bold text-sm"
                    >
                        <Activity className="w-4 h-4" /> ANALYZE & CALCULATE SCORE
                    </button>
                </div>
            </div>

            {/* 2. TIMELINE VISUALIZATION (Shows only after Analyze) */}
            {isAnalyzed && <Timeline />}

            {/* 3. SCORING SECTION (Auto-filled but editable) */}
            {isAnalyzed && (
                <div className="animate-slide-up space-y-6">
                     <div className="print-section">
                        <h2 className="text-sm font-bold text-[#6b6360] uppercase tracking-wider mb-4 border-b border-[#ebe8e2] pb-2 flex items-center gap-2 print:text-black print:border-black">
                            <CheckCircle className="w-4 h-4" /> 2. SAMS-CI Scoring Criteria
                        </h2>
                        
                        <div className="bg-white p-6 rounded-[10px] border border-[#ebe8e2] mb-6 grid grid-cols-1 md:grid-cols-2 gap-6 print:border-0 print:p-0">
                            {/* Q1: Distribution */}
                            <div className="md:col-span-2">
                                <label className="text-xs text-[#a8a099] font-bold block mb-1">1. DISTRIBUTION OF SYMPTOMS (Manual Select)</label>
                                <select 
                                    className="w-full text-sm border-[#d6d0c8] rounded-md p-2 bg-yellow-50 focus:ring-teal-500 focus:border-teal-500 print:appearance-none print:bg-white print:border-0 print:p-0 print:font-bold" 
                                    value={answers.distribution} 
                                    onChange={e => handleScoreChange('distribution', e.target.value)}
                                >
                                    {Object.entries(samsCriteria.distribution).map(([score, label]) => (
                                        <option key={score} value={score}>{label} ({Math.floor(score)} pts)</option>
                                    ))}
                                </select>
                                <p className="text-[10px] text-[#a8a099] mt-1 print:hidden">* This criteria depends on physical location, please select manually.</p>
                            </div>

                            {/* Q2: Onset */}
                            <div>
                                <label className="text-xs text-[#a8a099] font-bold block mb-1">2. ONSET (Auto-calculated)</label>
                                <div className="p-2 bg-[#f4f2ee] rounded text-sm text-[#2d2926] font-medium mb-1 border border-[#ebe8e2] print:hidden">
                                    Duration: {getDaysDiff(clinicalData.startDate, clinicalData.symptomDate) ?? '-'} days
                                </div>
                                <select 
                                    className="w-full text-sm border-[#d6d0c8] rounded-md p-2 focus:ring-teal-500 focus:border-teal-500 print:appearance-none print:bg-white print:border-0 print:p-0 print:font-bold" 
                                    value={answers.onset} 
                                    onChange={e => handleScoreChange('onset', e.target.value)}
                                >
                                    {Object.entries(samsCriteria.onset).map(([score, label]) => (
                                        <option key={score} value={score}>{label} ({Math.floor(score)} pts)</option>
                                    ))}
                                </select>
                            </div>

                            {/* Q3: Dechallenge */}
                            <div>
                                <label className="text-xs text-[#a8a099] font-bold block mb-1">3. DECHALLENGE (Auto-calculated)</label>
                                <div className="p-2 bg-[#f4f2ee] rounded text-sm text-[#2d2926] font-medium mb-1 border border-[#ebe8e2] print:hidden">
                                    Improvement within: {getDaysDiff(clinicalData.stopDate, clinicalData.improvementDate) ?? '-'} days
                                </div>
                                <select 
                                    className="w-full text-sm border-[#d6d0c8] rounded-md p-2 focus:ring-teal-500 focus:border-teal-500 print:appearance-none print:bg-white print:border-0 print:p-0 print:font-bold" 
                                    value={answers.dechallenge} 
                                    onChange={e => handleScoreChange('dechallenge', e.target.value)}
                                >
                                    {Object.entries(samsCriteria.dechallenge).sort((a,b) => b[0]-a[0]).map(([score, label]) => (
                                        <option key={score} value={score}>{label} ({score} pts)</option>
                                    ))}
                                </select>
                            </div>

                            {/* Q4: Rechallenge */}
                            <div>
                                <label className="text-xs text-[#a8a099] font-bold block mb-1">4. RECHALLENGE (Auto-calculated)</label>
                                <select 
                                    className="w-full text-sm border-[#d6d0c8] rounded-md p-2 focus:ring-teal-500 focus:border-teal-500 print:appearance-none print:bg-white print:border-0 print:p-0 print:font-bold" 
                                    value={answers.rechallenge} 
                                    onChange={e => handleScoreChange('rechallenge', e.target.value)}
                                >
                                    {Object.entries(samsCriteria.rechallenge).sort((a,b) => b[0]-a[0]).map(([score, label]) => (
                                        <option key={score} value={score}>{label} ({score} pts)</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* RESULT CARD */}
                    {result && (
                        <div className="print-section break-inside-avoid">
                            <div className="border-2 border-teal-500 rounded-[10px] overflow-hidden shadow-md bg-white print:border-black">
                                <div className={`${result.colorClass} text-white px-5 py-6 flex justify-between items-center print:text-black print:bg-white print:border-b-2 print:border-black`}>
                                    <div>
                                        <h3 className="text-2xl font-bold flex items-center gap-2">
                                            <AlertCircle className="w-6 h-6" /> SAMS-CI Score
                                        </h3>
                                        <p className="text-sm text-white/90 print:text-black/60 mt-1">Likelihood of Statin-Associated Muscle Symptoms</p>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-5xl font-bold">{result.total}</div>
                                        <div className="text-sm font-bold uppercase tracking-wide bg-black/20 px-3 py-1 rounded inline-block mt-2 print:bg-[#f4f2ee] print:text-black">
                                            {result.text}
                                        </div>
                                    </div>
                                </div>
                                <div className="bg-white p-4">
                                    <table className="w-full table-auto text-sm">
                                        <thead className="bg-[#faf9f7] text-[#a8a099] border-b print:bg-[#ebe8e2] print:text-black">
                                            <tr>
                                                <th className="py-2 px-3 text-left">Criteria</th>
                                                <th className="py-2 px-3 text-right">Points</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y">
                                            <tr><td className="py-2 px-3">1. Distribution (Manual)</td><td className="py-2 px-3 text-right font-bold">{result.breakdown.distribution}</td></tr>
                                            <tr><td className="py-2 px-3">2. Onset</td><td className="py-2 px-3 text-right font-bold">{result.breakdown.onset}</td></tr>
                                            <tr><td className="py-2 px-3">3. Dechallenge</td><td className="py-2 px-3 text-right font-bold">{result.breakdown.dechallenge}</td></tr>
                                            <tr><td className="py-2 px-3">4. Rechallenge</td><td className="py-2 px-3 text-right font-bold">{result.breakdown.rechallenge}</td></tr>
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default SamsAssessment;