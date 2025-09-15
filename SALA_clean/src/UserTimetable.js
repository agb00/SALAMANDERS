// src/UserTimetable.js
import React, { useState, useEffect } from 'react';

function UserTimetable() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadMessage, setUploadMessage] = useState('');
  const [existingFilePath, setExistingFilePath] = useState('');

  // 페이지 로드시 이미 업로드된 시간표 파일 경로를 서버에서 받아옴
  useEffect(() => {
    fetch('http://localhost:4000/get-timetable', {
      credentials: 'include',
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.filePath) {
          setExistingFilePath(data.filePath);
        }
      })
      .catch((err) => {
        console.error('시간표 파일 조회 실패:', err);
      });
  }, []);

  const handleFileChange = (e) => {
    setSelectedFile(e.target.files[0]);
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!selectedFile) {
      alert('업로드할 파일을 선택하세요.');
      return;
    }
    const formData = new FormData();
    formData.append('timetable', selectedFile);

    try {
      const res = await fetch('http://localhost:4000/upload-timetable', {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setUploadMessage(`업로드 성공: ${data.filePath}`);
        setExistingFilePath(data.filePath); // 파일 경로 업데이트
      } else {
        setUploadMessage(`업로드 실패: ${data.error || '알 수 없는 오류'}`);
      }
    } catch (err) {
      console.error(err);
      setUploadMessage('서버와의 연결 오류');
    }
  };

  // 파일 교체 버튼을 누르면 기존 파일 정보를 지우고 업로드 폼을 표시하도록 함
  const handleReplaceFile = () => {
    setExistingFilePath('');
    setSelectedFile(null);
    setUploadMessage('');
  };

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>시간표 관리</h2>
      {existingFilePath ? (
        <div style={styles.previewContainer}>
          <img
            src={`http://localhost:4000/${existingFilePath}`}
            alt="업로드된 시간표"
            style={styles.previewImage}
          />
          <p>현재 업로드된 시간표 파일입니다.</p>
          <button onClick={handleReplaceFile} style={styles.replaceButton}>
            파일 교체하기
          </button>
        </div>
      ) : (
        <form onSubmit={handleUpload} style={styles.form}>
          <input
            type="file"
            accept=".csv, .xlsx, .xls, image/*"
            onChange={handleFileChange}
            style={styles.inputFile}
          />
          <button type="submit" style={styles.uploadButton}>
            파일 업로드
          </button>
        </form>
      )}
      {uploadMessage && <p style={styles.message}>{uploadMessage}</p>}
    </div>
  );
}

const styles = {
  container: {
    width: '90%',
    maxWidth: '500px',
    margin: '40px auto',
    padding: '20px',
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    boxShadow: '0 4px 10px rgba(0, 0, 0, 0.1)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  title: {
    fontSize: '1.8rem',
    color: '#333',
    marginBottom: '20px',
  },
  form: {
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '15px',
  },
  inputFile: {
    width: '100%',
    padding: '10px',
    border: '1px solid #ccc',
    borderRadius: '4px',
  },
  uploadButton: {
    width: '100%',
    padding: '15px',
    fontSize: '1.2rem',
    borderRadius: '8px',
    border: 'none',
    backgroundColor: '#4CAF50',
    color: '#fff',
    cursor: 'pointer',
    transition: 'background 0.3s ease',
  },
  message: {
    marginTop: '20px',
    fontSize: '1rem',
    color: '#333',
    textAlign: 'center',
  },
  previewContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  previewImage: {
    maxWidth: '100%',
    borderRadius: '8px',
    marginBottom: '10px',
  },
  replaceButton: {
    padding: '10px 20px',
    fontSize: '1.2rem',
    borderRadius: '8px',
    border: 'none',
    backgroundColor: '#FFADAD',
    color: '#fff',
    cursor: 'pointer',
    transition: 'background 0.3s ease',
  },
};

export default UserTimetable;