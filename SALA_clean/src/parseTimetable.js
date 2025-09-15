// src/parseTimetable.js
export function parseTimetable(ocrText) {
    if (!ocrText) return [];
  
    // OCR 결과를 줄 단위로 분리하고, 빈 줄은 제외
    const lines = ocrText.trim().split('\n').filter(line => line.trim() !== '');
    
    // 최소 2줄 이상 있어야 헤더와 데이터가 있다고 가정
    if (lines.length < 2) return [];
  
    // 첫 줄은 헤더로 가정하고, 나머지 줄은 데이터로 처리
    const dataLines = lines.slice(1);
  
    // 각 데이터 줄을 파싱합니다.
    const scheduleItems = dataLines.map(line => {
      const cols = line.split(/\s+/);
      if (cols.length < 3) return null;
      
      const day = cols[0];
      const time = parseInt(cols[1], 10); // 교시나 시작 시간을 숫자로 변환
      const subject = cols[2];
      
      // 수업이 있다면 미리 정해진 배경색상으로 지정, 없으면 흰색으로 처리
      const color = subject ? "#e0f7fa" : "#FFFFFF";
      
      return { day, time, subject, color };
    }).filter(item => item !== null);
  
    return scheduleItems;
  }