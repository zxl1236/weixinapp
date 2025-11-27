/**
 * 用户管理路由
 */

const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { validateOpenid } = require('../middleware/auth');

/**
 * 验证注册请求参数（支持 openid 或 code）
 */
function validateRegister(req, res, next) {
  const { openid, code } = req.body;

  // 至少需要 openid 或 code 之一
  if (!openid && !code) {
    return res.status(400).json({
      success: false,
      message: 'openid 或 code 参数必填其一'
    });
  }

  // 如果传入了 code，验证 code 格式（简单验证：非空字符串）
  if (code && (typeof code !== 'string' || code.trim() === '')) {
    return res.status(400).json({
      success: false,
      message: 'code 参数格式无效'
    });
  }

  // 如果传入了 openid，验证格式
  if (openid && (typeof openid !== 'string' || openid.trim() === '')) {
    return res.status(400).json({
      success: false,
      message: 'openid 参数格式无效'
    });
  }

  next();
}

// 用户注册/登录（支持 code 或 openid）
router.post('/register', validateRegister, userController.register);

// 获取用户信息
router.get('/:openid', userController.getUser);

// 更新用户信息
router.put('/:openid', validateOpenid, userController.updateUser);

// 获取用户统计
router.get('/:openid/stats', userController.getUserStats);

// 验证激活码
router.post('/activation/verify', userController.verifyActivationCode);

module.exports = router;

