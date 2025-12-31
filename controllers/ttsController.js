/**
 * TTS控制器
 * 处理文本转语音请求
 */

const baiduTTS = require('../services/baiduTTS');
const logger = require('../utils/logger');

/**
 * 生成TTS音频URL
 * GET /api/tts?text=单词&lang=en&spd=5&pit=5&vol=5&per=0
 */
async function generateTTS(req, res, next) {
  try {
    const { text, lang, spd, pit, vol, per } = req.query;

    // 参数验证
    if (!text || typeof text !== 'string' || text.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'text参数必填且不能为空'
      });
    }

    // 文本长度验证（百度TTS限制1024字节）
    const textLength = baiduTTS.getTextByteLength(text);
    if (textLength > 1024) {
      return res.status(400).json({
        success: false,
        message: `文本长度超过限制（${textLength}字节，最大1024字节）`
      });
    }

    // 构建TTS URL
    const options = {
      lang: lang || 'en',
      spd: spd || '5',
      pit: pit || '5',
      vol: vol || '5',
      per: per || '0'
    };

    const url = await baiduTTS.buildTTSUrl(text, options);

    logger.info('TTS生成成功', { text: text.substring(0, 20), url: url.substring(0, 50) + '...' });

    res.json({
      success: true,
      url: url
    });
  } catch (error) {
    logger.error('TTS生成失败', { error: error.message, query: req.query });
    
    // 如果是配置错误，返回500
    if (error.message.includes('配置不完整')) {
      return res.status(500).json({
        success: false,
        message: 'TTS服务配置错误，请联系管理员'
      });
    }

    // 其他错误返回400
    res.status(400).json({
      success: false,
      message: error.message || 'TTS生成失败'
    });
  }
}

module.exports = {
  generateTTS
};

