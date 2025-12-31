/**
 * 百度TTS服务
 * 封装百度语音合成API调用，管理Token缓存
 */

const logger = require('../utils/logger');
const axios = require('axios');

// ==================== 配置 ====================
const BAIDU_TTS_CONFIG = {
  APP_ID: process.env.BAIDU_TTS_APP_ID || '',
  API_KEY: process.env.BAIDU_TTS_API_KEY || '',
  SECRET_KEY: process.env.BAIDU_TTS_SECRET_KEY || '',
  // 短文本合成API（文本长度 <= 1024字节）
  SHORT_TEXT_API: 'https://tsn.baidu.com/text2audio',
  // Token API
  TOKEN_API: 'https://aip.baidubce.com/oauth/2.0/token'
};

// ==================== Token管理 ====================
let cachedToken = null;
let tokenExpireTime = 0;
const TOKEN_CACHE_DURATION = 2592000; // 30天（百度token有效期）

/**
 * 验证配置是否完整
 */
function validateConfig() {
  if (!BAIDU_TTS_CONFIG.APP_ID || !BAIDU_TTS_CONFIG.API_KEY || !BAIDU_TTS_CONFIG.SECRET_KEY) {
    throw new Error('百度TTS配置不完整，请检查环境变量：BAIDU_TTS_APP_ID, BAIDU_TTS_API_KEY, BAIDU_TTS_SECRET_KEY');
  }
}

/**
 * 获取百度Access Token
 * @returns {Promise<string>} Access Token
 */
async function getAccessToken() {
  validateConfig();

  // 检查缓存的token是否有效
  const now = Date.now();
  if (cachedToken && now < tokenExpireTime) {
    return cachedToken;
  }

  try {
    const url = `${BAIDU_TTS_CONFIG.TOKEN_API}?grant_type=client_credentials&client_id=${BAIDU_TTS_CONFIG.API_KEY}&client_secret=${BAIDU_TTS_CONFIG.SECRET_KEY}`;
    
    const response = await axios.get(url, {
      timeout: 10000
    });

    // 缓存token
    if (response.data && response.data.access_token) {
      cachedToken = response.data.access_token;
      tokenExpireTime = now + (response.data.expires_in * 1000) - 60000; // 提前1分钟过期，确保安全
    } else {
      throw new Error(`获取Token失败: ${response.data?.error_description || '未知错误'}`);
    }
    
    logger.info('百度TTS Token获取成功');
    return cachedToken;
  } catch (error) {
    logger.error('获取百度TTS Token失败', { error: error.message });
    throw error;
  }
}

/**
 * 判断文本长度（字节数）
 * @param {string} text - 文本
 * @returns {number} 字节数
 */
function getTextByteLength(text) {
  if (!text) return 0;
  // 中文字符占3字节，英文和数字占1字节
  let length = 0;
  for (let i = 0; i < text.length; i++) {
    const char = text.charCodeAt(i);
    if (char >= 0x0000 && char <= 0x007F) {
      length += 1; // ASCII字符
    } else if (char >= 0x0080 && char <= 0x07FF) {
      length += 2; // 拉丁文等
    } else {
      length += 3; // 中文等
    }
  }
  return length;
}

/**
 * 构建百度TTS URL
 * @param {string} text - 要合成的文本
 * @param {Object} options - 选项
 * @param {string} options.lang - 语言，默认'en'（英语）
 * @param {string} options.spd - 语速，默认'5'（0-15）
 * @param {string} options.pit - 音调，默认'5'（0-15）
 * @param {string} options.vol - 音量，默认'5'（0-15）
 * @param {string} options.per - 发音人，默认'0'（0-4，0为女声，1为男声，3为情感合成-度逍遥，4为情感合成-度丫丫）
 * @returns {Promise<string>} 音频URL
 */
async function buildTTSUrl(text, options = {}) {
  if (!text || !text.trim()) {
    throw new Error('文本不能为空');
  }

  try {
    // 获取token
    const token = await getAccessToken();
    
    // 默认参数
    const params = {
      tex: encodeURIComponent(text.trim()),
      tok: token,
      cuid: BAIDU_TTS_CONFIG.APP_ID,
      ctp: '1',
      lan: options.lang || 'en', // 英语单词使用英文
      spd: options.spd || '5',
      pit: options.pit || '5',
      vol: options.vol || '5',
      per: options.per || '0' // 默认女声
    };

    // 构建URL
    const queryString = Object.keys(params)
      .map(key => `${key}=${params[key]}`)
      .join('&');
    
    const url = `${BAIDU_TTS_CONFIG.SHORT_TEXT_API}?${queryString}`;
    return url;
  } catch (error) {
    logger.error('构建百度TTS URL失败', { error: error.message, text });
    throw error;
  }
}

/**
 * 清除Token缓存（用于重新获取）
 */
function clearTokenCache() {
  cachedToken = null;
  tokenExpireTime = 0;
  logger.info('百度TTS Token缓存已清除');
}

// ==================== 导出 ====================
module.exports = {
  getAccessToken,
  buildTTSUrl,
  clearTokenCache,
  getTextByteLength,
  validateConfig
};

