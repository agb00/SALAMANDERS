import React, { useState, useEffect } from 'react';
import Timetable from './Timetable';

const days = ["월", "화", "수", "목", "금", "토", "일"];
const times = [9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22];

function SalaSchedule() {
  const [scheduleItems, setScheduleItems] = useState([]); // 주간 연습 일정 데이터
  const [currentWeekStart, setCurrentWeekStart] = useState('');

  // 현지 날짜 기준 "YYYY-MM-DD" 형식의 주 시작일(월요일) 계산 함수
  const calculateWeekStartLocal = (date) => {
    const day = date.getDay();
    // 일요일이면 전 주 월요일로, 그 외에는 (day - 1)만큼 빼줌
    const diff = date.getDate() - (day === 0 ? 6 : day - 1);
    const monday = new Date(date.getFullYear(), date.getMonth(), diff);
    const year = monday.getFullYear();
    const month = String(monday.getMonth() + 1).padStart(2, '0');
    const dayStr = String(monday.getDate()).padStart(2, '0');
    return `${year}-${month}-${dayStr}`;
  };

  // 모든 연습 일정 데이터를 가져와 Timetable에서 사용할 형식으로 변환하는 함수
  const fetchSchedules = (weekStart) => {
    fetch(`http://3.37.96.38:4000/api/practice-schedules?week_start=${weekStart}`, {
      credentials: 'include',
    })
      .then((res) => {
        if (!res.ok) {
          throw new Error('연습 일정 데이터를 불러오지 못했습니다.');
        }
        return res.json();
      })
      .then((data) => {
        // 각 항목에 subject와 color 필드 추가
        const transformedData = data.map(item => ({
          ...item,
          subject: item.team_name,  // 팀 이름을 제목으로 사용
          color: '#AED581',         // 예시: 셀 배경색 (필요에 따라 변경)
          id: item.id || `${item.day}-${item.time}`
        }));
        setScheduleItems(transformedData);
      })
      .catch((err) => {
        console.error("Error fetching practice schedules:", err);
      });
  };

  // 컴포넌트 마운트 시 오늘이 포함된 주의 시작일(월요일) 설정 및 일정 불러오기
  useEffect(() => {
    const today = new Date();
    const weekStartLocal = calculateWeekStartLocal(today);
    setCurrentWeekStart(weekStartLocal);
    fetchSchedules(weekStartLocal);
  }, []);

  // 주차 이동 기능: 이전 주, 다음 주 버튼 클릭 시 새 주 시작일 계산 및 일정 재조회
  const goToPreviousWeek = () => {
    const currentDate = new Date(currentWeekStart);
    currentDate.setDate(currentDate.getDate() - 7);
    const newWeekStart = `${currentDate.getFullYear()}-${(currentDate.getMonth() + 1)
      .toString().padStart(2, '0')}-${currentDate.getDate().toString().padStart(2, '0')}`;
    setCurrentWeekStart(newWeekStart);
    fetchSchedules(newWeekStart);
  };

  const goToNextWeek = () => {
    const currentDate = new Date(currentWeekStart);
    currentDate.setDate(currentDate.getDate() + 7);
    const newWeekStart = `${currentDate.getFullYear()}-${(currentDate.getMonth() + 1)
      .toString().padStart(2, '0')}-${currentDate.getDate().toString().padStart(2, '0')}`;
    setCurrentWeekStart(newWeekStart);
    fetchSchedules(newWeekStart);
  };

  // handleCellClick: 현재는 단순히 콘솔에 로그 출력 (표시 전용 페이지)
  const handleCellClick = (day, time) => {
    console.log(`Cell clicked: ${day}, ${time}`);
  };

  return (
    <div style={{ padding: '20px' }}>
      <h2>셀레멘더스 연습 일정</h2>
      <div style={{ textAlign: 'center', marginBottom: '10px' }}>
        <button onClick={goToPreviousWeek} style={navButtonStyle}>이전 주</button>
        <span style={{ margin: '0 10px' }}>주 시작일: {currentWeekStart}</span>
        <button onClick={goToNextWeek} style={navButtonStyle}>다음 주</button>
      </div>
      <Timetable
        days={days}
        times={times}
        scheduleItems={scheduleItems}  // 변환된 모든 연습 일정 데이터 전달
        onCellClick={handleCellClick}
        selectedCells={[]}             // 일정 생성 기능은 없으므로 빈 배열 전달
      />
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

export default SalaSchedule;