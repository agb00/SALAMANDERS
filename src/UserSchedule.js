// src/UserSchedule.js
import React, { useState, useEffect } from 'react';
import Timetable from './Timetable';
import { parseTimetable } from './parseTimetable';

// 요일 배열는 그대로 사용하고, 시간대 배열을 9시부터 22시까지로 수정합니다.
const days = ["월", "화", "수", "목", "금", "토", "일"];
const times = [9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22];

function UserSchedule() {
  const [scheduleItems, setScheduleItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    fetch('http://localhost:4000/user/timetable-data', {
      credentials: 'include',
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.timetables && data.timetables.length > 0) {
          // 최신 시간표 한 개를 사용 (배열 첫번째 요소)
          const latestTimetable = data.timetables[0];
          const items = parseTimetable(latestTimetable.extractedText);
          setScheduleItems(items);
        } else {
          setError(data.error || '시간표 데이터가 없습니다.');
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setError('서버와 통신 중 오류 발생');
        setLoading(false);
      });
  }, []);

  if (loading) return <p style={styles.message}>로딩 중...</p>;
  if (error) return <p style={styles.message}>오류: {error}</p>;

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>내 시간표</h2>
      {scheduleItems.length === 0 ? (
        <p style={styles.message}>시간표 데이터가 없습니다.</p>
      ) : (
        <Timetable days={days} times={times} scheduleItems={scheduleItems} />
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
    paddingBottom: '40px', // 하단에 여백 추가
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
};

export default UserSchedule;
