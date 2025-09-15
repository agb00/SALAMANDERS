require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mariadb = require('mariadb');
const bcrypt = require('bcrypt');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const fs = require('fs');
const path = require('path');
const upload = require('./uploadConfig'); // /server/uploadConfig.js
const Tesseract = require('tesseract.js');
const extractText = require('./ocr');

const app = express();

// 정적 파일 미들웨어는 라우트 정의 전에 등록
app.use('/uploads', express.static('uploads'));

app.use(cookieParser());
app.use(session({
  secret: process.env.SESSION_SECRET || 'salamander-secret',
  resave: false,
  saveUninitialized: false,
  rolling: true,              // 매 요청 시 세션 쿠키의 만료 시간을 재설정
  cookie: {
    httpOnly: true,
    secure: false,            // HTTPS 사용 시 true로 설정
    maxAge: 600000            // 10분 (600,000ms)
  }
}));

// CORS 설정 (세션 쿠키 사용을 위해 credentials 포함)
app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true
}));

app.use(express.json());

// MariaDB 연결 풀 생성 (데이터베이스 이름: SLDB)
const pool = mariadb.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'sala',
  password: process.env.DB_PASS || 'admin',
  database: process.env.DB_NAME || 'SLDB',
  port: process.env.DB_PORT || 3306,
  connectionLimit: 20
});

// uploads 폴더가 없는 경우 자동 생성
const uploadDir = path.join(__dirname, 'uploads', 'timetables');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

/*
  ※ 데이터베이스 스키마는
     - 기본 시간표: base_timetables
     - 주차별 일정: schedule_items
  로 사전에 생성해두셨다고 가정합니다.
*/

// ─── 회원가입 ─────────────────────────────────────────────────────────────
app.post('/register', async (req, res) => {
  const { name, password, phone, part, ST } = req.body;
  if (!name || !password || !phone || !part || !ST) {
    return res.status(400).json({ error: '모든 필드를 입력하세요.' });
  }
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const conn = await pool.getConnection();
    await conn.query(
      'INSERT INTO users (name, password, phone, part, ST) VALUES (?, ?, ?, ?, ?)',
      [name, hashedPassword, phone, part, ST]
    );
    conn.release();
    return res.json({ success: true, message: '회원가입 성공' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: '회원가입 중 오류가 발생했습니다.' });
  }
});

// ─── 로그인 ─────────────────────────────────────────────────────────────
app.post('/login', async (req, res) => {
  const { name, password } = req.body;
  if (!name || !password) {
    return res.status(400).json({ error: '이름과 비밀번호를 모두 입력하세요.' });
  }
  try {
    const conn = await pool.getConnection();
    const rows = await conn.query('SELECT * FROM users WHERE name = ?', [name]);
    conn.release();
    if (rows.length === 0) {
      return res.status(401).json({ error: '존재하지 않는 사용자입니다.' });
    }
    const user = rows[0];
    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(401).json({ error: '비밀번호가 일치하지 않습니다.' });
    }
    // 로그인 성공 시, 세션에 사용자 정보 저장 (ST 컬럼 포함)
    req.session.user = {
      name: user.name,
      isAdmin: user.name.toLowerCase() === 'sala',
      ST: user.ST,
    };
    return res.json({ success: true, message: '로그인 성공', user: req.session.user });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: '로그인 중 오류가 발생했습니다.' });
  }
});

// ─── 세션 상태 확인 ─────────────────────────────────────────────────────────────
app.get('/session', (req, res) => {
  if (req.session.user) {
    res.json({ loggedIn: true, user: req.session.user });
  } else {
    res.json({ loggedIn: false });
  }
});

// ─── 관리자 전용 사용자 관련 엔드포인트 ─────────────────────────────────────────────────────────────
app.post('/admin/add-user', async (req, res) => {
  const { name, password, phone, part, ST } = req.body;
  if (!name || !password || !phone || !part || !ST) {
    return res.status(400).json({ error: '모든 필드를 입력하세요.' });  
  }
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const conn = await pool.getConnection();
    await conn.query(
      'INSERT INTO users (name, password, phone, part, ST) VALUES (?, ?, ?, ?, ?)',
      [name, hashedPassword, phone, part, ST]
    );
    conn.release();
    return res.json({ success: true, message: '사용자 등록 완료' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: '사용자 등록 중 오류 발생' });
  }
});

app.get('/admin/users', async (req, res) => {
  try {
    const conn = await pool.getConnection();
    const rows = await conn.query('SELECT name, password, phone, part, ST FROM users');
    conn.release();
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '사용자 목록을 불러오지 못했습니다.' });
  }
});

app.delete('/admin/users/:name', async (req, res) => {
  const { name } = req.params;
  try {
    const conn = await pool.getConnection();
    const result = await conn.query('DELETE FROM users WHERE name = ?', [name]);
    conn.release();
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: '해당 사용자를 찾을 수 없습니다.' });
    }
    res.json({ success: true, message: '사용자 삭제 완료' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '사용자 삭제 중 오류 발생' });
  }
});

app.put('/admin/users/:name', async (req, res) => {
  const { name } = req.params;
  const { password, phone, part, ST } = req.body;
  try {
    const conn = await pool.getConnection();
    if (password && password.trim() !== '') {
      const hashedPassword = await bcrypt.hash(password, 10);
      await conn.query(
        'UPDATE users SET password = ?, phone = ?, part = ?, ST = ? WHERE name = ?',
        [hashedPassword, phone, part, ST, name]
      );
    } else {
      await conn.query(
        'UPDATE users SET phone = ?, part = ?, ST = ? WHERE name = ?',
        [phone, part, ST, name]
      );
    }
    conn.release();
    return res.json({ success: true, message: '사용자 수정 완료' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: '사용자 수정 중 오류 발생' });
  }
});

// ─── 로그아웃 ─────────────────────────────────────────────────────────────
app.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: '로그아웃 중 오류 발생' });
    }
    res.clearCookie('connect.sid');
    return res.json({ success: true });
  });
});

// ─── 시간표 업로드 및 조회 관련 엔드포인트 ─────────────────────────────────────────────────────────────
app.post('/upload-timetable', upload.single('timetable'), async (req, res) => {
  try {
    const filePath = req.file.path;
    
    // 이전 파일 삭제
    const uploadDir = path.join(__dirname, 'uploads', 'timetables');
    const username = req.session.user ? req.session.user.name : null;
    if (username) {
      fs.readdir(uploadDir, (err, files) => {
        if (err) {
          console.error('업로드 폴더 읽기 오류:', err);
          return;
        }
        files.forEach(file => {
          if (file.startsWith(username) && file !== req.file.filename) {
            fs.unlink(path.join(uploadDir, file), (err) => {
              if (err) console.error(`파일 삭제 오류 (${file}):`, err);
              else console.log(`이전 파일 ${file} 삭제 완료`);
            });
          }
        });
      });
    }

    // OCR 처리 후 TSV 데이터 추출
    const tsvData = await extractText(filePath);

    const conn = await pool.getConnection();
    await conn.query(
      'INSERT INTO timetables (username, filePath, extractedText) VALUES (?, ?, ?)',
      [req.session.user ? req.session.user.name : 'unknown', filePath, tsvData]
    );
    conn.release();

    return res.json({ 
      success: true, 
      message: '시간표 업로드 및 OCR 처리 성공', 
      filePath, 
      extractedText: tsvData
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: '시간표 업로드 중 오류 발생' });
  }
});

app.get('/get-timetable', (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ error: '로그인이 필요합니다.' });
  }
  const username = req.session.user.name;
  const uploadDir = path.join(__dirname, 'uploads', 'timetables');
  const fileName = username + '.jpg'; // 실제 파일 확장자에 맞게 수정
  const filePath = path.join(uploadDir, fileName);
  if (fs.existsSync(filePath)) {
    return res.json({ success: true, filePath: path.join('uploads', 'timetables', fileName) });
  } else {
    return res.json({ success: false, error: '시간표 파일이 존재하지 않습니다.' });
  }
});

app.get('/user/timetable-data', async (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ error: '로그인이 필요합니다.' });
  }
  const username = req.session.user.name;
  try {
    const conn = await pool.getConnection();
    const rows = await conn.query(
      'SELECT * FROM timetables WHERE username = ? ORDER BY createdAt DESC',
      [username]
    );
    conn.release();
    return res.json({ success: true, timetables: rows });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: '시간표 데이터를 불러오지 못했습니다.' });
  }
});

// ─── [추가] 사용자 시간표 조회 엔드포인트 ─────────────────────────────────────────────
// GET /admin/users/:userId/schedule
// 1. 먼저 schedule_items 테이블에서 오늘이 포함된 주(월~일)의 데이터 조회
// 2. 데이터가 없으면 base_timetables 테이블에서 해당 사용자의 기본 시간표 조회
// 3. 둘 다 없으면 빈 배열 반환
app.get('/admin/users/:userId/schedule', async (req, res) => {
  try {
    const { userId } = req.params;
    // 현재 주(월요일 ~ 일요일)의 시작일과 종료일 계산
    const today = new Date();
    const dayOfWeek = today.getDay();
    const diff = dayOfWeek === 0 ? today.getDate() - 6 : today.getDate() - dayOfWeek + 1;
    const startOfWeek = new Date(today);
    startOfWeek.setDate(diff);
    startOfWeek.setHours(0, 0, 0, 0);
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);
    
    const conn = await pool.getConnection();
    // 1. schedule_items 테이블에서 해당 주의 데이터 조회 (user_id와 date 컬럼 사용)
    const scheduleItems = await conn.query(
      'SELECT * FROM schedule_items WHERE user_id = ? AND date BETWEEN ? AND ?',
      [userId, startOfWeek, endOfWeek]
    );
    if (scheduleItems.length > 0) {
      conn.release();
      return res.json(scheduleItems);
    }
    // 2. 데이터가 없으면 base_timetables 테이블에서 기본 시간표 조회 (username 컬럼 사용)
    const baseTimetable = await conn.query(
      'SELECT * FROM base_timetables WHERE username = ?',
      [userId]
    );
    conn.release();
    if (baseTimetable.length > 0) {
      return res.json(baseTimetable);
    }
    // 3. 두 테이블 모두 데이터가 없으면 빈 배열 반환
    return res.json([]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '서버 에러' });
  }
});

// ─── [추가] 관리자 전용 기본 시간표 관리 API ─────────────────────────────────────────────
app.get('/api/base-timetable', async (req, res) => {
  if (!req.session.user) return res.status(401).json({ error: '로그인이 필요합니다.' });
  const currentUser = req.session.user;
  let targetUsername = currentUser.name;
  if (currentUser.isAdmin && req.query.username) {
    targetUsername = req.query.username;
  }
  let conn;
  try {
    conn = await pool.getConnection();
    const rows = await conn.query(
      'SELECT * FROM base_timetables WHERE username = ? ORDER BY day, time',
      [targetUsername]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    if (conn) conn.release();
  }
});

// POST /api/base-timetable - 관리자 전용, 대상 사용자의 기본 시간표 업데이트
app.post('/api/base-timetable', async (req, res) => {
  if (!req.session.user || !req.session.user.isAdmin) {
    return res.status(401).json({ error: '관리자 권한이 필요합니다.' });
  }
  const { username, timetable } = req.body;
  if (!username || !Array.isArray(timetable)) {
    return res.status(400).json({ error: 'username과 timetable 배열이 필요합니다.' });
  }
  let conn;
  try {
    conn = await pool.getConnection();
    // 대상 사용자의 기존 기본 시간표 삭제
    await conn.query('DELETE FROM base_timetables WHERE username = ?', [username]);
    const insertQuery = 'INSERT INTO base_timetables (username, day, time, subject, color) VALUES (?, ?, ?, ?, ?)';
    for (const item of timetable) {
      await conn.query(insertQuery, [username, item.day, item.time, item.subject, item.color || '#e0f7fa']);
    }
    res.json({ message: '기본 시간표가 업데이트되었습니다.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    if (conn) conn.release();
  }
});

// ─── [추가] 사용자 주차별 일정 관리 API ─────────────────────────────────────────────
app.get('/api/schedule', async (req, res) => {
  if (!req.session.user) return res.status(401).json({ error: '로그인이 필요합니다.' });
  const username = req.session.user.name;
  let conn;
  try {
    conn = await pool.getConnection();
    const rows = await conn.query(
      'SELECT * FROM schedule_items WHERE username = ? ORDER BY week_start, day, time',
      [username]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    if (conn) conn.release();
  }
});

app.post('/api/schedule', async (req, res) => {
  if (!req.session.user) return res.status(401).json({ error: '로그인이 필요합니다.' });
  const username = req.session.user.name;
  const { week_start, scheduleItems } = req.body;
  if (!week_start || !Array.isArray(scheduleItems)) {
    return res.status(400).json({ error: 'week_start와 scheduleItems 배열이 필요합니다.' });
  }
  let conn;
  try {
    conn = await pool.getConnection();
    await conn.query('DELETE FROM schedule_items WHERE username = ? AND week_start = ?', [username, week_start]);
    const insertQuery = 'INSERT INTO schedule_items (username, week_start, day, time, subject, color) VALUES (?, ?, ?, ?, ?, ?)';
    for (const item of scheduleItems) {
      await conn.query(insertQuery, [
        username,
        week_start,
        item.day,
        item.time,
        item.subject,
        item.color || '#e0f7fa'
      ]);
    }
    res.json({ message: '주차별 일정이 업데이트되었습니다.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    if (conn) conn.release();
  }
});

app.delete('/api/schedule/:id', async (req, res) => {
  if (!req.session.user) return res.status(401).json({ error: '로그인이 필요합니다.' });
  const username = req.session.user.name;
  const id = req.params.id;
  let conn;
  try {
    conn = await pool.getConnection();
    const result = await conn.query(
      'DELETE FROM schedule_items WHERE id = ? AND username = ?',
      [id, username]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: '해당 일정이 존재하지 않거나 삭제 권한이 없습니다.' });
    }
    res.json({ message: '일정이 삭제되었습니다.', id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    if (conn) conn.release();
  }
});

// ─── [추가] 해당 시간에 일정이 없는 사용자 목록 API ─────────────────────────────
// GET /api/available-users?day=월&time=11&week_start=YYYY-MM-DD (week_start는 선택사항)
app.get('/api/available-users', async (req, res) => {
  if (!req.session.user) return res.status(401).json({ error: '로그인이 필요합니다.' });
  
  const { day, time, week_start } = req.query;
  if (!day || !time) {
    return res.status(400).json({ error: 'day와 time 파라미터가 필요합니다.' });
  }
  
  let conn;
  try {
    conn = await pool.getConnection();
    // 모든 사용자 이름을 조회 (필요한 경우 다른 정보도 함께 조회)
    const users = await conn.query('SELECT name FROM users');
    // 해당 day, time, (선택적으로 week_start) 에 일정이 있는 사용자 조회
    let query = 'SELECT username FROM schedule_items WHERE day = ? AND time = ?';
    let params = [day, time];
    if (week_start) {
      query += ' AND week_start = ?';
      params.push(week_start);
    }
    const busyUsers = await conn.query(query, params);
    const busyUsernames = busyUsers.map(u => u.username);
    // available users: users not in busyUsernames
    const availableUsers = users.filter(user => !busyUsernames.includes(user.name));
    res.json(availableUsers);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  } finally {
    if (conn) conn.release();
  }
});

// 팀 생성 API 추가
app.post('/admin/create-team', async (req, res) => {
  const { teamName, users } = req.body;

  if (!teamName || !users || users.length === 0) {
    return res.status(400).json({ error: '팀 이름과 유저 목록을 입력하세요.' });
  }

  try {
    const conn = await pool.getConnection();

    // 팀 생성
    const result = await conn.query('INSERT INTO teams (name, users) VALUES (?, ?)', [
      teamName,
      JSON.stringify(users), // 유저 목록을 JSON 형식으로 저장
    ]);

    const teamId = result.insertId; // 생성된 팀의 ID

    // 유저-팀 관계 저장 (user_teams 테이블에 유저와 팀을 연결)
    for (const userName of users) {
      const userResult = await conn.query('SELECT id FROM users WHERE name = ?', [userName]);
      if (userResult.length === 0) {
        continue; // 유저가 존재하지 않으면 무시
      }

      const userId = userResult[0].id;
      await conn.query('INSERT INTO user_teams (user_id, team_id) VALUES (?, ?)', [userId, teamId]);
    }

    conn.release();
    res.json({ success: true, message: '팀이 생성되었습니다.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '팀 생성 중 오류가 발생했습니다.' });
  }
});

// 팀 목록을 가져오는 API
app.get('/admin/teams', async (req, res) => {
  try {
    const conn = await pool.getConnection();
    const teams = await conn.query('SELECT id, name, users FROM teams');
    conn.release();
    
    res.json({ success: true, teams: teams });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '팀 목록을 불러오지 못했습니다.' });
  }
});

// 연습일정 저장 API (팀별로 유저를 배열로 저장)
app.post('/api/practice-schedule', async (req, res) => {
  if (!req.session.user) return res.status(401).json({ error: '로그인이 필요합니다.' });

  const { teamName, users, day, time, weekStart } = req.body;

  try {
    const conn = await pool.getConnection();
    await conn.query(
      'INSERT INTO practice_schedules (team_name, users, day, time, week_start) VALUES (?, ?, ?, ?, ?)',
      [teamName, JSON.stringify(users), day, time, weekStart]
    );
    conn.release();
    res.json({ success: true, message: '연습 일정이 저장되었습니다.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '연습 일정 저장에 실패했습니다.' });
  }
});

// 연습 일정 데이터 가져오기
app.get('/api/practice-schedules', async (req, res) => {
  if (!req.session.user) return res.status(401).json({ error: '로그인이 필요합니다.' });

  const { week_start } = req.query; // 주 시작일을 받아옵니다.

  try {
    const conn = await pool.getConnection();
    const query = 
      'SELECT * FROM practice_schedules WHERE week_start = ?';
    const schedules = await conn.query(query, [week_start]);
    conn.release();
    
    res.json(schedules); // 연습 일정 데이터를 반환
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '서버 오류' });
  }
});

// ─── 연습 일정 삭제 엔드포인트 ─────────────────────────────────────────────
app.delete('/api/practice-schedule/:id', async (req, res) => {
  if (!req.session.user) return res.status(401).json({ error: '로그인이 필요합니다.' });
  
  const id = req.params.id;
  let conn;
  try {
    conn = await pool.getConnection();
    const result = await conn.query(
      'DELETE FROM practice_schedules WHERE id = ?',
      [id]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: '해당 연습 일정이 존재하지 않습니다.' });
    }
    res.json({ success: true, message: '연습 일정이 삭제되었습니다.', id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    if (conn) conn.release();
  }
});


const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`✅ 서버가 포트 ${PORT}에서 실행 중입니다`);
});