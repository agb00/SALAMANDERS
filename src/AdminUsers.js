// src/AdminUsers.js
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editUser, setEditUser] = useState(null); // 수정할 사용자를 저장
  const navigate = useNavigate();

  useEffect(() => {
    fetchUsers();
  }, []);

  // 사용자 목록 불러오기
  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch('http://localhost:4000/admin/users', {
        credentials: 'include',
      });
      if (!res.ok) {
        throw new Error('네트워크 응답이 올바르지 않습니다.');
      }
      const data = await res.json();
      setUsers(data);
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  };

  // 사용자 삭제 (name을 기준)
  const handleDelete = async (name) => {
    try {
      const res = await fetch(`http://localhost:4000/admin/users/${name}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || '삭제에 실패했습니다.');
      }
      fetchUsers();
    } catch (err) {
      alert(err.message);
    }
  };

  // 새 사용자 등록
  const handleAddUser = async (newUser) => {
    try {
      const res = await fetch('http://localhost:4000/admin/add-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(newUser),
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || '사용자 등록에 실패했습니다.');
      }
      setShowAddModal(false);
      fetchUsers();
    } catch (err) {
      alert(err.message);
    }
  };

  // 사용자 수정 (PUT 요청)
  const handleUpdateUser = async (updatedUser) => {
    try {
      const res = await fetch(`http://localhost:4000/admin/users/${updatedUser.name}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(updatedUser),
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || '사용자 수정에 실패했습니다.');
      }
      setEditUser(null);
      fetchUsers();
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div style={{ padding: '20px' }}>
      {/* 상단 헤더: 제목 및 추가, 메인화면 버튼 */}
      <div style={headerStyle}>
        <h2>인원 관리</h2>
        <div>
          <button onClick={() => setShowAddModal(true)} style={headerButtonStyle}>
            추가
          </button>
          <button onClick={() => navigate('/admin')} style={headerButtonStyle}>
            메인화면
          </button>
        </div>
      </div>

      {/* 사용자 목록 테이블 */}
      {loading ? (
        <p>로딩 중...</p>
      ) : error ? (
        <p>오류: {error}</p>
      ) : (
        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={thStyle}>이름</th>
              <th style={thStyle}>비밀번호</th>
              <th style={thStyle}>전화번호</th>
              <th style={thStyle}>파트</th>
              <th style={thStyle}>액션</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user, idx) => (
              <tr key={idx}>
                <td style={tdStyle}>{user.name}</td>
                <td style={tdStyle}>{user.password}</td>
                <td style={tdStyle}>{user.phone}</td>
                <td style={tdStyle}>{user.part}</td>
                <td style={tdStyle}>
                  <button onClick={() => setEditUser(user)} style={{ ...actionButtonStyle, marginRight: '5px' }}>
                    수정
                  </button>
                  <button onClick={() => handleDelete(user.name)} style={actionButtonStyle}>
                    삭제
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* 추가 모달 */}
      {showAddModal && (
        <AddUserModal onClose={() => setShowAddModal(false)} onAdd={handleAddUser} />
      )}

      {/* 수정 모달 */}
      {editUser && (
        <EditUserModal user={editUser} onClose={() => setEditUser(null)} onUpdate={handleUpdateUser} />
      )}
    </div>
  );
}

// 스타일 객체
const headerStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: '20px',
};

const headerButtonStyle = {
  padding: '8px 16px',
  backgroundColor: '#4CAF50',
  color: '#fff',
  border: 'none',
  borderRadius: '4px',
  cursor: 'pointer',
  marginRight: '10px',
};

const tableStyle = {
  width: '100%',
  borderCollapse: 'collapse',
};

const thStyle = {
  border: '1px solid #ddd',
  padding: '10px',
  backgroundColor: '#f2f2f2',
};

const tdStyle = {
  border: '1px solid #ddd',
  padding: '10px',
  textAlign: 'center',
};

const actionButtonStyle = {
  padding: '6px 12px',
  backgroundColor: '#008CBA',
  color: '#fff',
  border: 'none',
  borderRadius: '4px',
  cursor: 'pointer',
};

const modalOverlayStyle = {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: 'rgba(0, 0, 0, 0.6)',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
};

const modalContentStyle = {
  backgroundColor: '#fff',
  padding: '30px',
  borderRadius: '8px',
  boxShadow: '0 4px 8px rgba(0,0,0,0.2)',
  width: '400px',
  maxWidth: '90%',
};

const inputStyle = {
  width: '100%',
  padding: '10px',
  margin: '8px 0',
  border: '1px solid #ccc',
  borderRadius: '4px',
};

const modalButtonStyle = {
  padding: '10px 20px',
  backgroundColor: '#4CAF50',
  color: '#fff',
  border: 'none',
  borderRadius: '4px',
  cursor: 'pointer',
};

const modalCancelButtonStyle = {
  ...modalButtonStyle,
  backgroundColor: '#f44336',
  marginRight: '10px',
};

// 새 사용자 등록 모달 컴포넌트
function AddUserModal({ onClose, onAdd }) {
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [part, setPart] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name || !password || !phone || !part) {
      alert('모든 필드를 입력하세요.');
      return;
    }
    const newUser = { name, password, phone, part };
    await onAdd(newUser);
  };

  return (
    <div style={modalOverlayStyle}>
      <div style={modalContentStyle}>
        <h3 style={{ marginBottom: '20px', textAlign: 'center' }}>새 사용자 등록</h3>
        <form onSubmit={handleSubmit}>
          <label>이름:</label>
          <input style={inputStyle} type="text" value={name} onChange={(e) => setName(e.target.value)} />
          <label>비밀번호:</label>
          <input style={inputStyle} type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          <label>전화번호:</label>
          <input style={inputStyle} type="text" value={phone} onChange={(e) => setPhone(e.target.value)} />
          <label>파트:</label>
          <input style={inputStyle} type="text" value={part} onChange={(e) => setPart(e.target.value)} />
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
            <button type="button" onClick={onClose} style={modalCancelButtonStyle}>
              취소
            </button>
            <button type="submit" style={modalButtonStyle}>
              등록
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// 수정 모달 컴포넌트 (비밀번호는 빈 상태로 시작)
function EditUserModal({ user, onClose, onUpdate }) {
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState(user.phone);
  const [part, setPart] = useState(user.part);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const updatedUser = { name: user.name, password, phone, part };
    await onUpdate(updatedUser);
  };

  return (
    <div style={modalOverlayStyle}>
      <div style={modalContentStyle}>
        <h3 style={{ marginBottom: '20px', textAlign: 'center' }}>사용자 수정</h3>
        <form onSubmit={handleSubmit}>
          <label>이름:</label>
          <input style={{ ...inputStyle, backgroundColor: '#f2f2f2' }} type="text" value={user.name} readOnly />
          <label>비밀번호:</label>
          <input
            style={inputStyle}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="변경 시 입력 (비워두면 기존 비밀번호 유지)"
          />
          <label>전화번호:</label>
          <input style={inputStyle} type="text" value={phone} onChange={(e) => setPhone(e.target.value)} />
          <label>파트:</label>
          <input style={inputStyle} type="text" value={part} onChange={(e) => setPart(e.target.value)} />
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
            <button type="button" onClick={onClose} style={modalCancelButtonStyle}>
              취소
            </button>
            <button type="submit" style={modalButtonStyle}>
              수정
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default AdminUsers;