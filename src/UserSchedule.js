// src/UserSchedule.js
import React, { useState, useEffect } from 'react';
import Timetable from './Timetable';

// 요일과 시간 배열 (예시)
const days = ["월", "화", "수", "목", "금", "토", "일"];
const times = [9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22];

// 기준 날짜(월요일)를 계산하는 함수
function getWeekMonday(referenceDate) {
  const date = new Date(referenceDate);
  let day = date.getDay();
  if(day === 0) day = 7; // 일요일이면 7로 처리
  const monday = new Date(date);
  monday.setDate(date.getDate() - (day - 1));
  return monday;
}

// 해당 주의 모든 날짜 배열 (월~일)
function getWeekDates(referenceDate) {
  const monday = getWeekMonday(referenceDate);
  const weekDates = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    weekDates.push(d);
  }
  return weekDates;
}

// "YYYY-MM-DD" 형식으로 포맷팅
function formatDate(date) {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function UserSchedule() {
  const [allScheduleItems, setAllScheduleItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedCells, setSelectedCells] = useState([]);
  const [newSubject, setNewSubject] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  // weekOffset: 0 = 이번주, 음수/양수 = 이전/다음 주
  const [weekOffset, setWeekOffset] = useState(0);

  // 현재 주의 월요일(week_start) 계산
  const currentWeekMonday = formatDate(getWeekMonday(new Date(Date.now() + weekOffset * 7 * 24 * 60 * 60 * 1000)));

  // 현재 주에 해당하는 일정 데이터 필터링
  const currentWeekSchedule = allScheduleItems.filter(item => item.week_start === currentWeekMonday);

  // 페이지 로드 시 전체 일정 데이터를 GET
  useEffect(() => {
    setLoading(true);
    fetch('http://localhost:4000/api/schedule', {
      credentials: 'include',
    })
      .then(response => response.json())
      .then(data => {
        setAllScheduleItems(data);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  // 주간 이동 시 전체 일정 데이터를 다시 불러올 수도 있음
  useEffect(() => {
    // re-fetch 일정 데이터 시도 (옵션)
    fetch('http://localhost:4000/api/schedule', {
      credentials: 'include',
    })
      .then(response => response.json())
      .then(data => {
        setAllScheduleItems(data);
      })
      .catch(err => console.error(err));
  }, [weekOffset]);

  // 셀 클릭 시 선택 상태 토글
  const handleCellClick = (day, time, item) => {
    setSelectedCells(prev => {
      const exists = prev.find(cell => cell.day === day && cell.time === time);
      if (exists) {
        return prev.filter(cell => !(cell.day === day && cell.time === time));
      } else {
        return [...prev, { day, time }];
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

  // 모달 제출 시 현재 주의 일정 업데이트 (로컬과 서버 동기화)
  const handleModalSubmit = async (e) => {
    e.preventDefault();
    if (selectedCells.length === 0) return;

    // 현재 주 일정에 새로운 아이템 추가
    // 기존 일정은 currentWeekSchedule, 새로 추가할 일정은 selectedCells에 newSubject 적용
    const newItems = selectedCells.map(cell => ({
      week_start: currentWeekMonday,
      day: cell.day,
      time: cell.time,
      subject: newSubject,
      color: "#e0f7fa"
    }));

    // 기존 일정과 합쳐서 같은 주의 새 일정 배열 생성
    // 중복되는 셀은 새 항목으로 대체합니다.
    const updatedWeekItems = currentWeekSchedule.reduce((acc, cur) => {
      const found = newItems.find(item => item.day === cur.day && item.time === cur.time);
      if (found) return acc; // 이미 newItems에 있다면 기존 것은 대체
      return [...acc, cur];
    }, newItems);

    // POST 요청으로 현재 주 일정 업데이트 (전체 삭제 후 재삽입)
    try {
      const response = await fetch('http://localhost:4000/api/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ week_start: currentWeekMonday, scheduleItems: updatedWeekItems })
      });
      if (!response.ok) throw new Error('일정 저장 실패');
      // re-fetch 전체 일정 데이터
      const data = await response.json();
      // 업데이트 후 전체 일정 다시 GET
      const res = await fetch('http://localhost:4000/api/schedule', { credentials: 'include' });
      const allData = await res.json();
      setAllScheduleItems(allData);
      setSelectedCells([]);
      setNewSubject('');
      setModalOpen(false);
    } catch (err) {
      console.error("저장 에러:", err);
    }
  };

  // 모달 취소 시 선택 초기화
  const handleModalCancel = () => {
    setModalOpen(false);
    setNewSubject('');
    setSelectedCells([]);
  };

  // 주간 내비게이션: 현재 주의 전체 날짜 배열 및 텍스트 생성
  const weekDates = getWeekDates(new Date(Date.now() + weekOffset * 7 * 24 * 60 * 60 * 1000));
  const weekRangeText = `${formatDate(weekDates[0])} ~ ${formatDate(weekDates[6])}`;

  // 이전 주로 이동
  const handlePrevWeek = () => {
    setWeekOffset(prev => prev - 1);
  };

  // 다음 주로 이동
  const handleNextWeek = () => {
    setWeekOffset(prev => prev + 1);
  };

  if (loading) return <p style={styles.message}>로딩 중...</p>;
  if (error) return <p style={styles.message}>오류: {error}</p>;

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>일정 관리</h2>
      {/* 주간 내비게이션 */}
      <div style={weekNavStyles.container}>
        <button onClick={handlePrevWeek} style={weekNavStyles.button}>&lt;</button>
        <input 
          type="text" 
          readOnly 
          value={weekRangeText} 
          style={weekNavStyles.textBox}
        />
        <button onClick={handleNextWeek} style={weekNavStyles.button}>&gt;</button>
      </div>
      {/* Timetable 컴포넌트에 현재 주 일정만 전달 */}
      <Timetable 
        days={days} 
        times={times} 
        scheduleItems={currentWeekSchedule} 
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

const weekNavStyles = {
  container: {
    display: 'flex',
    alignItems: 'center',
    marginBottom: '20px',
  },
  button: {
    padding: '8px 12px',
    fontSize: '1rem',
    backgroundColor: '#4CAF50',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    margin: '0 10px',
  },
  textBox: {
    width: '200px',
    textAlign: 'center',
    fontSize: '1rem',
    padding: '8px',
    border: '1px solid #ccc',
    borderRadius: '4px',
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