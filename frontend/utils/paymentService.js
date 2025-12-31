/**
 * 支付服务
 * 处理微信支付相关功能
 */

const { getApiUrl, getApiBaseUrl } = require('./apiConfig');
const userManagerModule = require('./userManager');
const userManager = userManagerModule.userManager;

// 验证 userManager 是否正确导入
if (!userManager) {
  console.error('userManager 导入失败，模块内容:', userManagerModule);
  throw new Error('userManager 未正确导入');
}

// 验证 getUserInfo 方法是否存在
if (typeof userManager.getUserInfo !== 'function') {
  console.error('userManager 对象:', userManager);
  console.error('userManager 原型方法:', Object.getOwnPropertyNames(Object.getPrototypeOf(userManager)));
  throw new Error('userManager.getUserInfo 方法不存在');
}

// 支付配置（仅保留必要开关；API地址统一由 apiConfig.js 管理）
// ⚠️ 上线前必须为 false
const IS_DEVELOPMENT = false;

/**
 * 获取可用 openid（优先 userManager，其次本地缓存）
 */
function getOpenidSafe() {
  try {
    const info = userManager.getUserInfo();
    if (info && info.openid) return info.openid;
  } catch (e) {
    // ignore
  }

  const fromUserData = userManager && userManager.userData && userManager.userData.openid;
  if (fromUserData) return fromUserData;

  const fromStorage = wx.getStorageSync('openid');
  if (fromStorage) return fromStorage;

  return '';
}

/**
 * 轮询支付完成状态（解决“支付成功但回调/落库延迟”导致会员不生效的问题）
 */
async function pollCompletePayment({ orderId, openid, maxAttempts = 10, intervalMs = 1000 }) {
  let lastResponse = null;

  for (let i = 0; i < maxAttempts; i++) {
    // eslint-disable-next-line no-await-in-loop
    const resp = await new Promise((resolve, reject) => {
      wx.request({
        url: getApiUrl('/api/payment/complete'),
        method: 'POST',
        header: { 'Content-Type': 'application/json' },
        timeout: 10000,
        data: { orderId, openid },
        success: (res) => {
          if (res.statusCode === 200 && res.data && res.data.success) resolve(res.data);
          else reject(new Error(res.data?.message || '支付确认失败'));
        },
        fail: (err) => reject(new Error(err.errMsg || '网络请求失败'))
      });
    });

    lastResponse = resp;
    const data = resp.data || {};
    const status = data.status;
    const ms = data.membershipStatus;

    // 满足任一条件：订单已paid且会员为premium（或后端直接返回 premium 状态）
    if ((status === 'paid' && ms && ms.type === 'premium') || (ms && ms.type === 'premium')) {
      return { ok: true, resp };
    }

    // 未达到期望，等待后重试
    // eslint-disable-next-line no-await-in-loop
    await new Promise(r => setTimeout(r, intervalMs));
  }

  return { ok: false, resp: lastResponse };
}

/**
 * 检查支付配置
 */
function checkPaymentConfig() {
  const errors = [];
  
  if (IS_DEVELOPMENT) {
    errors.push('支付仍为开发模式，需要改为生产模式');
  }
  
  // 统一以 apiConfig.js 为准
  const base = getApiBaseUrl();
  if (!base || base.includes('your-domain.com') || base.includes('localhost')) {
    errors.push('API地址未配置，请填写实际的后端域名');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * 创建订单
 * @param {Object} plan - 套餐信息
 * @returns {Promise<Object>} 订单结果
 */
async function createOrder(plan) {
  try {
    // 获取用户信息（避免 userInfo 常量未刷新导致 openid 为空）
    const openidToSend = getOpenidSafe();
    if (!openidToSend) {
      const error = new Error('用户未登录，请先登录');
      error.code = 'NOT_LOGGED_IN';
      error.suggestion = '请返回首页点击"重新登录"按钮';
      throw error;
    }

    const response = await new Promise((resolve, reject) => {
      wx.request({
        url: getApiUrl('/api/payment/create-order'),
        method: 'POST',
        header: {
          'Content-Type': 'application/json'
        },
        timeout: 10000, // 10秒超时
        data: {
          openid: openidToSend,
          planId: plan.id,
          planName: plan.name,
          price: plan.price,
          originalPrice: plan.originalPrice || plan.price,
          discountCode: plan.discountCode,
          duration: plan.duration || 365
        },
        success: (res) => {
          if (res.statusCode === 200 && res.data.success) {
            resolve(res.data);
          } else {
            reject(new Error(res.data.message || '创建订单失败'));
          }
        },
        fail: (err) => {
          let errorMessage = '网络请求失败';
          if (err.errMsg) {
            if (err.errMsg.includes('time out') || err.errMsg.includes('timeout')) {
              errorMessage = '连接超时，请检查网络或确认后端服务是否运行';
            } else if (err.errMsg.includes('fail')) {
              errorMessage = '网络请求失败，请检查后端服务地址配置';
            } else {
              errorMessage = `网络错误: ${err.errMsg}`;
            }
          }
          reject(new Error(errorMessage));
        }
      });
    });

    return {
      success: true,
      orderData: response.data
    };
  } catch (error) {
    console.error('创建订单失败:', error);
    return {
      success: false,
      error: error.message || '创建订单失败'
    };
  }
}

/**
 * 请求微信支付
 * @param {Object} orderData - 订单数据
 * @returns {Promise<Object>} 支付结果
 */
async function requestPayment(orderData) {
  try {
    // 1. 获取支付参数
    const openidToSend = getOpenidSafe();
    if (!openidToSend) {
      const error = new Error('用户未登录，请先登录');
      error.code = 'NOT_LOGGED_IN';
      error.suggestion = '请返回首页点击"重新登录"按钮';
      throw error;
    }

    const paramsResponse = await new Promise((resolve, reject) => {
      wx.request({
        url: getApiUrl('/api/payment/get-params'),
        method: 'POST',
        header: {
          'Content-Type': 'application/json'
        },
        timeout: 10000, // 10秒超时
        data: {
          orderId: orderData.orderId,
          openid: openidToSend
        },
        success: (res) => {
          if (res.statusCode === 200 && res.data.success) {
            resolve(res.data);
          } else {
            reject(new Error(res.data.message || '获取支付参数失败'));
          }
        },
        fail: (err) => {
          let errorMessage = '网络请求失败';
          if (err.errMsg) {
            if (err.errMsg.includes('time out') || err.errMsg.includes('timeout')) {
              errorMessage = '连接超时，请检查网络或确认后端服务是否运行';
            } else if (err.errMsg.includes('fail')) {
              errorMessage = '网络请求失败，请检查后端服务地址配置';
            } else {
              errorMessage = `网络错误: ${err.errMsg}`;
            }
          }
          reject(new Error(errorMessage));
        }
      });
    });

    const paymentParams = paramsResponse.data;

    // 2. 调用微信支付
    const paymentResult = await new Promise((resolve, reject) => {
      // 🔧 修复：添加 total_fee 参数（如果后端返回了）
      const paymentOptions = {
        timeStamp: paymentParams.timeStamp,
        nonceStr: paymentParams.nonceStr,
        package: paymentParams.package,
        signType: paymentParams.signType,
        paySign: paymentParams.paySign
      };
      
      // 如果后端返回了 total_fee，添加到支付参数中
      if (paymentParams.total_fee !== undefined) {
        paymentOptions.total_fee = paymentParams.total_fee;
      }
      
      wx.requestPayment({
        ...paymentOptions,
        success: (res) => {
          resolve({ success: true, result: res });
        },
        fail: (err) => {
          reject(new Error(err.errMsg || '支付失败'));
        }
      });
    });

    return {
      success: true,
      orderId: orderData.orderId,
      result: paymentResult
    };
  } catch (error) {
    console.error('支付请求失败:', error);
    return {
      success: false,
      error: error.message || '支付失败'
    };
  }
}

/**
 * 处理支付成功
 * @param {Object} paymentResult - 支付结果
 * @returns {Promise<Object>} 处理结果
 */
async function handlePaymentSuccess(paymentResult) {
  try {
    const openidToSend = getOpenidSafe();
    if (!openidToSend) {
      const error = new Error('用户未登录，请先登录');
      error.code = 'NOT_LOGGED_IN';
      error.suggestion = '请返回首页点击"重新登录"按钮';
      throw error;
    }

    // 1) 轮询确认（兼容“支付成功但回调/落库稍后才到”的情况）
    const { ok, resp } = await pollCompletePayment({
      orderId: paymentResult.orderId,
      openid: openidToSend,
      maxAttempts: 10,
      intervalMs: 1000
    });

    const response = resp || {};

    // 2) 用 complete 返回的会员状态先更新一次本地（如果有）
    if (response.data && response.data.membershipStatus) {
      const membershipStatus = response.data.membershipStatus;
      userManager.updateMembershipStatus(membershipStatus);

      // 同步到全局数据和本地存储
      const app = getApp();
      if (app.globalData.userInfo) {
        app.globalData.userInfo.membership = membershipStatus.type;
        app.globalData.userInfo.membershipExpireTime = membershipStatus.expireTime;
        wx.setStorageSync('userInfo', app.globalData.userInfo);
      }
    }

    // 3) 最终再从 /api/users/:openid 拉一次，确保“下次打开/刷新”也一致
    //    即使 complete 轮询没等到，也可能回调稍后落库，这里能兜底同步
    try {
      await userManager.fetchUserFromBackend();
    } catch (e) {
      // ignore：不影响支付成功提示，但会影响即时展示；下次进入页面仍会再同步
    }

    return {
      success: true,
      data: response.data,
      synced: ok
    };
  } catch (error) {
    console.error('处理支付成功失败:', error);
    return {
      success: false,
      error: error.message || '处理支付成功失败'
    };
  }
}

module.exports = {
  paymentService: {
    checkPaymentConfig,
    createOrder,
    requestPayment,
    handlePaymentSuccess
  }
};
