import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Home from './pages/Home';
import AssessmentForm from './pages/AssessmentForm';
import SamsAssessment from './pages/SamsAssessment'; // <--- เพิ่ม import

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        
        {/* เพิ่ม route เฉพาะสำหรับ SAMS */}
        <Route path="/assess/sams" element={<SamsAssessment />} />
        
        {/* Route เดิมสำหรับแบบประเมินอื่นๆ */}
        <Route path="/assess/:type" element={<AssessmentForm />} />
      </Routes>
    </Router>
  );
}

export default App;