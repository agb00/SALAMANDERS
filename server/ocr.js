// server/ocr.js
const Tesseract = require('tesseract.js');

async function extractText(imagePath) {
  try {
    const result = await Tesseract.recognize(imagePath, 'kor+eng', {
      logger: m => console.log(m)  // OCR 진행 상황 로깅
    });
    return result.data.text;
  } catch (error) {
    console.error('OCR 처리 중 오류 발생:', error);
    throw error;
  }
}

module.exports = extractText;
