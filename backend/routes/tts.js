/**
 * TTS路由
 * 文本转语音API
 */

const express = require('express');
const router = express.Router();
const ttsController = require('../controllers/ttsController');

/**
 * GET /api/tts
 * 生成TTS音频URL
 * 参数：
 *   - text (必填): 要合成的文本
 *   - lang (可选): 语言，默认'en'
 *   - spd (可选): 语速，默认'5'
 *   - pit (可选): 音调，默认'5'
 *   - vol (可选): 音量，默认'5'
 *   - per (可选): 发音人，默认'0'
 */
router.get('/', ttsController.generateTTS);

module.exports = router;

