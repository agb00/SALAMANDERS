// App.js
import React, { useState, useEffect } from 'react';
import './App.css';
import salLogo from './Sal_logo.jpg';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useNavigate,
} from 'react-router-dom';

import AdminPanel from './AdminPanel';
import AdminUsers from './AdminUsers';
import AdminSchedule from './AdminSchedule';
import AdminTeams from './AdminTeams';

import UserMain from './UserMain';
import UserTimetable from './UserTimetable';
import UserSchedule from './UserSchedule';
import UserPractice from './UserPractice';
import UserTeam from './UserTeam';

function LoginModal({ onLoginSuccess }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();

    try {
      const response = await fetch('http://localhost:4000/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include', // 세션 쿠키 포함
        body: JSON.stringify({ name: username, password }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        alert('로그인 성공!');
        onLoginSuccess(username.toLowerCase() === 'sala');
      } else {
        alert(data.error || '로그인 실패');
      }
    } catch (err) {
      console.error(err);
      alert('서버와의 연결에 실패했습니다.');
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h2>로그인</h2>
        <form onSubmit={handleLogin} className="login-form">
          <input
            type="text"
            placeholder="이름"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder="비밀번호"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <button type="submit">로그인</button>
        </form>
      </div>
    </div>
  );
}

const AdminRoute = ({ isAdmin, children }) => {
  return isAdmin ? children : <Navigate to="/" />;
};

function AppContent() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [username, setUsername] = useState('');
  const [gisu, setGisu] = useState(''); // 기수 정보를 저장할 state (서버에서는 "ST" 컬럼)
  const [showModal, setShowModal] = useState(false);
  const navigate = useNavigate();

  // 페이지 로드(새로고침 포함) 시 세션 확인하여 상태 복원
  useEffect(() => {
    fetch('http://localhost:4000/session', {
      credentials: 'include',
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.loggedIn) {
          setIsLoggedIn(true);
          setIsAdmin(data.user.isAdmin);
          setUsername(data.user.name);
          // 서버에서 ST 컬럼으로 기수 정보를 반환하므로
          setGisu(data.user.ST);
        }
      })
      .catch((err) => console.error('세션 확인 실패:', err));
  }, []);

  const handleLogoClick = () => setShowModal(true);

  // 로그인 성공 시 상태 갱신 후 바로 페이지 이동
  const handleLoginSuccess = (isAdminAccount) => {
    setIsLoggedIn(true);
    setIsAdmin(isAdminAccount);
    setShowModal(false);
    if (isAdminAccount) {
      navigate('/admin');
    } else {
      navigate('/');
    }
  };

  return (
    <div className="App">
      {!isLoggedIn && (
        <div className="logo-container">
          <img
            src={salLogo}
            alt="Salamanders Logo"
            className="logo"
            onClick={handleLogoClick}
          />
        </div>
      )}

      {showModal && <LoginModal onLoginSuccess={handleLoginSuccess} />}

      <Routes>
        <Route
          path="/"
          element={
            isLoggedIn
              ? isAdmin
                ? <Navigate to="/admin" />
                : <UserMain username={username} gisu={gisu} />
              : null
          }
        />
        <Route
          path="/admin"
          element={
            <AdminRoute isAdmin={isAdmin}>
              <AdminPanel />
            </AdminRoute>
          }
        />
        <Route
          path="/admin/users"
          element={
            <AdminRoute isAdmin={isAdmin}>
              <AdminUsers />
            </AdminRoute>
          }
        />
        <Route
          path="/admin/schedule"
          element={
            <AdminRoute isAdmin={isAdmin}>
              <AdminSchedule />
            </AdminRoute>
          }
        />
        <Route
          path="/admin/teams"
          element={
            <AdminRoute isAdmin={isAdmin}>
              <AdminTeams />
            </AdminRoute>
          }
        />
        {/* 사용자 전용 페이지 */}
        <Route path="/user/timetable" element={<UserTimetable />} />
        <Route path="/user/schedule" element={<UserSchedule />} />
        <Route path="/user/practice" element={<UserPractice />} />
        <Route path="/user/team" element={<UserTeam />} />
      </Routes>
    </div>
  );
}

function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}

export default App;
