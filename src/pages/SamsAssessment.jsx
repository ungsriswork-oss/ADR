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

const SamsAssessment = ({ onAnalysisComplete }) => {
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

    // --- HELPER: Date Diff ---
    const getDaysDiff = (d1, d2) => {
        if (!d1 || !d2) return null;
        const date1 = new Date(d1);
        const date2 = new Date(d2);
        const diffTime = Math.abs(date2 - date1);
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    };

    // --- HANDLER: CPK Management ---
    const handleAddCpk = () => {
        if (newCpk.date && newCpk.value) {
            const updated = [...cpkEntries, newCpk].sort((a,b) => new Date(a.date) - new Date(b.date));
            setCpkEntries(updated);
            setNewCpk({ date: '', value: '' });
            setIsAnalyzed(false); // Reset analysis to force update timeline
        }
    };

    const removeCpk = (index) => {
        const updated = [...cpkEntries];
        updated.splice(index, 1);
        setCpkEntries(updated);
        setIsAnalyzed(false);
    };

    // --- HANDLER: Auto-Calculate & Analyze ---
    const handleAnalyze = () => {
        let newAnswers = { ...answers };

        // Logic 1: Onset
        const onsetDays = getDaysDiff(clinicalData.startDate, clinicalData.symptomDate);
        if (onsetDays !== null) {
            if (onsetDays < 28) newAnswers.onset = 3;
            else if (onsetDays <= 84) newAnswers.onset = 2; 
            else newAnswers.onset = 1;
        }

        // Logic 2: Dechallenge
        if (clinicalData.stopDate && clinicalData.improvementDate) {
            const dechallengeDays = getDaysDiff(clinicalData.stopDate, clinicalData.improvementDate);
            if (dechallengeDays !== null) {
                if (dechallengeDays < 14) newAnswers.dechallenge = 2;
                else if (dechallengeDays <= 28) newAnswers.dechallenge = 1; 
                else newAnswers.dechallenge = 0;
            }
        }

        // Logic 3: Rechallenge
        if (clinicalData.hasRechallenge && clinicalData.restartDate && clinicalData.recurrenceDate) {
            const rechallengeDays = getDaysDiff(clinicalData.restartDate, clinicalData.recurrenceDate);
            if (rechallengeDays !== null) {
                if (rechallengeDays < 28) newAnswers.rechallenge = 3;
                else if (rechallengeDays <= 84) newAnswers.rechallenge = 1;
                else newAnswers.rechallenge = 0;
            }
        } else if (!clinicalData.hasRechallenge) {
            newAnswers.rechallenge = 0;
        }

        setAnswers(newAnswers);
        
        const getScore = (val) => Math.floor(parseFloat(val));
        const breakdown = {
            distribution: getScore(newAnswers.distribution),
            onset: getScore(newAnswers.onset),
            dechallenge: getScore(newAnswers.dechallenge),
            rechallenge: getScore(newAnswers.rechallenge)
        };
        const total = Object.values(breakdown).reduce((a, b) => a + b, 0);

        let text = "Unlikely (< 7)";
        let colorClass = "bg-slate-500";
        if (total >= 9) {
            text = "Probable (9-11)";
            colorClass = "bg-teal-600";
        } else if (total >= 7) {
            text = "Possible (7-8)";
            colorClass = "bg-yellow-500";
        }

        const calculatedResult = { total, text, breakdown, colorClass };
        setResult(calculatedResult);
        setIsAnalyzed(true);

        if (onAnalysisComplete) {
            onAnalysisComplete({
                score: total,
                interpretation: text,
                answers: newAnswers,
                breakdown: breakdown,
                clinicalData: clinicalData,
                cpkData: cpkEntries // Send CPK data back
            });
        }
    };

    const handleChange = (field, value) => {
        setClinicalData(prev => ({ ...prev, [field]: value }));
        setIsAnalyzed(false);
    };

    const handleScoreChange = (field, value) => {
        setAnswers(prev => ({ ...prev, [field]: value }));
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
        ].filter(Boolean).map(d => new Date(d).getTime());

        if (eventDates.length === 0) return null;

        const minTime = Math.min(...eventDates);
        const maxTime = Math.max(...eventDates);
        const totalDuration = maxTime - minTime || 1; // Avoid div/0
        // Add buffer (5% on each side)
        const buffer = totalDuration * 0.05;
        const timelineStart = minTime - buffer;
        const timelineEnd = maxTime + buffer;
        const timelineRange = timelineEnd - timelineStart;

        const getPos = (dateStr) => {
            if (!dateStr) return -1;
            const time = new Date(dateStr).getTime();
            return ((time - timelineStart) / timelineRange) * 100;
        };

        return (
            <div className="mt-8 mb-8 p-6 bg-white rounded-xl border border-slate-200 shadow-sm print:shadow-none print:border">
                <h3 className="text-sm font-bold text-slate-700 mb-6 flex items-center gap-2">
                    <Activity className="w-4 h-4 text-teal-600" /> CLINICAL TIMELINE & CPK TREND
                </h3>
                
                <div className="relative w-full h-48">
                    {/* Grid Lines (Background) */}
                    <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
                        <div className="border-b border-slate-100 h-full w-full"></div>
                    </div>

                    {/* 1. Drug Duration Bar (Main Statin) */}
                    {clinicalData.startDate && (
                        <div 
                            className="absolute h-3 bg-teal-200 rounded-full top-10 opacity-80"
                            style={{ 
                                left: `${getPos(clinicalData.startDate)}%`, 
                                right: clinicalData.stopDate ? `${100 - getPos(clinicalData.stopDate)}%` : '0%'
                            }}
                        >
                             <span className="absolute -top-5 left-0 text-[10px] font-bold text-teal-700 whitespace-nowrap">
                                {clinicalData.suspectedDrug || 'Suspected Drug'}
                             </span>
                        </div>
                    )}

                    {/* 2. Key Events (Icons) */}
                    {[
                        { date: clinicalData.startDate, icon: PlayCircle, color: 'text-green-500', label: 'Start' },
                        { date: clinicalData.symptomDate, icon: AlertCircle, color: 'text-red-500', label: 'Symptom' },
                        { date: clinicalData.stopDate, icon: StopCircle, color: 'text-slate-500', label: 'Stop' },
                        { date: clinicalData.improvementDate, icon: CheckCircle, color: 'text-blue-500', label: 'Improved' },
                    ].map((ev, i) => {
                        const pos = getPos(ev.date);
                        if (pos < 0) return null;
                        const Icon = ev.icon;
                        return (
                            <div key={i} className="absolute top-8 flex flex-col items-center group z-10" style={{ left: `${pos}%`, transform: 'translateX(-50%)' }}>
                                <Icon className={`w-5 h-5 bg-white rounded-full ${ev.color} shadow-sm`} />
                                <div className="text-[9px] font-bold text-slate-500 mt-1 uppercase">{ev.label}</div>
                                <div className="text-[9px] text-slate-400">{new Date(ev.date).toLocaleDateString(undefined, {month:'short', day:'numeric'})}</div>
                                {/* Tooltip Line */}
                                <div className="h-24 w-px border-l border-dashed border-slate-300 absolute top-5 -z-10"></div>
                            </div>
                        );
                    })}

                    {/* 3. CPK Graph Points */}
                    {cpkEntries.map((cpk, i) => {
                        const pos = getPos(cpk.date);
                        if (pos < 0) return null;
                        return (
                            <div key={`cpk-${i}`} className="absolute top-28 flex flex-col items-center z-20" style={{ left: `${pos}%`, transform: 'translateX(-50%)' }}>
                                <div className="w-3 h-3 bg-purple-500 rounded-full border-2 border-white shadow-md hover:scale-125 transition-transform cursor-pointer"></div>
                                <div className="bg-purple-100 text-purple-800 text-[10px] font-bold px-1.5 py-0.5 rounded mt-1 shadow-sm whitespace-nowrap">
                                    {cpk.value} <span className="text-[8px] opacity-70">U/L</span>
                                </div>
                                <div className="text-[8px] text-slate-400 mt-0.5">{new Date(cpk.date).toLocaleDateString(undefined, {month:'short', day:'numeric'})}</div>
                            </div>
                        );
                    })}
                    
                    {/* Label for CPK Row */}
                    {cpkEntries.length > 0 && (
                        <div className="absolute top-32 left-0 text-[10px] font-bold text-purple-400 -translate-x-full pr-2">
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
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm print:shadow-none">
                <h2 className="text-sm font-bold text-teal-600 uppercase tracking-wider mb-4 border-b border-teal-100 pb-2 flex items-center gap-2">
                    <Calendar className="w-4 h-4" /> 1. Clinical Data & Dates
                </h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Suspected Drug */}
                    <div className="md:col-span-2">
                        <label className="text-xs text-slate-500 font-bold block mb-1">SUSPECTED STATIN / DRUG</label>
                        <input 
                            type="text" 
                            className="w-full text-sm border-slate-300 rounded-md p-2 focus:ring-teal-500 focus:border-teal-500 placeholder:text-slate-300"
                            placeholder="e.g. Atorvastatin 40mg"
                            value={clinicalData.suspectedDrug}
                            onChange={e => handleChange('suspectedDrug', e.target.value)}
                        />
                    </div>

                    {/* Onset Phase */}
                    <div className="bg-teal-50/50 p-4 rounded-lg border border-teal-100 space-y-3">
                        <div className="flex items-center gap-2 text-teal-700 font-bold text-xs mb-2">
                            <PlayCircle className="w-4 h-4" /> ONSET PHASE
                        </div>
                        <div>
                            <label className="text-xs text-slate-500 font-bold block mb-1">Date Started</label>
                            <input type="date" className="w-full text-sm border-slate-300 rounded-md" value={clinicalData.startDate} onChange={e => handleChange('startDate', e.target.value)} />
                        </div>
                        <div>
                            <label className="text-xs text-slate-500 font-bold block mb-1">Date Symptom Started</label>
                            <input type="date" className="w-full text-sm border-slate-300 rounded-md" value={clinicalData.symptomDate} onChange={e => handleChange('symptomDate', e.target.value)} />
                        </div>
                    </div>

                    {/* Dechallenge Phase */}
                    <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-3">
                        <div className="flex items-center gap-2 text-slate-600 font-bold text-xs mb-2">
                            <StopCircle className="w-4 h-4" /> DECHALLENGE PHASE
                        </div>
                        <div>
                            <label className="text-xs text-slate-500 font-bold block mb-1">Date Stopped</label>
                            <input type="date" className="w-full text-sm border-slate-300 rounded-md" value={clinicalData.stopDate} onChange={e => handleChange('stopDate', e.target.value)} />
                        </div>
                        <div>
                            <label className="text-xs text-slate-500 font-bold block mb-1">Date Improved</label>
                            <input type="date" className="w-full text-sm border-slate-300 rounded-md" value={clinicalData.improvementDate} onChange={e => handleChange('improvementDate', e.target.value)} />
                        </div>
                    </div>

                    {/* CPK Data Entry */}
                    <div className="md:col-span-2 bg-purple-50 p-4 rounded-lg border border-purple-100">
                         <div className="flex items-center justify-between mb-3">
                            <label className="text-xs font-bold text-purple-700 flex items-center gap-2">
                                <Activity className="w-4 h-4" /> CPK DATA (Creatine Phosphokinase)
                            </label>
                         </div>
                         
                         <div className="flex gap-3 mb-3 items-end">
                            <div className="flex-1">
                                <label className="text-[10px] text-slate-400 block mb-1">Date</label>
                                <input 
                                    type="date" 
                                    className="w-full text-xs border-slate-300 rounded"
                                    value={newCpk.date}
                                    onChange={e => setNewCpk({...newCpk, date: e.target.value})} 
                                />
                            </div>
                            <div className="flex-1">
                                <label className="text-[10px] text-slate-400 block mb-1">CPK Value (U/L)</label>
                                <input 
                                    type="number" 
                                    className="w-full text-xs border-slate-300 rounded"
                                    placeholder="e.g. 2500"
                                    value={newCpk.value}
                                    onChange={e => setNewCpk({...newCpk, value: e.target.value})} 
                                />
                            </div>
                            <button 
                                onClick={handleAddCpk}
                                className="bg-purple-600 hover:bg-purple-700 text-white p-1.5 rounded transition shadow-sm"
                                title="Add CPK"
                            >
                                <Plus className="w-4 h-4" />
                            </button>
                         </div>

                         {/* CPK List */}
                         {cpkEntries.length > 0 && (
                             <div className="bg-white rounded border border-purple-100 overflow-hidden">
                                 <table className="w-full text-xs text-left">
                                     <thead className="bg-purple-100/50 text-purple-700 font-bold">
                                         <tr>
                                             <th className="p-2">Date</th>
                                             <th className="p-2">Value (U/L)</th>
                                             <th className="p-2 text-right">Action</th>
                                         </tr>
                                     </thead>
                                     <tbody className="divide-y divide-purple-50">
                                         {cpkEntries.map((cpk, i) => (
                                             <tr key={i}>
                                                 <td className="p-2 text-slate-600">{new Date(cpk.date).toLocaleDateString()}</td>
                                                 <td className="p-2 font-mono font-bold text-purple-600">{cpk.value}</td>
                                                 <td className="p-2 text-right">
                                                     <button onClick={() => removeCpk(i)} className="text-slate-400 hover:text-red-500">
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
                            <label htmlFor="hasRechallenge" className="text-sm font-bold text-slate-700 cursor-pointer flex items-center gap-2">
                                <RefreshCw className="w-4 h-4" /> Rechallenge (Did the patient restart the drug?)
                            </label>
                        </div>
                        
                        {clinicalData.hasRechallenge && (
                            <div className="grid grid-cols-2 gap-4 bg-orange-50 p-4 rounded-lg border border-orange-100 animate-fade-in">
                                <div>
                                    <label className="text-xs text-slate-500 font-bold block mb-1">Date Restarted</label>
                                    <input type="date" className="w-full text-sm border-slate-300 rounded-md" value={clinicalData.restartDate} onChange={e => handleChange('restartDate', e.target.value)} />
                                </div>
                                <div>
                                    <label className="text-xs text-slate-500 font-bold block mb-1">Date Recurred</label>
                                    <input type="date" className="w-full text-sm border-slate-300 rounded-md" value={clinicalData.recurrenceDate} onChange={e => handleChange('recurrenceDate', e.target.value)} />
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* ANALYZE BUTTON */}
                <div className="mt-6 flex justify-center">
                    <button 
                        onClick={handleAnalyze}
                        className="bg-teal-600 text-white px-8 py-3 rounded-full shadow-md hover:bg-teal-700 hover:shadow-lg transition-all flex items-center gap-2 font-bold text-sm"
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
                        <h2 className="text-sm font-bold text-slate-600 uppercase tracking-wider mb-4 border-b border-slate-200 pb-2 flex items-center gap-2">
                            <CheckCircle className="w-4 h-4" /> 2. SAMS-CI Scoring Criteria
                        </h2>
                        
                        <div className="bg-white p-6 rounded-xl border border-slate-200 mb-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Q1: Distribution */}
                            <div className="md:col-span-2">
                                <label className="text-xs text-slate-500 font-bold block mb-1">1. DISTRIBUTION OF SYMPTOMS (Manual Select)</label>
                                <select 
                                    className="w-full text-sm border-slate-300 rounded-md p-2 bg-yellow-50 focus:ring-teal-500 focus:border-teal-500" 
                                    value={answers.distribution} 
                                    onChange={e => handleScoreChange('distribution', e.target.value)}
                                >
                                    {Object.entries(samsCriteria.distribution).map(([score, label]) => (
                                        <option key={score} value={score}>{label} ({Math.floor(score)} pts)</option>
                                    ))}
                                </select>
                                <p className="text-[10px] text-slate-400 mt-1">* This criteria depends on physical location, please select manually.</p>
                            </div>

                            {/* Q2: Onset */}
                            <div>
                                <label className="text-xs text-slate-500 font-bold block mb-1">2. ONSET (Auto-calculated)</label>
                                <div className="p-2 bg-slate-100 rounded text-sm text-slate-700 font-medium mb-1 border border-slate-200">
                                    Duration: {getDaysDiff(clinicalData.startDate, clinicalData.symptomDate) ?? '-'} days
                                </div>
                                <select 
                                    className="w-full text-sm border-slate-300 rounded-md p-2 focus:ring-teal-500 focus:border-teal-500" 
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
                                <label className="text-xs text-slate-500 font-bold block mb-1">3. DECHALLENGE (Auto-calculated)</label>
                                <div className="p-2 bg-slate-100 rounded text-sm text-slate-700 font-medium mb-1 border border-slate-200">
                                    Improvement within: {getDaysDiff(clinicalData.stopDate, clinicalData.improvementDate) ?? '-'} days
                                </div>
                                <select 
                                    className="w-full text-sm border-slate-300 rounded-md p-2 focus:ring-teal-500 focus:border-teal-500" 
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
                                <label className="text-xs text-slate-500 font-bold block mb-1">4. RECHALLENGE (Auto-calculated)</label>
                                <select 
                                    className="w-full text-sm border-slate-300 rounded-md p-2 focus:ring-teal-500 focus:border-teal-500" 
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
                            <div className="border-2 border-teal-500 rounded-xl overflow-hidden shadow-md bg-white">
                                <div className={`${result.colorClass} text-white px-5 py-6 flex justify-between items-center print:text-black print:bg-white print:border-b-2 print:border-teal-600`}>
                                    <div>
                                        <h3 className="text-2xl font-bold flex items-center gap-2">
                                            <AlertCircle className="w-6 h-6" /> SAMS-CI Score
                                        </h3>
                                        <p className="text-sm text-white/90 print:text-black/60 mt-1">Likelihood of Statin-Associated Muscle Symptoms</p>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-5xl font-bold">{result.total}</div>
                                        <div className="text-sm font-bold uppercase tracking-wide bg-black/20 px-3 py-1 rounded inline-block mt-2 print:bg-slate-100 print:text-black">
                                            {result.text}
                                        </div>
                                    </div>
                                </div>
                                <div className="bg-white p-4">
                                    <table className="w-full table-auto text-sm">
                                        <thead className="bg-slate-50 text-slate-500 border-b">
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