/**
 * 支付服务模块
 * 处理微信支付相关逻辑
 */

const { userManager } = require('./userManager');

// 支付环境配置
const PAYMENT_CONFIG = {
  // 开发环境标识 - 改为false启用真实微信支付
  isDevelopment: true,
  
  // 后端API地址（请替换为您的实际服务器地址）
  apiBaseUrl: 'https://your-api-domain.com/api',
  
  // 支付回调配置
  notifyUrl: 'https://your-api-domain.com/api/payment/notify',
  
  // 商户信息（请替换为您的实际微信支付商户信息）
  merchantInfo: {
    appId: 'wx1234567890abcdef', // 您的微信小程序AppID
    mchId: '1234567890'         // 您的微信支付商户号
  },
  
  // 支付配置
  paymentSettings: {
    currency: 'CNY',
    tradeType: 'JSAPI',
    signType: 'MD5'
  }
};

/**
 * 支付服务类
 */
class PaymentService {
  constructor() {
    this.orders = new Map(); // 本地订单缓存
  }

  /**
   * 创建支付订单
   * @param {Object} planInfo - 套餐信息
   * @returns {Promise} 订单信息
   */
  async createOrder(planInfo) {
    try {
      console.log('创建支付订单:', planInfo);

      // 生成订单号
      const orderId = this.generateOrderId();
      
      // 构建订单数据
      const orderData = {
        orderId: orderId,
        planId: planInfo.id,
        planName: planInfo.name,
        amount: Math.round(planInfo.price * 100), // 转换为分
        originalAmount: planInfo.price, // 保留原始金额（元）
        duration: planInfo.duration,
        userId: userManager.userData.openid || 'anonymous',
        createTime: new Date().toISOString(),
        status: 'pending',
        // 添加更多支付需要的信息
        body: `K12词汇学习系统-${planInfo.name}`,
        detail: planInfo.desc || `购买${planInfo.name}会员服务`
      };

      // 保存到本地缓存
      this.orders.set(orderId, orderData);

      if (PAYMENT_CONFIG.isDevelopment) {
        // 开发模式：模拟订单创建成功
        return {
          success: true,
          orderId: orderId,
          orderData: orderData
        };
      } else {
        // 生产模式：调用后端API创建订单
        const response = await this.callBackendAPI('/payment/create-order', {
          method: 'POST',
          data: orderData
        });

        if (response.success) {
          return {
            success: true,
            orderId: orderId,
            orderData: response.data
          };
        } else {
          throw new Error(response.message || '创建订单失败');
        }
      }
    } catch (error) {
      console.error('创建订单失败:', error);
      throw error;
    }
  }

  /**
   * 发起微信支付
   * @param {Object} orderInfo - 订单信息
   * @returns {Promise} 支付结果
   */
  async requestPayment(orderInfo) {
    try {
      console.log('发起微信支付:', orderInfo);

      if (PAYMENT_CONFIG.isDevelopment) {
        // 开发模式：模拟支付流程
        return await this.mockPayment(orderInfo);
      } else {
        // 生产模式：调用微信支付
        return await this.realPayment(orderInfo);
      }
    } catch (error) {
      console.error('支付失败:', error);
      throw error;
    }
  }

  /**
   * 模拟支付（开发环境）
   */
  async mockPayment(orderInfo) {
    return new Promise((resolve) => {
      // 显示支付进度
      wx.showLoading({
        title: '支付中...',
        mask: true
      });

      // 模拟支付延迟
      setTimeout(() => {
        wx.hideLoading();
        
        // 测试阶段：100% 成功率模拟
        const isSuccess = true; // Math.random() > 0.1;
        
        if (isSuccess) {
          // 支付成功，更新订单状态
          const order = this.orders.get(orderInfo.orderId);
          if (order) {
            order.status = 'paid';
            order.payTime = new Date().toISOString();
            this.orders.set(orderInfo.orderId, order);
          }

          resolve({
            success: true,
            orderId: orderInfo.orderId,
            transactionId: 'mock_' + Date.now()
          });
        } else {
          resolve({
            success: false,
            error: '用户取消支付'
          });
        }
      }, 1000); // 减少到1秒，测试更快
    });
  }

  /**
   * 真实微信支付（生产环境）
   */
  async realPayment(orderInfo) {
    try {
      // 显示支付准备中
      wx.showLoading({
        title: '准备支付...',
        mask: true
      });

      // 1. 调用后端获取支付参数
      const paymentParams = await this.callBackendAPI('/payment/get-params', {
        method: 'POST',
        data: {
          orderId: orderInfo.orderId,
          planId: orderInfo.planId,
          amount: orderInfo.amount,
          openid: userManager.userData.openid
        }
      });

      wx.hideLoading();

      if (!paymentParams.success) {
        throw new Error(paymentParams.message || '获取支付参数失败');
      }

      // 2. 验证支付参数
      const params = paymentParams.data;
      if (!params.timeStamp || !params.nonceStr || !params.package || !params.paySign) {
        throw new Error('支付参数不完整');
      }

      // 3. 调用微信支付API
      return new Promise((resolve) => {
        wx.requestPayment({
          timeStamp: params.timeStamp,
          nonceStr: params.nonceStr,
          package: params.package,
          signType: params.signType || 'MD5',
          paySign: params.paySign,
          success: (res) => {
            console.log('微信支付成功:', res);
            
            // 显示支付成功提示
            wx.showToast({
              title: '支付成功',
              icon: 'success',
              duration: 1500
            });

            resolve({
              success: true,
              orderId: orderInfo.orderId,
              transactionId: res.transactionId || params.transactionId
            });
          },
          fail: (err) => {
            console.error('微信支付失败:', err);
            let errorMessage = '支付失败';
            
            // 根据错误类型给出更详细的提示
            if (err.errMsg) {
              if (err.errMsg.includes('cancel')) {
                errorMessage = '用户取消支付';
              } else if (err.errMsg.includes('timeout')) {
                errorMessage = '支付超时，请重试';
              } else if (err.errMsg.includes('fail')) {
                errorMessage = '支付失败，请检查网络或稍后重试';
              }
            }
            
            // 显示错误提示
            wx.showToast({
              title: errorMessage,
              icon: 'none',
              duration: 2000
            });
            
            resolve({
              success: false,
              error: errorMessage
            });
          }
        });
      });
    } catch (error) {
      wx.hideLoading();
      console.error('支付请求异常:', error);
      
      // 显示网络错误提示
      wx.showToast({
        title: error.message || '网络异常，请重试',
        icon: 'none',
        duration: 2000
      });
      
      return {
        success: false,
        error: error.message || '支付请求失败'
      };
    }
  }

  /**
   * 处理支付成功后的逻辑
   * @param {Object} paymentResult - 支付结果
   * @returns {Promise} 处理结果
   */
  async handlePaymentSuccess(paymentResult) {
    try {
      const order = this.orders.get(paymentResult.orderId);
      if (!order) {
        throw new Error('订单不存在');
      }

      // 1. 升级用户会员权限
      const upgradeSuccess = userManager.upgradeToPremium(order.duration);
      if (!upgradeSuccess) {
        throw new Error('升级会员失败');
      }

      // 2. 更新订单状态
      order.status = 'completed';
      order.completeTime = new Date().toISOString();
      this.orders.set(paymentResult.orderId, order);

      // 3. 保存支付记录
      this.savePurchaseHistory(order, paymentResult);

      // 4. 如果是生产环境，通知后端
      if (!PAYMENT_CONFIG.isDevelopment) {
        await this.notifyBackend(order, paymentResult);
      }

      console.log('支付处理完成:', paymentResult.orderId);
      return { success: true };

    } catch (error) {
      console.error('支付后处理失败:', error);
      throw error;
    }
  }

  /**
   * 保存购买历史
   */
  savePurchaseHistory(order, paymentResult) {
    try {
      const purchaseHistory = wx.getStorageSync('purchaseHistory') || [];
      
      const purchaseRecord = {
        orderId: order.orderId,
        planName: order.planName,
        amount: order.amount,
        duration: order.duration,
        purchaseTime: order.payTime || new Date().toISOString(),
        transactionId: paymentResult.transactionId,
        status: 'completed'
      };

      purchaseHistory.push(purchaseRecord);
      
      // 只保留最近20条记录
      if (purchaseHistory.length > 20) {
        purchaseHistory.splice(0, purchaseHistory.length - 20);
      }

      wx.setStorageSync('purchaseHistory', purchaseHistory);
      console.log('购买历史已保存');
    } catch (error) {
      console.error('保存购买历史失败:', error);
    }
  }

  /**
   * 通知后端支付完成
   */
  async notifyBackend(order, paymentResult) {
    try {
      await this.callBackendAPI('/payment/complete', {
        method: 'POST',
        data: {
          orderId: order.orderId,
          transactionId: paymentResult.transactionId,
          userId: order.userId
        }
      });
    } catch (error) {
      console.error('通知后端失败:', error);
      // 这里可以实现重试机制
    }
  }

  /**
   * 生成订单号
   */
  generateOrderId() {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 10000);
    return `ORDER_${timestamp}_${random}`;
  }

  /**
   * 检查支付配置
   */
  checkPaymentConfig() {
    // 开发模式下跳过配置检查
    if (PAYMENT_CONFIG.isDevelopment) {
      return {
        isValid: true,
        errors: []
      };
    }
    
    const errors = [];
    
    if (PAYMENT_CONFIG.apiBaseUrl.includes('your-api-domain.com')) {
      errors.push('请配置正确的后端API地址');
    }
    
    if (PAYMENT_CONFIG.merchantInfo.appId.includes('your-app-id')) {
      errors.push('请配置正确的微信小程序AppID');
    }
    
    if (PAYMENT_CONFIG.merchantInfo.mchId.includes('1234567890')) {
      errors.push('请配置正确的微信支付商户号');
    }
    
    return {
      isValid: errors.length === 0,
      errors: errors
    };
  }

  /**
   * 调用后端API
   */
  async callBackendAPI(endpoint, options = {}) {
    return new Promise((resolve, reject) => {
      wx.request({
        url: PAYMENT_CONFIG.apiBaseUrl + endpoint,
        method: options.method || 'GET',
        data: options.data || {},
        header: {
          'Content-Type': 'application/json',
          // 可以添加认证信息
          'Authorization': `Bearer ${userManager.userData.token || ''}`
        },
        success: (res) => {
          if (res.statusCode === 200) {
            resolve(res.data);
          } else {
            reject(new Error(`API请求失败: ${res.statusCode}`));
          }
        },
        fail: (err) => {
          reject(new Error(`网络请求失败: ${err.errMsg}`));
        }
      });
    });
  }

  /**
   * 查询订单状态
   */
  getOrderStatus(orderId) {
    const order = this.orders.get(orderId);
    return order ? order.status : 'not_found';
  }

  /**
   * 获取购买历史
   */
  getPurchaseHistory() {
    try {
      return wx.getStorageSync('purchaseHistory') || [];
    } catch (error) {
      console.error('获取购买历史失败:', error);
      return [];
    }
  }
}

// 导出单例实例
const paymentService = new PaymentService();

module.exports = {
  paymentService,
  PAYMENT_CONFIG
};
