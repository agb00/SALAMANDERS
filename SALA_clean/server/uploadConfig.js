// server/uploadConfig.js
const multer = require('multer');
const path = require('path');

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/timetables'); // 파일 저장 폴더
  },
  filename: function (req, file, cb) {
    // 로그인된 사용자의 이름을 사용 (req.session.user가 있어야 함)
    const username = req.session.user ? req.session.user.name : 'unknown';
    const ext = path.extname(file.originalname); // 파일 확장자
    cb(null, username + ext); // 예: 홍길동.csv
  },
});

const upload = multer({ storage: storage });

module.exports = upload;