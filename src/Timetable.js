import React from 'react';

function Timetable({ days, times, scheduleItems, onCellClick, selectedCells = [] }) {
  return (
    // 테이블이 컨테이너 너비를 넘어가면 가로 스크롤 가능하도록 감싸기
    <div style={{ overflowX: 'auto', width: '100%' }}>
      <table style={tableStyles.table}>
        <thead>
          <tr>
            <th style={tableStyles.headerCell}></th>
            {days.map(day => (
              <th key={day} style={tableStyles.headerCell}>{day}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {times.map(time => (
            <tr key={time}>
              <td style={tableStyles.timeCell}>{time}</td>
              {days.map(day => {
                // 해당 시간대와 요일의 일정 찾기
                const scheduleItem = scheduleItems.find(item => item.day === day && item.time === time);
                // 선택된 셀 여부 확인 (selectedCells의 기본값을 빈 배열로 설정)
                const isSelected = selectedCells.some(cell => cell.day === day && cell.time === time);
                return (
                  <td
                    key={`${day}-${time}`}
                    onClick={() => onCellClick(day, time, scheduleItem)}
                    style={{
                      ...tableStyles.cell,
                      backgroundColor: isSelected
                        ? "#ffeb3b"  // 선택된 셀의 색상 (노란색)
                        : scheduleItem 
                          ? scheduleItem.color 
                          : "#fff"
                    }}
                  >
                    {scheduleItem ? scheduleItem.subject : ''}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const tableStyles = {
  table: {
    borderCollapse: 'collapse',
    width: '100%',
    marginBottom: '20px',
    tableLayout: 'fixed', // 셀 크기를 균등하게 분배
  },
  headerCell: {
    border: '1px solid #ccc',
    padding: '2px',         // 패딩 최소화
    backgroundColor: '#f5f5f5',
    textAlign: 'center',
    fontSize: '0.8rem',      
    minWidth: '40px',        
    minHeight: '30px',       
  },
  timeCell: {
    border: '1px solid #ccc',
    padding: '2px',         // 패딩 최소화
    textAlign: 'center',
    backgroundColor: '#f5f5f5',
    fontWeight: 'bold',
    fontSize: '0.8rem',      
    minWidth: '40px',        
    minHeight: '30px',       
  },
  cell: {
    border: '1px solid #ccc',
    padding: '2px',         // 패딩 최소화
    textAlign: 'center',
    fontSize: '0.8rem',
    cursor: 'pointer',
    minWidth: '60px',
    minHeight: '40px',
    wordWrap: 'break-word',
  },
};

export default Timetable;