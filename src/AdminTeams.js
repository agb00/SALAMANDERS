import React, { useState, useEffect } from 'react';

function AdminTeams() {
  const [groupedUsers, setGroupedUsers] = useState({});  // part 기준으로 그룹화된 유저들
  const [selectedUsers, setSelectedUsers] = useState([]);  // 선택된 유저들
  const [teamName, setTeamName] = useState(""); // 팀 이름
  const [errorMessage, setErrorMessage] = useState(""); // 에러 메시지
  const [createdTeams, setCreatedTeams] = useState([]);  // 생성된 팀들 목록

  // 유저 데이터를 불러오는 함수
  const fetchUsers = () => {
    fetch('http://3.37.96.38:4000/admin/users', { credentials: 'include' })
      .then((res) => {
        if (!res.ok) throw new Error("유저 데이터를 불러오지 못했습니다.");
        return res.json();
      })
      .then((data) => {
        // part로 그룹화
        const grouped = data.reduce((acc, user) => {
          const part = user.part || "기타"; // 파트가 없으면 '기타'로 처리
          if (!acc[part]) acc[part] = [];
          acc[part].push(user);
          return acc;
        }, {});
        setGroupedUsers(grouped);
      })
      .catch((err) => {
        console.error("유저 데이터를 불러오지 못했습니다.", err);
      });
  };

  // 생성된 팀 목록을 서버에서 불러오는 함수
  const fetchTeams = () => {
    fetch('http://3.37.96.38:4000/admin/teams', { credentials: 'include' })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setCreatedTeams(data.teams);  // 서버에서 받은 팀 목록 업데이트
        }
      })
      .catch((err) => {
        console.error("팀 목록을 불러오지 못했습니다.", err);
      });
  };

  // 유저 선택/해제
  const toggleUserSelection = (username) => {
    setSelectedUsers(prev => {
      if (prev.includes(username)) {
        return prev.filter((user) => user !== username);
      } else {
        return [...prev, username];
      }
    });
  };

  // 팀 생성
  const createTeam = () => {
    if (!teamName || selectedUsers.length === 0) {
      setErrorMessage('팀 이름을 입력하고, 유저를 선택하세요.');
      return;
    }

    const newTeam = {
      teamName: teamName,
      users: selectedUsers,
    };

    // 팀 생성 요청을 서버로 보내기
    fetch('http://3.37.96.38:4000/admin/create-team', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(newTeam),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          alert(`팀 "${teamName}"이(가) 생성되었습니다!`);
          fetchTeams();  // 팀 생성 후 팀 목록을 다시 불러옴
          setTeamName('');
          setSelectedUsers([]);
          setErrorMessage('');
        } else {
          setErrorMessage(data.error || '팀 생성에 실패했습니다.');
        }
      })
      .catch((err) => {
        setErrorMessage('서버와의 연결에 실패했습니다.');
        console.error(err);
      });
  };

  // 팀 삭제
  const deleteTeam = (teamId) => {
    fetch(`http://3.37.96.38:4000/admin/delete-team/${teamId}`, {
      method: 'DELETE',
      credentials: 'include',
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          alert(`팀이 삭제되었습니다!`);
          fetchTeams();  // 삭제 후 팀 목록을 다시 불러옴
        }
      })
      .catch((err) => {
        console.error('팀 삭제에 실패했습니다.', err);
      });
  };

  useEffect(() => {
    fetchUsers();  // 컴포넌트가 마운트될 때 유저 데이터를 불러옴
    fetchTeams();  // 컴포넌트가 마운트될 때 팀 목록을 불러옴
  }, []);

  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '20px' }}>
      <div style={{ width: '60%' }}>
        <h2>팀 관리 (Admin)</h2>

        {/* 팀 생성 */}
        <div style={{ marginBottom: '20px' }}>
          <input
            type="text"
            placeholder="팀 이름"
            value={teamName}
            onChange={(e) => setTeamName(e.target.value)}
            style={{ padding: '6px 12px', marginBottom: '10px' }}
          />
          <button onClick={createTeam} style={{ padding: '6px 12px' }}>
            팀 생성
          </button>
          {errorMessage && <p style={{ color: 'red' }}>{errorMessage}</p>}
        </div>

        {/* 유저 그룹화 */}
        <div style={{ marginTop: '20px' }}>
          <h3>유저 그룹화</h3>
          {Object.keys(groupedUsers).map((part) => (
            <div key={part}>
              <h4>{part}</h4>
              <ul style={{ listStyleType: 'none' }}>
                {groupedUsers[part].map((user) => (
                  <li key={user.name}>
                    <label>
                      <input
                        type="checkbox"
                        checked={selectedUsers.includes(user.name)}
                        onChange={() => toggleUserSelection(user.name)}
                      />
                      {user.name} ({user.phone})
                    </label>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* 생성된 팀 목록 (오른쪽에 표시) */}
      <div style={{ width: '30%', paddingLeft: '20px' }}>
        <h3>생성된 팀들</h3>
        <ul style={{ listStyleType: 'none' }}>
          {createdTeams.length === 0 ? (
            <li>생성된 팀이 없습니다.</li>
          ) : (
            createdTeams.map((team) => (
              <li key={team.id} style={{ marginBottom: '10px' }}>
                <div>
                  <strong>{team.name}</strong> - {team.users.join(', ')}
                </div>
                <button
                  onClick={() => deleteTeam(team.id)} // team.id를 사용하여 삭제
                  style={{ backgroundColor: '#f44336', color: '#fff', padding: '6px 12px', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                >
                  삭제
                </button>
              </li>
            ))
          )}
        </ul>
      </div>
    </div>
  );
}

export default AdminTeams;