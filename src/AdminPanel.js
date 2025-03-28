// src/AdminPanel.js
import React, { useState } from 'react';

function AdminPanel() {
  const [formData, setFormData] = useState({
    name: '',
    password: '',
    phone: '',
    part: ''
  });
  const [message, setMessage] = useState('');

  const handleChange = (e) => {
    setFormData({ 
      ...formData,
      [e.target.name]: e.target.value 
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const response = await fetch('http://localhost:4000/admin/add-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const result = await response.json();
      if (response.ok && result.success) {
        setMessage('✅ 사용자 등록이 완료되었습니다.');
        setFormData({ name: '', password: '', phone: '', part: '' });
      } else {
        setMessage(`❌ 오류: ${result.error || '등록 실패'}`);
      }
    } catch (error) {
      console.error(error);
      setMessage('❌ 서버 연결 오류');
    }
  };

  return (
    <div style={{ padding: '40px', maxWidth: '600px', margin: '0 auto' }}>
      <h2>👩‍💻 사용자 등록 (관리자 전용)</h2>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <input
          type="text"
          name="name"
          placeholder="이름"
          value={formData.name}
          onChange={handleChange}
          required
        />
        <input
          type="password"
          name="password"
          placeholder="비밀번호"
          value={formData.password}
          onChange={handleChange}
          required
        />
        <input
          type="text"
          name="phone"
          placeholder="전화번호"
          value={formData.phone}
          onChange={handleChange}
          required
        />
        <input
          type="text"
          name="part"
          placeholder="파트"
          value={formData.part}
          onChange={handleChange}
          required
        />
        <button type="submit">등록하기</button>
      </form>
      {message && <p style={{ marginTop: '20px' }}>{message}</p>}
    </div>
  );
}

export default AdminPanel;
