// index.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mariadb = require('mariadb');
const bcrypt = require('bcrypt');

const app = express();
app.use(cors());
app.use(express.json());

// MariaDB 연결 풀 생성 (데이터베이스 이름을 SLDB로 설정)
const pool = mariadb.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'myuser',
  password: process.env.DB_PASS || 'mypassword',
  database: process.env.DB_NAME || 'SLDB',
  port: process.env.DB_PORT || 3306,
  connectionLimit: 5
});

// 회원가입 엔드포인트
app.post('/register', async (req, res) => {
  const { name, password, phone, part } = req.body;
  if (!name || !password || !phone || !part) {
    return res.status(400).json({ error: '모든 필드를 입력하세요.' });
  }

  try {
    // 비밀번호 해싱
    const hashedPassword = await bcrypt.hash(password, 10);
    const conn = await pool.getConnection();
    await conn.query(
      'INSERT INTO users (name, password, phone, part) VALUES (?, ?, ?, ?)',
      [name, hashedPassword, phone, part]
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
    // 이름(PK)을 사용하므로 단일 사용자 조회
    const rows = await conn.query('SELECT * FROM users WHERE name = ?', [name]);
    conn.release();

    if (rows.length === 0) {
      return res.status(401).json({ error: '존재하지 않는 사용자입니다.' });
    }

    const user = rows[0];
    // 입력한 비밀번호와 해싱된 비밀번호 비교
    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(401).json({ error: '비밀번호가 일치하지 않습니다.' });
    }

    return res.json({ success: true, message: '로그인 성공' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: '로그인 중 오류가 발생했습니다.' });
  }
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
