// src/App.js
import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Header from './components/Header';
import Home from './pages/Home';
import Login from './pages/Login';

function App() {
  // localStorage에 저장된 인증 토큰을 불러오거나, 없으면 null로 초기화
  const [token, setToken] = useState(localStorage.getItem('authToken') || null);

  // 로그인 성공 시 호출되어 토큰을 저장하고 상태 업데이트
  const handleLogin = (newToken) => {
    setToken(newToken);
    localStorage.setItem('authToken', newToken);
  };

  return (
    <Router>
      <Header />
      <Routes>
        {/* 인증된 사용자만 Home 페이지 접근 가능 */}
        <Route path="/" element={ token ? <Home /> : <Navigate to="/login" /> } />
        {/* 로그인 페이지 */}
        <Route path="/login" element={<Login onLogin={handleLogin} />} />
        {/* 추가적인 보호된 라우트를 나중에 여기 추가할 수 있습니다. */}
      </Routes>
    </Router>
  );
}

export default App;
