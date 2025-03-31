// src/UserMain.js
import React from 'react';
import { useNavigate } from 'react-router-dom';

function UserMain({ username, gisu }) {
  const navigate = useNavigate();

  // 로그아웃 처리 함수
  const handleLogout = async () => {
    try {
      const res = await fetch('http://localhost:4000/logout', {
        method: 'POST',
        credentials: 'include',
      });
      if (res.ok) {
        window.location.replace('/login');
      } else {
        alert('로그아웃에 실패했습니다.');
      }
    } catch (err) {
      console.error(err);
      alert('로그아웃 중 오류가 발생했습니다.');
    }
  };

  return (
    <div style={{ padding: '40px', maxWidth: '600px', margin: '0 auto' }}>
      <h2>📋 {gisu} {username}</h2>
      <p>원하는 항목을 선택하여 사용 기능을 이용하세요.</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginTop: '30px' }}>
        <button onClick={() => navigate('/user/timetable')} style={btnStyle}>
          ⏰ 시간표 관리
        </button>
        <button onClick={() => navigate('/user/schedule')} style={btnStyle}>
          📅 일정 관리
        </button>
        <button onClick={() => navigate('/user/practice')} style={btnStyle}>
          🏋️‍♀️ 연습 일정
        </button>
        <button onClick={() => navigate('/user/team')} style={btnStyle}>
          🧑‍🤝‍🧑 팀 관리
        </button>
        <button onClick={handleLogout} style={btnStyle}>
          🔒 로그아웃
        </button>
      </div>
    </div>
  );
}

const btnStyle = {
  padding: '16px',
  fontSize: '18px',
  cursor: 'pointer',
  borderRadius: '8px',
  border: '1px solid #ccc',
  backgroundColor: '#f8f8f8',
  transition: 'all 0.2s ease',
};

export default UserMain;