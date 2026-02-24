import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const Home = () => {
  const navigate = useNavigate();
  const [savedCases, setSavedCases] = useState([]);
  const currentUser = 'งานพัฒนาระบบยา กลุ่มงานเภสัชกรรม';

  useEffect(() => {
    const data = JSON.parse(localStorage.getItem('dili_cases') || '[]');
    setSavedCases(data);
  }, []);

  const handleDeleteCase = (id, e) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this case?')) {
      const newData = savedCases.filter((c) => c.id !== id);
      setSavedCases(newData);
      localStorage.setItem('dili_cases', JSON.stringify(newData));
    }
  };

  const handleLoadCase = (caseData) => {
    navigate(`/assess/${caseData.type || 'dili'}`, { state: { caseData } });
  };

  const getSuspectedDrugs = (c) => {
    if (Array.isArray(c.rankedDrugs) && c.rankedDrugs.length > 0) {
      return c.rankedDrugs;
    }
    if (
      c.savedData &&
      Array.isArray(c.savedData.drugList) &&
      c.savedData.drugList.length > 0
    ) {
      return c.savedData.drugList;
    }
    if (Array.isArray(c.drugList) && c.drugList.length > 0) {
      return c.drugList;
    }
    return [];
  };

  // ✅ UPDATE: ย้าย Pancreatitis มาไว้ล่างสุดต่อจาก Heme
  const tools = [
    {
      id: 'dili',
      title: 'DILI Assessment',
      desc: 'RUCAM Scale for Liver Injury',
      color: 'orange',
      active: true,
      path: '/assess/dili',
    },
    {
      id: 'rash',
      title: 'Drug Rash',
      desc: 'Naranjo Scale for Exanthema',
      color: 'pink',
      active: true,
      path: '/assess/rash',
    },
    {
      id: 'sjs',
      title: 'SJS / TEN',
      desc: 'ALDEN Score for Severe Reactions',
      color: 'red',
      active: true,
      path: '/assess/sjs',
    },
    {
      id: 'dress',
      title: 'DRESS Syndrome',
      desc: 'RegiSCAR Score for DRESS',
      color: 'purple',
      active: true,
      path: '/assess/dress',
    },
    {
      id: 'agep',
      title: 'AGEP',
      desc: 'EuroSCAR Score for Pustulosis',
      color: 'teal',
      active: true,
      path: '/assess/agep',
    },
    {
      id: 'sams',
      title: 'SAMS-CI',
      desc: 'Statin-Associated Muscle Sx',
      color: 'cyan',
      active: true,
      path: '/assess/sams',
    },
    {
      id: 'drugfever',
      title: 'Drug Fever',
      desc: 'Timeline & Criteria Check',
      color: 'indigo',
      active: true,
      path: '/assess/drugfever',
    },
    {
      id: 'electro',
      title: 'Electrolyte Imbalance',
      desc: 'Naranjo Scale for lytes',
      color: 'yellow',
      active: true,
      path: '/assess/electro',
    },
    {
      id: 'heme',
      title: 'Drug induce Hematologic disorder', 
      desc: 'Lab Monitoring + Naranjo',
      color: 'rose',
      active: true, 
      path: '/assess/heme',
    },
    // ✅ ย้ายมาไว้ตรงนี้แล้วครับ
    {
      id: 'pancreatitis',
      title: 'Drug induce Pancreatitis',
      desc: 'Assessment & Criteria Check',
      color: 'amber',
      active: false, 
      path: '/assess/pancreatitis',
    },
  ];

  const getADRBadgeClass = (type) => {
    switch (type?.toLowerCase()) {
      case 'dili':
        return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'rash':
        return 'bg-pink-100 text-pink-700 border-pink-200';
      case 'sjs':
        return 'bg-red-100 text-red-700 border-red-200';
      case 'dress':
        return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'agep':
        return 'bg-teal-100 text-teal-700 border-teal-200';
      case 'sams':
        return 'bg-cyan-100 text-cyan-700 border-cyan-200';
      case 'heme':
        return 'bg-rose-100 text-rose-700 border-rose-200';
      case 'drugfever':
        return 'bg-indigo-100 text-indigo-700 border-indigo-200';
      case 'pancreatitis':
        return 'bg-amber-100 text-amber-700 border-amber-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      <nav className="bg-white border-b border-slate-200 px-6 py-4 shadow-sm sticky top-0 z-20">
        <div className="max-w-5xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-xl">
              Rx
            </div>
            <span className="text-xl font-bold text-slate-800">
             Yommarat ADR assessment tools
            </span>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <div className="text-sm font-bold text-slate-700">
                {currentUser}
              </div>
              <div className="text-xs text-slate-500">Man Ung</div>
            </div>
            <div className="w-10 h-10 bg-slate-200 rounded-full flex items-center justify-center text-slate-500 font-bold">
              U
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-6 py-8">
        <div className="mb-10">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {tools.map((tool) => (
              <div
                key={tool.id}
                onClick={() => tool.active && navigate(tool.path)}
                className={`relative p-6 rounded-xl border transition duration-200 flex flex-col h-full text-left ${
                  tool.active
                    ? 'bg-white shadow-sm border-slate-200 hover:shadow-md hover:border-blue-400 cursor-pointer group'
                    : 'bg-slate-50 border-slate-200 opacity-80 cursor-not-allowed grayscale-[0.2]'
                }`}
              >
                <div className="flex justify-between items-start mb-2 w-full">
                  <h3
                    className={`text-lg font-bold pr-2 ${
                      tool.active
                        ? 'text-slate-800 group-hover:text-blue-600'
                        : 'text-slate-500'
                    }`}
                  >
                    {tool.title}
                  </h3>
                  {!tool.active && (
                    <span className="bg-slate-200 text-slate-500 text-[10px] px-2 py-1 rounded font-bold uppercase shrink-0">
                      Coming Soon
                    </span>
                  )}
                </div>
                <p className="text-sm text-slate-500 flex-grow text-left w-full">{tool.desc}</p>
                {tool.active && (
                  <div
                    className={`mt-4 text-xs font-bold uppercase tracking-wide flex items-center gap-1 text-${tool.color}-600`}
                  >
                    Click to start{' '}
                    <span className="transition-transform group-hover:translate-x-1">
                      →
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div
          style={{
            backgroundColor: '#fff1f0',
            border: '1px solid #ffa39e',
            borderRadius: '8px',
            padding: '12px 20px',
            marginBottom: '16px', 
            color: '#c02a2a',
            fontSize: '14px',
            fontWeight: '500',
            textAlign: 'center',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '12px',
          }}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ flexShrink: 0 }}
          >
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
            <line x1="12" y1="9" x2="12" y2="13"></line>
            <line x1="12" y1="17" x2="12.01" y2="17"></line>
          </svg>
          <span style={{ textAlign: 'left' }}>
            <strong>ข้อกำหนดการใช้งาน:</strong>{' '}
            เครื่องมือนี้เป็นเพียงระบบช่วยสนับสนุนข้อมูลเท่านั้น
            การตัดสินใจทางการแพทย์ทั้งหมดต้องขึ้นอยู่กับดุลยพินิจของบุคลากรทางการแพทย์ผู้ใช้งาน
            โดยผู้พัฒนาจะไม่รับผิดชอบต่อผลลัพธ์ใดๆ
            ที่เกิดขึ้นจากการนำข้อมูลไปใช้ และไม่อนุญาตให้นำข้อมูลไปใช้อ้างอิงก่อนได้รับสิทธิ์ในการเผยแพร่ในทุกกรณี
          </span>
        </div>

        <div
          style={{
            backgroundColor: '#fef9c3',
            border: '1px solid #fde047',
            borderRadius: '8px',
            padding: '12px 20px',
            marginBottom: '32px',
            color: '#854d0e',
            fontSize: '14px',
            fontWeight: '500',
            textAlign: 'center',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '12px',
          }}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ flexShrink: 0 }}
          >
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="16" x2="12" y2="12"></line>
            <line x1="12" y1="8" x2="12.01" y2="8"></line>
          </svg>
          <span style={{ textAlign: 'left' }}>
            <strong>ข้อควรระวัง:</strong>{' '}
            ระบบจัดเก็บข้อมูลแบบ Local Storage เฉพาะในอุปกรณ์นี้เท่านั้น ข้อมูลจะสูญหายหากมีการล้างข้อมูลการท่องเว็บหรือแคชของเบราว์เซอร์
          </span>
        </div>

        <div>
          <div className="flex justify-between items-center mb-4">
            <div>
              <h2 className="text-xl font-bold text-slate-800">
                Case Follow-up
              </h2>
              <p className="text-sm text-slate-500">Recent saved assessments</p>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider text-xs">
                <tr>
                  <th className="p-4 font-bold">Date Saved</th>
                  <th className="p-4 font-bold">HN</th>
                  <th className="p-4 font-bold">Patient Name</th>
                  <th className="p-4 font-bold text-center">ADR Type</th>
                  <th className="p-4 font-bold">Suspected Drugs</th>
                  <th className="p-4 font-bold text-right w-20">Delete</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {savedCases.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="p-10 text-center">
                      <div className="text-4xl mb-2">📭</div>
                      <div className="text-slate-400 font-medium">
                        No saved cases yet.
                      </div>
                    </td>
                  </tr>
                ) : (
                  savedCases.map((c) => (
                    <tr
                      key={c.id}
                      onClick={() => handleLoadCase(c)}
                      className="hover:bg-blue-50 transition cursor-pointer group"
                    >
                      <td className="p-4 text-slate-500 font-mono text-xs">
                        {new Date(c.savedAt).toLocaleDateString()}
                      </td>
                      <td className="p-4 font-mono font-bold text-slate-600 group-hover:text-blue-600">
                        {c.hn}
                      </td>
                      <td className="p-4 font-bold text-slate-800">{c.name}</td>

                      <td className="p-4 text-center">
                        <span
                          className={`px-2 py-1 rounded text-[10px] font-bold border uppercase ${getADRBadgeClass(
                            c.type
                          )}`}
                        >
                          {c.type || 'N/A'}
                        </span>
                      </td>

                      <td className="p-4">
                        <div className="flex flex-wrap gap-1">
                          {getSuspectedDrugs(c)
                            .slice(0, 3)
                            .map((d, i) => (
                              <span
                                key={i}
                                className="px-2 py-0.5 rounded text-xs border font-medium bg-slate-50 text-slate-600 border-slate-200"
                              >
                                {d.name}{' '}
                                <span className="opacity-60 ml-0.5 text-[10px]">
                                  ({d.total || d.score || 0})
                                </span>
                              </span>
                            ))}
                          {getSuspectedDrugs(c).length === 0 && (
                            <span className="text-slate-400 italic text-xs">
                              No data
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="p-4 text-right">
                        <button
                          onClick={(e) => handleDeleteCase(c.id, e)}
                          className="p-1.5 rounded-full hover:bg-red-100 transition"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="w-5 h-5 text-red-500 opacity-70 hover:opacity-100"
                          >
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                          </svg>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;