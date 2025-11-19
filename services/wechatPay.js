/**
 * 微信支付服务
 */

const Wechatpay = require('wechatpay-node-v3');
const fs = require('fs');
const path = require('path');
const wechatConfig = require('../config/wechat');
const logger = require('../utils/logger');

let wechatpay = null;

// 初始化微信支付实例
function initWechatPay() {
  if (wechatConfig.isDevelopment) {
    logger.warn('当前为开发模式，微信支付功能将被模拟');
    return null;
  }

  // 检查必需的配置项
  if (!wechatConfig.appid || !wechatConfig.mchid || !wechatConfig.apiKey) {
    logger.warn('微信支付配置不完整，支付功能将不可用', {
      hasAppid: !!wechatConfig.appid,
      hasMchid: !!wechatConfig.mchid,
      hasApiKey: !!wechatConfig.apiKey
    });
    return null;
  }

  // 检查证书文件
  const certPath = path.resolve(__dirname, '..', wechatConfig.certPath);
  const keyPath = path.resolve(__dirname, '..', wechatConfig.keyPath);

  if (!fs.existsSync(certPath)) {
    logger.warn('微信支付证书文件不存在', { certPath });
    return null;
  }

  if (!fs.existsSync(keyPath)) {
    logger.warn('微信支付密钥文件不存在', { keyPath });
    return null;
  }

  try {
    wechatpay = new Wechatpay({
      appid: wechatConfig.appid,
      mchid: wechatConfig.mchid,
      privateKey: keyPath,
      key: wechatConfig.apiKey
    });
    logger.info('微信支付初始化成功', {
      appid: wechatConfig.appid,
      mchid: wechatConfig.mchid
    });
    return wechatpay;
  } catch (error) {
    logger.error('微信支付初始化失败', {
      error: error.message,
      stack: error.stack
    });
    return null;
  }
}

/**
 * 创建支付订单
 */
async function createPayment(orderData) {
  if (wechatConfig.isDevelopment) {
    // 开发模式：返回模拟数据
    return {
      success: true,
      prepayId: 'mock_prepay_id_' + Date.now(),
      paymentParams: {
        timeStamp: Math.floor(Date.now() / 1000).toString(),
        nonceStr: 'mock_nonce_str',
        package: 'prepay_id=mock_prepay_id',
        signType: 'RSA',
        paySign: 'mock_pay_sign'
      }
    };
  }

  if (!wechatpay) {
    throw new Error('微信支付未初始化');
  }

  try {
    const params = {
      appid: wechatConfig.appid,
      mchid: wechatConfig.mchid,
      description: orderData.body || orderData.planName,
      out_trade_no: orderData.orderId,
      notify_url: wechatConfig.notifyUrl,
      amount: {
        total: orderData.amount,
        currency: 'CNY'
      },
      payer: {
        openid: orderData.openid
      }
    };

    const result = await wechatpay.transactions_jsapi(params);
    
    return {
      success: true,
      prepayId: result.prepay_id,
      paymentParams: result
    };
  } catch (error) {
    logger.error('创建微信支付订单失败', error);
    throw error;
  }
}

/**
 * 验证支付回调
 */
function verifyNotify(headers, body) {
  if (wechatConfig.isDevelopment) {
    return true; // 开发模式直接通过
  }

  if (!wechatpay) {
    return false;
  }

  try {
    // 验证签名
    return wechatpay.verifySign(headers, body);
  } catch (error) {
    logger.error('验证支付回调失败', error);
    return false;
  }
}

// 初始化
initWechatPay();

module.exports = {
  createPayment,
  verifyNotify,
  initWechatPay
};

