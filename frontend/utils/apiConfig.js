/**
 * API 配置工具
 * 统一管理后端 API 地址
 */

// 开发环境配置
// ⚠️ 使用 localhost，后端已配置监听 0.0.0.0，可通过 localhost 访问
const DEV_API_BASE = 'http://localhost:3000';

// ⚠️ 生产环境配置（请填写您的实际后端域名）
const PROD_API_BASE = 'https://tongge.online'; // 生产环境API地址

/**
 * 获取 API 基础地址
 * @returns {string} API 基础地址
 */
function getApiBaseUrl() {
  // 可以通过编译时环境变量或运行时判断
  // 这里使用简单的判断方式，可以根据实际情况调整
  
  // 方案1: 通过编译时环境变量（需要在构建工具中配置）
  // const isDev = process.env.NODE_ENV === 'development';
  
  // 方案2: 通过域名判断（小程序中可以使用）
  // const accountInfo = wx.getAccountInfoSync();
  // const isDev = accountInfo.miniProgram.envVersion === 'develop';
  
  // 方案3: 使用固定配置（推荐，便于切换）
  // 开发时使用 DEV_API_BASE，生产时改为 PROD_API_BASE
  // ⚠️ 注意：小程序开发工具中，localhost 可能无法访问，需要使用局域网IP
  // 例如：const DEV_API_BASE = 'http://192.168.1.100:3000';
  const USE_DEV = false; // ⚠️ 已切换到生产模式，使用真实API地址
  
  return USE_DEV ? DEV_API_BASE : PROD_API_BASE;
}

/**
 * 获取完整的 API 路径
 * @param {string} path - API 路径（如 '/api/users/register'）
 * @returns {string} 完整的 API URL
 */
function getApiUrl(path) {
  const baseUrl = getApiBaseUrl();
  // 确保 path 以 / 开头
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${baseUrl}${normalizedPath}`;
}

module.exports = {
  getApiBaseUrl,
  getApiUrl
};

