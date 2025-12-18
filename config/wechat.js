/**
 * 微信支付配置
 */

module.exports = {
  appid: process.env.WECHAT_APPID,
  appId: process.env.WECHAT_APPID, // v2 API 兼容
  mchid: process.env.WECHAT_MCHID,
  mchId: process.env.WECHAT_MCHID, // v2 API 兼容
  apiKey: process.env.WECHAT_API_KEY,
  mchKey: process.env.WECHAT_API_KEY, // v2 API 使用 mchKey
  certPath: process.env.WECHAT_CERT_PATH || './certs/apiclient_cert.pem',
  keyPath: process.env.WECHAT_KEY_PATH || './certs/apiclient_key.pem',
  notifyUrl: process.env.WECHAT_NOTIFY_URL,
  ip: process.env.WECHAT_IP || '127.0.0.1',
  unifiedOrderUrl: 'https://api.mch.weixin.qq.com/pay/unifiedorder',
  isDevelopment: process.env.NODE_ENV === 'production'
};

