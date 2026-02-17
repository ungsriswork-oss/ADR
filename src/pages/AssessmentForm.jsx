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
import DrugFeverAssessment from './DrugFeverAssessment'; // ✅ 1. เพิ่ม Import Drug Fever

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
    drugfever: { title: 'Drug Fever', themeColor: 'indigo' }, // ✅ 2. เพิ่ม Config สีและชื่อ
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
      setDrugList(src.drugList || src.drugs || src.rashDrugs || loaded.drugList || []);
      setSymptomDate(src.symptomDate || src.rashOnset || src.onset || loaded.symptomDate || '');
      setPharmacistNote(loaded.pharmacistNote || src.pharmacistNote || '');

      // Load ข้อมูลเฉพาะ tool
      if (['dili', 'dress', 'agep', 'heme'].includes(type)) {
        setLabEntries(loaded.labEntries || []);
      }
      if (['rash', 'sjs'].includes(type)) {
        setDailyLogs(src.dailyLogs || src.logs || []);
      }
      if (type === 'rash') {
        setNaranjoScores(src.naranjoScores || src.scores || {});
        setProdromeData(src.prodromeData || {});
      }
      
      // Load ผลวิเคราะห์
      if (loaded.analysisResultFull) {
        setLoadedAnalysisResult(loaded.analysisResultFull);
        setAnalysisResult(loaded.analysisResultFull);
      } else {
        // ถ้าไม่มีผลบันทึกไว้ ให้ลอง Auto-analyze (ยกเว้น DILI ที่ต้องกดเอง)
        if (type !== 'dili') {
          setTimeout(() => setAnalyzeCount((c) => c + 1), 500);
        }
      }
    }
  }, [location.state, type]);

  // --- SAVE DATA HANDLER ---
  const handleSaveData = () => {
    if (!patientData.name || !patientData.hn)
      return alert('กรุณากรอก ชื่อ-นามสกุล และ HN');

    // จัดการ Ranked List
    let rankedList = analysisResult?.rankedDrugs || [];
    
    // กรณี SAMS มักไม่มี rankedDrugs แบบละเอียด ให้สร้าง Dummy ขึ้นมาแสดงในตารางหน้าแรก
    if (type === 'sams' && analysisResult) {
        rankedList = [{ name: 'Statin Risk Score', total: analysisResult.total || '-' }];
    } else if (type === 'rash' && rankedList.length === 0 && drugList.length > 0) {
      rankedList = drugList.map((d) => ({ name: d.name, total: '-' }));
    }

    const newCase = {
      id: location.state?.caseData?.id || Date.now(),
      type: type,
      ...patientData,
      drugList,
      symptomDate,
      pharmacistNote,
      labEntries: ['dili', 'dress', 'agep', 'heme'].includes(type) ? labEntries : [],
      
      // เก็บข้อมูลดิบ (Saved Data)
      savedData: {
        drugList,
        symptomDate,
        pharmacistNote,
        // เก็บเฉพาะฟิลด์ที่แต่ละ Tool ใช้
        dailyLogs: ['rash', 'sjs'].includes(type) ? dailyLogs : undefined,
        naranjoScores: type === 'rash' ? naranjoScores : undefined,
        prodromeData: type === 'rash' ? prodromeData : undefined,
        // Drug Fever อาจจะใช้ข้อมูลใน analysisResult ในการ Load กลับมาดู (ผ่าน onAnalysisComplete ที่ส่ง drugEntries กลับมา)
      },

      analysisResultFull: analysisResult,
      rFactor: analysisResult?.rFactor || analysisResult?.total || '-',
      analysisType: analysisResult?.type || analysisResult?.text || 'N/A',
      rankedDrugs: rankedList,
      savedAt: new Date().toISOString(),
    };

    try {
      const existingData = JSON.parse(localStorage.getItem('dili_cases') || '[]');
      // กรองข้อมูลเดิมออก (กรณี Edit) แล้วใส่ข้อมูลใหม่เข้าไปข้างหน้า
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
          
          {/* ✅ 3. เพิ่มเงื่อนไข Render Drug Fever */}
          {type === 'drugfever' && (
            <DrugFeverAssessment onAnalysisComplete={setAnalysisResult} />
          )}

          {/* SAMS */}
          {type === 'sams' && (
            <SamsAssessment onAnalysisComplete={setAnalysisResult} />
          )}

          {/* Tools อื่นๆ */}
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
          {type === 'electro' && <ElectroAssessment onAnalysisComplete={setAnalysisResult} />}
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

          {/* ปุ่ม Analyze (ซ่อนสำหรับ Tools ที่คำนวณ Auto หรือไม่จำเป็นต้องกด) */}
          {![ 'dili', 'sjs', 'rash', 'dress', 'agep', 'heme', 'electro', 'sams', 'drugfever' ].includes(type) && (
            <button onClick={() => setAnalyzeCount((c) => c + 1)} className={`px-6 py-2 rounded-lg bg-${theme}-500 hover:bg-${theme}-600 text-white shadow-sm transition`}>Analyze</button>
          )}

          <button onClick={handleSaveData} className="px-6 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white shadow-sm transition flex items-center gap-2">Save Data</button>
          <button onClick={() => window.print()} className="px-6 py-2 rounded-lg bg-slate-800 hover:bg-slate-900 text-white shadow-sm transition flex items-center gap-2">Print</button>
        </div>
      </div>
    </div>
  );
};

export default AssessmentForm;