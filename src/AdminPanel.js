// src/AdminPanel.js
import React from 'react';
import { useNavigate } from 'react-router-dom';

function AdminPanel() {
  const navigate = useNavigate();

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
