// src/App.jsx
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import AssessmentForm from './pages/AssessmentForm';
// ไม่ต้อง import SamsAssessment ที่นี่ก็ได้ เพราะเราจะไปใช้ใน AssessmentForm แทน

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        
        {/* ✅ ลบบรรทัด Route แยกของ SAMS ออก ให้เหลือแค่บรรทัดนี้บรรทัดเดียวครอบจักรวาลครับ */}
        <Route path="/assess/:type" element={<AssessmentForm />} />
      </Routes>
    </Router>
  );
}

export default App;