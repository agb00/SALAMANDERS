import React, { useState, useEffect } from 'react';
import Timetable from './Timetable';

const days = ["월", "화", "수", "목", "금", "토", "일"];
const times = [9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22];

function UserPractice() {
  // 개인 일정과 연습 일정 별도 상태
  const [personalScheduleItems, setPersonalScheduleItems] = useState([]);
  const [practiceScheduleItems, setPracticeScheduleItems] = useState([]);
  // 두 일정의 병합 결과
  const combinedScheduleItems = [...personalScheduleItems, ...practiceScheduleItems];

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [currentWeekStart, setCurrentWeekStart] = useState('');
  // 실제 로그인한 사용자 정보를 세션으로부터 받아옴
  const [currentUser, setCurrentUser] = useState(null);

  // 현지 날짜 기준 "YYYY-MM-DD" 형식의 주 시작일(월요일) 계산 함수
  const calculateWeekStartLocal = (date) => {
    const dayOfWeek = date.getDay(); // 일:0, 월:1, … 
    // 일요일이면 전 주 월요일로 보정, 그 외에는 (day-1)만큼 빼줌
    const diff = dayOfWeek === 0 ? date.getDate() - 6 : date.getDate() - dayOfWeek + 1;
    const weekStart = new Date(date);
    weekStart.setDate(diff);
    weekStart.setHours(0, 0, 0, 0);
    const year = weekStart.getFullYear();
    const month = (weekStart.getMonth() + 1).toString().padStart(2, '0');
    const day = weekStart.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // 세션 정보를 통해 로그인 사용자 정보를 불러옴
  useEffect(() => {
    fetch('http://3.37.96.38:4000/session', { credentials: 'include' })
      .then((res) => {
        if (!res.ok) throw new Error('세션 정보를 불러오지 못했습니다.');
        return res.json();
      })
      .then((data) => {
        if (data.loggedIn && data.user) {
          setCurrentUser(data.user);
        }
      })
      .catch((err) => {
        console.error(err);
      });
  }, []);

  // 컴포넌트 마운트 시 현재 주의 시작일(월요일) 설정
  useEffect(() => {
    const today = new Date();
    const weekStartLocal = calculateWeekStartLocal(today);
    setCurrentWeekStart(weekStartLocal);
  }, []);

  // 개인 일정 불러오기 (현재 사용자의 일정)
  useEffect(() => {
    // currentWeekStart와 currentUser 모두 설정되어 있어야 진행
    if (!currentWeekStart || !currentUser) return;
    setLoading(true);
    fetch('http://3.37.96.38:4000/api/schedule', { credentials: 'include' })
      .then((res) => {
        if (!res.ok) throw new Error('일정 데이터를 불러오지 못했습니다.');
        return res.json();
      })
      .then((data) => {
        // API로 받은 week_start 값을 KST 기준(UTC+9) 보정 후, 현재 주와 비교하여 필터링
        const weekItems = data.filter(item => {
          if (!item.week_start) return false;
          const itemDate = new Date(item.week_start);
          itemDate.setHours(itemDate.getHours() + 9);
          const formattedItemDate = `${itemDate.getFullYear()}-${(itemDate.getMonth() + 1)
            .toString().padStart(2, '0')}-${itemDate.getDate().toString().padStart(2, '0')}`;
          return formattedItemDate === currentWeekStart;
        });

        // (1) 사용자가 직접 등록한 일정: item.username이 현재 사용자와 일치
        const directItems = weekItems.filter(item => item.username && item.username === currentUser.name);
        // (2) 공유 일정: item.users 배열에 현재 사용자가 포함된 경우
        const sharedItems = weekItems.filter(item => item.users && item.users.includes(currentUser.name));

        // 두 종류의 일정을 중복 없이 병합하는 함수
        const mergeSchedules = (baseArray, extraArray) => {
          const merged = [...baseArray];
          extraArray.forEach(item => {
            if (!merged.some(existing => existing.id === item.id)) {
              merged.push(item);
            }
          });
          return merged;
        };

        if (directItems.length > 0) {
          setPersonalScheduleItems(mergeSchedules(directItems, sharedItems));
          setLoading(false);
        } else {
          // 직접 등록한 일정이 없다면 기본 시간표 데이터를 가져와서 공유 일정과 병합
          fetch('http://3.37.96.38:4000/api/base-timetable', { credentials: 'include' })
            .then(res => {
              if (!res.ok) throw new Error('기본 시간표 데이터를 불러오지 못했습니다.');
              return res.json();
            })
            .then(baseData => {
              const baseItems = baseData && baseData.length > 0 ? baseData : [];
              setPersonalScheduleItems(mergeSchedules(baseItems, sharedItems));
            })
            .catch(err => setError(err.message))
            .finally(() => setLoading(false));
        }
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, [currentWeekStart, currentUser]);

  // 연습 일정 불러오기: 팀 연습일정에서, 현재 사용자가 포함된 경우에만 출력
  useEffect(() => {
    if (!currentWeekStart || !currentUser) return;
    fetch(`http://3.37.96.38:4000/api/practice-schedules?week_start=${currentWeekStart}`, {
      credentials: 'include'
    })
      .then(res => {
        if (!res.ok) throw new Error('연습 일정 데이터를 불러오지 못했습니다.');
        return res.json();
      })
      .then(data => {
        // 각 항목에 subject와 color 필드를 추가 (팀 이름과 색상 지정)
        // 단, item.users 배열에 현재 사용자의 이름이 포함된 경우에만 포함
        const filteredData = data.filter(item => item.users && item.users.includes(currentUser.name));
        const transformedData = filteredData.map(item => ({
          ...item,
          subject: item.team_name,  // 팀 이름을 제목으로 사용
          color: '#AED581'          // 연습 일정에 적용할 배경색 예시
        }));
        setPracticeScheduleItems(transformedData);
      })
      .catch(err => {
        console.error("연습 일정 로딩 오류:", err);
      });
  }, [currentWeekStart, currentUser]);

  // 주차 이동 기능: 이전 주, 다음 주 버튼 클릭 시 currentWeekStart 업데이트 후 재조회
  const goToPreviousWeek = () => {
    const currentDate = new Date(currentWeekStart);
    currentDate.setDate(currentDate.getDate() - 7);
    setCurrentWeekStart(`${currentDate.getFullYear()}-${(currentDate.getMonth() + 1)
      .toString().padStart(2, '0')}-${currentDate.getDate().toString().padStart(2, '0')}`);
  };

  const goToNextWeek = () => {
    const currentDate = new Date(currentWeekStart);
    currentDate.setDate(currentDate.getDate() + 7);
    setCurrentWeekStart(`${currentDate.getFullYear()}-${(currentDate.getMonth() + 1)
      .toString().padStart(2, '0')}-${currentDate.getDate().toString().padStart(2, '0')}`);
  };

  if (loading) return <p>로딩 중...</p>;
  if (error) return <p>오류: {error}</p>;
  if (!currentUser) return <p>사용자 정보를 불러오는 중...</p>;

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>나의 시간표</h2>
      <div style={{ textAlign: 'center', marginBottom: '10px' }}>
        <button onClick={goToPreviousWeek} style={navButtonStyle}>이전 주</button>
        <span style={{ margin: '0 10px' }}>주 시작일: {currentWeekStart}</span>
        <button onClick={goToNextWeek} style={navButtonStyle}>다음 주</button>
      </div>
      {/* onCellClick에 no-op 함수를 전달하여 셀 클릭 시 오류가 발생하지 않게 함 */}
      <Timetable 
        days={days} 
        times={times} 
        scheduleItems={combinedScheduleItems} 
        onCellClick={() => {}} 
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
  }
};

export default UserPractice;