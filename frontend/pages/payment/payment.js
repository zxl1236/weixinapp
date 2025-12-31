const { userManager, MEMBERSHIP_CONFIG } = require('../../utils/userManager');
const { paymentService } = require('../../utils/paymentService');
const { activationCodeValidator } = require('../../utils/activationCodeValidator');
const { requireLogin } = require('../../utils/loginGuard');

function formatDailyLimit(limit) {
  if (limit === -1) return '无限次';
  if (typeof limit === 'number' && limit >= 0) return `${limit}次/天`;
  return '按规则限制';
}

function formatGrades(grades) {
  const nums = (grades || [])
    .map((g) => Number(g))
    .filter((n) => Number.isFinite(n))
    .sort((a, b) => a - b);
  if (!nums.length) return '全部年级';
  const min = nums[0];
  const max = nums[nums.length - 1];
  // 常见展示：仅覆盖小学
  if (max <= 6) return `小学${min}-${max}年级`;
  return `${min}-${max}年级`;
}

function formatMistakeLimit(limit) {
  if (limit === -1) return '无限容量';
  if (typeof limit === 'number' && limit >= 0) return `最多${limit}个`;
  return '按规则限制';
}

function formatLearnedLimit(limit) {
  if (limit === -1) return '无限';
  if (typeof limit === 'number' && limit >= 0) return `${limit}个`;
  return '按规则限制';
}

function buildPrivilegeList() {
  const free = MEMBERSHIP_CONFIG.free || {};
  const premium = MEMBERSHIP_CONFIG.premium || {};

  return [
    {
      name: '累计可学习单词数',
      free: formatLearnedLimit(free.maxLearnedWords),
      premium: formatLearnedLimit(premium.maxLearnedWords),
      freeStatus: true
    },
    {
      name: '每日测试次数',
      free: formatDailyLimit(free.dailyTestLimit),
      premium: formatDailyLimit(premium.dailyTestLimit),
      freeStatus: true
    },
    {
      name: '词汇训练范围',
      free: formatGrades(free.accessibleGrades),
      premium: formatGrades(premium.accessibleGrades),
      freeStatus: true
    },
    {
      name: '生词本容量',
      free: formatMistakeLimit(free.maxMistakeCount),
      premium: formatMistakeLimit(premium.maxMistakeCount),
      freeStatus: true
    },
    {
      name: '学习报告',
      free: free.detailedReport ? '详细分析' : '基础报告',
      premium: premium.detailedReport ? '详细分析' : '基础报告',
      freeStatus: true
    },
    {
      name: '数据同步',
      free: free.cloudSync ? '云端同步' : '本地存储',
      premium: premium.cloudSync ? '云端同步' : '本地存储',
      freeStatus: true
    },
    {
      name: '客服支持',
      free: '基础支持',
      premium: '优先支持',
      freeStatus: true
    }
  ];
}

Page({
  data: {
    membershipStatus: {},
    expireTimeText: '',
    userStats: {},
    remainingTests: {},
    paymentLoading: false,
    freeLimitDesc: '',
    
    // 支付方式选择
    selectedPaymentType: '', // 'activation' 或 'wechat'
    
    // 统一价格配置
    basePrice: 0.01, // 基础价格
    discountCode: '', // 优惠码
    discountAmount: 0, // 优惠金额
    finalPrice: 0.01, // 最终价格
    discountCodeValid: false, // 优惠码是否有效
    discountCodeError: '', // 优惠码错误提示
    activationCode: '', // 激活码
    activationCodeValid: false, // 激活码是否有效
    activationCodeError: '', // 激活码错误提示
    activationVerifying: false, // 是否正在验证激活码
    
    // 特权对比列表（会在 loadUserData 中动态生成，确保与配置一致）
    privilegeList: [],
    
    // FAQ列表
    faqList: [
      {
        question: '会员有效期是多长时间？',
        answer: '以支付页展示的套餐为准；当前为永久会员（开通后长期有效）。',
        expanded: false
      },
      {
        question: '支付后多久生效？',
        answer: '支付成功后会员权限立即生效，您可以马上享受所有高级功能。',
        expanded: false
      },
      {
        question: '会员到期后会自动续费吗？',
        answer: '不会自动续费，到期后会降级为免费用户，您可以随时手动续费。',
        expanded: false
      },
      {
        question: '支付失败怎么办？',
        answer: '如遇支付问题，请检查网络连接和微信支付设置，或联系客服处理。',
        expanded: false
      },
      {
        question: '可以申请退款吗？',
        answer: '由于数字商品特殊性，原则上不支持退款。如有特殊情况请联系客服。',
        expanded: false
      }
    ]
  },

  onLoad(options) {
    // 检查登录状态，未登录则跳转到登录页
    if (!requireLogin()) {
      return;
    }
    
    this.loadUserData();
    
    // 如果从学习完成页面跳转过来，且需要聚焦激活码输入框
    if (options.focus === 'activation') {
      // 自动选择激活码支付方式
      this.setData({
        selectedPaymentType: 'activation'
      });
      // 延迟一下，确保页面渲染完成
      setTimeout(() => {
        // 尝试聚焦激活码输入框
        const query = wx.createSelectorQuery();
        query.select('.activation-section .discount-input').boundingClientRect();
        query.exec((res) => {
          if (res[0]) {
            // 滚动到激活码输入框位置
            wx.pageScrollTo({
              selector: '.activation-section',
              duration: 300
            });
          }
        });
      }, 500);
    }
  },

  /**
   * 选择支付方式
   */
  selectPaymentType(e) {
    const type = e.currentTarget.dataset.type;
    this.setData({
      selectedPaymentType: type,
      // 切换支付方式时清空错误信息
      discountCodeError: '',
      activationCodeError: ''
    });
  },

  onShow() {
    // 先展示本地数据（快速）
    this.loadUserData();

    // 再后台同步一次后端用户信息（防止“支付成功但回调延迟/本地缓存旧”导致看起来会员丢失）
    userManager.fetchUserFromBackend()
      .then(() => this.loadUserData())
      .catch(() => {
        // ignore
      });
  },

  /**
   * 加载用户数据
   */
  loadUserData() {
    const membershipStatus = userManager.getMembershipStatus();
    const userStats = userManager.getUserStats();
    const remainingTests = userManager.getRemainingTests();

    const free = MEMBERSHIP_CONFIG.free || {};
    const limit = typeof free.maxLearnedWords === 'number' ? free.maxLearnedWords : 30;
    const learned = userManager.getTotalMasteredWordsCount();
    const freeLimitDesc = `免费版：累计学习${limit}个单词（当前${learned}个）后需开通会员继续学习；年级全开放；生词本${formatMistakeLimit(free.maxMistakeCount)}；每日测试${formatDailyLimit(free.dailyTestLimit)}`;
    
    // 格式化到期时间
    let expireTimeText = '';
    if (membershipStatus.expireTime) {
      const expireDate = new Date(membershipStatus.expireTime);
      expireTimeText = `${expireDate.getFullYear()}-${(expireDate.getMonth() + 1).toString().padStart(2, '0')}-${expireDate.getDate().toString().padStart(2, '0')}`;
    }

    this.setData({
      membershipStatus,
      expireTimeText,
      userStats,
      remainingTests,
      privilegeList: buildPrivilegeList(),
      freeLimitDesc
    });

    // 初始化价格
    this.updatePrice();
  },

  /**
   * 输入优惠码
   */
  onDiscountCodeInput(e) {
    const code = e.detail.value.trim();
    this.setData({
      discountCode: code,
      discountCodeValid: false,
      discountCodeError: ''
    });
    
    // 如果输入为空，重置价格
    if (!code) {
      this.setData({
        discountAmount: 0,
        finalPrice: this.data.basePrice
      });
    }
  },

  /**
   * 输入激活码
   */
  onActivationCodeInput(e) {
    const code = e.detail.value.trim();
    this.setData({
      activationCode: code,
      activationCodeValid: false,
      activationCodeError: ''
    });
  },

  /**
   * 验证激活码（前端验证，不依赖后端）
   */
  async verifyActivationCode() {
    const code = this.data.activationCode.trim();
    
    if (!code) {
      this.setData({
        activationCodeValid: false,
        activationCodeError: '请输入激活码'
      });
      return false;
    }

    this.setData({
      activationVerifying: true,
      activationCodeError: ''
    });

    // 使用 setTimeout 模拟异步操作，提供更好的用户体验
    await new Promise(resolve => setTimeout(resolve, 300));

    try {
      // 使用前端验证器验证激活码
      const verifyResult = activationCodeValidator.verify(code);

      if (!verifyResult.valid) {
        this.setData({
          activationCodeValid: false,
          activationCodeError: verifyResult.message,
          activationVerifying: false
        });

        wx.showToast({
          title: verifyResult.message,
          icon: 'none',
          duration: 2000
        });

        return false;
      }

      // 检查用户是否已激活
      if (userManager.isActivated()) {
        this.setData({
          activationCodeValid: false,
          activationCodeError: '您已经激活，无需重复激活',
          activationVerifying: false
        });

        wx.showToast({
          title: '您已经激活',
          icon: 'none',
          duration: 2000
        });

        return false;
      }

      // 标记激活码为已使用
      const useSuccess = activationCodeValidator.useCode(code);
      if (!useSuccess) {
        this.setData({
          activationCodeValid: false,
          activationCodeError: '激活码使用失败，请重试',
          activationVerifying: false
        });

        wx.showToast({
          title: '激活失败，请重试',
          icon: 'none',
          duration: 2000
        });

        return false;
      }

      // 激活成功，更新用户状态
      userManager.updateActivationStatus(true);
      
      // 同时更新会员状态为永久会员（设置一个很远的过期时间表示永久）
      const farFutureDate = new Date('2099-12-31').toISOString();
      userManager.updateMembershipStatus({
        type: 'premium',
        expireTime: farFutureDate
      });

      this.setData({
        activationCodeValid: true,
        activationCodeError: '',
        activationVerifying: false
      });

      wx.showToast({
        title: '激活成功！',
        icon: 'success',
        duration: 2000
      });

      // 刷新页面数据
      this.loadUserData();

      return true;
    } catch (error) {
      console.error('激活码验证失败:', error);
      const errorMsg = error.message || '激活码验证失败';
      
      this.setData({
        activationCodeValid: false,
        activationCodeError: errorMsg,
        activationVerifying: false
      });

      wx.showToast({
        title: errorMsg,
        icon: 'none',
        duration: 2000
      });

      return false;
    }
  },

  /**
   * 验证优惠码
   */
  validateDiscountCode() {
    const code = this.data.discountCode.trim();
    
    if (!code) {
      this.setData({
        discountCodeValid: false,
        discountCodeError: '请输入优惠码'
      });
      return false;
    }

    // 验证优惠码 "symbol"
    if (code.toLowerCase() === 'symbol') {
      const discountAmount = 10; // 减10元
      const finalPrice = Math.max(0, this.data.basePrice - discountAmount);
      
      this.setData({
        discountCodeValid: true,
        discountCodeError: '',
        discountAmount: discountAmount,
        finalPrice: finalPrice
      });
      
      wx.showToast({
        title: '优惠码已应用',
        icon: 'success',
        duration: 1500
      });
      
      return true;
    } else {
      this.setData({
        discountCodeValid: false,
        discountCodeError: '优惠码无效',
        discountAmount: 0,
        finalPrice: this.data.basePrice
      });
      
      wx.showToast({
        title: '优惠码无效',
        icon: 'none',
        duration: 1500
      });
      
      return false;
    }
  },

  /**
   * 更新价格
   */
  updatePrice() {
    const finalPrice = this.data.discountCodeValid 
      ? Math.max(0, this.data.basePrice - this.data.discountAmount)
      : this.data.basePrice;
    
    this.setData({
      finalPrice: finalPrice
    });
  },

  /**
   * 开始支付流程
   */
  async startPayment() {
    if (this.data.paymentLoading) {
      return;
    }

    // 如果输入了优惠码但未验证，先验证
    if (this.data.discountCode && !this.data.discountCodeValid) {
      const isValid = this.validateDiscountCode();
      if (!isValid) {
        return;
      }
    }

    this.setData({
      paymentLoading: true
    });

    try {
      // 构建套餐信息
      // 🔧 修复：总是传递优惠码到后端，让后端来验证和计算
      // 前端验证只是为了用户体验预览，真正的验证和计算在后端完成
      const planInfo = {
        id: '1',
        name: '年度会员',
        price: this.data.finalPrice,
        originalPrice: this.data.basePrice,
        duration: 365, // 一年
        discountCode: this.data.discountCode ? this.data.discountCode.trim() : null,
        discountAmount: this.data.discountAmount
      };
      
      // 检查支付配置
      const configCheck = paymentService.checkPaymentConfig();
      if (!configCheck.isValid) {
        wx.showModal({
          title: '支付配置提示',
          content: '支付功能需要配置：\n' + configCheck.errors.join('\n'),
          showCancel: false,
          confirmText: '我知道了'
        });
        this.setData({ paymentLoading: false });
        return;
      }
      
      // 显示支付确认
      const confirmResult = await this.showPaymentConfirm(planInfo);
      if (!confirmResult) {
        this.setData({ paymentLoading: false });
        return;
      }

      // 调用微信支付
      const paymentResult = await this.requestWxPayment(planInfo);
      
      if (paymentResult.success) {
        wx.showToast({
          title: '支付成功！',
          icon: 'success',
          duration: 2000
        });
        
        // 刷新页面数据
        this.loadUserData();
        
        // 2秒后返回上一页或首页
        setTimeout(() => {
          wx.navigateBack({
            fail: () => {
                wx.switchTab({
                  url: '/pages/index/index'
                });
            }
          });
        }, 2000);
      } else {
        // 处理支付失败
        const errorMsg = paymentResult.error || '支付失败';
        if (errorMsg.includes('未登录') || errorMsg.includes('NOT_LOGGED_IN')) {
          wx.showModal({
            title: '登录提示',
            content: '您尚未登录，请先登录后再进行支付。\n\n请返回首页点击"重新登录"按钮。',
            showCancel: true,
            cancelText: '取消',
            confirmText: '返回首页',
            success: (res) => {
              if (res.confirm) {
                wx.switchTab({
                  url: '/pages/index/index'
                });
              }
            }
          });
        } else {
          wx.showToast({
            title: errorMsg,
            icon: 'none',
            duration: 2000
          });
        }
      }
    } catch (error) {
      console.error('支付失败:', error);
      const errorMsg = error.message || '支付失败';
      if (errorMsg.includes('未登录') || error.code === 'NOT_LOGGED_IN') {
        wx.showModal({
          title: '登录提示',
          content: error.suggestion || '您尚未登录，请先登录后再进行支付。\n\n请返回首页点击"重新登录"按钮。',
          showCancel: true,
          cancelText: '取消',
          confirmText: '返回首页',
          success: (res) => {
            if (res.confirm) {
              wx.switchTab({
                url: '/pages/index/index'
              });
            }
          }
        });
      } else {
        wx.showToast({
          title: errorMsg,
          icon: 'error',
          duration: 2000
        });
      }
    } finally {
      this.setData({
        paymentLoading: false
      });
    }
  },

  /**
   * 显示支付确认弹窗
   */
  showPaymentConfirm(plan) {
    return new Promise((resolve) => {
      let content = `确定购买月度会员吗？\n`;
      if (plan.originalPrice > plan.price) {
        content += `原价：¥${plan.originalPrice}\n`;
        content += `优惠：-¥${plan.discountAmount}\n`;
      }
      content += `实付：¥${plan.price}\n\n购买后将立即享受会员特权。`;
      
      wx.showModal({
        title: '确认购买',
        content: content,
        confirmText: '立即支付',
        confirmColor: '#4A90E2',
        cancelText: '取消',
        cancelColor: '#666666',
        success: (res) => {
          resolve(res.confirm);
        },
        fail: () => {
          resolve(false);
        }
      });
    });
  },

  /**
   * 请求微信支付
   */
  async requestWxPayment(plan) {
    try {
      // 1. 创建订单
      const orderResult = await paymentService.createOrder(plan);
      if (!orderResult.success) {
        const errorMsg = orderResult.error || '创建订单失败';
        // 如果是登录相关错误，保留错误信息
        if (errorMsg.includes('未登录') || errorMsg.includes('NOT_LOGGED_IN')) {
          throw new Error(errorMsg);
        }
        throw new Error('创建订单失败');
      }

      // 2. 发起支付
      const paymentResult = await paymentService.requestPayment(orderResult.orderData);
      if (!paymentResult.success) {
        const errorMsg = paymentResult.error || '支付失败';
        // 如果是登录相关错误，保留错误信息
        if (errorMsg.includes('未登录') || errorMsg.includes('NOT_LOGGED_IN')) {
          throw new Error(errorMsg);
        }
        return {
          success: false,
          error: errorMsg
        };
      }

      // 3. 处理支付成功
      await paymentService.handlePaymentSuccess(paymentResult);
      
      // 强制再同步一次后端用户信息，确保页面/下次进入一致
      try {
        await userManager.fetchUserFromBackend();
      } catch (e) {
        // ignore
      }

      return { success: true };
      
    } catch (error) {
      console.error('支付流程失败:', error);
      // 保留原始错误信息，特别是登录相关错误
      return {
        success: false,
        error: error.message || '支付处理失败',
        code: error.code,
        suggestion: error.suggestion
      };
    }
  },

  /**
   * 显示续费选项
   */
  showRenewalOptions() {
    // 直接开始支付流程，使用当前价格
    this.startPayment();
  },

  /**
   * 切换FAQ展开状态
   */
  toggleFaq(e) {
    const index = e.currentTarget.dataset.index;
    const key = `faqList[${index}].expanded`;
    
    this.setData({
      [key]: !this.data.faqList[index].expanded
    });
  },

  /**
   * 分享功能
   */
  onShareAppMessage() {
    return {
      title: 'K12词汇学习系统 - 升级会员解锁全部功能',
      path: '/pages/payment/payment',
      imageUrl: ''
    };
  },

  /**
   * 分享到朋友圈
   */
  onShareTimeline() {
    return {
      title: 'K12词汇学习系统 - 升级会员解锁全部功能',
      imageUrl: ''
    };
  }
});
