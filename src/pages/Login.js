// src/pages/Login.js
import React, { useState } from 'react';

function Login({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  // 로그인 폼 제출 핸들러
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // 예시 API 호출 (실제 API 엔드포인트로 수정)
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      if (!response.ok) {
        throw new Error('로그인 실패');
      }

      const data = await response.json();
      // 예를 들어, data.token 에 JWT 토큰이 있다고 가정
      onLogin(data.token);
    } catch (error) {
      console.error(error);
      alert('로그인에 실패했습니다.');
    }
  };

  return (
    <div className="login-container">
      <h2>로그인</h2>
      <form onSubmit={handleSubmit}>
        <div>
          <label>아이디:</label>
          <input 
            type="text" 
            value={username} 
            onChange={(e) => setUsername(e.target.value)} 
            required 
          />
        </div>
        <div>
          <label>비밀번호:</label>
          <input 
            type="password" 
            value={password} 
            onChange={(e) => setPassword(e.target.value)} 
            required 
          />
        </div>
        <button type="submit">로그인</button>
      </form>
    </div>
  );
}

export default Login;
