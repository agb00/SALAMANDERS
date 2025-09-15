import React, { useState, useEffect } from 'react';
import Timetable from './Timetable';

const days = ["월", "화", "수", "목", "금", "토", "일"];
const times = [9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22];

function AdminSchedule() {
  const [scheduleItems, setScheduleItems] = useState([]); // 주간 연습 일정 데이터
  const [currentWeekStart, setCurrentWeekStart] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);  // 삭제 모달 상태
  const [selectedSlot, setSelectedSlot] = useState({ day: '', time: null });
  const [availableTeams, setAvailableTeams] = useState([]); // 가능한 팀들
  const [selectedTeams, setSelectedTeams] = useState([]); // 선택된 팀들
  const [allTeams, setAllTeams] = useState([]); // 전체 팀 목록
  const [selectedScheduleItem, setSelectedScheduleItem] = useState(null); // 삭제할 일정
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewUsers, setPreviewUsers] = useState([]);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState('');

  // 현지 날짜 기준 "YYYY-MM-DD" 형식의 주 시작일(월요일) 계산 함수
  const calculateWeekStartLocal = (date) => {
    // 현지 시간 기준으로 요일(일:0, 월:1, ...)을 구함
    const day = date.getDay();
    // 만약 일요일이면 6일을 빼서 월요일 계산, 그 외엔 (day - 1)만큼 빼줌
    const diff = date.getDate() - (day === 0 ? 6 : day - 1);
    const monday = new Date(date.getFullYear(), date.getMonth(), diff);
    const year = monday.getFullYear();
    const month = String(monday.getMonth() + 1).padStart(2, '0');
    const dayStr = String(monday.getDate()).padStart(2, '0');
    return `${year}-${month}-${dayStr}`;
  };
  

  // 컴포넌트 마운트 시 오늘이 포함된 주의 시작일(월요일) 설정
  useEffect(() => {
    const today = new Date();
    const weekStartLocal = calculateWeekStartLocal(today);
    setCurrentWeekStart(weekStartLocal);
    
    // 서버에서 연습 일정을 가져오기
    fetchSchedules(weekStartLocal);
    
    // 팀 데이터 한 번만 가져오기
    fetchTeams();
  }, []);

  // 연습 일정 데이터를 가져오는 함수
  // AdminSchedule.js 내의 fetchSchedules 함수의 일부
  const fetchSchedules = (weekStart) => {
    fetch(`http://3.37.96.38:4000/api/practice-schedules?week_start=${weekStart}`, {
      credentials: 'include',
    })
      .then((res) => res.json())
      .then((data) => {
        //console.log("Fetched practice schedules:", data);

        // 데이터 변환: 각 항목에 subject와 color 필드 추가
        const transformedData = data.map(item => ({
          ...item,
          subject: item.team_name,  // 팀 이름을 제목으로 사용
          color: '#AED581'         // 예시: 셀 배경색. 필요에 따라 색상 변경
        }));

        setScheduleItems(transformedData);
      })
      .catch((err) => {
        console.error("Error fetching practice schedules:", err);
      });
  };

  // 팀 목록을 서버에서 불러오는 함수
  const fetchTeams = () => {
    fetch('http://3.37.96.38:4000/admin/teams', { credentials: 'include' })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setAllTeams(data.teams);  // 전체 팀 목록을 상태에 저장
          //console.log("Fetched teams data:", data.teams); // 팀 데이터 확인
        } else {
          console.log("팀 목록을 불러오는 데 실패했습니다.");
        }
      })
      .catch((err) => {
        console.error('팀 목록을 불러오지 못했습니다.', err);
      });
  };

  // 셀 클릭 시, 해당 시간 슬롯이 비어있을 경우 모달을 열고, 일정이 없는 팀 목록을 조회
  const handleCellClick = (day, time, scheduleItem) => {
    if (scheduleItem) {
      // scheduleItem이 존재하면 해당 셀의 정보로 selectedSlot 업데이트
      setSelectedScheduleItem(scheduleItem);
      setSelectedSlot({ day: scheduleItem.day, time: scheduleItem.time });
      setDeleteModalOpen(true);
      return;
    }
    setSelectedSlot({ day, time });
    filterAvailableTeams(day, time);
    setModalOpen(true);
  };
  

  // 주차 이동 기능
  const goToPreviousWeek = () => {
    const currentDate = new Date(currentWeekStart);
    currentDate.setDate(currentDate.getDate() - 7);
    const newWeekStart = `${currentDate.getFullYear()}-${(currentDate.getMonth()+1)
      .toString()
      .padStart(2,'0')}-${currentDate.getDate().toString().padStart(2,'0')}`;
    setCurrentWeekStart(newWeekStart);
    fetchSchedules(newWeekStart);
  };
  
  const goToNextWeek = () => {
    const currentDate = new Date(currentWeekStart);
    currentDate.setDate(currentDate.getDate() + 7);
    const newWeekStart = `${currentDate.getFullYear()}-${(currentDate.getMonth()+1)
      .toString()
      .padStart(2,'0')}-${currentDate.getDate().toString().padStart(2,'0')}`;
    setCurrentWeekStart(newWeekStart);
    fetchSchedules(newWeekStart);
  };  

  // 팀 내 인원들만 가능한 팀을 필터링하는 함수
  const filterAvailableTeams = (day, time) => {
    fetch(`http://3.37.96.38:4000/api/available-users?day=${day}&time=${time}&week_start=${currentWeekStart}`, {
      credentials: 'include',
    })
      .then((res) => res.json())
      .then((data) => {
        const availableUsernames = data.map((user) => user.name.toLowerCase().trim()); // 소문자 및 공백 제거
        console.log("Available users:", availableUsernames); // 가능한 유저들을 출력

        // 전체 팀 목록에서 필터링된 팀만 표시
        const available = allTeams.filter((team) => {
          const allUsersAvailable = team.users.every((user) => {
            const isUserAvailable = availableUsernames.includes(user.toLowerCase().trim());
            //console.log(`${user} available: ${isUserAvailable}`); // 각 유저가 가능한지 출력
            return isUserAvailable;
          });

          console.log(`Team ${team.name} - All users available: ${allUsersAvailable}`); // 팀이 모든 유저가 가능한지 확인
          return allUsersAvailable; // 모든 유저가 가능한 팀만 필터링
        });

        if (available.length > 0) {
          //console.log(`Possible teams for ${day} ${time}:`, available);
        } else {
          //console.log("No teams available for this time.");
        }

        setAvailableTeams(available); // 필터링된 팀 목록을 상태에 저장
      })
      .catch((err) => {
        console.error("Error fetching available users:", err);
        setAvailableTeams([]); // 오류 발생 시 빈 배열로 상태 초기화
      });
  };

  // 팀을 선택/해제하는 함수
  const toggleTeamSelection = (teamName) => {
    setSelectedTeams((prev) => {
      if (prev.includes(teamName)) {
        return prev.filter((name) => name !== teamName);
      } else {
        return [...prev, teamName];
      }
    });
  };

  // 일정 삭제 함수
  const handleDeleteSchedule = () => {
    if (!selectedScheduleItem || !selectedScheduleItem.id) {
      alert("삭제할 일정이 없습니다.");
      return;
    }

    const scheduleId = selectedScheduleItem.id; // 삭제할 일정의 ID

    fetch(`http://3.37.96.38:4000/api/practice-schedule/${scheduleId}`, {
      method: 'DELETE',
      credentials: 'include',
    })
      .then((res) => {
        if (!res.ok) throw new Error('일정 삭제에 실패했습니다.');
        return res.json();
      })
      .then(() => {
        // 삭제 후, 일정 목록 업데이트
        setScheduleItems((prev) =>
          prev.filter((item) => item.id !== scheduleId)
        );
        setDeleteModalOpen(false); // 삭제 모달 닫기
        alert('일정이 삭제되었습니다.');
      })
      .catch((err) => {
        console.error(err);
        alert(err.message);
      });
  };

  // 모달 제출: 선택한 팀들을 일정에 할당
  const handleModalSubmit = () => {
    if (selectedTeams.length === 0) {
      alert("팀을 선택하세요.");
      return;
    }

    // 팀 이름과 유저들을 저장
    const usersForTeams = [];

   // 각 팀에 대해 해당 팀의 유저들을 찾아서 배열에 저장
    selectedTeams.forEach(teamName => {
      const team = allTeams.find(t => t.name === teamName); // allTeams에서 해당 팀을 찾기
      if (team) {
        usersForTeams.push(...team.users); // 해당 팀의 유저들을 추가
      }
    });

    const newItem = {
      teamName: selectedTeams.join(', '),  // 팀 이름을 팀명으로 저장
      users: usersForTeams,  // 선택된 팀들의 유저들을 배열로 저장
      day: selectedSlot.day,  // 연습일
      time: selectedSlot.time,  // 연습시간
      weekStart: currentWeekStart  // 주 시작일
    };

    // 해당 일정을 practice_schedules 테이블에 저장
    fetch('http://3.37.96.38:4000/api/practice-schedule', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(newItem)
    })
      .then((res) => {
        if (!res.ok) throw new Error("일정 저장에 실패했습니다.");
        return res.json();
      })
      .then(() => {
        // 일정 저장 후 상태 업데이트
        alert("연습 일정이 저장되었습니다.");
        setSelectedTeams([]);
        setSelectedSlot({ day: '', time: null });
        setModalOpen(false);
        fetchSchedules(currentWeekStart); // 일정 목록 다시 가져오기
      })
      .catch((err) => alert(err.message));
    };


  const handleModalCancel = () => {
    setModalOpen(false);
    setSelectedTeams([]);
    setSelectedSlot({ day: '', time: null });
  };

  const handleDeleteCancel = () => {
    setDeleteModalOpen(false); // 삭제 모달 닫기
  };

  // [추가] 미리보기 열기
  const openPreviewModal = async () => {
    if (!currentWeekStart) {
      alert('현재 주차가 설정되지 않았습니다.');
      return;
    }
    setPreviewLoading(true);
    setPreviewError('');
    setPreviewUsers([]);
    setPreviewOpen(true);
    try {
      const res = await fetch(
        `http://3.37.96.38:4000/api/admin/empty-week-users?week_start=${encodeURIComponent(currentWeekStart)}`,
        { credentials: 'include' }
      );
      if (!res.ok) throw new Error('조회 실패');
      const data = await res.json();
      setPreviewUsers(data.users || []);
    } catch (err) {
      console.error(err);
      setPreviewError(err.message || '조회 중 오류가 발생했습니다.');
    } finally {
      setPreviewLoading(false);
    }
  };

  // [추가] 미리보기 닫기
  const closePreviewModal = () => setPreviewOpen(false);

  return (
    <div style={{ padding: '20px' }}>
      <h2>팀 연습 일정 관리 (Admin)</h2>
      <div style={{ textAlign: 'center', marginBottom: '10px' }}>
        <button onClick={goToPreviousWeek} style={navButtonStyle}>이전 주</button>
        <span style={{ margin: '0 10px' }}>주 시작일: {currentWeekStart}</span>
        <button onClick={goToNextWeek} style={navButtonStyle}>다음 주</button>
      </div>

      <Timetable
        days={days}
        times={times}
        scheduleItems={scheduleItems}  // 데이터베이스에서 가져온 연습 일정을 전달
        onCellClick={handleCellClick}
        selectedCells={[]}  // 관리자용 일정 생성은 개별 셀 선택 모달로 처리하므로 빈 배열 전달
      />

      {modalOpen && (
        <div style={modalOverlayStyle}>
          <div style={modalContentStyle}>
            <h3>선택된 시간: {selectedSlot.day}요일, {selectedSlot.time}시</h3>
            <p>가능한 팀들:</p>
            {availableTeams.length > 0 ? (
              <ul style={{ textAlign: 'left' }}>
                {availableTeams.map((team, idx) => (
                  <li key={idx}>
                    <label>
                      <input
                        type="checkbox"
                        value={team.name}
                        checked={selectedTeams.includes(team.name)}
                        onChange={() => toggleTeamSelection(team.name)}
                      />
                      {team.name} - {team.users.join(', ')}
                    </label>
                  </li>
                ))}
              </ul>
            ) : (
              <p>해당 시간에 가능한 팀이 없습니다.</p>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '10px' }}>
              <button onClick={handleModalCancel} style={modalCancelButtonStyle}>취소</button>
              <button onClick={handleModalSubmit} style={modalButtonStyle}>일정 생성</button>
            </div>
          </div>
        </div>
      )}

      {deleteModalOpen && (
        <div style={modalOverlayStyle}>
          <div style={modalContentStyle}>
            <h3>선택된 시간: {selectedSlot.day}요일, {selectedSlot.time}시</h3>
            {selectedScheduleItem && (
              <>
                <p>팀: {selectedScheduleItem.teamName}</p>
                <p>참가 유저: {selectedScheduleItem.users.join(', ')}</p>
              </>
            )}
            <p>일정을 삭제하시겠습니까?</p>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '10px' }}>
              <button onClick={handleDeleteCancel} style={modalCancelButtonStyle}>취소</button>
              <button onClick={handleDeleteSchedule} style={modalButtonStyle}>확인</button>
            </div>
          </div>
        </div>
      )}

      {previewOpen && (
        <div style={modalOverlayStyle}>
          <div style={{ ...modalContentStyle, width: '440px', textAlign: 'left' }}>
            <h3 style={{ marginTop: 0 }}>비어있는 유저 미리보기 — {currentWeekStart}</h3>

            {previewLoading && <p>불러오는 중…</p>}
            {!previewLoading && previewError && (
              <p style={{ color: '#f44336' }}>오류: {previewError}</p>
            )}
            {!previewLoading && !previewError && (
              <>
                <p style={{ margin: '8px 0 12px' }}>
                  총 <b>{previewUsers.length}</b>명
                </p>
                <div style={{
                  maxHeight: '40vh',
                  overflowY: 'auto',
                  border: '1px solid #eee',
                  padding: '8px',
                  borderRadius: '6px',
                  background: '#fafafa'
                }}>
                  {previewUsers.length > 0 ? (
                    <ul style={{ margin: 0, paddingLeft: '18px' }}>
                      {previewUsers.map((u, idx) => (
                        <li key={idx} style={{ lineHeight: 1.6 }}>
                          {u.username}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p style={{ margin: 0 }}>(없음)</p>
                  )}
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
                  <button onClick={closePreviewModal} style={modalButtonStyle}>닫기</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* --- 동기화 & 미리보기 버튼 (하단 고정) --- */}
      <div style={{
        position: 'fixed',
        right: '24px',
        bottom: '24px',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        zIndex: 1100
      }}>
        <button
          onClick={async () => {
            if (!currentWeekStart) {
              alert('현재 주차가 설정되지 않았습니다.');
              return;
            }
            if (!window.confirm(`[관리자 동기화]\n${currentWeekStart} 주차 기준으로 "비어있는 유저"들의 시간표를 기본 시간표에서 채웁니다.`)) {
              return;
            }
            try {
              const res = await fetch('http://3.37.96.38:4000/api/admin/fill-week-from-base', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ week_start: currentWeekStart })
              });
              if (!res.ok) throw new Error('동기화 요청 실패');
              const data = await res.json();
              alert(`동기화 완료!\n복사된 셀: ${data.insertedRows || 0}개`);
            } catch (err) {
              console.error(err);
              alert('동기화 실패: ' + err.message);
            }
          }}
          style={{
            padding: '12px 20px',
            backgroundColor: '#4CAF50',
            color: '#fff',
            border: 'none',
            borderRadius: '24px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
            cursor: 'pointer',
            fontWeight: 'bold'
          }}
        >
          동기화
        </button>

        <button
          onClick={openPreviewModal}
          style={{
            padding: '12px 20px',
            backgroundColor: '#607D8B',
            color: '#fff',
            border: 'none',
            borderRadius: '24px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
            cursor: 'pointer',
            fontWeight: 'bold'
          }}
        >
          미리보기
        </button>
      </div>

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
  zIndex: 1000
};

const modalContentStyle = {
  backgroundColor: '#fff',
  padding: '20px',
  borderRadius: '8px',
  width: '400px',
  textAlign: 'center'
};

const modalCancelButtonStyle = {
  padding: '8px 16px',
  backgroundColor: '#f44336',
  color: '#fff',
  border: 'none',
  borderRadius: '4px',
  cursor: 'pointer'
};

const modalButtonStyle = {
  padding: '8px 16px',
  backgroundColor: '#4CAF50',
  color: '#fff',
  border: 'none',
  borderRadius: '4px',
  cursor: 'pointer'
};

export default AdminSchedule;