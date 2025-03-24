// src/App.js
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import Home from './pages/Home';
import UploadTimetable from './pages/UploadTimetable';
import ScheduleManagement from './pages/ScheduleManagement';
import TeamManagement from './pages/TeamManagement';
import CommonTime from './pages/CommonTime';

function App() {
  return (
    <Router>
      <nav>
        <Link to="/">Home</Link>
        <Link to="/upload">시간표 업로드</Link>
        <Link to="/schedule">일정 관리</Link>
        <Link to="/team">팀 관리</Link>
        <Link to="/common">공통 시간</Link>
      </nav>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/upload" element={<UploadTimetable />} />
        <Route path="/schedule" element={<ScheduleManagement />} />
        <Route path="/team" element={<TeamManagement />} />
        <Route path="/common" element={<CommonTime />} />
      </Routes>
    </Router>
  );
}

export default App;
