// src/AdminPanel.js
import React from 'react';
import { useNavigate } from 'react-router-dom';

function AdminPanel() {
  const navigate = useNavigate();

  // 로그아웃 처리 함수 (로그아웃 성공 시 페이지를 새로고침하며 /login으로 이동)
  const handleLogout = async () => {
    try {
      const res = await fetch('http://3.37.96.38:4000/logout', {
        method: 'POST',
        credentials: 'include',
      });
      if (res.ok) {
        // 로그아웃 후 페이지를 새로고침하며 로그인 페이지로 이동
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
      <h2>📋 관리자 페이지</h2>
      <p>원하는 항목을 선택하여 관리 기능을 사용하세요.</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginTop: '30px' }}>
        <button onClick={() => navigate('/admin/users')} style={btnStyle}>
          👥 인원관리
        </button>
        <button onClick={() => navigate('/admin/schedule')} style={btnStyle}>
          ⏰ 연습 시간 관리
        </button>
        <button onClick={() => navigate('/admin/teams')} style={btnStyle}>
          🧑‍🤝‍🧑 팀 관리
        </button>
        <button onClick={handleLogout} style={btnStyle}>
          로그아웃
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

export default AdminPanel;
