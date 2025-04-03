import React, { useState, useEffect } from 'react';
import Timetable from './Timetable';

const days = ["월", "화", "수", "목", "금", "토", "일"];
const times = [9,10,11,12,13,14,15,16,17,18,19,20,21,22];

function UserSchedule() {
  const [scheduleItems, setScheduleItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedCells, setSelectedCells] = useState([]);
  const [newSubject, setNewSubject] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [currentWeekStart, setCurrentWeekStart] = useState('');

  // 현지 날짜 기준으로 "YYYY-MM-DD" 형식의 주 시작일(월요일) 계산 함수
  const calculateWeekStartLocal = (date) => {
    const dayOfWeek = date.getDay(); // 일:0, 월:1, …, 토:6
    const diff = dayOfWeek === 0 ? date.getDate() - 6 : date.getDate() - dayOfWeek + 1;
    const weekStart = new Date(date);
    weekStart.setDate(diff);
    weekStart.setHours(0, 0, 0, 0);
    const year = weekStart.getFullYear();
    const month = (weekStart.getMonth() + 1).toString().padStart(2, '0');
    const day = weekStart.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // 컴포넌트 마운트 시 오늘이 포함된 주의 시작일(월요일) 설정
  useEffect(() => {
    const today = new Date();
    setCurrentWeekStart(calculateWeekStartLocal(today));
  }, []);

  // 일정 데이터 불러오기: 우선 schedule_items, 없으면 base_timetables, 없으면 빈 배열
  useEffect(() => {
    if (!currentWeekStart) return;
    setLoading(true);
    fetch('http://localhost:4000/api/schedule', {
      credentials: 'include'
    })
      .then(res => {
        if (!res.ok) throw new Error('일정 데이터를 불러오지 못했습니다.');
        return res.json();
      })
      .then(data => {
        // week_start 값을 현지 날짜 형식(YYYY-MM-DD)으로 변환하여 비교
        const currentWeekItems = data.filter(item => {
          if (!item.week_start) return false;
          const itemDate = new Date(item.week_start);
          const formattedItemDate = `${itemDate.getFullYear()}-${(itemDate.getMonth() + 1)
            .toString()
            .padStart(2, '0')}-${itemDate.getDate().toString().padStart(2, '0')}`;
          return formattedItemDate === currentWeekStart;
        });
        if (currentWeekItems.length > 0) {
          setScheduleItems(currentWeekItems);
          setLoading(false);
        } else {
          // schedule_items에 현재 주 데이터가 없으면 기본 시간표 데이터를 조회
          fetch('http://localhost:4000/api/base-timetable', { credentials: 'include' })
            .then(res => {
              if (!res.ok) throw new Error('기본 시간표 데이터를 불러오지 못했습니다.');
              return res.json();
            })
            .then(baseData => {
              setScheduleItems(baseData && baseData.length > 0 ? baseData : []);
            })
            .catch(err => setError(err.message))
            .finally(() => setLoading(false));
        }
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, [currentWeekStart]);

  // 셀 클릭 시 선택 상태 토글
  const handleCellClick = (day, time, scheduleItem) => {
    setSelectedCells(prev => {
      const exists = prev.find(cell => cell.day === day && cell.time === time);
      if (exists) {
        return prev.filter(cell => !(cell.day === day && cell.time === time));
      } else {
        return [...prev, { day, time, item: scheduleItem }];
      }
    });
  };

  // 모달 열기 (선택된 셀이 있어야 함)
  const openModal = () => {
    if (selectedCells.length === 0) {
      alert("일정을 추가할 셀을 먼저 선택하세요.");
      return;
    }
    setModalOpen(true);
  };

  // 모달 제출: 선택된 셀에 대해 새 과목명을 추가하고 DB 업데이트
  const handleModalSubmit = (e) => {
    e.preventDefault();
    if (!newSubject) {
      alert("과목명을 입력하세요.");
      return;
    }
    const updatedItems = [...scheduleItems];
    selectedCells.forEach(cell => {
      const newItem = {
        day: cell.day,
        time: cell.time,
        subject: newSubject,
        color: "#e0f7fa",
        week_start: currentWeekStart
      };
      const index = updatedItems.findIndex(item => item.day === cell.day && item.time === cell.time);
      if (index >= 0) {
        updatedItems[index] = newItem;
      } else {
        updatedItems.push(newItem);
      }
    });
    fetch('http://localhost:4000/api/schedule', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ week_start: currentWeekStart, scheduleItems: updatedItems })
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
      .catch(err => alert(err.message));
  };

  // 모달 취소: 선택 초기화
  const handleModalCancel = () => {
    setModalOpen(false);
    setNewSubject('');
    setSelectedCells([]);
  };

  // 주차 이동 기능
  const goToPreviousWeek = () => {
    const currentDate = new Date(currentWeekStart);
    currentDate.setDate(currentDate.getDate() - 7);
    // currentDate를 로컬 날짜 형식으로 변환
    setCurrentWeekStart(`${currentDate.getFullYear()}-${(currentDate.getMonth()+1).toString().padStart(2, '0')}-${currentDate.getDate().toString().padStart(2, '0')}`);
  };

  const goToNextWeek = () => {
    const currentDate = new Date(currentWeekStart);
    currentDate.setDate(currentDate.getDate() + 7);
    setCurrentWeekStart(`${currentDate.getFullYear()}-${(currentDate.getMonth()+1).toString().padStart(2, '0')}-${currentDate.getDate().toString().padStart(2, '0')}`);
  };

  if (loading) return <p>로딩 중...</p>;
  if (error) return <p>오류: {error}</p>;

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>나의 일정 관리</h2>
      <div style={{ marginBottom: '10px' }}>
        <button onClick={goToPreviousWeek} style={navButtonStyle}>이전 주</button>
        <span style={{ margin: '0 10px' }}>주 시작일: {currentWeekStart}</span>
        <button onClick={goToNextWeek} style={navButtonStyle}>다음 주</button>
      </div>
      <Timetable
        days={days}
        times={times}
        scheduleItems={scheduleItems}
        onCellClick={handleCellClick}
        selectedCells={selectedCells}
      />
      <div style={{ marginTop: '10px', display: 'flex', gap: '10px' }}>
        <button onClick={openModal} style={styles.addButton}>일정 추가</button>
        <button
          onClick={() => {
            const updatedItems = scheduleItems.filter(item => {
              return !selectedCells.some(cell => cell.day === item.day && cell.time === item.time);
            });
            fetch('http://localhost:4000/api/schedule', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              credentials: 'include',
              body: JSON.stringify({ week_start: currentWeekStart, scheduleItems: updatedItems })
            })
              .then(res => {
                if (!res.ok) throw new Error("일정 삭제에 실패했습니다.");
                return res.json();
              })
              .then(data => {
                setScheduleItems(updatedItems);
                setSelectedCells([]);
              })
              .catch(err => alert(err.message));
          }}
          style={{ ...styles.addButton, backgroundColor: '#FF9800' }}
        >
          선택 일정 삭제
        </button>
      </div>
      {modalOpen && (
        <div style={modalStyles.overlay}>
          <div style={modalStyles.modal}>
            <h3>일정 수정</h3>
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
                placeholder="추가할 과목명을 입력하세요"
                value={newSubject}
                onChange={(e) => setNewSubject(e.target.value)}
                required
                style={modalStyles.input}
              />
              <div style={modalStyles.buttonContainer}>
                <button type="button" onClick={handleModalCancel} style={modalStyles.buttonCancel}>
                  취소
                </button>
                <button type="submit" style={modalStyles.buttonSubmit}>
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

const navButtonStyle = {
  padding: '6px 12px',
  backgroundColor: '#008CBA',
  color: '#fff',
  border: 'none',
  borderRadius: '4px',
  cursor: 'pointer'
};

const styles = {
  container: {
    width: '90%',
    maxWidth: '800px',
    margin: '40px auto',
    padding: '20px',
    backgroundColor: '#fff',
    borderRadius: '12px',
    boxShadow: '0 4px 10px rgba(0,0,0,0.1)'
  },
  title: {
    fontSize: '1.8rem',
    color: '#333',
    marginBottom: '20px'
  },
  addButton: {
    padding: '10px 20px',
    fontSize: '1rem',
    backgroundColor: '#4CAF50',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer'
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
    width: '300px',
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