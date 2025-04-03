import React, { useState, useEffect } from 'react';
import Timetable from './Timetable';

const days = ["월", "화", "수", "목", "금", "토", "일"];
const times = [9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22];

function AdminSchedule() {
  const [scheduleItems, setScheduleItems] = useState([]); // 주간 연습 일정 데이터
  const [currentWeekStart, setCurrentWeekStart] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState({ day: '', time: null });
  const [availableUsers, setAvailableUsers] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState({}); // 객체로 수정: 유저별 선택 상태를 저장

  // 현지 날짜 기준 "YYYY-MM-DD" 형식의 주 시작일(월요일) 계산 함수
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

  // 컴포넌트 마운트 시 오늘이 포함된 주의 시작일 설정 및 빈 주간 시간표 생성
  useEffect(() => {
    const today = new Date();
    const weekStart = calculateWeekStartLocal(today);
    setCurrentWeekStart(weekStart);
    setScheduleItems([]); // 초기에는 빈 일정 배열로 설정
  }, []);

  // 주차 이동 기능
  const goToPreviousWeek = () => {
    const currentDate = new Date(currentWeekStart);
    currentDate.setDate(currentDate.getDate() - 7);
    setCurrentWeekStart(`${currentDate.getFullYear()}-${(currentDate.getMonth() + 1).toString().padStart(2, '0')}-${currentDate.getDate().toString().padStart(2, '0')}`);
    setScheduleItems([]);
  };

  const goToNextWeek = () => {
    const currentDate = new Date(currentWeekStart);
    currentDate.setDate(currentDate.getDate() + 7);
    setCurrentWeekStart(`${currentDate.getFullYear()}-${(currentDate.getMonth() + 1).toString().padStart(2, '0')}-${currentDate.getDate().toString().padStart(2, '0')}`);
    setScheduleItems([]);
  };

  // 셀 클릭 시, 해당 시간 슬롯이 비어있을 경우 모달을 열고, 일정이 없는 사용자 목록을 조회
  const handleCellClick = (day, time, scheduleItem) => {
    if (scheduleItem) {
      alert("해당 시간에는 이미 일정이 있습니다.");
      return;
    }
    setSelectedSlot({ day, time });
    fetch(`http://localhost:4000/api/available-users?day=${encodeURIComponent(day)}&time=${time}`, {
      credentials: 'include',
    })
      .then((res) => {
        if (!res.ok) throw new Error("사용자 목록을 불러오지 못했습니다.");
        return res.json();
      })
      .then((data) => {
        setAvailableUsers(data); // 사용자 목록을 불러옴
        // 선택된 사용자 상태 초기화
        setSelectedUsers(data.reduce((acc, user) => {
          acc[user.username] = false; // 기본적으로 모두 선택 안함
          return acc;
        }, {}));
      })
      .catch((err) => {
        console.error(err);
        setAvailableUsers([]);
      });
    setModalOpen(true);
  };

  // 모달 내 체크박스: 사용자를 선택/해제하는 함수
  const handleUserSelection = (username) => {
    setSelectedUsers((prev) => ({
      ...prev,
      [username]: !prev[username], // 선택 상태 토글
    }));
  };

  // 모달 제출: 선택한 사용자들을 일정에 할당
  const handleModalSubmit = () => {
    const selectedUsernames = Object.keys(selectedUsers).filter((username) => selectedUsers[username]);
    if (selectedUsernames.length === 0) {
      alert("일정을 생성할 사용자를 선택하세요.");
      return;
    }

    const newItem = {
      day: selectedSlot.day,
      time: selectedSlot.time,
      subject: selectedUsernames.join(', '),
      color: "#e0f7fa",
      week_start: currentWeekStart,
    };

    const updatedItems = [...scheduleItems, newItem];
    fetch('http://localhost:4000/api/schedule', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ week_start: currentWeekStart, scheduleItems: updatedItems }),
    })
      .then((res) => {
        if (!res.ok) throw new Error("일정 저장에 실패했습니다.");
        return res.json();
      })
      .then(() => {
        setScheduleItems(updatedItems);
        setSelectedUsers({});
        setSelectedSlot({ day: '', time: null });
        setModalOpen(false);
      })
      .catch((err) => alert(err.message));
  };

  const handleModalCancel = () => {
    setModalOpen(false);
    setSelectedUsers({});
    setSelectedSlot({ day: '', time: null });
  };

  return (
    <div style={{ padding: '20px' }}>
      <h2>주간 연습 일정 관리 (Admin)</h2>
      <div style={{ textAlign: 'center', marginBottom: '10px' }}>
        <button onClick={goToPreviousWeek} style={navButtonStyle}>이전 주</button>
        <span style={{ margin: '0 10px' }}>주 시작일: {currentWeekStart}</span>
        <button onClick={goToNextWeek} style={navButtonStyle}>다음 주</button>
      </div>
      <Timetable
        days={days}
        times={times}
        scheduleItems={scheduleItems}
        onCellClick={handleCellClick}
        selectedCells={[]} // 관리자용 일정 생성은 개별 셀 선택 모달로 처리하므로 빈 배열 전달
      />
      {modalOpen && (
        <div style={modalOverlayStyle}>
          <div style={modalContentStyle}>
            <h3>선택된 시간: {selectedSlot.day}요일, {selectedSlot.time}시</h3>
            <p>일정이 없는 사용자 목록:</p>
            {availableUsers.length > 0 ? (
              <ul style={{ textAlign: 'left' }}>
                {availableUsers.map((user, idx) => (
                  <li key={idx}>
                    <label>
                      <input
                        type="checkbox"
                        value={user.username}
                        checked={selectedUsers[user.username] || false}
                        onChange={() => handleUserSelection(user.username)}
                      />
                      {user.name}
                    </label>
                  </li>
                ))}
              </ul>
            ) : (
              <p>해당 시간에 일정이 없는 사용자가 없습니다.</p>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '10px' }}>
              <button onClick={handleModalCancel} style={modalCancelButtonStyle}>취소</button>
              <button onClick={handleModalSubmit} style={modalButtonStyle}>일정 생성</button>
            </div>
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
  cursor: 'pointer',
};

const modalOverlayStyle = {
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
};

const modalContentStyle = {
  backgroundColor: '#fff',
  padding: '20px',
  borderRadius: '8px',
  width: '400px',
  textAlign: 'center',
};

const modalCancelButtonStyle = {
  padding: '8px 16px',
  backgroundColor: '#f44336',
  color: '#fff',
  border: 'none',
  borderRadius: '4px',
  cursor: 'pointer',
};

const modalButtonStyle = {
  padding: '8px 16px',
  backgroundColor: '#4CAF50',
  color: '#fff',
  border: 'none',
  borderRadius: '4px',
  cursor: 'pointer',
};

export default AdminSchedule;