// src/UserSchedule.js
import React, { useState, useEffect } from 'react';
import Timetable from './Timetable';

// 요일과 시간 배열 (예시)
const days = ["월", "화", "수", "목", "금", "토", "일"];
const times = [9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22];

function UserSchedule() {
  const [scheduleItems, setScheduleItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedCells, setSelectedCells] = useState([]);
  const [newSubject, setNewSubject] = useState('');
  const [modalOpen, setModalOpen] = useState(false);

  // DB에서 불러오는 대신 초기엔 빈 시간표로 시작
  useEffect(() => {
    setLoading(true);
    setTimeout(() => {
      setScheduleItems([]);
      setLoading(false);
    }, 500);
  }, []);

  // 셀 클릭 시 선택 상태 토글
  const handleCellClick = (day, time, item) => {
    setSelectedCells(prev => {
      const exists = prev.find(cell => cell.day === day && cell.time === time);
      if (exists) {
        // 이미 선택된 경우 선택 해제
        return prev.filter(cell => !(cell.day === day && cell.time === time));
      } else {
        // 선택되지 않은 경우 추가
        return [...prev, { day, time, item }];
      }
    });
  };

  // "일정 추가하기" 버튼 클릭 시 모달 열기
  const openModal = () => {
    if (selectedCells.length === 0) {
      alert("일정을 추가할 셀을 먼저 선택하세요.");
      return;
    }
    setModalOpen(true);
  };

  // 모달에서 일정 추가 제출 (선택된 모든 셀에 적용)
  const handleModalSubmit = (e) => {
    e.preventDefault();
    if (selectedCells.length === 0) return;
    const updatedItems = [...scheduleItems];
    selectedCells.forEach(cell => {
      const newItem = { day: cell.day, time: cell.time, subject: newSubject, color: "#e0f7fa" };
      const existingIndex = updatedItems.findIndex(item => item.day === cell.day && item.time === cell.time);
      if (existingIndex >= 0) {
        updatedItems[existingIndex] = newItem;
      } else {
        updatedItems.push(newItem);
      }
    });
    setScheduleItems(updatedItems);
    setSelectedCells([]); // 선택 초기화
    setNewSubject('');
    setModalOpen(false);
  };

  // 모달 취소 시 선택 초기화
  const handleModalCancel = () => {
    setModalOpen(false);
    setNewSubject('');
    setSelectedCells([]);
  };

  if (loading) return <p style={styles.message}>로딩 중...</p>;
  if (error) return <p style={styles.message}>오류: {error}</p>;

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>내 시간표</h2>
      <Timetable 
        days={days} 
        times={times} 
        scheduleItems={scheduleItems} 
        onCellClick={handleCellClick}
        selectedCells={selectedCells} // 선택된 셀 정보 전달
      />
      <button onClick={openModal} style={styles.addButton}>일정 추가하기</button>
      
      {modalOpen && (
        <div style={modalStyles.overlay}>
          <div style={modalStyles.modal}>
            <h3>일정 추가</h3>
            <div>
              <p>선택된 셀:</p>
              <ul style={modalStyles.cellList}>
                {selectedCells.map((cell, index) => (
                  <li key={index}>{cell.day}요일, {cell.time}시</li>
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
    width: '90%',
    maxWidth: '500px',
    margin: '40px auto',
    padding: '20px',
    paddingBottom: '40px',
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    boxShadow: '0 4px 10px rgba(0,0,0,0.1)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  title: {
    fontSize: '1.8rem',
    color: '#333',
    marginBottom: '20px',
  },
  message: {
    fontSize: '1rem',
    color: '#333',
    textAlign: 'center',
  },
  addButton: {
    marginTop: '20px',
    padding: '10px 20px',
    fontSize: '1rem',
    backgroundColor: '#4CAF50',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
  },
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
    zIndex: 1000,
  },
  modal: {
    backgroundColor: '#fff',
    padding: '20px',
    borderRadius: '8px',
    width: '90%',
    maxWidth: '300px',
    textAlign: 'center',
  },
  input: {
    width: '100%',
    padding: '8px',
    margin: '10px 0',
    border: '1px solid #ccc',
    borderRadius: '4px',
  },
  buttonContainer: {
    display: 'flex',
    justifyContent: 'space-between',
    marginTop: '10px',
  },
  buttonCancel: {
    padding: '8px 16px',
    backgroundColor: '#f44336',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  buttonSubmit: {
    padding: '8px 16px',
    backgroundColor: '#4CAF50',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  cellList: {
    listStyleType: 'none',
    padding: 0,
    margin: '10px 0',
  },
};

export default UserSchedule;