import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Home from './pages/Home';
import AssessmentForm from './pages/AssessmentForm';

function App() {
  return (
    <Router>
      <Routes>
        {/* เปลี่ยนหน้าแรกเป็น Home */}
        <Route path="/" element={<Home />} />
        <Route path="/assess/:type" element={<AssessmentForm />} />
      </Routes>
    </Router>
  );
}

export default App;