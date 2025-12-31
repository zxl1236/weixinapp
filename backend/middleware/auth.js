/**
 * 认证中间件
 */

const logger = require('../utils/logger');

/**
 * 管理后台API认证
 */
function adminAuth(req, res, next) {
  const apiKey = req.headers['x-api-key'] || req.query.apiKey;
  const expectedKey = process.env.ADMIN_API_KEY;

  if (!expectedKey) {
    logger.warn('管理后台API密钥未配置');
    return res.status(500).json({
      success: false,
      message: '服务器配置错误'
    });
  }

  if (!apiKey || apiKey !== expectedKey) {
    logger.warn('管理后台认证失败', {
      ip: req.ip,
      path: req.path
    });
    return res.status(401).json({
      success: false,
      message: '认证失败，请提供有效的API密钥'
    });
  }

  next();
}

/**
 * 用户openid验证（简单验证）
 */
function validateOpenid(req, res, next) {
  const openid = req.body.openid || req.params.openid || req.query.openid;

  if (!openid || typeof openid !== 'string' || openid.trim() === '') {
    return res.status(400).json({
      success: false,
      message: 'openid参数无效'
    });
  }

  req.openid = openid.trim();
  next();
}

module.exports = {
  adminAuth,
  validateOpenid
};

