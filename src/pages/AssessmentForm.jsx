import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';

import DiliAssessment        from './DiliAssessment';
import DressAssessment       from './DressAssessment';
import AgepAssessment        from './AgepAssessment';
import SjsAssessment         from './SjsAssessment';
import HemeAssessment        from './HemeAssessment';
import RashAssessment        from './RashAssessment';
import ElectroAssessment     from './ElectroAssessment';
import SamsAssessment        from './SamsAssessment';
import DrugFeverAssessment   from './DrugFeverAssessment';
import PancreatitisAssessment from './PancreatitisAssessment';

const CFG = {
  dili:         { title: 'DILI Assessment',           scale: 'RUCAM',    bg: '#fff0e4', color: '#c4620a', border: '#f5cfa8' },
  dress:        { title: 'DRESS Syndrome',            scale: 'RegiSCAR', bg: '#f0eeff', color: '#4a3ab8', border: '#cec8f6' },
  agep:         { title: 'AGEP',                      scale: 'EuroSCAR', bg: '#e6f4f1', color: '#1a6b62', border: '#b2ddd7' },
  sjs:          { title: 'SJS / TEN',                 scale: 'ALDEN',    bg: '#fdf0ee', color: '#8c3322', border: '#f5b8b8' },
  rash:         { title: 'Drug Rash',                 scale: 'Naranjo',  bg: '#fbeaf0', color: '#9b3060', border: '#f4c0d1' },
  electro:      { title: 'Electrolyte Imbalance',     scale: 'Naranjo',  bg: '#fef6e4', color: '#9b6e00', border: '#f0d98a' },
  heme:         { title: 'Hematologic Disorder',      scale: 'Naranjo',  bg: '#fbeaf0', color: '#9b3060', border: '#f4c0d1' },
  sams:         { title: 'SAMS-CI',                   scale: 'SAMS-CI',  bg: '#e6f4f1', color: '#1a6b62', border: '#b2ddd7' },
  drugfever:    { title: 'Drug-induced Fever',        scale: 'Timeline', bg: '#f0eeff', color: '#4a3ab8', border: '#cec8f6' },
  pancreatitis: { title: 'Drug-induced Pancreatitis', scale: 'Weissman', bg: '#fff0e4', color: '#c4620a', border: '#f5cfa8' },
  default:      { title: 'Assessment',                scale: '',         bg: '#f4f2ee', color: '#6b6360', border: '#d6d0c8' },
};

/* ── Shared inline styles ── */
const inputStyle = {
  width: '100%', padding: '7px 10px',
  border: '1px solid #d6d0c8',
  borderRadius: 7,                      /* Apple 7px */
  fontSize: 13, color: '#2d2926',
  background: '#fff',
  fontFamily: "'Inter', system-ui, sans-serif",
  outline: 'none', boxSizing: 'border-box',
  transition: 'border-color 0.15s, box-shadow 0.15s',
};
const onFocus = e => {
  e.target.style.borderColor = '#0071e3';               /* Apple blue */
  e.target.style.boxShadow = '0 0 0 3px rgba(0,113,227,0.18)';
};
const onBlur  = e => {
  e.target.style.borderColor = '#d6d0c8';
  e.target.style.boxShadow = 'none';
};

export default function AssessmentForm() {
  const { type }    = useParams();
  const navigate    = useNavigate();
  const location    = useLocation();
  const cfg         = CFG[type] || CFG.default;
  const isSaved     = !!location.state?.caseData;

  const [patientData, setPatientData] = useState({
    hn: '', name: '', age: '', ward: '',
    dateReceived: new Date().toISOString().split('T')[0],
  });
  const [labEntries,       setLabEntries]       = useState([]);
  const [drugList,         setDrugList]         = useState([]);
  const [symptomDate,      setSymptomDate]      = useState('');
  const [pharmacistNote,   setPharmacistNote]   = useState('');
  const [dailyLogs,        setDailyLogs]        = useState([]);
  const [naranjoScores,    setNaranjoScores]    = useState({});
  const [prodromeData,     setProdromeData]     = useState({});
  const [apCriteria,       setApCriteria]       = useState({ pain: false, lab: false, imaging: false });
  const [analysisResult,   setAnalysisResult]   = useState(null);
  const [analyzeCount,     setAnalyzeCount]     = useState(0);
  const [loadedResult,     setLoadedResult]     = useState(null);

  useEffect(() => {
    if (!location.state?.caseData) return;
    const loaded = location.state.caseData;
    setPatientData({ hn: loaded.hn||'', name: loaded.name||'', age: loaded.age||'', ward: loaded.ward||'', dateReceived: loaded.dateReceived || new Date().toISOString().split('T')[0] });
    const src = loaded.savedData || loaded;
    setDrugList(src.drugList || src.drugs || src.rashDrugs || loaded.drugList || []);
    setSymptomDate(src.symptomDate || src.rashOnset || src.onset || loaded.symptomDate || '');
    setPharmacistNote(loaded.pharmacistNote || src.pharmacistNote || '');
    if (['dili','dress','agep','heme','electro','pancreatitis'].includes(type)) setLabEntries(loaded.labEntries || src.labEntries || []);
    if (['rash','sjs'].includes(type)) setDailyLogs(src.dailyLogs || src.logs || []);
    if (['rash','electro','pancreatitis'].includes(type)) {
      setNaranjoScores(src.naranjoScores || src.scores || {});
      setProdromeData(src.prodromeData || {});
      if (type === 'pancreatitis') setApCriteria(src.apCriteria || { pain:false, lab:false, imaging:false });
    }
    if (loaded.analysisResultFull) { setLoadedResult(loaded.analysisResultFull); setAnalysisResult(loaded.analysisResultFull); }
    else if (!['dili','drugfever'].includes(type)) setTimeout(() => setAnalyzeCount(c => c+1), 500);
  }, [location.state, type]);

  const handleSave = () => {
    if (!patientData.name || !patientData.hn) return alert('กรุณากรอก ชื่อ-นามสกุล และ HN');
    let ranked = analysisResult?.rankedDrugs || [];
    if (type==='sams' && analysisResult) ranked = [{ name: 'Statin Risk Score', total: analysisResult.total||'-' }];
    else if (type==='rash' && !ranked.length && drugList.length) ranked = drugList.map(d => ({ name: d.name, total: '-' }));
    const isDrugFever = type === 'drugfever';
    const savedData = {
      drugList:      isDrugFever ? [] : drugList,
      symptomDate:   isDrugFever ? (analysisResult?.feverOnsetDate||'') : symptomDate,
      pharmacistNote:isDrugFever ? (analysisResult?.pharmacistNote||'') : pharmacistNote,
      labEntries:    ['dili','dress','agep','heme','electro','pancreatitis'].includes(type) ? labEntries : undefined,
      dailyLogs:     ['rash','sjs'].includes(type) ? dailyLogs : (isDrugFever ? analysisResult?.dailyLogs : undefined),
      naranjoScores: ['rash','electro','pancreatitis'].includes(type) ? naranjoScores : undefined,
      apCriteria:    type==='pancreatitis' ? (analysisResult?.rawData?.apCriteria||apCriteria) : undefined,
      prodromeData:  type==='rash' ? prodromeData : undefined,
      drugEntries:   isDrugFever ? analysisResult?.drugEntries : undefined,
      feverOnsetDate:isDrugFever ? analysisResult?.feverOnsetDate : undefined,
      answers:       isDrugFever ? analysisResult?.answers : undefined,
    };
    const newCase = {
      id: location.state?.caseData?.id || Date.now(),
      type, ...patientData,
      drugList: isDrugFever && analysisResult?.drugEntries ? analysisResult.drugEntries : drugList,
      symptomDate: savedData.symptomDate,
      pharmacistNote: savedData.pharmacistNote,
      savedData,
      analysisResultFull: analysisResult,
      rFactor: analysisResult?.rFactor || analysisResult?.total || '-',
      analysisType: analysisResult?.type || analysisResult?.text || 'N/A',
      rankedDrugs: ranked,
      savedAt: new Date().toISOString(),
    };
    try {
      const existing = JSON.parse(localStorage.getItem('dili_cases') || '[]');
      localStorage.setItem('dili_cases', JSON.stringify([newCase, ...existing.filter(c => c.id !== newCase.id)]));
      alert('บันทึกข้อมูลเรียบร้อย');
      navigate('/');
    } catch(err) { alert('เกิดข้อผิดพลาดในการบันทึก'); }
  };

  const patFields = [
    { label: 'HN',            key: 'hn',           type: 'text',   col: '90px' },
    { label: 'Full name',     key: 'name',          type: 'text',   col: '1fr'  },
    { label: 'Age',           key: 'age',           type: 'number', col: '72px' },
    { label: 'Ward',          key: 'ward',          type: 'text',   col: '1fr'  },
    { label: 'Date received', key: 'dateReceived',  type: 'date',   col: '148px'},
  ];

  return (
    <div style={{ minHeight: '100vh', background: '#faf9f7', fontFamily: "'Inter', system-ui, sans-serif", paddingBottom: 80 }}>

      {/* ── NAV — frosted glass ── */}
      <nav className="no-print" style={{
        background: 'rgba(250,249,247,0.85)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(0,0,0,0.08)',
        padding: '0 24px', height: 52,
        display: 'flex', alignItems: 'center', gap: 12,
        position: 'sticky', top: 0, zIndex: 20,
      }}>
        <button
          onClick={() => navigate('/')}
          style={{ width: 30, height: 30, borderRadius: 7, border: '1px solid #ebe8e2', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#6b6360', fontSize: 16, flexShrink: 0, transition: 'background 0.15s' }}
          onMouseEnter={e => e.currentTarget.style.background = '#f4f2ee'}
          onMouseLeave={e => e.currentTarget.style.background = '#fff'}
        >←</button>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <span style={{ padding: '2px 8px', borderRadius: 99, fontSize: 10, fontWeight: 600, letterSpacing: '0.04em', background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }}>{cfg.scale}</span>
            <span style={{ fontSize: 15, fontWeight: 600, color: '#2d2926', letterSpacing: '-0.01em' }}>{cfg.title}</span>
          </div>
          <div style={{ fontSize: 11, color: '#a8a099', marginTop: 1 }}>{isSaved ? 'Viewing saved case' : 'New clinical entry'}</div>
        </div>
      </nav>

      <div style={{ maxWidth: 960, margin: '0 auto', padding: '24px 24px 0' }}>

        {/* ── PATIENT CARD ── */}
        <div style={{ background: '#fff', border: '1px solid #ebe8e2', borderRadius: 10, padding: '18px 20px', marginBottom: 14 }}>
          <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase', color: '#a8a099', marginBottom: 12, paddingBottom: 8, borderBottom: '1px solid #f4f2ee' }}>Patient data</div>
          <div style={{ display: 'grid', gridTemplateColumns: patFields.map(f => f.col).join(' '), gap: 12 }}>
            {patFields.map(f => (
              <div key={f.key}>
                <label style={{ fontSize: 10, fontWeight: 600, color: '#6b6360', marginBottom: 4, display: 'block', letterSpacing: '0.03em' }}>{f.label}</label>
                <input
                  style={inputStyle} type={f.type}
                  value={patientData[f.key]}
                  onChange={e => setPatientData({ ...patientData, [f.key]: e.target.value })}
                  onFocus={onFocus} onBlur={onBlur}
                />
              </div>
            ))}
          </div>
        </div>

        {/* ── TOOL AREA ── */}
        <div style={{ background: '#fff', border: '1px solid #ebe8e2', borderRadius: 10, padding: '20px 20px', marginBottom: 14 }}>
          {type==='drugfever'    && <DrugFeverAssessment    onAnalysisComplete={setAnalysisResult} initialData={location.state?.caseData} />}
          {type==='sams'         && <SamsAssessment         onAnalysisComplete={setAnalysisResult} />}
          {type==='dili'         && <DiliAssessment         patientData={patientData} labEntries={labEntries} setLabEntries={setLabEntries} drugList={drugList} setDrugList={setDrugList} symptomDate={symptomDate} setSymptomDate={setSymptomDate} initialAnalysisResult={loadedResult} analyzeCount={analyzeCount} onAnalysisComplete={setAnalysisResult} pharmacistNote={pharmacistNote} onPharmacistNoteChange={setPharmacistNote} />}
          {type==='dress'        && <DressAssessment        patientData={patientData} analyzeCount={analyzeCount} onAnalysisComplete={setAnalysisResult} labEntries={labEntries} setLabEntries={setLabEntries} drugList={drugList} setDrugList={setDrugList} symptomDate={symptomDate} setSymptomDate={setSymptomDate} initialData={{ savedData: { drugs: drugList, labs: labEntries, onsetDate: symptomDate, pharmacistNote } }} />}
          {type==='agep'         && <AgepAssessment         patientData={patientData} analyzeCount={analyzeCount} onAnalysisComplete={setAnalysisResult} labEntries={labEntries} setLabEntries={setLabEntries} drugList={drugList} setDrugList={setDrugList} symptomDate={symptomDate} setSymptomDate={setSymptomDate} />}
          {type==='sjs'          && <SjsAssessment          drugList={drugList} setDrugList={setDrugList} indexDate={symptomDate} setIndexDate={setSymptomDate} symptomLogs={dailyLogs} setSymptomLogs={setDailyLogs} onAnalysisComplete={setAnalysisResult} />}
          {type==='heme'         && <HemeAssessment         onAnalysisComplete={setAnalysisResult} />}
          {type==='electro'      && <ElectroAssessment      drugList={drugList} setDrugList={setDrugList} labList={labEntries} setLabList={setLabEntries} onset={symptomDate} setOnset={setSymptomDate} naranjoScores={naranjoScores} setNaranjoScores={setNaranjoScores} pharmacistNote={pharmacistNote} setPharmacistNote={setPharmacistNote} onAnalysisComplete={setAnalysisResult} initialData={location.state?.caseData} />}
          {type==='pancreatitis' && <PancreatitisAssessment drugList={drugList} setDrugList={setDrugList} labList={labEntries} setLabList={setLabEntries} onset={symptomDate} setOnset={setSymptomDate} naranjoScores={naranjoScores} setNaranjoScores={setNaranjoScores} pharmacistNote={pharmacistNote} setPharmacistNote={setPharmacistNote} onAnalysisComplete={setAnalysisResult} initialData={{ savedData: { drugs:drugList, labs:labEntries, onsetDate:symptomDate, pharmacistNote, naranjoScores, apCriteria } }} />}
          {type==='rash'         && <RashAssessment         drugList={drugList} setDrugList={setDrugList} dailyLogs={dailyLogs} setDailyLogs={setDailyLogs} symptomDate={symptomDate} setSymptomDate={setSymptomDate} naranjoScores={naranjoScores} setNaranjoScores={setNaranjoScores} pharmacistNote={pharmacistNote} setPharmacistNote={setPharmacistNote} prodromeData={prodromeData} setProdromeData={setProdromeData} onAnalysisComplete={setAnalysisResult} initialData={{ savedData: { drugList, symptomDate, dailyLogs, naranjoScores, pharmacistNote, prodromeData } }} />}
        </div>

        {/* ── FOOTER BUTTONS ── */}
        <div className="no-print" style={{ display: 'flex', justifyContent: 'flex-end', gap: 7, marginTop: 4, paddingTop: 16, borderTop: '1px solid #f4f2ee' }}>
          <button
            onClick={() => navigate('/')}
            style={{ padding: '7px 16px', borderRadius: 7, border: '1px solid #d6d0c8', background: '#fff', fontSize: 13, fontWeight: 400, color: '#6b6360', cursor: 'pointer', fontFamily: "'Inter', system-ui, sans-serif" }}
            onMouseEnter={e => e.currentTarget.style.background = '#f4f2ee'}
            onMouseLeave={e => e.currentTarget.style.background = '#fff'}
          >Cancel</button>

          {!['dili','sjs','rash','dress','agep','heme','electro','sams','drugfever','pancreatitis'].includes(type) && (
            <button
              onClick={() => setAnalyzeCount(c => c+1)}
              style={{ padding: '7px 16px', borderRadius: 7, border: `1px solid ${cfg.border}`, background: cfg.bg, fontSize: 13, fontWeight: 500, color: cfg.color, cursor: 'pointer', fontFamily: "'Inter', system-ui, sans-serif" }}
            >⚡ Analyze</button>
          )}

          {/* Save — Apple blue */}
          <button
            onClick={handleSave}
            style={{ padding: '7px 18px', borderRadius: 7, border: '1px solid #0071e3', background: '#0071e3', fontSize: 13, fontWeight: 500, color: '#fff', cursor: 'pointer', fontFamily: "'Inter', system-ui, sans-serif", display: 'flex', alignItems: 'center', gap: 5, transition: 'background 0.15s' }}
            onMouseEnter={e => e.currentTarget.style.background = '#0077ed'}
            onMouseLeave={e => e.currentTarget.style.background = '#0071e3'}
          >↓ Save</button>

          <button
            onClick={() => window.print()}
            style={{ padding: '7px 16px', borderRadius: 7, border: '1px solid #d6d0c8', background: '#f4f2ee', fontSize: 13, fontWeight: 400, color: '#6b6360', cursor: 'pointer', fontFamily: "'Inter', system-ui, sans-serif", display: 'flex', alignItems: 'center', gap: 5 }}
            onMouseEnter={e => e.currentTarget.style.background = '#ebe8e2'}
            onMouseLeave={e => e.currentTarget.style.background = '#f4f2ee'}
          >⎙ Print</button>
        </div>
      </div>
    </div>
  );
}
