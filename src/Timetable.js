// src/Timetable.js
import React from "react";

function Timetable({ days, times, scheduleItems }) {
  // 각 칸(day, time)에 해당하는 수업 정보를 찾는 함수
  const getItemForDayTime = (day, time) => {
    return scheduleItems.find(item => item.day === day && item.time === time);
  };

  return (
    <table style={styles.table}>
      <thead>
        <tr>
          <th style={styles.th}>시간</th>
          {days.map(day => (
            <th key={day} style={styles.th}>{day}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {times.map(time => (
          <tr key={time}>
            <td style={styles.timeTd}>{time}</td>
            {days.map(day => {
              const item = getItemForDayTime(day, time);
              return (
                <td
                  key={day}
                  style={{
                    ...styles.td,
                    backgroundColor: item ? item.color : "#fff",
                  }}
                >
                  {item ? item.subject : ""}
                </td>
              );
            })}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

const styles = {
  table: {
    borderCollapse: "collapse",
    width: "100%",
    marginTop: "20px"
  },
  th: {
    border: "1px solid #ccc",
    padding: "2px", // 패딩을 4px로 축소
    backgroundColor: "#f2f2f2",
    textAlign: "center"
  },
  timeTd: {
    border: "1px solid #ccc",
    padding: "2px", // 패딩 축소
    backgroundColor: "#fafafa",
    textAlign: "center",
    width: "60px"
  },
  td: {
    border: "1px solid #ccc",
    padding: "2px", // 패딩 축소
    textAlign: "center",
    height: "50px",
    width: "100px"
  }
};

export default Timetable;
