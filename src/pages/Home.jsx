import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const TOOLS = [
  { id: 'dili',         title: 'DILI',                scale: 'RUCAM',      desc: 'Drug-induced liver injury',         path: '/assess/dili',         color: '#fff0e4', textColor: '#c4620a', borderColor: '#f5cfa8' },
  { id: 'rash',         title: 'Drug Rash',           scale: 'Naranjo',    desc: 'Cutaneous drug reaction',           path: '/assess/rash',         color: '#fbeaf0', textColor: '#9b3060', borderColor: '#f4c0d1' },
  { id: 'sjs',          title: 'SJS / TEN',           scale: 'ALDEN',      desc: 'Epidermal necrolysis',              path: '/assess/sjs',          color: '#fdf0ee', textColor: '#8c3322', borderColor: '#f5b8b8' },
  { id: 'dress',        title: 'DRESS',               scale: 'RegiSCAR',   desc: 'Drug reaction with eosinophilia',   path: '/assess/dress',        color: '#f0eeff', textColor: '#4a3ab8', borderColor: '#cec8f6' },
  { id: 'agep',         title: 'AGEP',                scale: 'EuroSCAR',   desc: 'Acute generalised pustulosis',      path: '/assess/agep',         color: '#e6f4f1', textColor: '#1a6b62', borderColor: '#b2ddd7' },
  { id: 'sams',         title: 'SAMS-CI',             scale: 'SAMS-CI',    desc: 'Statin-associated muscle symptoms', path: '/assess/sams',         color: '#e6f4f1', textColor: '#1a6b62', borderColor: '#b2ddd7' },
  { id: 'drugfever',    title: 'Drug Fever',          scale: 'Timeline',   desc: 'Drug-induced fever workup',         path: '/assess/drugfever',    color: '#f0eeff', textColor: '#4a3ab8', borderColor: '#cec8f6' },
  { id: 'electro',      title: 'Electrolyte',         scale: 'Naranjo',    desc: 'Drug-induced electrolyte imbalance',path: '/assess/electro',      color: '#fef6e4', textColor: '#9b6e00', borderColor: '#f0d98a' },
  { id: 'heme',         title: 'Hematologic',         scale: 'Naranjo',    desc: 'Drug-induced blood disorder',       path: '/assess/heme',         color: '#fbeaf0', textColor: '#9b3060', borderColor: '#f4c0d1' },
  { id: 'pancreatitis', title: 'Pancreatitis',        scale: 'Weissman',   desc: 'Drug-induced pancreatitis',        path: '/assess/pancreatitis', color: '#fff0e4', textColor: '#c4620a', borderColor: '#f5cfa8' },
];

const ADR_BADGE = {
  dili:         { bg: '#fff0e4', text: '#c4620a', border: '#f5cfa8' },
  rash:         { bg: '#fbeaf0', text: '#9b3060', border: '#f4c0d1' },
  sjs:          { bg: '#fdf0ee', text: '#8c3322', border: '#f5b8b8' },
  dress:        { bg: '#f0eeff', text: '#4a3ab8', border: '#cec8f6' },
  agep:         { bg: '#e6f4f1', text: '#1a6b62', border: '#b2ddd7' },
  sams:         { bg: '#e6f4f1', text: '#1a6b62', border: '#b2ddd7' },
  drugfever:    { bg: '#f0eeff', text: '#4a3ab8', border: '#cec8f6' },
  electro:      { bg: '#fef6e4', text: '#9b6e00', border: '#f0d98a' },
  heme:         { bg: '#fbeaf0', text: '#9b3060', border: '#f4c0d1' },
  pancreatitis: { bg: '#fff0e4', text: '#c4620a', border: '#f5cfa8' },
};

export default function Home() {
  const navigate = useNavigate();
  const [savedCases, setSavedCases] = useState([]);

  useEffect(() => {
    const data = JSON.parse(localStorage.getItem('dili_cases') || '[]');
    setSavedCases(data);
  }, []);

  const handleDelete = (id, e) => {
    e.stopPropagation();
    if (!confirm('Delete this case?')) return;
    const next = savedCases.filter(c => c.id !== id);
    setSavedCases(next);
    localStorage.setItem('dili_cases', JSON.stringify(next));
  };

  const getSuspectedDrugs = c => {
    if (Array.isArray(c.rankedDrugs) && c.rankedDrugs.length) return c.rankedDrugs;
    if (c.savedData?.drugList?.length) return c.savedData.drugList;
    if (Array.isArray(c.drugList) && c.drugList.length) return c.drugList;
    return [];
  };

  const badge = type => ADR_BADGE[type?.toLowerCase()] || { bg: '#f4f2ee', text: '#6b6360', border: '#d6d0c8' };

  return (
    <div style={{ minHeight: '100vh', background: '#faf9f7', fontFamily: "'Inter', system-ui, sans-serif" }}>

      {/* ── NAV ── */}
      <nav style={{ background: '#fff', borderBottom: '0.5px solid #ebe8e2', padding: '0 24px', height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 30, height: 30, background: '#2a9d8f', borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 12, flexShrink: 0 }}>Rx</div>
          <span style={{ fontWeight: 600, fontSize: 15, color: '#2d2926', letterSpacing: '-0.01em' }}>Yommarat ADR tools</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#2d2926' }}>งานพัฒนาระบบยา</div>
            <div style={{ fontSize: 11, color: '#a8a099' }}>Man Ung</div>
          </div>
          <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#f4f2ee', border: '0.5px solid #d6d0c8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 600, color: '#6b6360' }}>U</div>
        </div>
      </nav>

      <div style={{ maxWidth: 960, margin: '0 auto', padding: '32px 24px 64px' }}>

        {/* ── TOOLS GRID ── */}
        <div style={{ marginBottom: 8 }}>
          <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase', color: '#a8a099', marginBottom: 14 }}>Assessment tools</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 10 }}>
            {TOOLS.map(tool => (
              <div
                key={tool.id}
                onClick={() => navigate(tool.path)}
                style={{ background: '#fff', border: '0.5px solid #ebe8e2', borderRadius: 10, padding: '14px 16px', cursor: 'pointer', transition: 'border-color 0.15s, box-shadow 0.15s', position: 'relative' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = '#2a9d8f'; e.currentTarget.style.boxShadow = '0 0 0 3px #e6f4f1'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = '#ebe8e2'; e.currentTarget.style.boxShadow = 'none'; }}
              >
                <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 99, fontSize: 10, fontWeight: 600, letterSpacing: '0.03em', background: tool.color, color: tool.textColor, border: `0.5px solid ${tool.borderColor}`, marginBottom: 8 }}>{tool.scale}</span>
                <div style={{ fontWeight: 600, fontSize: 14, color: '#2d2926', marginBottom: 3 }}>{tool.title}</div>
                <div style={{ fontSize: 11, color: '#a8a099', lineHeight: 1.4 }}>{tool.desc}</div>
                <span style={{ position: 'absolute', top: 14, right: 14, color: '#d6d0c8', fontSize: 14 }}>→</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── NOTICES ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, margin: '24px 0' }}>
          <div style={{ background: '#fdf0ee', border: '0.5px solid #f0c4be', borderLeft: '3px solid #e07060', borderRadius: 6, padding: '10px 14px', fontSize: 12, color: '#8c3322', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            <span style={{ flexShrink: 0, marginTop: 1 }}>⚠</span>
            <span><strong>ข้อกำหนดการใช้งาน:</strong> เครื่องมือนี้เป็นระบบช่วยสนับสนุนข้อมูลเท่านั้น การตัดสินใจทางการแพทย์ขึ้นอยู่กับดุลยพินิจของบุคลากรทางการแพทย์ ผู้พัฒนาไม่รับผิดชอบต่อผลลัพธ์ที่เกิดขึ้น</span>
          </div>
          <div style={{ background: '#fef6e4', border: '0.5px solid #f0d98a', borderLeft: '3px solid #e09520', borderRadius: 6, padding: '10px 14px', fontSize: 12, color: '#7a5500', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            <span style={{ flexShrink: 0, marginTop: 1 }}>ℹ</span>
            <span><strong>Local storage:</strong> ข้อมูลถูกจัดเก็บใน browser นี้เท่านั้น จะสูญหายหากล้างแคชหรือเปลี่ยนอุปกรณ์</span>
          </div>
        </div>

        {/* ── CASE TABLE ── */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 14 }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase', color: '#a8a099' }}>Case follow-up</div>
              <div style={{ fontSize: 12, color: '#a8a099', marginTop: 2 }}>Recent saved assessments</div>
            </div>
            <div style={{ fontSize: 12, color: '#a8a099' }}>{savedCases.length} case{savedCases.length !== 1 ? 's' : ''}</div>
          </div>

          <div style={{ background: '#fff', border: '0.5px solid #ebe8e2', borderRadius: 10, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#faf9f7', borderBottom: '0.5px solid #ebe8e2' }}>
                  {['Date', 'HN', 'Patient name', 'ADR type', 'Suspected drugs', ''].map(h => (
                    <th key={h} style={{ padding: '9px 14px', textAlign: 'left', fontSize: 10, fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase', color: '#a8a099', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {savedCases.length === 0 ? (
                  <tr><td colSpan={6} style={{ padding: '48px 0', textAlign: 'center', color: '#a8a099', fontSize: 13 }}>
                    <div style={{ fontSize: 24, marginBottom: 8 }}>📭</div>
                    No saved cases yet
                  </td></tr>
                ) : savedCases.map(c => {
                  const b = badge(c.type);
                  const drugs = getSuspectedDrugs(c);
                  return (
                    <tr key={c.id}
                      onClick={() => navigate(`/assess/${c.type || 'dili'}`, { state: { caseData: c } })}
                      style={{ borderBottom: '0.5px solid #f4f2ee', cursor: 'pointer', transition: 'background 0.1s' }}
                      onMouseEnter={e => e.currentTarget.style.background = '#faf9f7'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      <td style={{ padding: '10px 14px', fontFamily: 'monospace', fontSize: 11, color: '#a8a099' }}>{new Date(c.savedAt).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: '2-digit' })}</td>
                      <td style={{ padding: '10px 14px', fontFamily: 'monospace', fontWeight: 600, fontSize: 12, color: '#6b6360' }}>{c.hn}</td>
                      <td style={{ padding: '10px 14px', fontWeight: 500, color: '#2d2926' }}>{c.name}</td>
                      <td style={{ padding: '10px 14px' }}>
                        <span style={{ padding: '2px 9px', borderRadius: 99, fontSize: 10, fontWeight: 600, letterSpacing: '0.03em', background: b.bg, color: b.text, border: `0.5px solid ${b.border}` }}>{(c.type || 'N/A').toUpperCase()}</span>
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                          {drugs.slice(0, 3).map((d, i) => (
                            <span key={i} style={{ padding: '2px 8px', borderRadius: 99, fontSize: 11, background: '#f4f2ee', color: '#6b6360', border: '0.5px solid #ebe8e2' }}>
                              {d.name} <span style={{ color: '#a8a099', fontSize: 10 }}>({d.total ?? d.score ?? 0})</span>
                            </span>
                          ))}
                          {drugs.length === 0 && <span style={{ color: '#a8a099', fontSize: 11, fontStyle: 'italic' }}>No data</span>}
                        </div>
                      </td>
                      <td style={{ padding: '10px 14px', textAlign: 'right' }}>
                        <button
                          onClick={e => handleDelete(c.id, e)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px 6px', borderRadius: 6, color: '#d6d0c8', fontSize: 16, lineHeight: 1, transition: 'color 0.15s' }}
                          onMouseEnter={e => e.currentTarget.style.color = '#e07060'}
                          onMouseLeave={e => e.currentTarget.style.color = '#d6d0c8'}
                        >×</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
