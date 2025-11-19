/**
 * 支付控制器
 */

const { Order, User, DiscountCode } = require('../models');
const wechatPay = require('../services/wechatPay');
const logger = require('../utils/logger');

/**
 * 创建订单
 */
async function createOrder(req, res, next) {
  try {
    const { openid, planId, planName, price, originalPrice, discountCode, duration } = req.body;

    if (!openid || !planId || !planName || !price || !duration) {
      return res.status(400).json({
        success: false,
        message: '缺少必要参数'
      });
    }

    // 验证用户是否存在
    const user = await User.findOne({ openid });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      });
    }

    // 处理优惠码
    let finalPrice = price;
    let discountAmount = 0;
    let usedDiscountCode = null;

    if (discountCode) {
      const code = await DiscountCode.findOne({ code: discountCode.toUpperCase() });
      if (code && code.isValid()) {
        discountAmount = code.calculateDiscount(originalPrice || price);
        finalPrice = Math.max(0, (originalPrice || price) - discountAmount);
        usedDiscountCode = code.code;
      }
    }

    // 生成订单
    const orderId = Order.generateOrderId();
    const order = await Order.create({
      orderId,
      userId: user._id,
      openid,
      planId,
      planName,
      amount: Math.round(finalPrice * 100), // 转换为分
      originalAmount: originalPrice || price,
      discountAmount,
      discountCode: usedDiscountCode,
      duration
    });

    res.json({
      success: true,
      data: {
        orderId: order.orderId,
        amount: order.amount,
        originalAmount: order.originalAmount,
        discountAmount: order.discountAmount,
        status: order.status
      }
    });
  } catch (error) {
    logger.error('创建订单失败', error);
    next(error);
  }
}

/**
 * 获取微信支付参数
 */
async function getPaymentParams(req, res, next) {
  try {
    const { orderId } = req.body;

    if (!orderId) {
      return res.status(400).json({
        success: false,
        message: '订单号必填'
      });
    }

    const order = await Order.findOne({ orderId });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: '订单不存在'
      });
    }

    if (order.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: '订单状态不正确'
      });
    }

    if (order.isExpired()) {
      order.status = 'cancelled';
      await order.save();
      return res.status(400).json({
        success: false,
        message: '订单已过期'
      });
    }

    // 创建微信支付
    const paymentResult = await wechatPay.createPayment({
      orderId: order.orderId,
      openid: order.openid,
      amount: order.amount,
      planName: order.planName,
      body: `K12词汇学习系统-${order.planName}`
    });

    if (!paymentResult.success) {
      return res.status(500).json({
        success: false,
        message: '创建支付失败'
      });
    }

    // 保存预支付ID
    order.wxPrepayId = paymentResult.prepayId;
    await order.save();

    res.json({
      success: true,
      data: paymentResult.paymentParams
    });
  } catch (error) {
    logger.error('获取支付参数失败', error);
    next(error);
  }
}

/**
 * 微信支付回调
 */
async function paymentNotify(req, res, next) {
  try {
    const headers = req.headers;
    let body = req.body;

    // 如果是Buffer，转换为字符串
    if (Buffer.isBuffer(body)) {
      body = body.toString('utf8');
    }

    // 解析JSON
    let notifyData;
    try {
      notifyData = typeof body === 'string' ? JSON.parse(body) : body;
    } catch (e) {
      logger.error('支付回调数据解析失败', { error: e.message, body });
      return res.status(400).send('数据格式错误');
    }

    // 验证签名
    const isValid = wechatPay.verifyNotify(headers, body);
    if (!isValid) {
      logger.warn('支付回调签名验证失败', { headers, body: notifyData });
      return res.status(400).send('签名验证失败');
    }

    // 提取订单信息（微信支付v3格式）
    let out_trade_no, transaction_id;
    
    if (notifyData.resource && notifyData.resource.ciphertext) {
      // 需要解密resource.ciphertext（实际使用时需要实现解密逻辑）
      // 这里简化处理，假设已经解密
      const decrypted = JSON.parse(notifyData.resource.ciphertext);
      out_trade_no = decrypted.out_trade_no;
      transaction_id = decrypted.transaction_id;
    } else {
      // 直接获取
      out_trade_no = notifyData.out_trade_no;
      transaction_id = notifyData.transaction_id;
    }

    if (!out_trade_no) {
      logger.warn('支付回调缺少订单号', { notifyData });
      return res.status(400).send('缺少订单号');
    }

    const order = await Order.findOne({ orderId: out_trade_no });

    if (!order) {
      logger.warn('支付回调订单不存在', { orderId: out_trade_no });
      return res.status(404).send('订单不存在');
    }

    if (order.status === 'paid') {
      return res.send('success'); // 已处理，直接返回成功
    }

    // 更新订单状态
    await order.markAsPaid(transaction_id || notifyData.transaction_id);

    // 更新用户会员状态
    const user = await User.findById(order.userId);
    if (user) {
      const expireTime = new Date();
      expireTime.setDate(expireTime.getDate() + order.duration);
      
      user.membership = 'premium';
      user.membershipExpireTime = expireTime;
      await user.save();
    }

    // 更新优惠码使用次数
    if (order.discountCode) {
      const discountCode = await DiscountCode.findOne({ code: order.discountCode });
      if (discountCode) {
        await discountCode.use();
      }
    }

    logger.info('支付成功处理完成', { orderId: order.orderId, transactionId: transaction_id });

    res.send('success');
  } catch (error) {
    logger.error('处理支付回调失败', error);
    res.status(500).send('处理失败');
  }
}

/**
 * 支付完成确认
 */
async function completePayment(req, res, next) {
  try {
    const { orderId } = req.body;

    if (!orderId) {
      return res.status(400).json({
        success: false,
        message: '订单号必填'
      });
    }

    const order = await Order.findOne({ orderId });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: '订单不存在'
      });
    }

    res.json({
      success: true,
      data: {
        orderId: order.orderId,
        status: order.status,
        paidTime: order.paidTime
      }
    });
  } catch (error) {
    logger.error('查询订单状态失败', error);
    next(error);
  }
}

/**
 * 查询订单状态
 */
async function getOrder(req, res, next) {
  try {
    const { orderId } = req.params;

    const order = await Order.findOne({ orderId }).populate('userId', 'openid nickname');

    if (!order) {
      return res.status(404).json({
        success: false,
        message: '订单不存在'
      });
    }

    res.json({
      success: true,
      data: order
    });
  } catch (error) {
    logger.error('查询订单失败', error);
    next(error);
  }
}

/**
 * 获取用户订单列表
 */
async function getUserOrders(req, res, next) {
  try {
    const { openid } = req.params;
    const { page = 1, limit = 20 } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const orders = await Order.find({ openid })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Order.countDocuments({ openid });

    res.json({
      success: true,
      data: {
        orders,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });
  } catch (error) {
    logger.error('获取用户订单列表失败', error);
    next(error);
  }
}

module.exports = {
  createOrder,
  getPaymentParams,
  paymentNotify,
  completePayment,
  getOrder,
  getUserOrders
};

