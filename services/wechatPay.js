/**
 * 微信支付服务 (v2 API)
 */

const crypto = require('crypto');
const axios = require('axios');
const xml2js = require('xml2js');
const logger = require('../utils/logger');
const config = require('../config/wechat');

// 生成签名（v2）
function sign(params, key) {
  const stringA = Object.keys(params)
    .filter(k => params[k] !== undefined && params[k] !== '' && k !== 'sign')
    .sort()
    .map(k => `${k}=${params[k]}`)
    .join('&');
  const stringSignTemp = `${stringA}&key=${key}`;
  return crypto
    .createHash('md5')
    .update(stringSignTemp, 'utf8')
    .digest('hex')
    .toUpperCase();
}

function buildXML(obj) {
  // 微信支付 v2 API 要求纯文本 XML，不使用 CDATA
  const builder = new xml2js.Builder({ 
    rootName: 'xml', 
    cdata: false,  // 不使用 CDATA
    headless: true,
    renderOpts: { pretty: false }  // 不格式化，单行输出
  });
  return builder.buildObject(obj);
}

function parseXML(xml) {
  return new Promise((resolve, reject) => {
    xml2js.parseString(xml, { trim: true, explicitArray: false }, (err, result) => {
      if (err) return reject(err);
      resolve(result.xml || result);
    });
  });
}

/**
 * 创建支付订单（统一下单）
 */
async function createPayment({ orderId, openid, amount, planName, body }) {
  logger.info('创建支付请求', { orderId, amount, openid, planName, body });
  
  // 开发环境可以直接返回 mock（不想走真支付就打开这段）
  // 注意：如果需要在手机上测试真实支付，需要注释掉这段代码
  // if (config.isDevelopment || process.env.NODE_ENV === 'development') {
  //   logger.warn('当前为开发模式，wechatPay.createPayment 返回模拟数据', { orderId, amount });
  //   return {
  //     success: true,
  //     prepayId: `mock_prepay_id_${orderId}`,
  //     paymentParams: {
  //       timeStamp: String(Math.floor(Date.now() / 1000)),
  //       nonceStr: 'mock_nonce_str',
  //       package: `prepay_id=mock_prepay_id_${orderId}`,
  //       signType: 'MD5',
  //       paySign: 'MOCK_PAY_SIGN',
  //       mock: true
  //     }
  //   };
  // }

  // 检查必需的配置
  if (!config.appId || !config.mchId || !config.mchKey) {
    logger.error('微信支付配置不完整', {
      hasAppId: !!config.appId,
      hasMchId: !!config.mchId,
      hasMchKey: !!config.mchKey
    });
    return {
      success: false,
      message: '微信支付配置不完整'
    };
  }

  // 验证和转换 amount
  const totalFee = parseInt(amount, 10);
  if (!totalFee || totalFee <= 0 || isNaN(totalFee)) {
    logger.error('金额无效', { amount, totalFee, orderId });
    return {
      success: false,
      message: `金额无效: ${amount}，必须是大于0的整数（单位：分）`
    };
  }

  const nonce_str = crypto.randomBytes(16).toString('hex');

  // ⭐⭐ 这里一定要有 total_fee，且是整数分：用传进来的 amount
  // 微信支付 v2 API 要求所有参数都是字符串格式
  const unifiedParams = {
    appid: String(config.appId),
    mch_id: String(config.mchId),
    nonce_str: String(nonce_str),
    body: String(body || planName || 'K12词汇学习系统-会员'),
    out_trade_no: String(orderId),
    total_fee: String(totalFee),                 // ★ 确保是字符串格式的整数，单位：分
    spbill_create_ip: String(config.ip || '127.0.0.1'),
    notify_url: String(config.notifyUrl || ''),
    trade_type: 'JSAPI',
    openid: String(openid)
  };

  logger.info('统一下单参数', {
    orderId,
    total_fee: unifiedParams.total_fee,
    amount: amount,
    totalFee: totalFee,
    body: unifiedParams.body
  });

  unifiedParams.sign = sign(unifiedParams, config.mchKey);

  try {
    const xml = buildXML(unifiedParams);
    
    // 调试：打印 XML（仅前 500 字符，避免日志过长）
    logger.info('调用微信统一下单接口', {
      orderId,
      amount,
      total_fee: totalFee,
      url: config.unifiedOrderUrl,
      xmlPreview: xml.substring(0, 500)
    });

    const resp = await axios.post(
      config.unifiedOrderUrl || 'https://api.mch.weixin.qq.com/pay/unifiedorder',
      xml,
      { 
        headers: { 'Content-Type': 'text/xml' },
        timeout: 10000
      }
    );

    const data = await parseXML(resp.data);
    logger.info('微信统一下单结果', {
      return_code: data.return_code,
      result_code: data.result_code,
      err_code: data.err_code,
      err_code_des: data.err_code_des,
      return_msg: data.return_msg,
      prepay_id: data.prepay_id,
      fullData: data
    });

    if (data.return_code !== 'SUCCESS' || data.result_code !== 'SUCCESS') {
      logger.error('微信统一下单失败', data);
      return {
        success: false,
        message: data.err_code_des || data.return_msg || '微信统一下单失败'
      };
    }

    const prepayId = data.prepay_id;

    // 给小程序用的二次签名参数
    const timeStamp = String(Math.floor(Date.now() / 1000));
    const nonceStr2 = crypto.randomBytes(16).toString('hex');
    const pkg = `prepay_id=${prepayId}`;
    const paySignParams = {
      appId: config.appId,
      timeStamp,
      nonceStr: nonceStr2,
      package: pkg,
      signType: 'MD5'
    };

    const paySign = sign(paySignParams, config.mchKey);

    return {
      success: true,
      prepayId,
      paymentParams: {
        timeStamp,
        nonceStr: nonceStr2,
        package: pkg,
        signType: 'MD5',
        paySign
      }
    };
  } catch (error) {
    logger.error('调用微信统一下单接口失败', {
      error: error.message,
      stack: error.stack,
      orderId,
      amount
    });
    return {
      success: false,
      message: error.message || '调用微信支付接口失败'
    };
  }
}

/**
 * 验证支付回调签名（v2 API）
 */
async function verifyNotify(xmlBody) {
  if (config.isDevelopment || process.env.NODE_ENV === 'development') {
    logger.warn('开发模式：跳过支付回调签名验证');
    return true; // 开发模式直接通过
  }

  try {
    // 解析 XML
    const notifyData = await parseXML(xmlBody);
    
    // 提取签名
    const receivedSign = notifyData.sign;
    if (!receivedSign) {
      logger.error('支付回调缺少签名');
      return false;
    }

    // 重新计算签名
    const calculatedSign = sign(notifyData, config.mchKey);
    
    // 验证签名
    const isValid = receivedSign === calculatedSign;
    
    if (!isValid) {
      logger.error('支付回调签名验证失败', {
        receivedSign,
        calculatedSign,
        orderId: notifyData.out_trade_no
      });
    }
    
    return isValid;
  } catch (error) {
    logger.error('支付回调签名验证异常', { error: error.message });
    return false;
  }
}

module.exports = {
  createPayment,
  verifyNotify
};
