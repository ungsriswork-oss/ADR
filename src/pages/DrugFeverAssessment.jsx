// src/pages/DrugFeverAssessment.jsx
import React, { useState, useEffect } from 'react';

// Criteria คำถามสำหรับ Drug Fever (Narrowest definition)
const feverCriteria = [
    { id: 1, q: "1. Fever appeared AFTER drug administration?", y: 1, n: -1 },
    { id: 2, q: "2. Fever resolved within 72h after discontinuation?", y: 2, n: -2 }, // Key criteria
    { id: 3, q: "3. No other cause identified (Infection, etc.)?", y: 1, n: 0 },
    { id: 4, q: "4. Fever reappeared on rechallenge?", y: 2, n: 0 }
];

const DrugFeverAssessment = ({ onAnalysisComplete }) => {
    // 1. Timeline Data State
    const [feverDate, setFeverDate] = useState('');
    const [drugEntries, setDrugEntries] = useState([]);
    const [currentDrug, setCurrentDrug] = useState({ name: '', startDate: '', stopDate: '' });

    // 2. Criteria State
    const [answers, setAnswers] = useState({});
    const [totalScore, setTotalScore] = useState(0);

    // คำนวณระยะเวลา (Lag Time)
    const calculateLagTime = (start, fever) => {
        if (!start || !fever) return '-';
        const d1 = new Date(start);
        const d2 = new Date(fever);
        const diffTime = d2 - d1;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays;
    };

    const handleAddDrug = () => {
        if (!currentDrug.name || !currentDrug.startDate) return alert("Please enter drug name and start date");
        
        const lagTime = calculateLagTime(currentDrug.startDate, feverDate);
        
        setDrugEntries([...drugEntries, { 
            ...currentDrug, 
            lagTime,
            id: Date.now() 
        }].sort((a, b) => new Date(a.startDate) - new Date(b.startDate))); // เรียงตามวันเริ่มยา
        
        setCurrentDrug({ name: '', startDate: '', stopDate: '' });
    };

    const handleAnswer = (qid, val) => {
        setAnswers(prev => ({ ...prev, [qid]: val }));
    };

    // Calculate Score & Result
    useEffect(() => {
        const score = Object.values(answers).reduce((a, b) => a + b, 0);
        setTotalScore(score);

        // Interpretation Logic based on Narrowest definition
        let interp = "Unlikely";
        // ถ้าตอบ Yes ข้อ 1 และ 2 (สำคัญที่สุด) -> Probable/Definite
        const criteriaMet = (answers[1] === 1) && (answers[2] === 2);
        
        if (score >= 5) interp = "Definite";
        else if (criteriaMet || score >= 3) interp = "Probable";
        else if (score >= 1) interp = "Possible";

        if (onAnalysisComplete) {
            // หา Suspected Drug ที่ Lag Time สัมพันธ์กัน (เช่น 7-14 วัน หรือตามบริบท)
            // เบื้องต้นส่งตัวที่เพิ่งแอดไป หรือตัวที่มี Lag Time เป็นบวก
            const suspects = drugEntries
                .filter(d => d.lagTime !== '-' && d.lagTime >= 0)
                .map(d => ({ name: `${d.name} (Day ${d.lagTime})`, total: score }));

            onAnalysisComplete({
                rFactor: score,
                type: interp,
                rankedDrugs: suspects.length > 0 ? suspects : [{ name: 'Unknown Drug', total: score }],
                drugEntries
            });
        }
    }, [answers, drugEntries, feverDate]);

    return (
        <div className="space-y-8 animate-fade-in">
            {/* PART 1: TIMELINE & DRUG LIST */}
            <div className="print-section">
                <h2 className="text-sm font-bold text-indigo-600 uppercase tracking-wider mb-4 border-b border-indigo-100 pb-2">
                    1. Drug Timeline Analysis
                </h2>
                
                {/* Global Date Input */}
                <div className="mb-4 flex items-center gap-3 bg-indigo-50 p-3 rounded-lg border border-indigo-100">
                    <label className="text-xs font-bold text-indigo-800">FEVER ONSET DATE:</label>
                    <input 
                        type="date" 
                        className="border p-1.5 rounded text-sm font-bold text-indigo-700 focus:ring-2 focus:ring-indigo-300 outline-none"
                        value={feverDate}
                        onChange={e => setFeverDate(e.target.value)}
                    />
                    <span className="text-[10px] text-indigo-400">(Required for calculation)</span>
                </div>

                <div className="bg-white p-4 rounded-xl border border-slate-200 mb-4 shadow-sm print:hidden">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-2 items-end">
                        <div className="md:col-span-2">
                            <label className="text-[10px] font-bold text-slate-500">Drug Name</label>
                            <input type="text" className="w-full border p-2 rounded text-xs" placeholder="e.g., Ceftriaxone" value={currentDrug.name} onChange={e => setCurrentDrug({...currentDrug, name: e.target.value})} />
                        </div>
                        <div>
                            <label className="text-[10px] font-bold text-slate-500">Start Date</label>
                            <input type="date" className="w-full border p-2 rounded text-xs" value={currentDrug.startDate} onChange={e => setCurrentDrug({...currentDrug, startDate: e.target.value})} />
                        </div>
                        <div>
                            <label className="text-[10px] font-bold text-slate-500">Stop Date (Optional)</label>
                            <input type="date" className="w-full border p-2 rounded text-xs" value={currentDrug.stopDate} onChange={e => setCurrentDrug({...currentDrug, stopDate: e.target.value})} />
                        </div>
                    </div>
                    <button onClick={handleAddDrug} className="mt-3 w-full bg-indigo-600 text-white rounded py-2 text-xs font-bold shadow hover:bg-indigo-700 transition">
                        + Add Drug to Timeline
                    </button>
                </div>

                <div className="border border-slate-200 rounded-lg overflow-hidden text-sm shadow-sm">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 text-slate-500 font-bold text-xs uppercase">
                            <tr>
                                <th className="p-3">Drug</th>
                                <th className="p-3">Start - Stop</th>
                                <th className="p-3 text-center">Lag Time (Days)</th>
                                <th className="p-3 text-center">Analysis</th>
                                <th className="p-3 text-center">Act</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {drugEntries.length === 0 ? (
                                <tr><td colSpan="5" className="p-6 text-center text-slate-400 italic">No drugs added yet.</td></tr>
                            ) : (
                                drugEntries.map(e => (
                                    <tr key={e.id} className="hover:bg-slate-50">
                                        <td className="p-3 font-bold text-slate-700">{e.name}</td>
                                        <td className="p-3 text-xs text-slate-500">
                                            {e.startDate} <span className="mx-1">→</span> {e.stopDate || 'Ongoing'}
                                        </td>
                                        <td className="p-3 text-center">
                                            <span className={`px-2 py-1 rounded text-xs font-bold ${e.lagTime > 0 ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-400'}`}>
                                                {e.lagTime > 0 ? `Day ${e.lagTime}` : e.lagTime}
                                            </span>
                                        </td>
                                        <td className="p-3 text-center text-xs">
                                            {/* Simple logic highlight */}
                                            {e.lagTime >= 7 && e.lagTime <= 14 && <span className="text-red-500 font-bold">High Risk (7-14d)</span>}
                                            {e.lagTime >= 2 && e.lagTime < 7 && <span className="text-orange-500">Possible</span>}
                                        </td>
                                        <td className="p-3 text-center text-red-400 cursor-pointer font-bold hover:bg-red-50" onClick={() => setDrugEntries(drugEntries.filter(x => x.id !== e.id))}>×</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* PART 2: CRITERIA ASSESSMENT */}
            <div className="print-section">
                <h2 className="text-sm font-bold text-indigo-600 uppercase tracking-wider mb-2 border-b border-indigo-100 pb-2 flex justify-between items-center">
                    <span>2. Criteria Assessment</span>
                    <span className={`px-3 py-1 rounded text-white text-xs font-bold ${totalScore >= 3 ? 'bg-green-500' : 'bg-slate-400'}`}>
                        Result: {totalScore >= 3 ? 'Likely Drug Fever' : 'Monitor'}
                    </span>
                </h2>
                
                <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                    <table className="w-full text-xs">
                        <thead className="bg-indigo-50 text-indigo-700 font-bold">
                            <tr>
                                <th className="p-3 text-left w-2/3">Criteria Question</th>
                                <th className="p-3 text-center w-16">Yes</th>
                                <th className="p-3 text-center w-16">No</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {feverCriteria.map((q) => (
                                <tr key={q.id} className="hover:bg-slate-50 transition">
                                    <td className="p-3 text-slate-700 font-medium">{q.q}</td>
                                    <td className="p-3 text-center relative">
                                        <input 
                                            type="radio" 
                                            name={`df_q${q.id}`} 
                                            checked={answers[q.id] === q.y} 
                                            onChange={() => handleAnswer(q.id, q.y)} 
                                            className="w-4 h-4 accent-indigo-600 cursor-pointer"
                                        />
                                    </td>
                                    <td className="p-3 text-center relative">
                                        <input 
                                            type="radio" 
                                            name={`df_q${q.id}`} 
                                            checked={answers[q.id] === q.n} 
                                            onChange={() => handleAnswer(q.id, q.n)} 
                                            className="w-4 h-4 accent-red-500 cursor-pointer"
                                        />
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                
                <div className="mt-4 p-3 bg-yellow-50 text-yellow-800 text-xs border border-yellow-200 rounded">
                    <strong>Note:</strong> Drug fever typically resolves within 72 hours of discontinuation. If fever persists {">"}72h, consider other causes (Infection, etc.).
                </div>
            </div>
        </div>
    );
};

export default DrugFeverAssessment;