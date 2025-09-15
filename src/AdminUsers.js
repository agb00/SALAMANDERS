import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Timetable from './Timetable';

function UserBaseSchedule({ username }) {
  const [baseTimetable, setBaseTimetable] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  // 셀 선택 상태와 모달, 과목명 상태 추가
  const [selectedCells, setSelectedCells] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [newSubject, setNewSubject] = useState('');

  // 기본 시간표 데이터 조회 (GET /api/base-timetable?username=xxx)
  useEffect(() => {
    if (!username) return;
    setLoading(true);
    fetch(`http://3.37.96.38:4000/api/base-timetable?username=${username}`, {
      credentials: 'include'
    })
      .then(res => {
        if (!res.ok) throw new Error("기본 시간표 데이터를 불러오지 못했습니다.");
        return res.json();
      })
      .then(data => {
        setBaseTimetable(data && data.length > 0 ? data : []);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, [username]);

  const days = ["월", "화", "수", "목", "금", "토", "일"];
  const times = [9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22];

  // 셀 클릭 시 선택 상태 토글
  const handleCellClick = (day, time, scheduleItem) => {
    console.log(`셀 클릭됨: ${day} ${time}`, scheduleItem);
    setSelectedCells(prev => {
      const exists = prev.find(cell => cell.day === day && cell.time === time);
      if (exists) {
        return prev.filter(cell => !(cell.day === day && cell.time === time));
      } else {
        return [...prev, { day, time, item: scheduleItem }];
      }
    });
  };

  // 일정 추가 모달 열기
  const openModal = () => {
    if (selectedCells.length === 0) {
      alert("일정을 추가할 셀을 먼저 선택하세요.");
      return;
    }
    setModalOpen(true);
  };

  // 모달 제출 시, 선택한 셀에 새 과목명 반영하여 기본 시간표 업데이트 및 API 호출
  const handleModalSubmit = (e) => {
    e.preventDefault();
    if (!newSubject) {
      alert("과목명을 입력하세요.");
      return;
    }
    const updatedTimetable = [...baseTimetable];
    selectedCells.forEach(cell => {
      const newItem = { day: cell.day, time: cell.time, subject: newSubject, color: "#e0f7fa" };
      const index = updatedTimetable.findIndex(item => item.day === cell.day && item.time === cell.time);
      if (index >= 0) {
        updatedTimetable[index] = newItem;
      } else {
        updatedTimetable.push(newItem);
      }
    });
    // API 호출: POST /api/base-timetable
    fetch(`http://3.37.96.38:4000/api/base-timetable`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ username, timetable: updatedTimetable })
    })
      .then(res => {
        if (!res.ok) throw new Error("기본 시간표 저장에 실패했습니다.");
        return res.json();
      })
      .then(data => {
        setBaseTimetable(updatedTimetable);
        setSelectedCells([]);
        setNewSubject('');
        setModalOpen(false);
      })
      .catch(err => {
        alert(err.message);
      });
  };

  const handleModalCancel = () => {
    setModalOpen(false);
    setNewSubject('');
    setSelectedCells([]);
  };

  if (loading) return <p>로딩 중...</p>;
  if (error) return <p>오류: {error}</p>;

  return (
    <div>
      <Timetable
        days={days}
        times={times}
        scheduleItems={baseTimetable}
        onCellClick={handleCellClick}
        selectedCells={selectedCells}
      />
      <button onClick={openModal} style={{ marginTop: '10px', padding: '8px 16px', backgroundColor: '#4CAF50', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
        일정 추가하기
      </button>
      {modalOpen && (
        <div style={modalOverlayStyle}>
          <div style={modalContentStyle}>
            <h3>일정 추가</h3>
            <div>
              <p>선택된 셀:</p>
              <ul>
                {selectedCells.map((cell, idx) => (
                  <li key={idx}>{cell.day}요일, {cell.time}시</li>
                ))}
              </ul>
            </div>
            <form onSubmit={handleModalSubmit}>
              <input
                type="text"
                placeholder="과목명을 입력하세요"
                value={newSubject}
                onChange={(e) => setNewSubject(e.target.value)}
                required
                style={{ width: '100%', padding: '8px', margin: '10px 0', border: '1px solid #ccc', borderRadius: '4px' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '10px' }}>
                <button type="button" onClick={handleModalCancel} style={modalCancelButtonStyle}>
                  취소
                </button>
                <button type="submit" style={{ padding: '8px 16px', backgroundColor: '#4CAF50', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                  일정 추가
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editUser, setEditUser] = useState(null); // 수정할 사용자를 저장
  const [selectedUserForSchedule, setSelectedUserForSchedule] = useState(null); // 시간표 관리 모달에서 선택된 사용자
  const navigate = useNavigate();

  useEffect(() => {
    fetchUsers();
  }, []);

  // 사용자 목록 불러오기
  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch('http://3.37.96.38:4000/admin/users', {
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

  // 사용자 삭제
  const handleDelete = async (name) => {
    try {
      const res = await fetch(`http://3.37.96.38:4000/admin/users/${name}`, {
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
      const res = await fetch('http://3.37.96.38:4000/admin/add-user', {
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
      const res = await fetch(`http://3.37.96.38:4000/admin/users/${updatedUser.name}`, {
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
      {/* 상단 헤더 */}
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
              <th style={thStyle}>기수</th>
              <th style={thStyle}>액션</th>
              <th style={thStyle}>시간표 관리</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user, idx) => (
              <tr key={idx}>
                <td style={tdStyle}>{user.name}</td>
                <td style={tdStyle}>{user.password}</td>
                <td style={tdStyle}>{user.phone}</td>
                <td style={tdStyle}>{user.part}</td>
                <td style={tdStyle}>{user.ST}</td>
                <td style={tdStyle}>
                  <button onClick={() => setEditUser(user)} style={{ ...actionButtonStyle, marginRight: '5px' }}>
                    수정
                  </button>
                  <button onClick={() => handleDelete(user.name)} style={actionButtonStyle}>
                    삭제
                  </button>
                </td>
                <td style={tdStyle}>
                  <button onClick={() => setSelectedUserForSchedule(user)} style={actionButtonStyle}>
                    시간표 관리
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* 시간표 관리 모달 */}
      {selectedUserForSchedule && (
        <div style={modalOverlayStyle}>
          <div style={modalContentStyle}>
            <h3 style={{ marginBottom: '20px', textAlign: 'center' }}>
              {selectedUserForSchedule.name}의 기본 시간표
            </h3>
            <div style={{ display: 'flex', gap: '20px' }}>
              {/* 왼쪽: 업로드된 시간표 이미지 추가 */}
              <div style={{ flex: 1, textAlign: 'center' }}>
                <img
                  src={`http://3.37.96.38:4000/uploads/timetables/${encodeURIComponent(selectedUserForSchedule.name)}.jpg`}
                  alt="업로드된 시간표"
                  style={{ maxWidth: '100%' }}
                  onError={(e) => { e.target.onerror = null; e.target.style.display = 'none'; }}
                />
              </div>
              {/* 오른쪽: 기존 UserBaseSchedule 컴포넌트 */}
              <div style={{ flex: 1 }}>
                <UserBaseSchedule username={selectedUserForSchedule.name} />
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
              <button onClick={() => setSelectedUserForSchedule(null)} style={modalCancelButtonStyle}>
                닫기
              </button>
            </div>
          </div>
        </div>
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
  width: '1200px',
  maxWidth: '90%',
};

const modalCancelButtonStyle = {
  padding: '10px 20px',
  backgroundColor: '#f44336',
  color: '#fff',
  border: 'none',
  borderRadius: '4px',
  cursor: 'pointer',
};

// 새 사용자 등록 모달 컴포넌트
function AddUserModal({ onClose, onAdd }) {
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [part, setPart] = useState('');
  const [ST, setST] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name || !password || !phone || !part || !ST) {
      alert('모든 필드를 입력하세요.');
      return;
    }
    const newUser = { name, password, phone, part, ST };
    await onAdd(newUser);
  };

  return (
    <div style={modalOverlayStyle}>
      <div style={modalContentStyle}>
        <h3 style={{ marginBottom: '20px', textAlign: 'center' }}>새 사용자 등록</h3>
        <form onSubmit={handleSubmit}>
          <label>이름:</label>
          <input
            style={{ width: '100%', padding: '10px', margin: '8px 0', border: '1px solid #ccc', borderRadius: '4px' }}
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <label>비밀번호:</label>
          <input
            style={{ width: '100%', padding: '10px', margin: '8px 0', border: '1px solid #ccc', borderRadius: '4px' }}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <label>전화번호:</label>
          <input
            style={{ width: '100%', padding: '10px', margin: '8px 0', border: '1px solid #ccc', borderRadius: '4px' }}
            type="text"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
          <label>파트:</label>
          <input
            style={{ width: '100%', padding: '10px', margin: '8px 0', border: '1px solid #ccc', borderRadius: '4px' }}
            type="text"
            value={part}
            onChange={(e) => setPart(e.target.value)}
          />
          <label>ST:</label>
          <input
            style={{ width: '100%', padding: '10px', margin: '8px 0', border: '1px solid #ccc', borderRadius: '4px' }}
            type="text"
            value={ST}
            onChange={(e) => setST(e.target.value)}
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
            <button type="button" onClick={onClose} style={modalCancelButtonStyle}>
              취소
            </button>
            <button
              type="submit"
              style={{ padding: '10px 20px', backgroundColor: '#4CAF50', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
            >
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
  const [ST, setST] = useState(user.ST);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const updatedUser = { name: user.name, password, phone, part, ST };
    await onUpdate(updatedUser);
  };

  return (
    <div style={modalOverlayStyle}>
      <div style={modalContentStyle}>
        <h3 style={{ marginBottom: '20px', textAlign: 'center' }}>사용자 수정</h3>
        <form onSubmit={handleSubmit}>
          <label>이름:</label>
          <input
            style={{ width: '100%', padding: '10px', margin: '8px 0', border: '1px solid #ccc', borderRadius: '4px', backgroundColor: '#f2f2f2' }}
            type="text"
            value={user.name}
            readOnly
          />
          <label>비밀번호:</label>
          <input
            style={{ width: '100%', padding: '10px', margin: '8px 0', border: '1px solid #ccc', borderRadius: '4px' }}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="변경 시 입력 (비워두면 기존 비밀번호 유지)"
          />
          <label>전화번호:</label>
          <input
            style={{ width: '100%', padding: '10px', margin: '8px 0', border: '1px solid #ccc', borderRadius: '4px' }}
            type="text"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
          <label>파트:</label>
          <input
            style={{ width: '100%', padding: '10px', margin: '8px 0', border: '1px solid #ccc', borderRadius: '4px' }}
            type="text"
            value={part}
            onChange={(e) => setPart(e.target.value)}
          />
          <label>기수:</label>
          <input
            style={{ width: '100%', padding: '10px', margin: '8px 0', border: '1px solid #ccc', borderRadius: '4px' }}
            type="text"
            value={ST}
            onChange={(e) => setST(e.target.value)}
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
            <button type="button" onClick={onClose} style={modalCancelButtonStyle}>
              취소
            </button>
            <button
              type="submit"
              style={{ padding: '10px 20px', backgroundColor: '#4CAF50', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
            >
              수정
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default AdminUsers;