/**
 * 错误处理中间件
 */

const logger = require('../utils/logger');

function errorHandler(err, req, res, next) {
  logger.error('请求处理错误', {
    path: req.path,
    method: req.method,
    error: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    body: req.body
  });

  // 如果响应已经发送，直接返回
  if (res.headersSent) {
    logger.warn('响应已发送，无法发送错误响应', { path: req.path });
    return next(err);
  }

  // 默认错误响应
  const statusCode = err.statusCode || err.status || 500;
  const message = err.message || '服务器内部错误';

  try {
    res.status(statusCode).json({
      success: false,
      message: message,
      ...(process.env.NODE_ENV === 'development' && { 
        stack: err.stack,
        error: err.message 
      })
    });
  } catch (sendError) {
    // 如果发送响应时出错，记录错误但不抛出（避免无限循环）
    logger.error('发送错误响应失败', { 
      error: sendError.message,
      originalError: err.message 
    });
  }
}

module.exports = {
  errorHandler
};

