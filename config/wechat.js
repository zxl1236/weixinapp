/**
 * 微信支付配置
 */

module.exports = {
  appid: process.env.WECHAT_APPID,
  mchid: process.env.WECHAT_MCHID,
  apiKey: process.env.WECHAT_API_KEY,
  certPath: process.env.WECHAT_CERT_PATH || './certs/apiclient_cert.pem',
  keyPath: process.env.WECHAT_KEY_PATH || './certs/apiclient_key.pem',
  notifyUrl: process.env.WECHAT_NOTIFY_URL,
  isDevelopment: process.env.NODE_ENV === 'development'
};

