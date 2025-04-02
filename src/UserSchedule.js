// src/UserSchedule.js
import React, { useState, useEffect } from 'react';
import Timetable from './Timetable';

// 요일과 시간 배열 (예시)
const days = ["월", "화", "수", "목", "금", "토", "일"];
const times = [9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22];

function UserSchedule({ userId }) {
  const [scheduleItems, setScheduleItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedCells, setSelectedCells] = useState([]);
  const [newSubject, setNewSubject] = useState('');
  const [modalOpen, setModalOpen] = useState(false);

  // 사용자별 시간표 데이터 로드 (base_timetables 테이블에서 불러옴)
  useEffect(() => {
    if (!userId) return;
    setLoading(true);
    fetch(`http://localhost:4000/admin/users/${userId}/base_timetables`, {
      credentials: 'include'
    })
      .then(res => {
        if (!res.ok) throw new Error("시간표 데이터를 불러오지 못했습니다.");
        return res.json();
      })
      .then(data => {
        // 데이터가 없으면 빈 배열로 설정하여 빈 시간표를 렌더링
        setScheduleItems(data && data.length > 0 ? data : []);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, [userId]);

  // 셀 클릭 시 선택 상태 토글 (선택된 셀은 색상 변경)
  const handleCellClick = (day, time, item) => {
    console.log(`셀 클릭됨: ${day}, ${time}`, item);
    setSelectedCells(prev => {
      const exists = prev.find(cell => cell.day === day && cell.time === time);
      if (exists) {
        return prev.filter(cell => !(cell.day === day && cell.time === time));
      } else {
        return [...prev, { day, time, item }];
      }
    });
  };

  // 모달 열기
  const openModal = () => {
    if (selectedCells.length === 0) {
      alert("일정을 추가할 셀을 먼저 선택하세요.");
      return;
    }
    setModalOpen(true);
  };

  // 모달에서 일정 추가 제출: 선택한 셀에 일정 추가 후 백엔드의 base_timetables에 저장
  const handleModalSubmit = (e) => {
    e.preventDefault();
    if (selectedCells.length === 0) return;
    const updatedItems = [...scheduleItems];
    selectedCells.forEach(cell => {
      const newItem = { day: cell.day, time: cell.time, subject: newSubject, color: "#e0f7fa" };
      const index = updatedItems.findIndex(item => item.day === cell.day && item.time === cell.time);
      if (index >= 0) {
        updatedItems[index] = newItem;
      } else {
        updatedItems.push(newItem);
      }
    });
    // 수정된 시간표 데이터를 백엔드에 저장 (base_timetables 테이블에 저장됨)
    fetch(`http://localhost:4000/admin/users/${userId}/base_timetables`, {
      method: 'POST', // 또는 PUT, API 사양에 맞게 수정
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(updatedItems)
    })
      .then(res => {
        if (!res.ok) throw new Error("일정 저장에 실패했습니다.");
        return res.json();
      })
      .then(data => {
        setScheduleItems(updatedItems);
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

  if (loading) return <p style={styles.message}>로딩 중...</p>;
  if (error) return <p style={styles.message}>오류: {error}</p>;

  return (
    <div style={styles.container}>
      <h3 style={styles.title}>사용자 {userId}의 시간표</h3>
      <Timetable
        days={days}
        times={times}
        scheduleItems={scheduleItems}
        onCellClick={handleCellClick}
        selectedCells={selectedCells}
      />
      <button onClick={openModal} style={styles.addButton}>일정 추가하기</button>
      {modalOpen && (
        <div style={modalStyles.overlay}>
          <div style={modalStyles.modal}>
            <h3>일정 추가</h3>
            <div>
              <p>선택된 셀:</p>
              <ul style={modalStyles.cellList}>
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
                style={modalStyles.input}
                required
              />
              <div style={modalStyles.buttonContainer}>
                <button type="button" onClick={handleModalCancel} style={modalStyles.buttonCancel}>취소</button>
                <button type="submit" style={modalStyles.buttonSubmit}>일정 추가</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: {
    width: '100%',
    padding: '10px',
    backgroundColor: '#ffffff',
    borderRadius: '8px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    marginBottom: '20px'
  },
  title: {
    fontSize: '1.2rem',
    marginBottom: '10px'
  },
  message: {
    fontSize: '1rem',
    color: '#333',
    textAlign: 'center'
  },
  addButton: {
    padding: '8px 16px',
    backgroundColor: '#4CAF50',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    marginTop: '10px'
  }
};

const modalStyles = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000
  },
  modal: {
    backgroundColor: '#fff',
    padding: '20px',
    borderRadius: '8px',
    width: '90%',
    maxWidth: '300px',
    textAlign: 'center'
  },
  input: {
    width: '100%',
    padding: '8px',
    margin: '10px 0',
    border: '1px solid #ccc',
    borderRadius: '4px'
  },
  buttonContainer: {
    display: 'flex',
    justifyContent: 'space-between',
    marginTop: '10px'
  },
  buttonCancel: {
    padding: '8px 16px',
    backgroundColor: '#f44336',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer'
  },
  buttonSubmit: {
    padding: '8px 16px',
    backgroundColor: '#4CAF50',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer'
  },
  cellList: {
    listStyleType: 'none',
    padding: 0,
    margin: '10px 0'
  }
};

export default UserSchedule;
