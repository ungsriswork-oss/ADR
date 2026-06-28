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
  e.target.style.borderColor = '#2a9d8f';               /* Apple blue */
  e.target.style.boxShadow = '0 0 0 3px rgba(42,157,143,0.18)';
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
  const [noteTimestamp,    setNoteTimestamp]    = useState('');

  const handlePharmacistNoteChange = (val) => {
    setPharmacistNote(val);
    if (val) setNoteTimestamp(new Date().toISOString());
    else setNoteTimestamp('');
  };
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
    setNoteTimestamp(loaded.noteTimestamp || '');
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
      noteTimestamp: pharmacistNote ? new Date().toISOString() : '',
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
        padding: '0 clamp(16px, 4vw, 48px)', height: 52,
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
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
            <span style={{
              display: 'inline-block', fontSize: 10, fontWeight: 600,
              padding: '1px 7px', borderRadius: 99,
              background: isSaved ? '#fff0e4' : '#e6f4f1',
              color: isSaved ? '#c4620a' : '#1a6b62',
              border: `1px solid ${isSaved ? '#f5cfa8' : '#b2ddd7'}`,
              letterSpacing: '0.03em'
            }}>
              {isSaved ? 'Saved case' : 'New entry'}
            </span>
          </div>
        </div>
      </nav>

      <div style={{ maxWidth: 1400, margin: '0 auto', padding: 'clamp(16px, 4vw, 48px)', paddingTop: 24, paddingBottom: 0 }}>

        {/* ── PATIENT CARD ── */}
        <div style={{ background: '#fff', border: '1px solid #ebe8e2', borderRadius: 10, padding: '18px 20px', marginBottom: 14 }}>
          <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase', color: '#a8a099', marginBottom: 12, paddingBottom: 8, borderBottom: '1px solid #f4f2ee' }}>Patient data</div>
          <div style={{ display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 140px), 1fr))',
            gap: 12 }}>
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

        {/* ── PRINT HEADER — แสดงเฉพาะตอน print ── */}
        <div style={{ display: 'none' }} className="print-only-header">
          <style>{`
            @media print {
              .print-only-header {
                display: block !important;
                border-bottom: 2px solid #2d2926;
                padding-bottom: 10px;
                margin-bottom: 14px;
                page-break-inside: avoid;
              }
              .print-only-header table { width: 100%; border-collapse: collapse; }
              .print-only-header td { padding: 2px 6px; font-size: 11px; vertical-align: top; }
              .print-only-header .label { color: #6b6360; font-weight: 600; width: 80px; }
              .print-only-header .value { color: #2d2926; font-weight: 400; }
              .print-only-header .title { font-size: 15px; font-weight: 700; color: #2d2926; margin-bottom: 6px; }
              .print-only-header .subtitle { font-size: 10px; color: #6b6360; margin-bottom: 8px; }
            }
          `}</style>
          <div className="title">
            {cfg.title} — {cfg.scale}
          </div>
          <div className="subtitle">
            งานพัฒนาระบบยา โรงพยาบาลเจ้าพระยายมราช · พิมพ์: {new Date().toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })}
          </div>
          <table>
            <tbody>
              <tr>
                <td className="label">HN</td>
                <td className="value">{patientData.hn || '—'}</td>
                <td className="label">ชื่อ-สกุล</td>
                <td className="value">{patientData.name || '—'}</td>
                <td className="label">อายุ</td>
                <td className="value">{patientData.age ? `${patientData.age} ปี` : '—'}</td>
              </tr>
              <tr>
                <td className="label">Ward</td>
                <td className="value">{patientData.ward || '—'}</td>
                <td className="label">วันที่รับ</td>
                <td className="value">{patientData.dateReceived ? new Date(patientData.dateReceived).toLocaleDateString('th-TH') : '—'}</td>
                {noteTimestamp && <>
                  <td className="label">บันทึกล่าสุด</td>
                  <td className="value">{new Date(noteTimestamp).toLocaleString('th-TH', { dateStyle: 'short', timeStyle: 'short' })}</td>
                </>}
                {!noteTimestamp && <><td></td><td></td></>}
              </tr>
            </tbody>
          </table>
        </div>

        {/* ── TOOL AREA ── */}
        <div style={{ marginBottom: 14 }}>
          {type==='drugfever'    && <DrugFeverAssessment    onAnalysisComplete={setAnalysisResult} initialData={location.state?.caseData} />}
          {type==='sams'         && <SamsAssessment         onAnalysisComplete={setAnalysisResult} />}
          {type==='dili'         && <DiliAssessment         patientData={patientData} labEntries={labEntries} setLabEntries={setLabEntries} drugList={drugList} setDrugList={setDrugList} symptomDate={symptomDate} setSymptomDate={setSymptomDate} initialAnalysisResult={loadedResult} analyzeCount={analyzeCount} onAnalysisComplete={setAnalysisResult} pharmacistNote={pharmacistNote} onPharmacistNoteChange={handlePharmacistNoteChange} />}
          {type==='dress'        && <DressAssessment        patientData={patientData} analyzeCount={analyzeCount} onAnalysisComplete={setAnalysisResult} labEntries={labEntries} setLabEntries={setLabEntries} drugList={drugList} setDrugList={setDrugList} symptomDate={symptomDate} setSymptomDate={setSymptomDate} initialData={{ savedData: { drugs: drugList, labs: labEntries, onsetDate: symptomDate, pharmacistNote } }} />}
          {type==='agep'         && <AgepAssessment         patientData={patientData} analyzeCount={analyzeCount} onAnalysisComplete={setAnalysisResult} labEntries={labEntries} setLabEntries={setLabEntries} drugList={drugList} setDrugList={setDrugList} symptomDate={symptomDate} setSymptomDate={setSymptomDate} />}
          {type==='sjs'          && <SjsAssessment          drugList={drugList} setDrugList={setDrugList} indexDate={symptomDate} setIndexDate={setSymptomDate} symptomLogs={dailyLogs} setSymptomLogs={setDailyLogs} onAnalysisComplete={setAnalysisResult} />}
          {type==='heme'         && <HemeAssessment         onAnalysisComplete={setAnalysisResult} />}
          {type==='electro'      && <ElectroAssessment      drugList={drugList} setDrugList={setDrugList} labList={labEntries} setLabList={setLabEntries} onset={symptomDate} setOnset={setSymptomDate} naranjoScores={naranjoScores} setNaranjoScores={setNaranjoScores} pharmacistNote={pharmacistNote} setPharmacistNote={handlePharmacistNoteChange} onAnalysisComplete={setAnalysisResult} initialData={location.state?.caseData} />}
          {type==='pancreatitis' && <PancreatitisAssessment drugList={drugList} setDrugList={setDrugList} labList={labEntries} setLabList={setLabEntries} onset={symptomDate} setOnset={setSymptomDate} naranjoScores={naranjoScores} setNaranjoScores={setNaranjoScores} pharmacistNote={pharmacistNote} setPharmacistNote={handlePharmacistNoteChange} onAnalysisComplete={setAnalysisResult} initialData={{ savedData: { drugs:drugList, labs:labEntries, onsetDate:symptomDate, pharmacistNote, naranjoScores, apCriteria } }} />}
          {type==='rash'         && <RashAssessment         drugList={drugList} setDrugList={setDrugList} dailyLogs={dailyLogs} setDailyLogs={setDailyLogs} symptomDate={symptomDate} setSymptomDate={setSymptomDate} naranjoScores={naranjoScores} setNaranjoScores={setNaranjoScores} pharmacistNote={pharmacistNote} setPharmacistNote={handlePharmacistNoteChange} prodromeData={prodromeData} setProdromeData={setProdromeData} onAnalysisComplete={setAnalysisResult} initialData={{ savedData: { drugList, symptomDate, dailyLogs, naranjoScores, pharmacistNote, prodromeData } }} />}
        </div>

        {/* ── PHARMACIST NOTE TIMESTAMP — แสดงถ้ามี note ── */}
        {noteTimestamp && (
          <div style={{ fontSize: 11, color: '#a8a099', textAlign: 'right', marginBottom: 4, fontStyle: 'italic' }}>
            Note last updated: {new Date(noteTimestamp).toLocaleString('th-TH', { dateStyle: 'medium', timeStyle: 'short' })}
          </div>
        )}

        {/* ── FOOTER BUTTONS ── */}
        <div className="no-print" style={{ display: 'flex', justifyContent: 'flex-end', gap: 7, marginTop: 4, paddingTop: 16, borderTop: '1px solid #f4f2ee', position: 'sticky', bottom: 0, background: 'rgba(250,249,247,0.95)', backdropFilter: 'blur(10px)', padding: '12px clamp(16px,4vw,48px)', marginLeft: 'calc(-1 * clamp(16px,4vw,48px))', marginRight: 'calc(-1 * clamp(16px,4vw,48px))', zIndex: 10 }}>
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
            >View Timeline & Score</button>
          )}

          {/* Save — Apple blue */}
          <button
            onClick={handleSave}
            style={{ padding: '7px 18px', borderRadius: 7, border: '1px solid #2a9d8f', background: '#2a9d8f', fontSize: 13, fontWeight: 500, color: '#fff', cursor: 'pointer', fontFamily: "'Inter', system-ui, sans-serif", display: 'flex', alignItems: 'center', gap: 5, transition: 'background 0.15s' }}
            onMouseEnter={e => e.currentTarget.style.background = '#238f82'}
            onMouseLeave={e => e.currentTarget.style.background = '#2a9d8f'}
          >↓ Save</button>

          <button
            onClick={() => window.print()}
            style={{ padding: '7px 16px', borderRadius: 7, border: '1px solid #d6d0c8', background: '#f4f2ee', fontSize: 13, fontWeight: 400, color: '#6b6360', cursor: 'pointer', fontFamily: "'Inter', system-ui, sans-serif", display: 'flex', alignItems: 'center', gap: 5 }}
            onMouseEnter={e => e.currentTarget.style.background = '#ebe8e2'}
            onMouseLeave={e => e.currentTarget.style.background = '#f4f2ee'}
          >⎙ Print</button>
        </div>
      </div>
      {/* Easter egg */}
      <div style={{
        position: 'fixed', bottom: 14, right: 18,
        fontSize: 10, color: '#d6d0c8',
        fontFamily: "'Inter', system-ui, sans-serif",
        letterSpacing: '0.02em',
        userSelect: 'none',
        pointerEvents: 'none',
        zIndex: 1,
      }}>
        Man Ung
      </div>
    </div>
  );
}