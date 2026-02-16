import React, { useState, useEffect } from 'react';

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
        1: "4-12 weeks",
        1.1: "> 12 weeks"
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

const SamsRow = ({ label, value, score }) => (
    <tr className="border-b border-slate-100 last:border-0">
        <td className="py-2 pl-4 w-[60%] font-bold text-slate-700 text-sm">{label}</td>
        <td className="py-2 pr-4 w-[40%] text-right">
            <span className="text-xs text-slate-500 mr-2">{value}</span>
            <span className={`font-bold text-sm border px-2 rounded inline-block ${score > 0 ? 'text-teal-700 bg-teal-50 border-teal-200' : 'text-slate-500 bg-slate-50 border-slate-200'}`}>
                {score}
            </span>
        </td>
    </tr>
);

// ✅ ปรับให้รับ props: onAnalysisComplete
const SamsAssessment = ({ onAnalysisComplete }) => {
    const [answers, setAnswers] = useState({
        distribution: 3,
        onset: 3,
        dechallenge: 2,
        rechallenge: 0
    });

    const [result, setResult] = useState(null);

    useEffect(() => {
        const getScore = (val) => Math.floor(parseFloat(val));
        
        const breakdown = {
            distribution: getScore(answers.distribution),
            onset: getScore(answers.onset),
            dechallenge: getScore(answers.dechallenge),
            rechallenge: getScore(answers.rechallenge)
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

        // ✅ ส่งข้อมูลกลับไปให้ AssessmentForm เพื่อบันทึก
        if (onAnalysisComplete) {
            onAnalysisComplete({
                score: total,
                interpretation: text,
                answers: answers, // บันทึกคำตอบเก็บไว้
                breakdown: breakdown
            });
        }

    }, [answers]); // เอา onAnalysisComplete ออกจาก dependency เพื่อป้องกัน loop

    const handleChange = (field, value) => {
        setAnswers(prev => ({ ...prev, [field]: value }));
    };

    return (
        <div className="space-y-8 animate-fade-in">
            {/* INPUT SECTION */}
            <div className="print-section">
                <h2 className="text-sm font-bold text-teal-600 uppercase tracking-wider mb-4 border-b border-teal-100 pb-2">
                    2. SAMS-CI Assessment (Clinical Index)
                </h2>
                
                <div className="bg-teal-50 p-6 rounded-xl border border-teal-100 mb-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="text-xs text-slate-500 font-bold block mb-1">1. DISTRIBUTION OF SYMPTOMS</label>
                        <select className="w-full text-sm border-slate-300 rounded-md p-2" value={answers.distribution} onChange={e => handleChange('distribution', e.target.value)}>
                            {Object.entries(samsCriteria.distribution).map(([score, label]) => (
                                <option key={score} value={score}>{label} ({Math.floor(score)} pts)</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="text-xs text-slate-500 font-bold block mb-1">2. TIMING OF SYMPTOM ONSET</label>
                        <select className="w-full text-sm border-slate-300 rounded-md p-2" value={answers.onset} onChange={e => handleChange('onset', e.target.value)}>
                            {Object.entries(samsCriteria.onset).map(([score, label]) => (
                                <option key={score} value={score}>{label} ({Math.floor(score)} pts)</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="text-xs text-slate-500 font-bold block mb-1">3. DECHALLENGE</label>
                        <select className="w-full text-sm border-slate-300 rounded-md p-2" value={answers.dechallenge} onChange={e => handleChange('dechallenge', e.target.value)}>
                            {Object.entries(samsCriteria.dechallenge).sort((a,b) => b[0]-a[0]).map(([score, label]) => (
                                <option key={score} value={score}>{label} ({score} pts)</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="text-xs text-slate-500 font-bold block mb-1">4. RECHALLENGE</label>
                        <select className="w-full text-sm border-slate-300 rounded-md p-2" value={answers.rechallenge} onChange={e => handleChange('rechallenge', e.target.value)}>
                            {Object.entries(samsCriteria.rechallenge).sort((a,b) => b[0]-a[0]).map(([score, label]) => (
                                <option key={score} value={score}>{label} ({score} pts)</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {/* RESULT SECTION */}
            {result && (
                <div className="animate-slide-up print-section break-inside-avoid">
                    <div className="border-2 border-teal-500 rounded-xl overflow-hidden shadow-sm bg-white">
                        <div className={`${result.colorClass} text-white px-5 py-4 flex justify-between items-center print:text-black print:bg-white print:border-b-2 print:border-teal-600`}>
                            <div>
                                <h3 className="text-xl font-bold">SAMS-CI Score</h3>
                                <p className="text-xs text-white/80 print:text-black/60">Likelihood of statin involvement</p>
                            </div>
                            <div className="text-right">
                                <div className="text-4xl font-bold">{result.total}</div>
                                <div className="text-sm font-bold uppercase tracking-wide bg-black/20 px-3 py-1 rounded inline-block print:bg-slate-100 print:text-black">
                                    {result.text}
                                </div>
                            </div>
                        </div>
                        <div className="bg-white p-2">
                            <table className="w-full table-fixed">
                                <tbody>
                                    <SamsRow label="1. Distribution & Pattern" value="Score" score={result.breakdown.distribution} />
                                    <SamsRow label="2. Timing of Onset" value="Score" score={result.breakdown.onset} />
                                    <SamsRow label="3. Dechallenge (Withdrawal)" value="Score" score={result.breakdown.dechallenge} />
                                    <SamsRow label="4. Rechallenge (Restart)" value="Score" score={result.breakdown.rechallenge} />
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SamsAssessment;