const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const logger = require('../utils/logger');

// 简单启发式评分函数：基于时长匹配度（占位实现）
async function scorePronunciation(req, res) {
  try {
    if (!req.file || !req.file.path) {
      return res.status(400).json({ success: false, message: '未上传音频文件' });
    }

    const filePath = req.file.path;

    // 使用 ffprobe 获取音频时长（秒）
    const cmd = `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${filePath}"`;
    exec(cmd, (err, stdout, stderr) => {
      try {
        if (err) {
          logger.error('ffprobe error', { err: err.message, stderr });
          // 清理临时文件
          try { fs.unlinkSync(filePath); } catch (e) {}
          return res.status(500).json({ success: false, message: '音频处理失败' });
        }

        const duration = parseFloat(stdout) || 0;
        // 参考时长：基于单词长度估算（简单规则：0.5s 基础 + 0.08s * letters）
        const word = req.query.word || req.body.word || '';
        const refLen = 0.5 + (Math.max(1, word.length) * 0.08);

        const durationRatio = Math.min(duration / refLen, refLen / duration);
        // score 基于时长匹配度，范围0-100
        let score = Math.round(Math.max(0, Math.min(100, durationRatio * 100)));

        // 小幅降分：若时长太短或太长
        if (duration < 0.25 || duration > 3.0) {
          score = Math.round(score * 0.6);
        }

        // 返回结果
        res.json({
          success: true,
          score,
          details: {
            duration,
            refLen,
            durationRatio: Number(durationRatio.toFixed(3))
          }
        });
      } finally {
        // 清理临时文件
        try { fs.unlinkSync(filePath); } catch (e) {}
      }
    });
  } catch (error) {
    logger.error('scorePronunciation failed', { error: error.message, stack: error.stack });
    res.status(500).json({ success: false, message: '评分失败' });
  }
}

module.exports = {
  scorePronunciation
};


