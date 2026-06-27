import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';

import DiliAssessment from './DiliAssessment';
import DressAssessment from './DressAssessment';
import AgepAssessment from './AgepAssessment';
import SjsAssessment from './SjsAssessment';
import HemeAssessment from './HemeAssessment';
import RashAssessment from './RashAssessment';
import ElectroAssessment from './ElectroAssessment';
import SamsAssessment from './SamsAssessment';
import DrugFeverAssessment from './DrugFeverAssessment';
import PancreatitisAssessment from './PancreatitisAssessment';

const TYPE_CONFIG = {
  dili:         { title: 'DILI Assessment',              scale: 'RUCAM',    accent: '#c4620a', accentBg: '#fff0e4', accentBorder: '#f5cfa8' },
  dress:        { title: 'DRESS Syndrome',               scale: 'RegiSCAR', accent: '#4a3ab8', accentBg: '#f0eeff', accentBorder: '#cec8f6' },
  agep:         { title: 'AGEP',                         scale: 'EuroSCAR', accent: '#1a6b62', accentBg: '#e6f4f1', accentBorder: '#b2ddd7' },
  sjs:          { title: 'SJS / TEN',                    scale: 'ALDEN',    accent: '#8c3322', accentBg: '#fdf0ee', accentBorder: '#f5b8b8' },
  rash:         { title: 'Drug Rash',                    scale: 'Naranjo',  accent: '#9b3060', accentBg: '#fbeaf0', accentBorder: '#f4c0d1' },
  electro:      { title: 'Electrolyte Imbalance',        scale: 'Naranjo',  accent: '#9b6e00', accentBg: '#fef6e4', accentBorder: '#f0d98a' },
  heme:         { title: 'Hematologic Disorder',         scale: 'Naranjo',  accent: '#9b3060', accentBg: '#fbeaf0', accentBorder: '#f4c0d1' },
  sams:         { title: 'SAMS-CI',                      scale: 'SAMS-CI',  accent: '#1a6b62', accentBg: '#e6f4f1', accentBorder: '#b2ddd7' },
  drugfever:    { title: 'Drug-induced Fever',           scale: 'Timeline', accent: '#4a3ab8', accentBg: '#f0eeff', accentBorder: '#cec8f6' },
  pancreatitis: { title: 'Drug-induced Pancreatitis',    scale: 'Weissman', accent: '#c4620a', accentBg: '#fff0e4', accentBorder: '#f5cfa8' },
  default:      { title: 'Assessment',                   scale: '',         accent: '#6b6360', accentBg: '#f4f2ee', accentBorder: '#d6d0c8' },
};

const S = {
  page: { minHeight: '100vh', background: '#faf9f7', fontFamily: "'Inter', system-ui, sans-serif", paddingBottom: 80 },
  nav:  { background: '#fff', borderBottom: '0.5px solid #ebe8e2', padding: '0 24px', height: 56, display: 'flex', alignItems: 'center', gap: 12, position: 'sticky', top: 0, zIndex: 20 },
  backBtn: { background: 'none', border: 'none', cursor: 'pointer', width: 32, height: 32, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6b6360', fontSize: 18, flexShrink: 0, transition: 'background 0.15s' },
  card:    { background: '#fff', border: '0.5px solid #ebe8e2', borderRadius: 10, padding: '20px 22px', marginBottom: 16 },
  sectionLabel: { fontSize: 11, fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase', color: '#a8a099', marginBottom: 14, paddingBottom: 10, borderBottom: '0.5px solid #f4f2ee' },
  label: { fontSize: 11, fontWeight: 600, color: '#6b6360', marginBottom: 4, display: 'block' },
  input: { width: '100%', padding: '7px 10px', border: '0.5px solid #d6d0c8', borderRadius: 6, fontSize: 13, color: '#2d2926', background: '#fff', fontFamily: "'Inter', system-ui, sans-serif", outline: 'none', boxSizing: 'border-box' },
  btnPrimary:   { background: '#2a9d8f', color: '#fff', border: 'none', borderRadius: 6, padding: '8px 18px', fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: "'Inter', system-ui, sans-serif", display: 'flex', alignItems: 'center', gap: 6 },
  btnSecondary: { background: 'transparent', color: '#6b6360', border: '0.5px solid #d6d0c8', borderRadius: 6, padding: '8px 18px', fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: "'Inter', system-ui, sans-serif" },
  btnDanger:    { background: '#fdf0ee', color: '#e07060', border: '0.5px solid #f0c4be', borderRadius: 6, padding: '8px 18px', fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: "'Inter', system-ui, sans-serif", display: 'flex', alignItems: 'center', gap: 6 },
  btnPrint:     { background: '#f4f2ee', color: '#6b6360', border: '0.5px solid #d6d0c8', borderRadius: 6, padding: '8px 18px', fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: "'Inter', system-ui, sans-serif", display: 'flex', alignItems: 'center', gap: 6 },
};

export default function AssessmentForm() {
  const { type } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const cfg = TYPE_CONFIG[type] || TYPE_CONFIG.default;

  const [patientData, setPatientData] = useState({
    hn: '', name: '', age: '', ward: '',
    dateReceived: new Date().toISOString().split('T')[0],
  });
  const [labEntries, setLabEntries] = useState([]);
  const [drugList, setDrugList]     = useState([]);
  const [symptomDate, setSymptomDate]       = useState('');
  const [pharmacistNote, setPharmacistNote] = useState('');
  const [dailyLogs, setDailyLogs]           = useState([]);
  const [naranjoScores, setNaranjoScores]   = useState({});
  const [prodromeData, setProdromeData]     = useState({});
  const [apCriteria, setApCriteria]         = useState({ pain: false, lab: false, imaging: false });
  const [analysisResult, setAnalysisResult] = useState(null);
  const [analyzeCount, setAnalyzeCount]     = useState(0);
  const [loadedAnalysisResult, setLoadedAnalysisResult] = useState(null);

  useEffect(() => {
    if (!location.state?.caseData) return;
    const loaded = location.state.caseData;
    setPatientData({ hn: loaded.hn || '', name: loaded.name || '', age: loaded.age || '', ward: loaded.ward || '', dateReceived: loaded.dateReceived || new Date().toISOString().split('T')[0] });
    const src = loaded.savedData || loaded;
    setDrugList(src.drugList || src.drugs || src.rashDrugs || loaded.drugList || []);
    setSymptomDate(src.symptomDate || src.rashOnset || src.onset || loaded.symptomDate || '');
    setPharmacistNote(loaded.pharmacistNote || src.pharmacistNote || '');
    if (['dili','dress','agep','heme','electro','pancreatitis'].includes(type)) setLabEntries(loaded.labEntries || src.labEntries || []);
    if (['rash','sjs'].includes(type)) setDailyLogs(src.dailyLogs || src.logs || []);
    if (['rash','electro','pancreatitis'].includes(type)) {
      setNaranjoScores(src.naranjoScores || src.scores || {});
      setProdromeData(src.prodromeData || {});
      if (type === 'pancreatitis') setApCriteria(src.apCriteria || { pain: false, lab: false, imaging: false });
    }
    if (loaded.analysisResultFull) { setLoadedAnalysisResult(loaded.analysisResultFull); setAnalysisResult(loaded.analysisResultFull); }
    else if (!['dili','drugfever'].includes(type)) setTimeout(() => setAnalyzeCount(c => c + 1), 500);
  }, [location.state, type]);

  const handleSave = () => {
    if (!patientData.name || !patientData.hn) return alert('กรุณากรอก ชื่อ-นามสกุล และ HN');
    let rankedList = analysisResult?.rankedDrugs || [];
    if (type === 'sams' && analysisResult) rankedList = [{ name: 'Statin Risk Score', total: analysisResult.total || '-' }];
    else if (type === 'rash' && !rankedList.length && drugList.length) rankedList = drugList.map(d => ({ name: d.name, total: '-' }));
    const isDrugFever = type === 'drugfever';
    const savedDataObj = {
      drugList: isDrugFever ? [] : drugList,
      symptomDate: isDrugFever ? (analysisResult?.feverOnsetDate || '') : symptomDate,
      pharmacistNote: isDrugFever ? (analysisResult?.pharmacistNote || '') : pharmacistNote,
      labEntries: ['dili','dress','agep','heme','electro','pancreatitis'].includes(type) ? labEntries : undefined,
      dailyLogs: ['rash','sjs'].includes(type) ? dailyLogs : (isDrugFever ? analysisResult?.dailyLogs : undefined),
      naranjoScores: ['rash','electro','pancreatitis'].includes(type) ? naranjoScores : undefined,
      apCriteria: type === 'pancreatitis' ? (analysisResult?.rawData?.apCriteria || apCriteria) : undefined,
      prodromeData: type === 'rash' ? prodromeData : undefined,
      drugEntries: isDrugFever ? analysisResult?.drugEntries : undefined,
      feverOnsetDate: isDrugFever ? analysisResult?.feverOnsetDate : undefined,
      answers: isDrugFever ? analysisResult?.answers : undefined,
    };
    const newCase = {
      id: location.state?.caseData?.id || Date.now(), type, ...patientData,
      drugList: isDrugFever && analysisResult?.drugEntries ? analysisResult.drugEntries : drugList,
      symptomDate: savedDataObj.symptomDate,
      pharmacistNote: savedDataObj.pharmacistNote,
      savedData: savedDataObj,
      analysisResultFull: analysisResult,
      rFactor: analysisResult?.rFactor || analysisResult?.total || '-',
      analysisType: analysisResult?.type || analysisResult?.text || 'N/A',
      rankedDrugs: rankedList,
      savedAt: new Date().toISOString(),
    };
    try {
      const existing = JSON.parse(localStorage.getItem('dili_cases') || '[]');
      localStorage.setItem('dili_cases', JSON.stringify([newCase, ...existing.filter(c => c.id !== newCase.id)]));
      alert('บันทึกข้อมูลเรียบร้อย');
      navigate('/');
    } catch (err) { console.error(err); alert('เกิดข้อผิดพลาดในการบันทึก'); }
  };

  const isSaved = !!location.state?.caseData;

  return (
    <div style={S.page}>
      {/* NAV */}
      <nav style={S.nav} className="print:hidden">
        <button style={S.backBtn} onClick={() => navigate('/')}
          onMouseEnter={e => e.currentTarget.style.background = '#f4f2ee'}
          onMouseLeave={e => e.currentTarget.style.background = 'none'}>←</button>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ padding: '2px 9px', borderRadius: 99, fontSize: 10, fontWeight: 600, background: cfg.accentBg, color: cfg.accent, border: `0.5px solid ${cfg.accentBorder}` }}>{cfg.scale}</span>
            <h1 style={{ fontSize: 16, fontWeight: 600, color: '#2d2926', margin: 0 }}>{cfg.title}</h1>
          </div>
          <div style={{ fontSize: 11, color: '#a8a099', marginTop: 1 }}>{isSaved ? 'Viewing saved case' : 'New clinical entry'}</div>
        </div>
      </nav>

      <div style={{ maxWidth: 960, margin: '0 auto', padding: '24px 24px 0' }}>
        {/* PATIENT DATA */}
        <div style={S.card}>
          <div style={S.sectionLabel}>Patient data</div>
          <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr 80px 1fr 1fr', gap: 12 }}>
            {[
              { label: 'HN', key: 'hn', type: 'text' },
              { label: 'Full name', key: 'name', type: 'text' },
              { label: 'Age', key: 'age', type: 'number' },
              { label: 'Ward', key: 'ward', type: 'text' },
              { label: 'Date received', key: 'dateReceived', type: 'date' },
            ].map(f => (
              <div key={f.key}>
                <label style={S.label}>{f.label}</label>
                <input style={S.input} type={f.type} value={patientData[f.key]}
                  onChange={e => setPatientData({ ...patientData, [f.key]: e.target.value })}
                  onFocus={e => { e.target.style.borderColor = '#2a9d8f'; e.target.style.boxShadow = '0 0 0 3px #e6f4f1'; }}
                  onBlur={e => { e.target.style.borderColor = '#d6d0c8'; e.target.style.boxShadow = 'none'; }}
                />
              </div>
            ))}
          </div>
        </div>

        {/* TOOL AREA */}
        <div style={{ ...S.card, padding: '20px 22px' }}>
          {type === 'drugfever'    && <DrugFeverAssessment    onAnalysisComplete={setAnalysisResult} initialData={location.state?.caseData} />}
          {type === 'sams'         && <SamsAssessment         onAnalysisComplete={setAnalysisResult} />}
          {type === 'dili'         && <DiliAssessment patientData={patientData} labEntries={labEntries} setLabEntries={setLabEntries} drugList={drugList} setDrugList={setDrugList} symptomDate={symptomDate} setSymptomDate={setSymptomDate} initialAnalysisResult={loadedAnalysisResult} analyzeCount={analyzeCount} onAnalysisComplete={setAnalysisResult} pharmacistNote={pharmacistNote} onPharmacistNoteChange={setPharmacistNote} />}
          {type === 'dress'        && <DressAssessment patientData={patientData} analyzeCount={analyzeCount} onAnalysisComplete={setAnalysisResult} labEntries={labEntries} setLabEntries={setLabEntries} drugList={drugList} setDrugList={setDrugList} symptomDate={symptomDate} setSymptomDate={setSymptomDate} initialData={{ savedData: { drugs: drugList, labs: labEntries, onsetDate: symptomDate, pharmacistNote } }} />}
          {type === 'agep'         && <AgepAssessment patientData={patientData} analyzeCount={analyzeCount} onAnalysisComplete={setAnalysisResult} labEntries={labEntries} setLabEntries={setLabEntries} drugList={drugList} setDrugList={setDrugList} symptomDate={symptomDate} setSymptomDate={setSymptomDate} />}
          {type === 'sjs'          && <SjsAssessment drugList={drugList} setDrugList={setDrugList} indexDate={symptomDate} setIndexDate={setSymptomDate} symptomLogs={dailyLogs} setSymptomLogs={setDailyLogs} onAnalysisComplete={setAnalysisResult} />}
          {type === 'heme'         && <HemeAssessment onAnalysisComplete={setAnalysisResult} />}
          {type === 'electro'      && <ElectroAssessment drugList={drugList} setDrugList={setDrugList} labList={labEntries} setLabList={setLabEntries} onset={symptomDate} setOnset={setSymptomDate} naranjoScores={naranjoScores} setNaranjoScores={setNaranjoScores} pharmacistNote={pharmacistNote} setPharmacistNote={setPharmacistNote} onAnalysisComplete={setAnalysisResult} initialData={location.state?.caseData} />}
          {type === 'pancreatitis' && <PancreatitisAssessment drugList={drugList} setDrugList={setDrugList} labList={labEntries} setLabList={setLabEntries} onset={symptomDate} setOnset={setSymptomDate} naranjoScores={naranjoScores} setNaranjoScores={setNaranjoScores} pharmacistNote={pharmacistNote} setPharmacistNote={setPharmacistNote} onAnalysisComplete={setAnalysisResult} initialData={{ savedData: { drugs: drugList, labs: labEntries, onsetDate: symptomDate, pharmacistNote, naranjoScores, apCriteria } }} />}
          {type === 'rash'         && <RashAssessment drugList={drugList} setDrugList={setDrugList} dailyLogs={dailyLogs} setDailyLogs={setDailyLogs} symptomDate={symptomDate} setSymptomDate={setSymptomDate} naranjoScores={naranjoScores} setNaranjoScores={setNaranjoScores} pharmacistNote={pharmacistNote} setPharmacistNote={setPharmacistNote} prodromeData={prodromeData} setProdromeData={setProdromeData} onAnalysisComplete={setAnalysisResult} initialData={{ savedData: { drugList, symptomDate, dailyLogs, naranjoScores, pharmacistNote, prodromeData } }} />}
        </div>

        {/* FOOTER ACTIONS */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }} className="print:hidden">
          <button style={S.btnSecondary} onClick={() => navigate('/')}>Cancel</button>
          {!['dili','sjs','rash','dress','agep','heme','electro','sams','drugfever','pancreatitis'].includes(type) && (
            <button style={{ ...S.btnSecondary, background: cfg.accentBg, color: cfg.accent, border: `0.5px solid ${cfg.accentBorder}` }} onClick={() => setAnalyzeCount(c => c + 1)}>⚡ Analyze</button>
          )}
          <button style={S.btnPrimary} onClick={handleSave}>
            <span>↓</span> Save
          </button>
          <button style={S.btnPrint} onClick={() => window.print()}>
            <span>⎙</span> Print
          </button>
        </div>
      </div>
    </div>
  );
}
