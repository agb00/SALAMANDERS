import React, { useState } from 'react';
import './App.css';
import salLogo from './Sal_logo.jpg';
import AdminPanel from './AdminPanel';

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleLogoClick = () => {
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
  };

  const handleLogin = async (e) => {
    e.preventDefault();

    try {
      const response = await fetch('http://localhost:4000/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: username, password }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        alert('로그인 성공!');
        setIsLoggedIn(true);
        setIsAdmin(username.toLowerCase() === 'sala'); // ✅ admin 여부 판단
        setShowModal(false);
      } else {
        alert(data.error || '로그인 실패');
      }
    } catch (err) {
      console.error(err);
      alert('서버와의 연결에 실패했습니다.');
    }
  };

  // 일반 사용자용 메인 화면
  const MainScreen = () => (
    <div className="main-screen">
      <h1>메인 화면</h1>
      <p>이곳에 실제 서비스를 위한 콘텐츠를 배치하세요.</p>
    </div>
  );

  return (
    <div className="App">
      {!isLoggedIn ? (
        <div className="logo-container">
          <img
            src={salLogo}
            alt="Salamanders Logo"
            className="logo"
            onClick={handleLogoClick}
          />
        </div>
      ) : isAdmin ? (
        <AdminPanel /> // ✅ 관리자 전용 페이지
      ) : (
        <MainScreen /> // ✅ 일반 사용자용
      )}

      {/* 로그인 팝업 */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <button className="close-button" onClick={handleCloseModal}>
              &times;
            </button>
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
      )}
    </div>
  );
}

export default App;
