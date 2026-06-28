import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const TOOLS = [
  { id: 'dili',         title: 'DILI',          scale: 'RUCAM',    desc: 'Drug-induced liver injury',          path: '/assess/dili',         accent: '#e09520' },
  { id: 'rash',         title: 'Drug rash',      scale: 'Naranjo',  desc: 'Cutaneous drug reaction',            path: '/assess/rash',         accent: '#d4537e' },
  { id: 'sjs',          title: 'SJS / TEN',      scale: 'ALDEN',    desc: 'Epidermal necrolysis',               path: '/assess/sjs',          accent: '#e05050' },
  { id: 'dress',        title: 'DRESS',          scale: 'RegiSCAR', desc: 'Drug reaction with eosinophilia',    path: '/assess/dress',        accent: '#534ab7' },
  { id: 'agep',         title: 'AGEP',           scale: 'EuroSCAR', desc: 'Acute generalised pustulosis',       path: '/assess/agep',         accent: '#2a9d8f' },
  { id: 'sams',         title: 'SAMS-CI',        scale: 'SAMS-CI',  desc: 'Statin muscle symptoms',             path: '/assess/sams',         accent: '#2a9d8f' },
  { id: 'drugfever',    title: 'Drug fever',     scale: 'Timeline', desc: 'Fever workup',                       path: '/assess/drugfever',    accent: '#534ab7' },
  { id: 'electro',      title: 'Electrolyte',    scale: 'Naranjo',  desc: 'Drug-induced imbalance',             path: '/assess/electro',      accent: '#e09520' },
  { id: 'heme',         title: 'Hematologic',    scale: 'Naranjo',  desc: 'Drug-induced blood disorder',        path: '/assess/heme',         accent: '#d4537e' },
  { id: 'pancreatitis', title: 'Pancreatitis',   scale: 'Weissman', desc: 'Drug-induced pancreatitis',          path: '/assess/pancreatitis', accent: '#e09520' },
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

const T = {
  // Nav — Apple frosted glass
  nav: {
    background: 'rgba(250,249,247,0.85)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    borderBottom: '1px solid rgba(0,0,0,0.08)',
    padding: '0 clamp(16px, 4vw, 48px)',
    height: 52,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    position: 'sticky',
    top: 0,
    zIndex: 20,
  },
  logoMark: {
    width: 28, height: 28,
    background: '#2a9d8f',
    borderRadius: 7,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    color: '#fff', fontWeight: 700, fontSize: 11, flexShrink: 0,
  },
  sectionLabel: {
    fontSize: 11, fontWeight: 600, letterSpacing: '0.07em',
    textTransform: 'uppercase', color: '#a8a099', marginBottom: 12,
  },
  // Tool card — warm left-border accent
  toolCard: {
    background: '#fff',
    border: '1px solid #ebe8e2',
    borderRadius: 10,
    padding: '13px 14px 13px 17px',
    cursor: 'pointer',
    position: 'relative',
    overflow: 'hidden',
    transition: 'border-color 0.15s, box-shadow 0.15s',
  },
  // Input — Apple 7px radius
  input: {
    padding: '7px 10px',
    border: '1px solid #d6d0c8',
    borderRadius: 7,
    fontSize: 13,
    color: '#2d2926',
    background: '#fff',
    fontFamily: "'Inter', system-ui, sans-serif",
    outline: 'none',
    width: '100%',
    boxSizing: 'border-box',
  },
};

export default function Home() {
  const navigate = useNavigate();
  const [savedCases, setSavedCases] = useState([]);

  useEffect(() => {
    setSavedCases(JSON.parse(localStorage.getItem('dili_cases') || '[]'));
  }, []);

  const handleDelete = (id, e) => {
    e.stopPropagation();
    if (!confirm('ลบ case นี้?')) return;
    const next = savedCases.filter(c => c.id !== id);
    setSavedCases(next);
    localStorage.setItem('dili_cases', JSON.stringify(next));
  };

  const getDrugs = c =>
    c.rankedDrugs?.length ? c.rankedDrugs
    : c.savedData?.drugList?.length ? c.savedData.drugList
    : c.drugList?.length ? c.drugList : [];

  const badge = type => ADR_BADGE[type?.toLowerCase()] || { bg: '#f4f2ee', text: '#6b6360', border: '#d6d0c8' };

  return (
    <div style={{ minHeight: '100vh', background: '#faf9f7', fontFamily: "'Inter', system-ui, sans-serif" }}>

      {/* ── NAV — frosted glass ── */}
      <nav style={T.nav}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          <div style={T.logoMark}>Rx</div>
          <span style={{ fontWeight: 600, fontSize: 14, color: '#2d2926', letterSpacing: '-0.01em' }}>
            Yommarat ADR tools
          </span>
        </div>
        <div style={{ fontSize: 12, color: '#a8a099', letterSpacing: '-0.01em' }}>
          งานพัฒนาระบบยา โรงพยาบาลเจ้าพระยายมราช
        </div>
      </nav>

      <div style={{ maxWidth: 1400, margin: '0 auto', padding: 'clamp(16px, 4vw, 48px)', paddingTop: 32, paddingBottom: 64 }}>

        {/* ── TOOLS GRID ── */}
        <div style={T.sectionLabel}>Assessment tools</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 195px), 1fr))', gap: 10, marginBottom: 28 }}>
          {TOOLS.map(tool => (
            <div
              key={tool.id}
              onClick={() => navigate(tool.path)}
              style={T.toolCard}
              onMouseEnter={e => { e.currentTarget.style.borderColor = '#2a9d8f'; e.currentTarget.style.boxShadow = '0 0 0 3px #e6f4f1'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = '#ebe8e2'; e.currentTarget.style.boxShadow = 'none'; }}
            >
              {/* Left accent bar */}
              <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, background: tool.accent, borderRadius: '10px 0 0 10px' }} />
              <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', color: '#a8a099', marginBottom: 5 }}>{tool.scale}</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#2d2926', marginBottom: 2 }}>{tool.title}</div>
              <div style={{ fontSize: 11, color: '#a8a099', lineHeight: 1.4 }}>{tool.desc}</div>
              <div style={{ position: 'absolute', top: '50%', right: 12, transform: 'translateY(-50%)', color: '#d6d0c8', fontSize: 14 }}>›</div>
            </div>
          ))}
        </div>

        {/* ── NOTICES ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 7, marginBottom: 32 }}>
          {[
            { icon: '⚠', color: '#8c3322', bg: '#fdf0ee', border: '#f0c4be', accent: '#e07060', text: <><strong>ข้อกำหนดการใช้งาน:</strong> เครื่องมือนี้เป็นระบบสนับสนุนข้อมูลเท่านั้น การตัดสินใจทางการแพทย์ขึ้นอยู่กับดุลยพินิจของบุคลากรทางการแพทย์ ผู้พัฒนาไม่รับผิดชอบต่อผลลัพธ์ที่เกิดขึ้น</> },
            { icon: 'ℹ', color: '#7a5500', bg: '#fef6e4', border: '#f0d98a', accent: '#e09520', text: <><strong>Local storage:</strong> ข้อมูลถูกจัดเก็บใน browser นี้เท่านั้น จะสูญหายหากล้างแคช</> },
          ].map((n, i) => (
            <div key={i} style={{ background: n.bg, border: `1px solid ${n.border}`, borderLeft: `3px solid ${n.accent}`, borderRadius: 7, padding: '9px 13px', fontSize: 12, color: n.color, display: 'flex', gap: 9, alignItems: 'flex-start' }}>
              <span style={{ flexShrink: 0, marginTop: 1 }}>{n.icon}</span>
              <span>{n.text}</span>
            </div>
          ))}
        </div>

        {/* ── CASE TABLE ── */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div style={T.sectionLabel}>Case follow-up</div>
          <div style={{ fontSize: 11, color: '#a8a099' }}>{savedCases.length} case{savedCases.length !== 1 ? 's' : ''}</div>
        </div>

        <div style={{ background: '#fff', border: '1px solid #ebe8e2', borderRadius: 10, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#faf9f7', borderBottom: '1px solid #ebe8e2' }}>
                {['Date', 'HN', 'Patient name', 'Ward', 'ADR type', 'Suspected drugs', ''].map(h => (
                  <th key={h} style={{ padding: '9px 14px', textAlign: 'left', fontSize: 10, fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase', color: '#a8a099' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {savedCases.length === 0 ? (
                <tr><td colSpan={6} style={{ padding: '48px 0', textAlign: 'center', color: '#a8a099', fontSize: 13 }}>
                  <div style={{ fontSize: 24, marginBottom: 8 }}>📭</div>No saved cases yet
                </td></tr>
              ) : savedCases.map(c => {
                const b = badge(c.type);
                const drugs = getDrugs(c);
                return (
                  <tr key={c.id}
                    onClick={() => navigate(`/assess/${c.type || 'dili'}`, { state: { caseData: c } })}
                    style={{ borderBottom: '1px solid #f4f2ee', cursor: 'pointer' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#faf9f7'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <td style={{ padding: '10px 14px', fontFamily: 'monospace', fontSize: 11, color: '#a8a099' }}>{new Date(c.savedAt).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: '2-digit' })}</td>
                    <td style={{ padding: '10px 14px', fontFamily: 'monospace', fontWeight: 600, fontSize: 11, color: '#6b6360' }}>{c.hn}</td>
                    <td style={{ padding: '10px 14px', fontWeight: 500, color: '#2d2926' }}>{c.name}</td>
                    <td style={{ padding: '10px 14px', fontSize: 12, color: '#6b6360' }}>{c.ward || <span style={{ color: '#d6d0c8', fontStyle: 'italic' }}>—</span>}</td>
                    <td style={{ padding: '10px 14px' }}>
                      <span style={{ padding: '2px 8px', borderRadius: 99, fontSize: 10, fontWeight: 600, letterSpacing: '0.03em', background: b.bg, color: b.text, border: `1px solid ${b.border}` }}>{(c.type || 'N/A').toUpperCase()}</span>
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                        {drugs.slice(0, 3).map((d, i) => (
                          <span key={i} style={{ padding: '2px 8px', borderRadius: 99, fontSize: 11, background: '#f4f2ee', color: '#6b6360', border: '1px solid #ebe8e2' }}>
                            {d.name} <span style={{ color: '#a8a099', fontSize: 10 }}>({d.total ?? d.score ?? 0})</span>
                          </span>
                        ))}
                        {drugs.length === 0 && <span style={{ color: '#a8a099', fontSize: 11, fontStyle: 'italic' }}>No data</span>}
                      </div>
                    </td>
                    <td style={{ padding: '10px 14px', textAlign: 'right' }}>
                      <button
                        onClick={e => handleDelete(c.id, e)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#d6d0c8', fontSize: 16, padding: '2px 5px', borderRadius: 5, lineHeight: 1, transition: 'color 0.15s' }}
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

      {/* Easter egg — subtle credit */}
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
