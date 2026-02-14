import React, { useState, useEffect } from 'react';

// --- 1. CONFIGURATION: EuroSCAR Criteria ---
const criteriaOptions = {
    morphology: {
        pustules: { 2: "Typical (Non-follicular)", 1: "Compatible", 0: "No / Unknown" },
        erythema: { 2: "Typical", 1: "Compatible", 0: "No / Unknown" },
        distribution: { 2: "Typical", 1: "Compatible", 0: "No / Unknown" },
        desquamation: { 1: "Yes", 0: "No" }
    },
    clinical: {
        mucosal: { 0: "No", '-2': "Yes (Mucosal Involvement)" }, // AGEP มักไม่มี mucosal
        onset: { 2: "Acute (< 10 days)", '-2': "Not acute (> 10 days)" },
        resolution: { 2: "Resolution < 15 days", '-2': "Prolonged" },
        fever: { 1: "Yes (> 38°C)", '-1': "No" },
        lab: { 1: "Neutrophils > 7,000", '-1': "Neutrophils ≤ 7,000" }
    }
};

// --- 2. SUB-COMPONENTS ---
const AgepRow = ({ label, value, score }) => (
    <tr className="border-b border-slate-100 last:border-0">
        <td className="py-2 pl-4 w-[50%] font-bold text-slate-700 text-sm">{label}</td>
        <td className="py-2 pr-4 w-[50%] text-right">
            <span className="text-xs text-slate-500 mr-2">{value}</span>
            <span className={`font-bold text-sm border px-2 rounded inline-block ${score >= 0 ? 'text-teal-700 bg-teal-50 border-teal-200' : 'text-red-500 bg-red-50 border-red-200'}`}>
                {score > 0 ? `+${score}` : score}
            </span>
        </td>
    </tr>
);

const AgepCard = ({ drug, result }) => (
    <div className="print-section border-2 border-teal-500 rounded-xl overflow-hidden shadow-sm bg-white mb-6 break-inside-avoid">
        <div className="bg-teal-600 text-white px-5 py-3 flex justify-between items-center print:text-black print:bg-white print:border-b-2 print:border-teal-600">
            <div><h3 className="text-xl font-bold">{drug.name}</h3></div>
            <div className="text-right">
                <div className="text-3xl font-bold">{result.total}</div>
                <div className="text-sm font-bold uppercase tracking-wide bg-black/20 px-2 py-1 rounded inline-block print:bg-slate-100 print:text-black">{result.text}</div>
            </div>
        </div>
        <div className="bg-white p-2">
            <table className="w-full table-fixed">
                <tbody>
                    <AgepRow label="1. Morphology (Pustules/Erythema)" value="Combined Score" score={result.breakdown.morphology} />
                    <AgepRow label="2. Fever (>38°C)" value={`${result.maxTemp}°C`} score={result.breakdown.fever} />
                    <AgepRow label="3. Neutrophils (>7,000)" value={result.maxNeutro} score={result.breakdown.neutro} />
                    <AgepRow label="4. Mucosal Involvement" value={result.hasMucosal ? "Yes" : "No"} score={result.breakdown.mucosal} />
                    <AgepRow label="5. Acute Onset (<10 days)" value={result.isAcute ? "Yes" : "No"} score={result.breakdown.onset} />
                    <AgepRow label="6. Resolution (<15 days)" value={result.isResolved ? "Yes" : "No"} score={result.breakdown.resolution} />
                </tbody>
            </table>
        </div>
    </div>
);

// --- 3. MAIN COMPONENT ---
const AgepAssessment = ({ patientData, analyzeCount, onAnalysisComplete }) => {
  // Inputs
  const [labEntries, setLabEntries] = useState([]);
  const [drugList, setDrugList] = useState([]);
  const [currentEntry, setCurrentEntry] = useState({ date: '', temp: '', neutro: '' });
  const [currentDrug, setCurrentDrug] = useState({ name: '', startDate: '', stopDate: '' });
  const [symptomDate, setSymptomDate] = useState('');

  // Manual Checks
  const [manual, setManual] = useState({
      pustules: 2, erythema: 2, distribution: 2, desquamation: 0, // Morphology
      mucosal: false, resolution15d: true
  });

  const [result, setResult] = useState(null);

  // Handlers
  const handleAddEntry = () => {
      if(!currentEntry.date) return alert("Date required");
      setLabEntries([...labEntries, { ...currentEntry, id: Date.now() }].sort((a,b)=>new Date(a.date)-new Date(b.date)));
      setCurrentEntry({ date: '', temp: '', neutro: '' });
  };
  const handleAddDrug = () => {
      if(!currentDrug.name) return;
      setDrugList([...drugList, { ...currentDrug, id: Date.now() }]);
      setCurrentDrug({ name: '', startDate: '', stopDate: '' });
  };

  // --- CALCULATION LOGIC (EuroSCAR) ---
  useEffect(() => {
      if (analyzeCount > 0) {
          // 1. Lab Peak
          let maxTemp = 0, maxNeutro = 0;
          labEntries.forEach(e => {
              if (parseFloat(e.temp) > maxTemp) maxTemp = parseFloat(e.temp);
              if (parseFloat(e.neutro) > maxNeutro) maxNeutro = parseFloat(e.neutro);
          });

          // 2. Timeline Check (Onset < 10 days?)
          let isAcute = false;
          if (symptomDate && drugList.length > 0) {
              // Check if ANY drug started within 10 days before onset
              isAcute = drugList.some(d => {
                  const diff = (new Date(symptomDate) - new Date(d.startDate)) / 86400000;
                  return diff >= 0 && diff <= 10;
              });
          }

          // 3. Scoring
          const bd = {
              morphology: parseInt(manual.pustules) + parseInt(manual.erythema) + parseInt(manual.distribution) + parseInt(manual.desquamation),
              fever: maxTemp > 38 ? 1 : -1,
              neutro: maxNeutro > 7000 ? 1 : -1,
              mucosal: manual.mucosal ? -2 : 0,
              onset: isAcute ? 2 : -2,
              resolution: manual.resolution15d ? 2 : -2
          };

          const total = Object.values(bd).reduce((a,b) => a+b, 0);

          let text = "Excluded (≤ 0)";
          if (total >= 1 && total <= 4) text = "Possible (1-4)";
          else if (total >= 5 && total <= 7) text = "Probable (5-7)";
          else if (total >= 8 && total <= 12) text = "Definite (8-12)";

          const finalRes = { total, text, breakdown: bd, maxTemp, maxNeutro, hasMucosal: manual.mucosal, isAcute, isResolved: manual.resolution15d };
          setResult(finalRes);

          if (onAnalysisComplete) {
              const ranked = drugList.map(d => ({ name: d.name, total }));
              onAnalysisComplete({ 
                  rFactor: total, type: text, rankedDrugs: ranked, 
                  labEntries, drugList, symptomDate, manual, scores: bd 
              });
          }
      }
  }, [analyzeCount]);

  return (
    <div className="space-y-8 animate-fade-in">
        {/* SECTION 1: CLINICAL & LAB */}
        <div className="print-section">
            <h2 className="text-sm font-bold text-teal-600 uppercase tracking-wider mb-4 border-b border-teal-100 pb-2">2. Clinical & Morphology (EuroSCAR)</h2>
            
            {/* Manual Morphology */}
            <div className="bg-teal-50 p-4 rounded-xl border border-teal-100 mb-4 grid grid-cols-2 md:grid-cols-4 gap-4">
                <div><label className="text-[10px] text-slate-500 font-bold block mb-1">PUSTULES</label><select className="w-full text-xs border rounded p-1" value={manual.pustules} onChange={e=>setManual({...manual, pustules: e.target.value})}>{Object.entries(criteriaOptions.morphology.pustules).map(([k,v])=><option key={k} value={k}>{v} ({k})</option>)}</select></div>
                <div><label className="text-[10px] text-slate-500 font-bold block mb-1">ERYTHEMA</label><select className="w-full text-xs border rounded p-1" value={manual.erythema} onChange={e=>setManual({...manual, erythema: e.target.value})}>{Object.entries(criteriaOptions.morphology.erythema).map(([k,v])=><option key={k} value={k}>{v} ({k})</option>)}</select></div>
                <div><label className="text-[10px] text-slate-500 font-bold block mb-1">DISTRIBUTION</label><select className="w-full text-xs border rounded p-1" value={manual.distribution} onChange={e=>setManual({...manual, distribution: e.target.value})}>{Object.entries(criteriaOptions.morphology.distribution).map(([k,v])=><option key={k} value={k}>{v} ({k})</option>)}</select></div>
                <div className="flex flex-col justify-end gap-2">
                    <label className="flex items-center gap-2 text-xs cursor-pointer"><input type="checkbox" checked={manual.desquamation === 1} onChange={e=>setManual({...manual, desquamation: e.target.checked?1:0})} /> Post-pustular Desquamation (+1)</label>
                    <label className="flex items-center gap-2 text-xs cursor-pointer text-red-600"><input type="checkbox" checked={manual.mucosal} onChange={e=>setManual({...manual, mucosal: e.target.checked})} /> Mucosal Involvement (-2)</label>
                    <label className="flex items-center gap-2 text-xs cursor-pointer text-green-600"><input type="checkbox" checked={manual.resolution15d} onChange={e=>setManual({...manual, resolution15d: e.target.checked})} /> Resolution &lt; 15 days (+2)</label>
                </div>
            </div>

            {/* Lab Input */}
            <div className="bg-white p-3 border rounded-lg mb-4 print:hidden">
                <div className="flex gap-2 items-end">
                    <div className="w-32"><label className="text-[10px] text-slate-500 font-bold">DATE</label><input type="date" className="border p-1 rounded w-full text-xs" value={currentEntry.date} onChange={e=>setCurrentEntry({...currentEntry, date: e.target.value})} /></div>
                    <div className="w-24"><label className="text-[10px] text-slate-500 font-bold">TEMP (°C)</label><input type="number" className="border p-1 rounded w-full text-xs" placeholder="38.5" value={currentEntry.temp} onChange={e=>setCurrentEntry({...currentEntry, temp: e.target.value})} /></div>
                    <div className="w-24"><label className="text-[10px] text-slate-500 font-bold">NEUTROPHIL</label><input type="number" className="border p-1 rounded w-full text-xs" placeholder="7500" value={currentEntry.neutro} onChange={e=>setCurrentEntry({...currentEntry, neutro: e.target.value})} /></div>
                    <button onClick={handleAddEntry} className="bg-teal-600 text-white rounded px-3 py-1 text-xs font-bold hover:bg-teal-700 h-7">+ Add</button>
                </div>
            </div>
            
            {/* Lab Table */}
            <div className="border rounded-lg overflow-hidden text-xs">
                <table className="w-full text-left"><thead className="bg-slate-50"><tr><th className="p-2">Date</th><th className="p-2">Temp</th><th className="p-2">Neutrophils</th></tr></thead>
                <tbody>{labEntries.map((e,i)=><tr key={i} className="border-t"><td className="p-2">{e.date}</td><td className={`p-2 font-bold ${e.temp>38?'text-red-500':''}`}>{e.temp}</td><td className={`p-2 font-bold ${e.neutro>7000?'text-red-500':''}`}>{e.neutro}</td></tr>)}</tbody></table>
            </div>
        </div>

        {/* SECTION 2: DRUGS & ONSET */}
        <div className="print-section">
            <h2 className="text-sm font-bold text-teal-600 uppercase tracking-wider mb-4 border-b border-teal-100 pb-2">3. Timeline</h2>
            <div className="flex items-center gap-4 mb-4"><label className="text-sm font-bold text-slate-700">Onset Date:</label><input type="date" value={symptomDate} onChange={e=>setSymptomDate(e.target.value)} className="border p-1 rounded font-bold text-teal-700" /></div>
            
            <div className="bg-white p-3 border rounded-lg mb-4 print:hidden">
                <div className="flex gap-2 items-end">
                    <div className="flex-1"><label className="text-[10px] text-slate-500 font-bold">DRUG NAME</label><input type="text" className="border p-1 rounded w-full text-xs" value={currentDrug.name} onChange={e=>setCurrentDrug({...currentDrug, name: e.target.value})} /></div>
                    <div className="w-32"><label className="text-[10px] text-slate-500 font-bold">START</label><input type="date" className="border p-1 rounded w-full text-xs" value={currentDrug.startDate} onChange={e=>setCurrentDrug({...currentDrug, startDate: e.target.value})} /></div>
                    <div className="w-32"><label className="text-[10px] text-slate-500 font-bold">STOP</label><input type="date" className="border p-1 rounded w-full text-xs" value={currentDrug.stopDate} onChange={e=>setCurrentDrug({...currentDrug, stopDate: e.target.value})} /></div>
                    <button onClick={handleAddDrug} className="bg-teal-600 text-white rounded px-3 py-1 text-xs font-bold hover:bg-teal-700 h-7">+ Add</button>
                </div>
            </div>
        </div>

        {/* SECTION 3: RESULT */}
        {result && (
            <div className="animate-slide-up">
                <h2 className="text-sm font-bold text-teal-600 uppercase tracking-wider mb-4 border-b border-teal-100 pb-2">4. EuroSCAR Assessment</h2>
                {drugList.map((drug, i) => <AgepCard key={i} drug={drug} result={result} />)}
            </div>
        )}
    </div>
  );
};

export default AgepAssessment;