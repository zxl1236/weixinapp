/**
 * 登录守卫工具
 * 用于在页面加载时检查用户是否已登录，未登录则跳转到登录页
 */

const { userManager } = require('./userManager');

/**
 * 检查用户是否已登录 - 暂时跳过登录检查
 * @returns {boolean} 是否已登录
 */
function isLoggedIn() {
  // 临时跳过登录检查，假定用户已登录
  return true;
}

/**
 * 登录守卫 - 暂时跳过登录检查
 * @param {boolean} allowRedirect 是否允许跳转（默认true）
 * @returns {boolean} 是否已登录
 */
function requireLogin(allowRedirect = true) {
  // 临时跳过登录检查，假定用户已登录
  return true;
}

module.exports = {
  isLoggedIn,
  requireLogin
};

