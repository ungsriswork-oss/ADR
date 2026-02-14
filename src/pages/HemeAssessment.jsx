import React, { useState, useEffect } from 'react';

// Naranjo Logic (Embedded for Hematologic)
const naranjoQuestions = [
    { id: 1, q: "1. Previous conclusive reports?", y: 1, n: 0, u: 0 },
    { id: 2, q: "2. Appeared after suspected drug?", y: 2, n: -1, u: 0 },
    { id: 3, q: "3. Improved on discontinuation (Dechallenge)?", y: 1, n: 0, u: 0 },
    { id: 4, q: "4. Reappeared on readministration (Rechallenge)?", y: 2, n: -1, u: 0 },
    { id: 5, q: "5. Alternative causes excluded?", y: -1, n: 2, u: 0 },
    { id: 6, q: "6. Reappeared with placebo?", y: -1, n: 1, u: 0 },
    { id: 7, q: "7. Drug detected in toxic concentration?", y: 1, n: 0, u: 0 },
    { id: 8, q: "8. Severity changed with dose?", y: 1, n: 0, u: 0 },
    { id: 9, q: "9. Previous similar reaction?", y: 1, n: 0, u: 0 },
    { id: 10, q: "10. Confirmed by objective evidence?", y: 1, n: 0, u: 0 }
];

const HemeAssessment = ({ onAnalysisComplete }) => {
    // 1. Lab Monitoring
    const [labEntries, setLabEntries] = useState([]);
    const [currentEntry, setCurrentEntry] = useState({ date: '', hb: '', wbc: '', plt: '' });

    // 2. Causality (Naranjo)
    const [answers, setAnswers] = useState({});
    const [drugName, setDrugName] = useState('');
    const [totalScore, setTotalScore] = useState(0);

    const handleAddLab = () => {
        if(!currentEntry.date) return alert("Please select date");
        setLabEntries([...labEntries, {...currentEntry, id: Date.now()}].sort((a,b)=>new Date(a.date)-new Date(b.date)));
        setCurrentEntry({ date: '', hb: '', wbc: '', plt: '' });
    };

    const handleAnswer = (qid, val) => {
        setAnswers(prev => ({ ...prev, [qid]: val }));
    };

    // Calculate Score & Send to Parent
    useEffect(() => {
        const score = Object.values(answers).reduce((a, b) => a + b, 0);
        setTotalScore(score);

        let interp = "Doubtful";
        if (score >= 9) interp = "Definite";
        else if (score >= 5) interp = "Probable";
        else if (score >= 1) interp = "Possible";

        if(onAnalysisComplete) {
            onAnalysisComplete({
                rFactor: score,
                type: interp,
                rankedDrugs: [{ name: drugName || 'Suspected Drug', total: score }],
                labEntries // Save Lab Data too
            });
        }
    }, [answers, drugName, labEntries]);

    return (
        <div className="space-y-8 animate-fade-in">
            {/* PART 1: LAB MONITORING */}
            <div className="print-section">
                <h2 className="text-sm font-bold text-rose-600 uppercase tracking-wider mb-4 border-b border-rose-100 pb-2">1. Serial Hematologic Monitoring</h2>
                
                <div className="bg-rose-50 p-4 rounded-xl border border-rose-100 mb-4 print:hidden">
                    <div className="grid grid-cols-4 gap-2 items-end">
                        <div><label className="text-[10px] font-bold text-slate-500">Date</label><input type="date" className="w-full border p-1 rounded text-xs" value={currentEntry.date} onChange={e=>setCurrentEntry({...currentEntry, date: e.target.value})} /></div>
                        <div><label className="text-[10px] font-bold text-slate-500">Hb (g/dL)</label><input type="number" className="w-full border p-1 rounded text-xs" placeholder="12.0" value={currentEntry.hb} onChange={e=>setCurrentEntry({...currentEntry, hb: e.target.value})} /></div>
                        <div><label className="text-[10px] font-bold text-slate-500">WBC</label><input type="number" className="w-full border p-1 rounded text-xs" placeholder="5000" value={currentEntry.wbc} onChange={e=>setCurrentEntry({...currentEntry, wbc: e.target.value})} /></div>
                        <div><label className="text-[10px] font-bold text-slate-500">Platelet</label><input type="number" className="w-full border p-1 rounded text-xs" placeholder="150000" value={currentEntry.plt} onChange={e=>setCurrentEntry({...currentEntry, plt: e.target.value})} /></div>
                    </div>
                    <button onClick={handleAddLab} className="mt-2 w-full bg-rose-600 text-white rounded py-1.5 text-xs font-bold shadow hover:bg-rose-700">+ Add Lab Value</button>
                </div>

                <div className="border border-slate-200 rounded-lg overflow-hidden text-sm">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 text-slate-500 font-bold text-xs uppercase"><tr><th className="p-3">Date</th><th className="p-3">Hb</th><th className="p-3">WBC</th><th className="p-3">Platelet</th><th className="p-3 text-center">Act</th></tr></thead>
                        <tbody className="divide-y divide-slate-100">
                            {labEntries.length === 0 ? <tr><td colSpan="5" className="p-4 text-center text-slate-400 italic">No lab data recorded.</td></tr> : 
                            labEntries.map(e => (
                                <tr key={e.id}>
                                    <td className="p-3">{e.date}</td>
                                    <td className={`p-3 font-bold ${e.hb<10?'text-red-500':''}`}>{e.hb}</td>
                                    <td className={`p-3 font-bold ${e.wbc<4000?'text-red-500':''}`}>{e.wbc}</td>
                                    <td className={`p-3 font-bold ${e.plt<100000?'text-red-500':''}`}>{e.plt}</td>
                                    <td className="p-3 text-center text-red-400 cursor-pointer font-bold" onClick={()=>setLabEntries(labEntries.filter(x=>x.id!==e.id))}>×</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* PART 2: NARANJO ASSESSMENT */}
            <div className="print-section">
                <h2 className="text-sm font-bold text-rose-600 uppercase tracking-wider mb-2 border-b border-rose-100 pb-2 flex justify-between">
                    <span>2. Causality Assessment</span>
                    <span className={`px-2 py-0.5 rounded text-white text-xs ${totalScore>=5?'bg-green-500':'bg-slate-400'}`}>Score: {totalScore}</span>
                </h2>
                
                <div className="mb-4">
                    <input type="text" className="w-full border p-2 rounded text-sm focus:ring-2 focus:ring-rose-200 outline-none" value={drugName} onChange={e=>setDrugName(e.target.value)} placeholder="Suspected Drug Name..." />
                </div>

                <div className="bg-white border rounded-xl overflow-hidden shadow-sm">
                    <table className="w-full text-xs">
                        <thead className="bg-rose-50 text-rose-700 font-bold">
                            <tr><th className="p-3 text-left w-2/3">Question</th><th className="p-3 text-center">Yes</th><th className="p-3 text-center">No</th><th className="p-3 text-center">Unk</th></tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {naranjoQuestions.map((q) => (
                                <tr key={q.id} className="hover:bg-slate-50">
                                    <td className="p-3">{q.q}</td>
                                    <td className="p-3 text-center"><input type="radio" name={`h_q${q.id}`} checked={answers[q.id]===q.y} onChange={()=>handleAnswer(q.id, q.y)} className="accent-rose-500"/> <span className="text-[9px] text-slate-400">({q.y})</span></td>
                                    <td className="p-3 text-center"><input type="radio" name={`h_q${q.id}`} checked={answers[q.id]===q.n} onChange={()=>handleAnswer(q.id, q.n)} className="accent-rose-500"/> <span className="text-[9px] text-slate-400">({q.n})</span></td>
                                    <td className="p-3 text-center"><input type="radio" name={`h_q${q.id}`} checked={answers[q.id]===q.u} onChange={()=>handleAnswer(q.id, q.u)} className="accent-rose-500"/> <span className="text-[9px] text-slate-400">({q.u})</span></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default HemeAssessment;