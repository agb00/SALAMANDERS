require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mariadb = require('mariadb');
const bcrypt = require('bcrypt');
const session = require('express-session');
const cookieParser = require('cookie-parser');

const app = express();

// 쿠키 파서 및 세션 설정 (rolling: true 옵션 추가)
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
  connectionLimit: 5
});

// 회원가입 엔드포인트
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

// 로그인 엔드포인트
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

    // 로그인 성공 시, 세션에 사용자 정보 저장 (ST도 포함)
    req.session.user = {
      name: user.name,
      isAdmin: user.name.toLowerCase() === 'sala',
      ST: user.ST,
    };

    // 사용자 정보를 함께 반환합니다.
    return res.json({ success: true, message: '로그인 성공', user: req.session.user });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: '로그인 중 오류가 발생했습니다.' });
  }
});



// 세션 상태 확인 엔드포인트
app.get('/session', (req, res) => {
  if (req.session.user) {
    res.json({ loggedIn: true, user: req.session.user });
  } else {
    res.json({ loggedIn: false });
  }
});

// 관리자 전용 사용자 등록 엔드포인트
app.post('/admin/add-user', async (req, res) => {
  const { name, password, phone, part, ST } = req.body;
  
  // 모든 필드가 입력되었는지 확인
  if (!name || !password || !phone || !part || !ST) {
    return res.status(400).json({ error: '모든 필드를 입력하세요.' });
  }

  try {
    // 비밀번호 해싱
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

// 관리자 전용 사용자 목록 조회 엔드포인트
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

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`✅ 서버가 포트 ${PORT}에서 실행 중입니다`);
});

// 관리자 전용 사용자 삭제 엔드포인트
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

// 관리자 전용 사용자 수정 엔드포인트
app.put('/admin/users/:name', async (req, res) => {
  const { name } = req.params;
  const { password, phone, part, ST } = req.body;
  
  try {
    const conn = await pool.getConnection();

    if (password && password.trim() !== '') {
      // 새 비밀번호가 입력된 경우
      const hashedPassword = await bcrypt.hash(password, 10);
      await conn.query(
        'UPDATE users SET password = ?, phone = ?, part = ?, ST = ? WHERE name = ?',
        [hashedPassword, phone, part, ST, name]
      );
    } else {
      // 비밀번호를 변경하지 않을 경우 다른 필드만 업데이트
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

// 로그아웃 엔드포인트
app.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: '로그아웃 중 오류 발생' });
    }
    res.clearCookie('connect.sid'); // 쿠키 이름은 설정에 따라 달라질 수 있습니다.
    return res.json({ success: true });
  });
});