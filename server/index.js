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
  origin: 'http://3.37.96.38:3000',
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

/* ────────────────────────────── 미들웨어 정의 ────────────────────────────── */
// 사용자 인증 미들웨어 (세션 검증)
const authenticate = (req, res, next) => {
  if (req.session && req.session.user) {
    next();
  } else {
    return res.status(401).json({ error: '로그인이 필요합니다.' });
  }
};

// 관리자 권한 검증 미들웨어
const authorizeAdmin = (req, res, next) => {
  if (req.session && req.session.user && req.session.user.isAdmin) {
    next();
  } else {
    return res.status(403).json({ error: '관리자 권한이 필요합니다.' });
  }
};

/* ────────────────────────────── API 엔드포인트 ────────────────────────────── */

// ─── 회원가입 ─────────────────────────────────────────────
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

// ─── 로그인 ─────────────────────────────────────────────
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

// ─── 세션 상태 확인 (인증 필요) ─────────────────────────────────────────────
app.get('/session', authenticate, (req, res) => {
  res.json({ loggedIn: true, user: req.session.user });
});

// ─── 로그아웃 ─────────────────────────────────────────────
app.post('/logout', authenticate, (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: '로그아웃 중 오류 발생' });
    }
    res.clearCookie('connect.sid');
    return res.json({ success: true });
  });
});

// ─── 관리자 전용 사용자 관련 엔드포인트 ─────────────────────────────────────────────
// 관리자 엔드포인트에는 authenticate + authorizeAdmin 미들웨어를 사용
app.post('/admin/add-user', authenticate, authorizeAdmin, async (req, res) => {
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

app.get('/admin/users', authenticate, authorizeAdmin, async (req, res) => {
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

app.delete('/admin/users/:name', authenticate, authorizeAdmin, async (req, res) => {
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

app.put('/admin/users/:name', authenticate, authorizeAdmin, async (req, res) => {
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

// ─── 시간표 업로드 및 조회 관련 엔드포인트 ─────────────────────────────────────────────
// 업로드와 관련된 엔드포인트는 인증이 필요합니다.
app.post('/upload-timetable', authenticate, upload.single('timetable'), async (req, res) => {
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

app.get('/get-timetable', authenticate, (req, res) => {
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

app.get('/user/timetable-data', authenticate, async (req, res) => {
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
app.get('/admin/users/:userId/schedule', authenticate, authorizeAdmin, async (req, res) => {
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
app.get('/api/base-timetable', authenticate, async (req, res) => {
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

app.post('/api/base-timetable', authenticate, authorizeAdmin, async (req, res) => {
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
app.get('/api/schedule', authenticate, async (req, res) => {
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

app.post('/api/schedule', authenticate, async (req, res) => {
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

app.delete('/api/schedule/:id', authenticate, async (req, res) => {
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
app.get('/api/available-users', authenticate, async (req, res) => {
  const { day, time, week_start } = req.query;
  if (!day || !time) {
    return res.status(400).json({ error: 'day와 time 파라미터가 필요합니다.' });
  }
  
  let conn;
  try {
    conn = await pool.getConnection();
    // 모든 사용자 이름 조회
    const users = await conn.query('SELECT name FROM users');
    // 해당 시간대 일정이 있는 사용자 조회
    let query = 'SELECT username FROM schedule_items WHERE day = ? AND time = ?';
    let params = [day, time];
    if (week_start) {
      query += ' AND week_start = ?';
      params.push(week_start);
    }
    const busyUsers = await conn.query(query, params);
    const busyUsernames = busyUsers.map(u => u.username);
    // 사용 가능한 사용자 필터링
    const availableUsers = users.filter(user => !busyUsernames.includes(user.name));
    res.json(availableUsers);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  } finally {
    if (conn) conn.release();
  }
});

// ─── 관리자 전용 팀 생성 및 조회 API ─────────────────────────────────────────────
app.post('/admin/create-team', authenticate, authorizeAdmin, async (req, res) => {
  const { teamName, users } = req.body;

  if (!teamName || !users || users.length === 0) {
    return res.status(400).json({ error: '팀 이름과 유저 목록을 입력하세요.' });
  }

  try {
    const conn = await pool.getConnection();

    // 팀 생성
    const result = await conn.query('INSERT INTO teams (name, users) VALUES (?, ?)', [
      teamName,
      JSON.stringify(users)
    ]);

    const teamId = result.insertId; // 생성된 팀의 ID

    // 유저-팀 관계 저장
    for (const userName of users) {
      const userResult = await conn.query('SELECT id FROM users WHERE name = ?', [userName]);
      if (userResult.length === 0) {
        continue;
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

// 관리자 전용 팀 삭제 API 엔드포인트
app.delete('/admin/delete-team/:id', authenticate, authorizeAdmin, async (req, res) => {
  const teamId = req.params.id;
  let conn;
  try {
    conn = await pool.getConnection();

    // 팀에 연결된 사용자 관계가 저장된 테이블이 있다면 먼저 삭제합니다.
    // 만약 user_teams 테이블이 없다면 아래 쿼리는 생략해도 됩니다.
    await conn.query('DELETE FROM user_teams WHERE team_id = ?', [teamId]);

    // teams 테이블에서 팀 삭제
    const result = await conn.query('DELETE FROM teams WHERE id = ?', [teamId]);
    conn.release();
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: '해당 팀을 찾을 수 없습니다.' });
    }
    res.json({ success: true, message: '팀이 삭제되었습니다.' });
  } catch (err) {
    console.error(err);
    if (conn) conn.release();
    res.status(500).json({ error: '팀 삭제 중 오류가 발생했습니다.' });
  }
});

app.get('/admin/teams', authenticate, authorizeAdmin, async (req, res) => {
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

// ─── [추가] 관리자 전용: 해당 주차에 비어있는 유저 목록 조회 ─────────────────────
app.get('/api/admin/empty-week-users', authenticate, authorizeAdmin, async (req, res) => {
  const { week_start } = req.query;
  if (!week_start) {
    return res.status(400).json({ error: 'week_start(YYYY-MM-DD) 쿼리 파라미터가 필요합니다.' });
  }

  let conn;
  try {
    conn = await pool.getConnection();
    // base_timetables에 존재하고, 해당 주차에 schedule_items가 하나도 없는 유저만
    const rows = await conn.query(
      `
      SELECT DISTINCT bt.username
      FROM base_timetables bt
      WHERE NOT EXISTS (
        SELECT 1
        FROM schedule_items si
        WHERE si.username = bt.username
          AND si.week_start = ?
      )
      ORDER BY bt.username ASC
      `,
      [week_start]
    );

    return res.json({ users: rows });
  } catch (err) {
    console.error('[empty-week-users] error:', err);
    return res.status(500).json({ error: '조회 실패' });
  } finally {
    if (conn) conn.release();
  }
});

// ─── [추가] 관리자 전용: 비어있는 유저 시간표를 기본 시간표로 채우기 ────────────────
app.post('/api/admin/fill-week-from-base', authenticate, authorizeAdmin, async (req, res) => {
  const { week_start } = req.body;
  if (!week_start) {
    return res.status(400).json({ error: 'week_start(YYYY-MM-DD) body 파라미터가 필요합니다.' });
  }

  let conn;
  try {
    conn = await pool.getConnection();
    await conn.beginTransaction();

    // base_timetables의 셀을 해당 주차로 복사 (이미 그 주에 어떤 셀이라도 있으면 대상 제외)
    const result = await conn.query(
      `
      INSERT INTO schedule_items (username, week_start, day, time, subject, color)
      SELECT bt.username, ?, bt.day, bt.time, bt.subject, bt.color
      FROM base_timetables bt
      WHERE bt.subject IS NOT NULL AND bt.subject <> ''
        AND NOT EXISTS (
          SELECT 1
          FROM schedule_items si
          WHERE si.username = bt.username
            AND si.week_start = ?
        )
      `,
      [week_start, week_start]
    );

    await conn.commit();
    return res.json({ insertedRows: result.affectedRows || 0 });
  } catch (err) {
    if (conn) await conn.rollback();
    console.error('[fill-week-from-base] error:', err);
    return res.status(500).json({ error: '동기화 실패' });
  } finally {
    if (conn) conn.release();
  }
});


// ─── 연습 일정 저장 및 조회, 삭제 API ─────────────────────────────────────────────
app.post('/api/practice-schedule', authenticate, async (req, res) => {
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

app.get('/api/practice-schedules', authenticate, async (req, res) => {
  const { week_start } = req.query;
  try {
    const conn = await pool.getConnection();
    const query = 'SELECT * FROM practice_schedules WHERE week_start = ?';
    const schedules = await conn.query(query, [week_start]);
    conn.release();
    res.json(schedules);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '서버 오류' });
  }
});

app.delete('/api/practice-schedule/:id', authenticate, async (req, res) => {
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
app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ 서버가 포트 ${PORT}에서 실행 중입니다`);
});