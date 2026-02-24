// src/pages/AssessmentForm.jsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';

// Import เครื่องมือต่างๆ
import DiliAssessment from './DiliAssessment';
import DressAssessment from './DressAssessment';
import AgepAssessment from './AgepAssessment';
import SjsAssessment from './SjsAssessment';
import HemeAssessment from './HemeAssessment';
import RashAssessment from './RashAssessment';
import ElectroAssessment from './ElectroAssessment';
import SamsAssessment from './SamsAssessment';
import DrugFeverAssessment from './DrugFeverAssessment';
import PancreatitisAssessment from './PancreatitisAssessment'; // ✅ เพิ่ม Import ของ Pancreatitis

const AssessmentForm = () => {
  const { type } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  // --- State: Patient Data ---
  const [patientData, setPatientData] = useState({
    hn: '',
    name: '',
    age: '',
    ward: '',
    dateReceived: new Date().toISOString().split('T')[0],
  });

  // --- State: Shared ---
  const [labEntries, setLabEntries] = useState([]);
  const [drugList, setDrugList] = useState([]);
  const [symptomDate, setSymptomDate] = useState('');
  const [pharmacistNote, setPharmacistNote] = useState('');

  // --- State: Tool Specific ---
  const [dailyLogs, setDailyLogs] = useState([]);
  const [naranjoScores, setNaranjoScores] = useState({});
  const [prodromeData, setProdromeData] = useState({}); // ของ Rash
  const [apCriteria, setApCriteria] = useState({ pain: false, lab: false, imaging: false }); // ✅ State สำหรับ Checklist ของ Pancreatitis

  // --- State: Results ---
  const [analysisResult, setAnalysisResult] = useState(null);
  const [analyzeCount, setAnalyzeCount] = useState(0);
  const [loadedAnalysisResult, setLoadedAnalysisResult] = useState(null);

  // --- CONFIGURATION ---
  const typeSettings = {
    dili: { title: 'Liver Injury (DILI)', themeColor: 'orange' },
    dress: { title: 'DRESS Syndrome', themeColor: 'purple' },
    agep: { title: 'AGEP', themeColor: 'teal' },
    sjs: { title: 'SJS/TEN', themeColor: 'red' },
    rash: { title: 'Drug Rash (Naranjo)', themeColor: 'pink' },
    electro: { title: 'Electrolyte Imbalance', themeColor: 'yellow' },
    heme: { title: 'Hematologic Disorder', themeColor: 'rose' },
    sams: { title: 'SAMS-CI', themeColor: 'cyan' },
    drugfever: { title: 'Drug Fever', themeColor: 'indigo' },
    pancreatitis: { title: 'Acute Pancreatitis', themeColor: 'rose' }, // ✅ เพิ่มการตั้งค่าสีและชื่อของ Pancreatitis
    default: { title: 'Assessment', themeColor: 'slate' },
  };
  const currentSetting = typeSettings[type] || typeSettings.default;
  const theme = currentSetting.themeColor;

  // --- LOAD DATA (useEffect) ---
  useEffect(() => {
    if (location.state?.caseData) {
      const loaded = location.state.caseData;
      setPatientData({
        hn: loaded.hn || '',
        name: loaded.name || '',
        age: loaded.age || '',
        ward: loaded.ward || '',
        dateReceived: loaded.dateReceived || new Date().toISOString().split('T')[0],
      });

      const src = loaded.savedData || loaded;
      // Load ข้อมูลพื้นฐาน (สำหรับ tool ทั่วไป)
      setDrugList(src.drugList || src.drugs || src.rashDrugs || loaded.drugList || []);
      setSymptomDate(src.symptomDate || src.rashOnset || src.onset || loaded.symptomDate || '');
      setPharmacistNote(loaded.pharmacistNote || src.pharmacistNote || '');

      // Load ข้อมูลเฉพาะ tool
      // ✅ เพิ่ม 'pancreatitis' ให้โหลดข้อมูล Lab
      if (['dili', 'dress', 'agep', 'heme', 'electro', 'pancreatitis'].includes(type)) {
        setLabEntries(loaded.labEntries || src.labEntries || []);
      }
      if (['rash', 'sjs'].includes(type)) {
        setDailyLogs(src.dailyLogs || src.logs || []);
      }
      // ✅ เพิ่ม 'pancreatitis' ให้โหลดคะแนน Naranjo
      if (['rash', 'electro', 'pancreatitis'].includes(type)) {
        setNaranjoScores(src.naranjoScores || src.scores || {});
        setProdromeData(src.prodromeData || {});
        if (type === 'pancreatitis') {
            setApCriteria(src.apCriteria || { pain: false, lab: false, imaging: false });
        }
      }
      
      // Load ผลวิเคราะห์
      if (loaded.analysisResultFull) {
        setLoadedAnalysisResult(loaded.analysisResultFull);
        setAnalysisResult(loaded.analysisResultFull);
      } else {
        // Auto-analyze สำหรับ tool บางตัว
        if (!['dili', 'drugfever'].includes(type)) {
          setTimeout(() => setAnalyzeCount((c) => c + 1), 500);
        }
      }
    }
  }, [location.state, type]);

  // --- SAVE DATA HANDLER ---
  const handleSaveData = () => {
    if (!patientData.name || !patientData.hn)
      return alert('กรุณากรอก ชื่อ-นามสกุล และ HN');

    // จัดการ Ranked List (สำหรับแสดงหน้า Home)
    let rankedList = analysisResult?.rankedDrugs || [];
    if (type === 'sams' && analysisResult) {
        rankedList = [{ name: 'Statin Risk Score', total: analysisResult.total || '-' }];
    } else if (type === 'rash' && rankedList.length === 0 && drugList.length > 0) {
      rankedList = drugList.map((d) => ({ name: d.name, total: '-' }));
    }

    // เตรียม Saved Data Object
    const isDrugFever = type === 'drugfever';
    
    const savedDataObj = {
        // Shared fields
        drugList: isDrugFever ? [] : drugList,
        symptomDate: isDrugFever ? (analysisResult?.feverOnsetDate || '') : symptomDate,
        pharmacistNote: isDrugFever ? (analysisResult?.pharmacistNote || '') : pharmacistNote,
        
        // Tool specific fields
        // ✅ เพิ่ม 'pancreatitis' ให้บันทึก Lab
        labEntries: ['dili', 'dress', 'agep', 'heme', 'electro', 'pancreatitis'].includes(type) ? labEntries : undefined,
        
        dailyLogs: ['rash', 'sjs'].includes(type) ? dailyLogs : (isDrugFever ? analysisResult?.dailyLogs : undefined),
        
        // ✅ เพิ่ม 'pancreatitis' ให้บันทึก Score และตัว Checklist
        naranjoScores: ['rash', 'electro', 'pancreatitis'].includes(type) ? naranjoScores : undefined,
        apCriteria: type === 'pancreatitis' ? (analysisResult?.rawData?.apCriteria || apCriteria) : undefined,
        
        prodromeData: type === 'rash' ? prodromeData : undefined,
        
        // Drug Fever Specifics
        drugEntries: isDrugFever ? analysisResult?.drugEntries : undefined,
        feverOnsetDate: isDrugFever ? analysisResult?.feverOnsetDate : undefined,
        answers: isDrugFever ? analysisResult?.answers : undefined,
    };

    const newCase = {
      id: location.state?.caseData?.id || Date.now(),
      type: type,
      ...patientData,
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
      const existingData = JSON.parse(localStorage.getItem('dili_cases') || '[]');
      const filteredData = existingData.filter((c) => c.id !== newCase.id);
      localStorage.setItem('dili_cases', JSON.stringify([newCase, ...filteredData]));
      alert('บันทึกข้อมูลเรียบร้อยแล้ว!');
      navigate('/');
    } catch (error) {
      console.error('Save Error:', error);
      alert('เกิดข้อผิดพลาดในการบันทึกข้อมูล');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans pb-24 relative print:bg-white print:pb-0">
      {/* HEADER */}
      <nav className="bg-white border-b border-slate-200 px-6 py-4 shadow-sm sticky top-0 z-20 print:hidden">
        <div className="max-w-5xl mx-auto flex items-center gap-4">
          <button onClick={() => navigate('/')} className="p-2 rounded-full text-slate-500 hover:bg-slate-100">←</button>
          <div>
            <h1 className={`text-2xl font-bold tracking-tight text-${theme}-600`}>{currentSetting.title}</h1>
            <p className="text-xs text-slate-400 font-medium">{location.state?.caseData ? 'Viewing Saved Case' : 'New Clinical Entry'}</p>
          </div>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-6 mt-8 print:max-w-none print:px-0 print:mt-0">
        {/* PATIENT DATA FORM */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6">
          <h2 className={`text-sm font-bold text-${theme}-600 uppercase mb-4 border-b pb-2 text-left`}>PATIENT DATA</h2>
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
            <div className="col-span-1">
              <label className="text-xs font-bold text-slate-500">HN</label>
              <input className="border w-full p-2 rounded" value={patientData.hn} onChange={(e) => setPatientData({ ...patientData, hn: e.target.value })} />
            </div>
            <div className="col-span-2">
              <label className="text-xs font-bold text-slate-500">Name</label>
              <input className="border w-full p-2 rounded" value={patientData.name} onChange={(e) => setPatientData({ ...patientData, name: e.target.value })} />
            </div>
            <div className="col-span-1">
              <label className="text-xs font-bold text-slate-500">Age</label>
              <input type="number" className="border w-full p-2 rounded" value={patientData.age} onChange={(e) => setPatientData({ ...patientData, age: e.target.value })} />
            </div>
            <div className="col-span-2">
              <label className="text-xs font-bold text-slate-500">Date</label>
              <input type="date" className="border w-full p-2 rounded" value={patientData.dateReceived} onChange={(e) => setPatientData({ ...patientData, dateReceived: e.target.value })} />
            </div>
          </div>
        </div>

        {/* TOOL RENDER AREA */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          
          {type === 'drugfever' && (
            <DrugFeverAssessment 
                onAnalysisComplete={setAnalysisResult} 
                initialData={location.state?.caseData} 
            />
          )}

          {type === 'sams' && (
            <SamsAssessment onAnalysisComplete={setAnalysisResult} />
          )}

          {type === 'dili' && (
            <DiliAssessment
              patientData={patientData}
              labEntries={labEntries} setLabEntries={setLabEntries}
              drugList={drugList} setDrugList={setDrugList}
              symptomDate={symptomDate} setSymptomDate={setSymptomDate}
              initialAnalysisResult={loadedAnalysisResult}
              analyzeCount={analyzeCount}
              onAnalysisComplete={setAnalysisResult}
              pharmacistNote={pharmacistNote}
              onPharmacistNoteChange={setPharmacistNote}
            />
          )}
          {type === 'dress' && (
            <DressAssessment
              patientData={patientData}
              analyzeCount={analyzeCount}
              onAnalysisComplete={setAnalysisResult}
              labEntries={labEntries} setLabEntries={setLabEntries}
              drugList={drugList} setDrugList={setDrugList}
              symptomDate={symptomDate} setSymptomDate={setSymptomDate}
              initialData={{ savedData: { drugs: drugList, labs: labEntries, onsetDate: symptomDate, pharmacistNote } }}
            />
          )}
          {type === 'agep' && (
            <AgepAssessment
              patientData={patientData}
              analyzeCount={analyzeCount}
              onAnalysisComplete={setAnalysisResult}
              labEntries={labEntries} setLabEntries={setLabEntries}
              drugList={drugList} setDrugList={setDrugList}
              symptomDate={symptomDate} setSymptomDate={setSymptomDate}
            />
          )}
          {type === 'sjs' && (
            <SjsAssessment
              drugList={drugList} setDrugList={setDrugList}
              indexDate={symptomDate} setIndexDate={setSymptomDate}
              symptomLogs={dailyLogs} setSymptomLogs={setDailyLogs}
              onAnalysisComplete={setAnalysisResult}
            />
          )}
          {type === 'heme' && <HemeAssessment onAnalysisComplete={setAnalysisResult} />}
          
          {type === 'electro' && (
            <ElectroAssessment 
              drugList={drugList} setDrugList={setDrugList}
              labList={labEntries} setLabList={setLabEntries}
              onset={symptomDate} setOnset={setSymptomDate}
              naranjoScores={naranjoScores} setNaranjoScores={setNaranjoScores}
              pharmacistNote={pharmacistNote} setPharmacistNote={setPharmacistNote}
              onAnalysisComplete={setAnalysisResult}
              initialData={location.state?.caseData}
            />
          )}

          {/* ✅ Component ของ Pancreatitis ที่เพิ่มเข้ามาใหม่ */}
          {type === 'pancreatitis' && (
            <PancreatitisAssessment
              drugList={drugList} setDrugList={setDrugList}
              labList={labEntries} setLabList={setLabEntries}
              onset={symptomDate} setOnset={setSymptomDate}
              naranjoScores={naranjoScores} setNaranjoScores={setNaranjoScores}
              pharmacistNote={pharmacistNote} setPharmacistNote={setPharmacistNote}
              onAnalysisComplete={setAnalysisResult}
              initialData={{ savedData: { drugs: drugList, labs: labEntries, onsetDate: symptomDate, pharmacistNote, naranjoScores, apCriteria } }}
            />
          )}

          {type === 'rash' && (
            <RashAssessment
              drugList={drugList} setDrugList={setDrugList}
              dailyLogs={dailyLogs} setDailyLogs={setDailyLogs}
              symptomDate={symptomDate} setSymptomDate={setSymptomDate}
              naranjoScores={naranjoScores} setNaranjoScores={setNaranjoScores}
              pharmacistNote={pharmacistNote} setPharmacistNote={setPharmacistNote}
              prodromeData={prodromeData} setProdromeData={setProdromeData}
              onAnalysisComplete={setAnalysisResult}
              initialData={{ savedData: { drugList, symptomDate, dailyLogs, naranjoScores, pharmacistNote, prodromeData } }}
            />
          )}
        </div>

        {/* FOOTER BUTTONS */}
        <div className="mt-8 flex justify-end gap-3 print:hidden">
          <button onClick={() => navigate('/')} className="px-6 py-2 rounded-lg border hover:bg-slate-50 transition">Cancel</button>

          {/* ✅ เพิ่ม 'pancreatitis' ในกลุ่มเครื่องมือที่ซ่อนปุ่ม Analyze (เพราะมันรันผลอัตโนมัติ/มีปุ่มในตัวเอง) */}
          {![ 'dili', 'sjs', 'rash', 'dress', 'agep', 'heme', 'electro', 'sams', 'drugfever', 'pancreatitis' ].includes(type) && (
            <button onClick={() => setAnalyzeCount((c) => c + 1)} className={`px-6 py-2 rounded-lg bg-${theme}-500 hover:bg-${theme}-600 text-white shadow-sm transition`}>Analyze</button>
          )}

          <button onClick={handleSaveData} className="px-6 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white shadow-sm transition flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" /></svg>
            Save Data
          </button>
          <button onClick={() => window.print()} className="px-6 py-2 rounded-lg bg-slate-800 hover:bg-slate-900 text-white shadow-sm transition flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
            Print
          </button>
        </div>
      </div>
    </div>
  );
};

export default AssessmentForm;