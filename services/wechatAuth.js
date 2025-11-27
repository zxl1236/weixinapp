/**
 * 微信认证服务
 * 处理微信小程序登录相关接口
 */

const axios = require('axios');
const logger = require('../utils/logger');
const wechatConfig = require('../config/wechat');

/**
 * 通过 code 获取 openid 和 session_key
 * @param {string} code - 微信登录凭证
 * @returns {Promise<{openid: string, session_key: string}>}
 */
async function code2Session(code) {
  // 检查是否应该使用开发模式
  const appid = process.env.WECHAT_APPID;
  const secret = process.env.WECHAT_SECRET;
  const shouldUseDevelopment = wechatConfig.isDevelopment || !appid || !secret;

  // 开发模式：返回模拟数据
  if (shouldUseDevelopment) {
    logger.warn('当前为开发模式，微信登录功能将被模拟', {
      reason: !appid || !secret ? '微信配置不完整' : 'NODE_ENV=development'
    });
    
    if (!code) {
      throw new Error('code 参数不能为空');
    }

    // 基于 code 生成稳定的模拟 openid（相同 code 生成相同 openid）
    const crypto = require('crypto');
    const hash = crypto.createHash('md5').update(code).digest('hex');
    const mockOpenid = `mock_openid_${hash.substring(0, 16)}`;
    const mockSessionKey = `mock_session_key_${hash.substring(16, 32)}`;

    logger.info('开发模式：返回模拟登录数据', { 
      openid: mockOpenid.substring(0, 10) + '...',
      code: code.substring(0, 10) + '...'
    });

    return {
      openid: mockOpenid,
      session_key: mockSessionKey
    };
  }

  // 生产模式：调用真实微信接口
  if (!appid || !secret) {
    throw new Error('微信配置不完整：缺少 WECHAT_APPID 或 WECHAT_SECRET');
  }

  if (!code) {
    throw new Error('code 参数不能为空');
  }

  try {
    const url = 'https://api.weixin.qq.com/sns/jscode2session';
    const params = {
      appid,
      secret,
      js_code: code,
      grant_type: 'authorization_code'
    };

    logger.info('调用微信 code2Session 接口', { appid, code: code.substring(0, 10) + '...' });

    const response = await axios.get(url, { params, timeout: 10000 });

    if (response.data.errcode) {
      const errorMsg = `微信接口错误: ${response.data.errcode} - ${response.data.errmsg}`;
      logger.error('微信 code2Session 失败', {
        errcode: response.data.errcode,
        errmsg: response.data.errmsg
      });
      throw new Error(errorMsg);
    }

    if (!response.data.openid) {
      throw new Error('微信接口返回数据异常：缺少 openid');
    }

    logger.info('微信 code2Session 成功', { openid: response.data.openid.substring(0, 10) + '...' });

    return {
      openid: response.data.openid,
      session_key: response.data.session_key
    };
  } catch (error) {
    if (error.response) {
      logger.error('微信 code2Session 网络错误', {
        status: error.response.status,
        data: error.response.data
      });
      throw new Error(`微信接口请求失败: ${error.response.status}`);
    } else if (error.request) {
      logger.error('微信 code2Session 请求超时', { timeout: error.message });
      throw new Error('微信接口请求超时，请稍后重试');
    } else {
      logger.error('微信 code2Session 错误', { error: error.message });
      throw error;
    }
  }
}

module.exports = {
  code2Session
};

