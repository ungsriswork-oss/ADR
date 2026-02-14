import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';

import DiliAssessment from './DiliAssessment';
import DressAssessment from './DressAssessment';
import AgepAssessment from './AgepAssessment';
import SjsAssessment from './SjsAssessment';
import HemeAssessment from './HemeAssessment';
import RashAssessment from './RashAssessment';
import ElectroAssessment from './ElectroAssessment';

const AssessmentForm = () => {
  const { type } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  // 1. Patient Data
  const [patientData, setPatientData] = useState({
    hn: '',
    name: '',
    age: '',
    ward: '',
    dateReceived: new Date().toISOString().split('T')[0],
  });

  // 2. Shared States
  const [labEntries, setLabEntries] = useState([]);
  const [drugList, setDrugList] = useState([]);
  const [symptomDate, setSymptomDate] = useState('');

  // 3. Rash Specific States
  const [dailyLogs, setDailyLogs] = useState([]);
  const [naranjoScores, setNaranjoScores] = useState({});
  const [pharmacistNote, setPharmacistNote] = useState('');

  // ✅ (1) เพิ่มตัวแปร state สำหรับเก็บค่า Checkbox ของ Prodrome
  const [prodromeData, setProdromeData] = useState({});

  // Result
  const [analysisResult, setAnalysisResult] = useState(null);
  const [analyzeCount, setAnalyzeCount] = useState(0);
  const [loadedAnalysisResult, setLoadedAnalysisResult] = useState(null);

  // --- LOAD DATA ---
  useEffect(() => {
    if (location.state?.caseData) {
      const loaded = location.state.caseData;
      setPatientData({
        hn: loaded.hn || '',
        name: loaded.name || '',
        age: loaded.age || '',
        ward: loaded.ward || '',
        dateReceived:
          loaded.dateReceived || new Date().toISOString().split('T')[0],
      });

      const src = loaded.savedData || loaded;
      setDrugList(
        src.drugList || src.drugs || src.rashDrugs || loaded.drugList || []
      );
      setSymptomDate(
        src.symptomDate ||
          src.rashOnset ||
          src.onset ||
          loaded.symptomDate ||
          ''
      );

      // Load Note
      setPharmacistNote(loaded.pharmacistNote || src.pharmacistNote || '');

      if (['dili', 'dress', 'agep', 'heme'].includes(type)) {
        setLabEntries(loaded.labEntries || []);
        if (loaded.analysisResultFull) {
          setLoadedAnalysisResult(loaded.analysisResultFull);
          setAnalysisResult(loaded.analysisResultFull);
        }
      }

      if (['rash', 'sjs'].includes(type)) {
        setDailyLogs(src.dailyLogs || src.logs || src.symptomLogs || []);
      }

      if (type === 'rash') {
        setNaranjoScores(src.naranjoScores || src.scores || {});
        // ✅ (2) โหลดค่า Prodrome ที่เคยบันทึกไว้มาใส่ State
        setProdromeData(src.prodromeData || {});
      }

      if (!loaded.analysisResultFull) {
        setTimeout(() => setAnalyzeCount((c) => c + 1), 500);
      }
    }
  }, [location.state, type]);

  const typeSettings = {
    dili: { title: 'Liver Injury (DILI)', themeColor: 'orange' },
    dress: { title: 'DRESS Syndrome', themeColor: 'purple' },
    agep: { title: 'AGEP', themeColor: 'teal' },
    sjs: { title: 'SJS/TEN', themeColor: 'red' },
    rash: { title: 'Drug Rash (Naranjo)', themeColor: 'pink' },
    electro: { title: 'Electrolyte Imbalance', themeColor: 'yellow' },
    heme: { title: 'Hematologic Disorder', themeColor: 'rose' },
    default: { title: 'Assessment', themeColor: 'slate' },
  };
  const currentSetting = typeSettings[type] || typeSettings.default;
  const theme = currentSetting.themeColor;

  // --- SAVE DATA ---
  const handleSaveData = () => {
    if (!patientData.name || !patientData.hn)
      return alert('กรุณากรอก ชื่อ-นามสกุล และ HN');

    let rankedList = analysisResult?.rankedDrugs || [];
    if (type === 'rash' && rankedList.length === 0 && drugList.length > 0) {
      rankedList = drugList.map((d) => ({ name: d.name, total: '-' }));
    }

    const newCase = {
      id: location.state?.caseData?.id || Date.now(),
      type: type,
      ...patientData,

      labEntries: ['dili', 'dress', 'agep', 'heme'].includes(type)
        ? labEntries
        : [],
      drugList,
      symptomDate,
      pharmacistNote,

      analysisResultFull: analysisResult,

      savedData: ['rash', 'sjs'].includes(type)
        ? {
            drugList,
            symptomDate,
            dailyLogs,
            naranjoScores: type === 'rash' ? naranjoScores : undefined,
            pharmacistNote,
            // ✅ (3) บันทึกค่า Prodrome ลงฐานข้อมูล
            prodromeData,
          }
        : null,

      rFactor: analysisResult?.rFactor || '-',
      analysisType: analysisResult?.type || 'N/A',
      rankedDrugs: rankedList,
      savedAt: new Date().toISOString(),
    };

    try {
      const existingData = JSON.parse(
        localStorage.getItem('dili_cases') || '[]'
      );
      const filteredData = existingData.filter((c) => c.id !== newCase.id);
      localStorage.setItem(
        'dili_cases',
        JSON.stringify([newCase, ...filteredData])
      );
      alert('บันทึกข้อมูลเรียบร้อยแล้ว!');
      navigate('/');
    } catch (error) {
      console.error('Save Error:', error);
      alert('เกิดข้อผิดพลาดในการบันทึกข้อมูล');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans pb-24 relative print:bg-white print:pb-0">
      <nav className="bg-white border-b border-slate-200 px-6 py-4 shadow-sm sticky top-0 z-20 print:hidden">
        <div className="max-w-5xl mx-auto flex items-center gap-4">
          <button
            onClick={() => navigate('/')}
            className="p-2 rounded-full text-slate-500 hover:bg-slate-100"
          >
            ←
          </button>
          <div>
            <h1
              className={`text-2xl font-bold tracking-tight text-${theme}-600`}
            >
              {currentSetting.title}
            </h1>
            <p className="text-xs text-slate-400 font-medium">
              {location.state?.caseData
                ? 'Viewing Saved Case'
                : 'New Clinical Entry'}
            </p>
          </div>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-6 mt-8 print:max-w-none print:px-0 print:mt-0">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6">
          <h2
            className={`text-sm font-bold text-${theme}-600 uppercase mb-4 border-b pb-2 text-left`}
          >
            PATIENT DATA
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
            <div className="col-span-1">
              <label className="text-xs font-bold text-slate-500">HN</label>
              <input
                className="border w-full p-2 rounded"
                value={patientData.hn}
                onChange={(e) =>
                  setPatientData({ ...patientData, hn: e.target.value })
                }
              />
            </div>
            <div className="col-span-2">
              <label className="text-xs font-bold text-slate-500">Name</label>
              <input
                className="border w-full p-2 rounded"
                value={patientData.name}
                onChange={(e) =>
                  setPatientData({ ...patientData, name: e.target.value })
                }
              />
            </div>
            <div className="col-span-1">
              <label className="text-xs font-bold text-slate-500">Age</label>
              <input
                type="number"
                className="border w-full p-2 rounded"
                value={patientData.age}
                onChange={(e) =>
                  setPatientData({ ...patientData, age: e.target.value })
                }
              />
            </div>
            <div className="col-span-2">
              <label className="text-xs font-bold text-slate-500">Date</label>
              <input
                type="date"
                className="border w-full p-2 rounded"
                value={patientData.dateReceived}
                onChange={(e) =>
                  setPatientData({
                    ...patientData,
                    dateReceived: e.target.value,
                  })
                }
              />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          {type === 'dili' && (
            <DiliAssessment
              patientData={patientData}
              labEntries={labEntries}
              setLabEntries={setLabEntries}
              drugList={drugList}
              setDrugList={setDrugList}
              symptomDate={symptomDate}
              setSymptomDate={setSymptomDate}
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
              labEntries={labEntries}
              setLabEntries={setLabEntries}
              drugList={drugList}
              setDrugList={setDrugList}
              symptomDate={symptomDate}
              setSymptomDate={setSymptomDate}
            />
          )}
          {type === 'agep' && (
            <AgepAssessment
              patientData={patientData}
              analyzeCount={analyzeCount}
              onAnalysisComplete={setAnalysisResult}
              labEntries={labEntries}
              setLabEntries={setLabEntries}
              drugList={drugList}
              setDrugList={setDrugList}
              symptomDate={symptomDate}
              setSymptomDate={setSymptomDate}
            />
          )}
          {type === 'sjs' && (
            <SjsAssessment
              drugList={drugList}
              setDrugList={setDrugList}
              indexDate={symptomDate}
              setIndexDate={setSymptomDate}
              symptomLogs={dailyLogs}
              setSymptomLogs={setDailyLogs}
              onAnalysisComplete={setAnalysisResult}
            />
          )}
          {type === 'heme' && (
            <HemeAssessment onAnalysisComplete={setAnalysisResult} />
          )}

          {/* ✅ (4) ส่ง Props prodromeData ให้ตัวลูกใช้งาน */}
          {type === 'rash' && (
            <RashAssessment
              drugList={drugList}
              setDrugList={setDrugList}
              dailyLogs={dailyLogs}
              setDailyLogs={setDailyLogs}
              symptomDate={symptomDate}
              setSymptomDate={setSymptomDate}
              naranjoScores={naranjoScores}
              setNaranjoScores={setNaranjoScores}
              pharmacistNote={pharmacistNote}
              setPharmacistNote={setPharmacistNote}
              // เพิ่มตรงนี้
              prodromeData={prodromeData}
              setProdromeData={setProdromeData}
              onAnalysisComplete={setAnalysisResult}
              initialData={{
                savedData: {
                  drugList,
                  symptomDate,
                  dailyLogs,
                  naranjoScores,
                  pharmacistNote,
                  prodromeData, // ส่งลงไปเพื่อให้ลูกรู้สถานะล่าสุด
                },
              }}
            />
          )}

          {type === 'electro' && (
            <ElectroAssessment onAnalysisComplete={setAnalysisResult} />
          )}
        </div>

        <div className="mt-8 flex justify-end gap-3 print:hidden">
          <button
            onClick={() => navigate('/')}
            className="px-6 py-2 rounded-lg border hover:bg-slate-50 transition"
          >
            Cancel
          </button>

          {!['dili', 'sjs', 'rash'].includes(type) && (
            <button
              onClick={() => setAnalyzeCount((c) => c + 1)}
              className={`px-6 py-2 rounded-lg bg-${theme}-500 hover:bg-${theme}-600 text-white shadow-sm transition`}
            >
              Analyze
            </button>
          )}

          <button
            onClick={handleSaveData}
            className="px-6 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white shadow-sm transition flex items-center gap-2"
          >
            Save Data
          </button>
          <button
            onClick={() => window.print()}
            className="px-6 py-2 rounded-lg bg-slate-800 hover:bg-slate-900 text-white shadow-sm transition flex items-center gap-2"
          >
            Print
          </button>
        </div>
      </div>
    </div>
  );
};

export default AssessmentForm;
