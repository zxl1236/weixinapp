// 音频工具函数

/**
 * 构建TTS URL
 * @param {string} text - 文本
 * @param {number} type - 类型，默认为1
 * @returns {string} - TTS URL
 */
function buildTTSUrl(text, type = 1) {
  const q = encodeURIComponent(String(text || '').trim());
  return `https://dict.youdao.com/dictvoice?audio=${q}&type=${type}`;
}

module.exports = {
  buildTTSUrl
};

