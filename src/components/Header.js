// src/components/Header.js
import React from 'react';
import { Link } from 'react-router-dom';
import './Header.css';

function Header() {
  return (
    <header className="header">
      <div className="logo">
        <Link to="/">Salamanders</Link>
      </div>
      <nav className="nav">
        <Link to="/">Home</Link>
        <Link to="/upload">시간표 업로드</Link>
        <Link to="/schedule">일정 관리</Link>
        <Link to="/team">팀 관리</Link>
        <Link to="/common">공통 시간</Link>
      </nav>
    </header>
  );
}

export default Header;