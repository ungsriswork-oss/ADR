import React, { useState, useEffect } from 'react';

// Naranjo Scale Questions (เหมือนกัน แต่แยกไฟล์เพื่ออนาคตอาจปรับคำถามเฉพาะทาง)
const naranjoQuestions = [
    { id: 1, q: "1. Are there previous conclusive reports on this reaction?", y: 1, n: 0, u: 0 },
    { id: 2, q: "2. Did the adverse event appear after the suspected drug was administered?", y: 2, n: -1, u: 0 },
    { id: 3, q: "3. Did the adverse reaction improve when the drug was discontinued (Dechallenge)?", y: 1, n: 0, u: 0 },
    { id: 4, q: "4. Did the adverse reaction reappear when the drug was re-administered (Rechallenge)?", y: 2, n: -1, u: 0 },
    { id: 5, q: "5. Are there alternative causes (other than the drug) that could on their own have caused the reaction?", y: -1, n: 2, u: 0 },
    { id: 6, q: "6. Did the reaction reappear when a placebo was given?", y: -1, n: 1, u: 0 },
    { id: 7, q: "7. Was the drug detected in blood (or other fluids) in concentrations known to be toxic?", y: 1, n: 0, u: 0 },
    { id: 8, q: "8. Was the reaction more severe when the dose was increased or less severe when the dose was decreased?", y: 1, n: 0, u: 0 },
    { id: 9, q: "9. Did the patient have a similar reaction to the same or similar drugs in any previous exposure?", y: 1, n: 0, u: 0 },
    { id: 10, q: "10. Was the adverse event confirmed by any objective evidence?", y: 1, n: 0, u: 0 }
];

const ElectroAssessment = ({ onAnalysisComplete }) => {
    const [answers, setAnswers] = useState({});
    const [drugName, setDrugName] = useState('');
    const [imbalanceType, setImbalanceType] = useState('Hyponatremia');
    const [totalScore, setTotalScore] = useState(0);

    const handleAnswer = (qid, val) => {
        setAnswers(prev => ({ ...prev, [qid]: val }));
    };

    useEffect(() => {
        const score = Object.values(answers).reduce((a, b) => a + b, 0);
        setTotalScore(score);

        let interp = "Doubtful (< 1)";
        if (score >= 9) interp = "Definite (≥ 9)";
        else if (score >= 5) interp = "Probable (5-8)";
        else if (score >= 1) interp = "Possible (1-4)";

        if(onAnalysisComplete) {
            onAnalysisComplete({ 
                rFactor: score, 
                type: interp, 
                // บันทึกชื่อยา + ประเภทความผิดปกติ
                rankedDrugs: [{ name: `${drugName || 'Drug'} (${imbalanceType})`, total: score }] 
            });
        }
    }, [answers, drugName, imbalanceType]);

    return (
        <div className="space-y-6 animate-fade-in">
            <h2 className="text-sm font-bold text-yellow-600 uppercase border-b border-yellow-100 pb-2 flex justify-between items-center">
                <span>Electrolyte Imbalance Assessment</span>
                <span className={`px-3 py-1 rounded text-white text-xs ${totalScore>=5?'bg-green-500':'bg-slate-400'}`}>Score: {totalScore}</span>
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div className="md:col-span-2">
                    <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Suspected Drug Name</label>
                    <input type="text" className="w-full border p-2 rounded text-sm focus:ring-2 focus:ring-yellow-200 outline-none" value={drugName} onChange={e=>setDrugName(e.target.value)} placeholder="Enter drug name..." />
                </div>
                <div>
                    <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Imbalance Type</label>
                    <select className="w-full border p-2 rounded text-sm" value={imbalanceType} onChange={e=>setImbalanceType(e.target.value)}>
                        <option value="Hyponatremia">Hyponatremia (Low Na)</option>
                        <option value="Hypernatremia">Hypernatremia (High Na)</option>
                        <option value="Hypokalemia">Hypokalemia (Low K)</option>
                        <option value="Hyperkalemia">Hyperkalemia (High K)</option>
                        <option value="Hypomagnesemia">Hypomagnesemia (Low Mg)</option>
                        <option value="Other">Other</option>
                    </select>
                </div>
            </div>

            <div className="bg-white border rounded-xl overflow-hidden shadow-sm">
                <table className="w-full text-sm">
                    <thead className="bg-yellow-50 text-yellow-700 font-bold">
                        <tr>
                            <th className="p-3 text-left w-2/3">Naranjo Question</th>
                            <th className="p-3 text-center w-16">Yes</th>
                            <th className="p-3 text-center w-16">No</th>
                            <th className="p-3 text-center w-16">Unk</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {naranjoQuestions.map((q) => (
                            <tr key={q.id} className="hover:bg-slate-50 transition">
                                <td className="p-3 text-slate-700">{q.q}</td>
                                <td className="p-3 text-center">
                                    <label className="cursor-pointer block">
                                        <input type="radio" name={`eq${q.id}`} checked={answers[q.id]===q.y} onChange={()=>handleAnswer(q.id, q.y)} className="accent-yellow-500" />
                                        <div className="text-[9px] text-slate-400 mt-1">({q.y})</div>
                                    </label>
                                </td>
                                <td className="p-3 text-center">
                                    <label className="cursor-pointer block">
                                        <input type="radio" name={`eq${q.id}`} checked={answers[q.id]===q.n} onChange={()=>handleAnswer(q.id, q.n)} className="accent-yellow-500" />
                                        <div className="text-[9px] text-slate-400 mt-1">({q.n})</div>
                                    </label>
                                </td>
                                <td className="p-3 text-center">
                                    <label className="cursor-pointer block">
                                        <input type="radio" name={`eq${q.id}`} checked={answers[q.id]===q.u} onChange={()=>handleAnswer(q.id, q.u)} className="accent-yellow-500" />
                                        <div className="text-[9px] text-slate-400 mt-1">({q.u})</div>
                                    </label>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default ElectroAssessment;