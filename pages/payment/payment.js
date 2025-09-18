const { userManager } = require('../../utils/userManager');
const { paymentService } = require('../../utils/paymentService');

Page({
  data: {
    membershipStatus: {},
    expireTimeText: '',
    userStats: {},
    remainingTests: {},
    selectedPlan: '1',
    paymentLoading: false,
    
    // 套餐列表
    planList: [
      {
        id: '1',
        name: '月度会员',
        price: 19.9,
        originalPrice: 29.9,
        unit: '月',
        desc: '解锁全部功能，适合短期使用',
        duration: 30,
        popular: false
      },
      {
        id: '2',
        name: '季度会员',
        price: 49.9,
        originalPrice: 89.7,
        unit: '季度',
        desc: '3个月使用期，性价比之选',
        duration: 90,
        popular: true
      },
      {
        id: '3',
        name: '年度会员',
        price: 169.9,
        originalPrice: 358.8,
        unit: '年',
        desc: '12个月超值套餐，最优惠选择',
        duration: 365,
        popular: false
      }
    ],
    
    // 特权对比列表
    privilegeList: [
      {
        name: '每日测试次数',
        free: '3次',
        premium: '无限次',
        freeStatus: false
      },
      {
        name: '词汇训练范围',
        free: '小学3-4年级',
        premium: '全部K12年级',
        freeStatus: false
      },
      {
        name: '生词本容量',
        free: '最多20个',
        premium: '无限容量',
        freeStatus: false
      },
      {
        name: '学习报告',
        free: '基础报告',
        premium: '详细分析',
        freeStatus: true
      },
      {
        name: '数据同步',
        free: '本地存储',
        premium: '云端同步',
        freeStatus: true
      },
      {
        name: '客服支持',
        free: '基础支持',
        premium: '优先支持',
        freeStatus: true
      }
    ],
    
    // FAQ列表
    faqList: [
      {
        question: '会员有效期是多长时间？',
        answer: '根据您购买的套餐不同，月度会员30天，季度会员90天，年度会员365天。',
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

  onLoad() {
    this.loadUserData();
  },

  onShow() {
    this.loadUserData();
  },

  /**
   * 加载用户数据
   */
  loadUserData() {
    const membershipStatus = userManager.getMembershipStatus();
    const userStats = userManager.getUserStats();
    const remainingTests = userManager.getRemainingTests();
    
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
      remainingTests
    });

    // 设置默认选中套餐
    this.updateSelectedPlanInfo();
  },

  /**
   * 选择套餐
   */
  selectPlan(e) {
    const planId = e.currentTarget.dataset.plan;
    this.setData({
      selectedPlan: planId
    });
    this.updateSelectedPlanInfo();
  },

  /**
   * 更新选中套餐信息
   */
  updateSelectedPlanInfo() {
    const selectedPlanInfo = this.data.planList.find(plan => plan.id === this.data.selectedPlan) || this.data.planList[0];
    this.setData({
      selectedPlanInfo
    });
  },

  /**
   * 开始支付流程
   */
  async startPayment() {
    if (!this.data.selectedPlan || this.data.paymentLoading) {
      return;
    }

    this.setData({
      paymentLoading: true
    });

    try {
      const selectedPlan = this.data.planList.find(plan => plan.id === this.data.selectedPlan);
      
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
      const confirmResult = await this.showPaymentConfirm(selectedPlan);
      if (!confirmResult) {
        this.setData({ paymentLoading: false });
        return;
      }

      // 调用微信支付
      const paymentResult = await this.requestWxPayment(selectedPlan);
      
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
      }
    } catch (error) {
      console.error('支付失败:', error);
      wx.showToast({
        title: error.message || '支付失败',
        icon: 'error',
        duration: 2000
      });
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
      wx.showModal({
        title: '确认购买',
        content: `确定购买 ${plan.name} (¥${plan.price}) 吗？\n购买后将立即享受会员特权。`,
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
        throw new Error('创建订单失败');
      }

      // 2. 发起支付
      const paymentResult = await paymentService.requestPayment(orderResult.orderData);
      if (!paymentResult.success) {
        return {
          success: false,
          error: paymentResult.error || '支付失败'
        };
      }

      // 3. 处理支付成功
      await paymentService.handlePaymentSuccess(paymentResult);
      
      return { success: true };
      
    } catch (error) {
      console.error('支付流程失败:', error);
      return {
        success: false,
        error: error.message || '支付处理失败'
      };
    }
  },

  /**
   * 显示续费选项
   */
  showRenewalOptions() {
    const actions = ['月度续费 ¥19.9', '季度续费 ¥49.9', '年度续费 ¥169.9'];
    
    wx.showActionSheet({
      itemList: actions,
      success: (res) => {
        // 根据选择设置对应的套餐
        const planIds = ['1', '2', '3'];
        this.setData({
          selectedPlan: planIds[res.tapIndex]
        });
        this.updateSelectedPlanInfo();
        
        // 直接开始支付流程
        this.startPayment();
      }
    });
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
