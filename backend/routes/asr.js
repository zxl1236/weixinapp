const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { scorePronunciation } = require('../controllers/asrController');

// 临时存储目录
const uploadDir = path.join(__dirname, '../tmp');
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const ts = Date.now();
    const ext = path.extname(file.originalname) || '.wav';
    cb(null, `rec_${ts}${ext}`);
  }
});

const upload = multer({ storage: storage, limits: { fileSize: 5 * 1024 * 1024 } });

// POST /api/asr/score
router.post('/score', upload.single('audio'), scorePronunciation);

module.exports = router;


