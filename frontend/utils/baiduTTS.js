// utils/baiduTTS.js
// 百度语音合成API集成（通过后端API）

const { getApiUrl } = require('./apiConfig');

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
 * 通过后端API构建百度TTS URL
 * @param {string} text - 要合成的文本
 * @param {Object} options - 选项
 * @param {string} options.lang - 语言，默认'en'（英语）
 * @param {string} options.spd - 语速，默认'5'（0-15）
 * @param {string} options.pit - 音调，默认'5'（0-15）
 * @param {string} options.vol - 音量，默认'5'（0-15）
 * @param {string} options.per - 发音人，默认'0'（0-4，0为女声，1为男声，3为情感合成-度逍遥，4为情感合成-度丫丫）
 * @returns {Promise<string|null>} 音频URL
 */
async function buildBaiduTTSUrl(text, options = {}) {
  if (!text || !text.trim()) {
    console.warn('[BaiduTTS] 文本为空');
    return null;
  }

  try {
    // 构建请求参数
    // 注意：lang 参数已废弃，百度TTS固定使用 'zh'（中英文混合模式）
    const params = {
      text: text.trim(),
      spd: options.spd || '5',
      pit: options.pit || '5',
      vol: options.vol || '5',
      per: options.per || '106' // 度博文（精品音库），适合英语单词发音
    };

    // 构建查询字符串
    const queryString = Object.keys(params)
      .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
      .join('&');

    const apiUrl = getApiUrl(`/api/tts?${queryString}`);
    
    // 调试：打印请求URL
    console.log('[BaiduTTS] 请求URL:', apiUrl);

    // 调用后端API
    return new Promise((resolve) => {
      wx.request({
        url: apiUrl,
        method: 'GET',
        timeout: 10000,
        success: (res) => {
          // 兼容多种返回格式：{success:true,url} / {url} / {data:{url}}
          const url =
            res?.data?.url ||
            res?.data?.data?.url ||
            (res?.data?.success ? res?.data?.url : null);

          if (res.statusCode === 200 && url) {
            console.log('[BaiduTTS] 通过后端API获取TTS URL成功:', url.slice(0, 60) + '...');
            resolve(url);
          } else {
            console.warn('[BaiduTTS] 后端API返回异常:', {
              statusCode: res.statusCode,
              data: res.data
            });
            resolve(null);
          }
        },
        fail: (err) => {
          console.error('[BaiduTTS] 网络请求失败:', err.errMsg || '未知错误');
          resolve(null);
        }
      });
    });
  } catch (error) {
    console.error('[BaiduTTS] 构建URL失败:', error);
    return null;
  }
}

/**
 * 生成百度TTS音频URL（同步版本，用于快速回退）
 * 注意：由于现在需要通过后端API，此方法改为异步调用
 * 为了保持兼容性，返回null，调用者应使用异步版本 buildBaiduTTSUrl
 * @param {string} text - 文本
 * @param {string} token - Access Token（已废弃，保留参数以兼容旧代码）
 * @returns {string|null} 音频URL（始终返回null，提示使用异步版本）
 */
function buildBaiduTTSUrlSync(text, token) {
  // 由于现在需要通过后端API，同步版本不再可用
  // 返回null，调用者应使用异步版本
  console.warn('[BaiduTTS] buildBaiduTTSUrlSync 已废弃，请使用 buildBaiduTTSUrl');
  return null;
}

/**
 * 预加载Token（已废弃，保留以兼容旧代码）
 * 现在不再需要预加载token，因为token由后端管理
 * @returns {Promise<string|null>} 始终返回null
 */
async function preloadToken() {
  // Token现在由后端管理，前端不需要预加载
  console.log('[BaiduTTS] preloadToken 已废弃，token由后端管理');
  return null;
}

/**
 * 清除Token缓存（已废弃，保留以兼容旧代码）
 */
function clearTokenCache() {
  // Token现在由后端管理，前端不需要清除缓存
  console.log('[BaiduTTS] clearTokenCache 已废弃，token由后端管理');
}

// ==================== 导出 ====================
module.exports = {
  buildBaiduTTSUrl,
  buildBaiduTTSUrlSync,
  preloadToken,
  clearTokenCache,
  getTextByteLength
};
