// App.js (또는 Login.js 등)
import React, { useState } from 'react';

function LoginForm({ onLoginSuccess }) {
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();

    try {
      const response = await fetch('http://localhost:4000/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, password }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        alert('로그인 성공!');
        onLoginSuccess(); // 부모 컴포넌트로 로그인 성공 알림
      } else {
        alert(data.error || '로그인 실패');
      }
    } catch (err) {
      console.error(err);
      alert('서버에 연결할 수 없습니다.');
    }
  };

  return (
    <form onSubmit={handleLogin} className="login-form">
      <input
        type="text"
        placeholder="이름"
        value={name}
        onChange={(e) => setName(e.target.value)}
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
  );
}

export default LoginForm;
