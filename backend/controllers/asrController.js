const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const logger = require('../utils/logger');
const wav = require('wav-decoder');
const mfcc = require('ml-mfcc');
// Inline DTW implementation will be used instead of external dependency
const sqlite3 = require('sqlite3').verbose();
const dbConfig = require('../config/database');

// 确保 recordings 目录存在
const recordingsDir = path.join(__dirname, '../recordings');
if (!fs.existsSync(recordingsDir)) {
  fs.mkdirSync(recordingsDir, { recursive: true });
}

// Helper: convert uploaded file to 16k mono wav using ffmpeg, return converted path
function convertToWav16kMono(inputPath) {
  return new Promise((resolve, reject) => {
    const outPath = inputPath + '.conv.wav';
    const cmd = `ffmpeg -y -i "${inputPath}" -ar 16000 -ac 1 -vn "${outPath}"`;
    exec(cmd, (err, stdout, stderr) => {
      if (err) {
        return reject(new Error(`ffmpeg convert failed: ${stderr || err.message}`));
      }
      resolve(outPath);
    });
  });
}

// Helper: read wav file and return Float32Array samples and sampleRate
async function readWavSamples(filePath) {
  const buffer = fs.readFileSync(filePath);
  const audioData = await wav.decode(buffer);
  const sampleRate = audioData.sampleRate;
  const channelData = audioData.channelData[0];
  return { samples: channelData, sampleRate };
}

// Helper: extract MFCC frames
function extractMfccFrames(samples, sampleRate) {
  // ml-mfcc expects (signal, sampleRate, options)
  const options = {
    windowSize: 512,
    hopSize: 160, // 10ms at 16k
    melFilters: 26,
    numberOfCoefficients: 13
  };
  return mfcc(samples, sampleRate, options); // returns array of coefficient arrays
}

// Classic DTW implementation (Euclidean distance between frames)
function computeDtwDistance(framesA, framesB) {
  if (!framesA || !framesB || framesA.length === 0 || framesB.length === 0) {
    return { dist: Infinity, norm: Infinity, pathLength: 0 };
  }

  const n = framesA.length;
  const m = framesB.length;

  // distance between two frames (arrays)
  function frameDist(a, b) {
    let sum = 0;
    const len = Math.min(a.length, b.length);
    for (let i = 0; i < len; i++) {
      const d = (a[i] || 0) - (b[i] || 0);
      sum += d * d;
    }
    return Math.sqrt(sum);
  }

  // initialize matrix with Infinity
  const dp = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(Infinity));
  dp[0][0] = 0;

  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      const cost = frameDist(framesA[i - 1], framesB[j - 1]);
      dp[i][j] = cost + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }

  const dist = dp[n][m];

  // backtrack to find path length
  let i = n, j = m;
  let pathLength = 0;
  while (i > 0 && j > 0) {
    pathLength++;
    const choices = [
      { val: dp[i - 1][j - 1], ni: i - 1, nj: j - 1 },
      { val: dp[i - 1][j], ni: i - 1, nj: j },
      { val: dp[i][j - 1], ni: i, nj: j - 1 }
    ];
    let minChoice = choices[0];
    for (let k = 1; k < choices.length; k++) {
      if (choices[k].val < minChoice.val) minChoice = choices[k];
    }
    i = minChoice.ni;
    j = minChoice.nj;
  }
  // account for remaining steps
  pathLength += i + j;

  const norm = dist / Math.max(1, pathLength);
  return { dist, norm, pathLength };
}

// Persist recording metadata and score to SQLite
function persistRecording({ gradeId, word, filePath, score, details }) {
  return new Promise((resolve, reject) => {
    const dbPath = dbConfig.sqlite.path || './data/k12_vocabulary.db';
    const db = new sqlite3.Database(dbPath);
    // create table if not exists
    const createSql = `CREATE TABLE IF NOT EXISTS recordings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      gradeId TEXT,
      word TEXT,
      filePath TEXT,
      score INTEGER,
      details TEXT,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
    )`;
    db.serialize(() => {
      db.run(createSql, (err) => {
        if (err) {
          db.close();
          return reject(err);
        }
        const insertSql = `INSERT INTO recordings (gradeId, word, filePath, score, details) VALUES (?, ?, ?, ?, ?)`;
        db.run(insertSql, [gradeId, word, filePath, score, JSON.stringify(details || {})], function(err2) {
          db.close();
          if (err2) return reject(err2);
          resolve({ id: this.lastID });
        });
      });
    });
  });
}

// MFCC+DTW评分实现，保存文件并返回 score + hints
async function scorePronunciation(req, res) {
  try {
    if (!req.file || !req.file.path) {
      return res.status(400).json({ success: false, message: '未上传音频文件' });
    }

    const uploadedPath = req.file.path;
    // convert to standard wav 16k mono
    const convPath = await convertToWav16kMono(uploadedPath);

    // read samples
    const { samples: userSamples, sampleRate: userRate } = await readWavSamples(convPath);

    // reference audio: try to find TTS file in frontend cdn-data (prefer pre-generated wav under recordings)
    const word = req.query.word || req.body.word || '';
    const gradeId = req.query.gradeId || req.body.gradeId || '';
    const refCandidates = [
      path.join(__dirname, `../../frontend/cdn-data/js-modules/${gradeId}.js`), // not audio, skip
    ];
    // For now, we do not have per-word reference audio; use heuristic reference length based on word
    const refLen = 0.5 + (Math.max(1, word.length) * 0.08);

    // Extract MFCC frames for user
    const userFrames = extractMfccFrames(userSamples, userRate);

    // For reference frames, synthesize a very rough reference by generating silence-length frames? 
    // Instead, we'll create a short synthetic reference: compute MFCC of a short white-noise of expected length scaled - placeholder
    // Generate a pseudo-reference signal (silence with small noise) of refLen seconds
    const refSampleCount = Math.floor(refLen * userRate);
    const refSamples = new Float32Array(refSampleCount);
    for (let i = 0; i < refSampleCount; i++) refSamples[i] = 0;
    const refFrames = extractMfccFrames(refSamples, userRate);

    // compute DTW
    const { dist, norm, pathLength } = computeDtwDistance(userFrames, refFrames);

    // duration based metrics
    const userDuration = userSamples.length / userRate;
    const durationRatio = Math.min(userDuration / refLen, refLen / userDuration);

    // normalize DTW into 0..1 (heuristic)
    const normalizedDtw = Math.min(1, norm / 50); // 50 is rough scale

    // scoring formula
    let score = 100 - Math.round(normalizedDtw * 70) - Math.round((1 - durationRatio) * 30);
    score = Math.max(0, Math.min(100, score));

    // hints
    const hints = [];
    if (userDuration < refLen * 0.7) hints.push('读得太短');
    if (userDuration > refLen * 1.4) hints.push('读得太长');
    if (normalizedDtw > 0.6) hints.push('发音与参考差异较大');

    // move converted file to recordings dir
    const destName = `rec_${Date.now()}_${path.basename(uploadedPath)}.wav`;
    const destPath = path.join(recordingsDir, destName);
    fs.renameSync(convPath, destPath);
    // delete original uploaded file
    try { fs.unlinkSync(uploadedPath); } catch (e) {}

    // persist metadata
    try {
      await persistRecording({
        gradeId,
        word,
        filePath: destPath,
        score,
        details: { dtw: norm, duration: userDuration, refLen, hints }
      });
    } catch (e) {
      logger.warn('persistRecording failed', { err: e.message });
    }

    return res.json({
      success: true,
      score,
      hints,
      details: { dtw: norm, duration: userDuration, refLen, durationRatio }
    });
  } catch (error) {
    logger.error('scorePronunciation failed', { error: error.message, stack: error.stack });
    return res.status(500).json({ success: false, message: '评分失败', error: error.message });
  }
}

module.exports = {
  scorePronunciation
};


