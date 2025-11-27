/**
 * 支付控制器
 */

const { Order, User, DiscountCode } = require('../models');
const wechatPay = require('../services/wechatPay');
const logger = require('../utils/logger');

/**
 * 本地订单号生成工具
 * 形如：ORD20251123012340123
 */
function generateOrderId() {
  const now = new Date();
  const yyyyMMdd = now.toISOString().slice(0, 10).replace(/-/g, ''); // 20251123
  const ms = now.getTime().toString().slice(-5);                     // 时间戳后5位
  const rand = Math.floor(Math.random() * 1000)
    .toString()
    .padStart(3, '0');                                               // 000~999
  return `ORD${yyyyMMdd}${ms}${rand}`;
}

/**
 * 创建订单
 */
async function createOrder(req, res, next) {
  try {
    const {
      openid,
      planId,
      planName,
      price,
      originalPrice,
      discountCode,
      duration
    } = req.body || {};

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
      const code = await DiscountCode.findOne({
        code: discountCode.toUpperCase()
      });
      if (code && code.isValid()) {
        discountAmount = code.calculateDiscount(originalPrice || price);
        finalPrice = Math.max(0, (originalPrice || price) - discountAmount);
        usedDiscountCode = code.code;
      }
    }

    // 生成订单号（不再调用不存在的 Order.generateOrderId）
    const orderId = generateOrderId();

    // 创建订单
    // 兼容 MongoDB (_id) 和 SQLite (id)
    const userId = user._id || user.id;
    const order = await Order.create({
      orderId,
      userId,
      openid,
      planId,
      planName,
      amount: Math.round(finalPrice * 100),        // 转换为分
      originalAmount: originalPrice || price,
      discountAmount,
      discountCode: usedDiscountCode,
      duration
    });

    return res.json({
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
    logger.error('创建订单失败', { error: error.message, stack: error.stack });
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

    if (order.isExpired && order.isExpired()) {
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
      body: `K12词汇学习系统-${order.planName}`,
      // 🔧 添加优惠相关参数
      discountAmount: order.discountAmount || 0,
      discountCode: order.discountCode || null
    });

    if (!paymentResult.success) {
      logger.error('创建支付失败', {
        orderId: order.orderId,
        error: paymentResult.message,
        amount: order.amount
      });
      return res.status(500).json({
        success: false,
        message: paymentResult.message || '创建支付失败'
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
    logger.error('获取支付参数失败', { error: error.message, stack: error.stack });
    next(error);
  }
}

/**
 * 微信支付回调（v2 API，XML 格式）
 */
async function paymentNotify(req, res, next) {
  try {
    let xmlBody = req.body;

    // 如果是Buffer，转换为字符串
    if (Buffer.isBuffer(xmlBody)) {
      xmlBody = xmlBody.toString('utf8');
    }

    if (!xmlBody || typeof xmlBody !== 'string') {
      logger.error('支付回调数据格式错误', { bodyType: typeof xmlBody });
      return res.status(400).send('数据格式错误');
    }

    logger.info('收到支付回调', { bodyPreview: xmlBody.substring(0, 200) });

    // 解析 XML（微信支付 v2 API 使用 XML 格式）
    const parseXML = require('xml2js').parseString;
    const notifyData = await new Promise((resolve, reject) => {
      parseXML(xmlBody, { trim: true, explicitArray: false }, (err, result) => {
        if (err) return reject(err);
        resolve(result.xml || result);
      });
    });

    logger.info('支付回调解析成功', {
      return_code: notifyData.return_code,
      result_code: notifyData.result_code,
      out_trade_no: notifyData.out_trade_no
    });

    // 验证签名
    const isValid = await wechatPay.verifyNotify(xmlBody);
    if (!isValid) {
      logger.warn('支付回调签名验证失败', { orderId: notifyData.out_trade_no });
      return res.status(400).send('签名验证失败');
    }

    // 检查返回码
    if (notifyData.return_code !== 'SUCCESS') {
      logger.error('支付回调返回码错误', {
        return_code: notifyData.return_code,
        return_msg: notifyData.return_msg
      });
      return res.status(400).send('支付回调返回码错误');
    }

    // 提取订单信息（微信支付 v2 API 格式）
    const out_trade_no = notifyData.out_trade_no;
    const transaction_id = notifyData.transaction_id;

    if (!out_trade_no) {
      logger.warn('支付回调缺少订单号', { notifyData });
      return res.status(400).send('缺少订单号');
    }

    // 检查支付结果
    if (notifyData.result_code !== 'SUCCESS') {
      logger.warn('支付失败', {
        orderId: out_trade_no,
        err_code: notifyData.err_code,
        err_code_des: notifyData.err_code_des
      });
      // 即使支付失败，也要返回 success，避免微信重复通知
      return res.send('success');
    }

    const order = await Order.findOne({ orderId: out_trade_no });

    if (!order) {
      logger.warn('支付回调订单不存在', { orderId: out_trade_no });
      return res.status(404).send('订单不存在');
    }

    if (order.status === 'paid') {
      logger.info('订单已处理，跳过重复处理', { orderId: out_trade_no });
      return res.send('success'); // 已处理，直接返回成功
    }

    // 更新订单状态
    if (order.markAsPaid) {
      await order.markAsPaid(transaction_id);
    } else {
      // 兜底：没有 markAsPaid 方法时手动更新
      order.status = 'paid';
      order.paidTime = new Date();
      order.wxTransactionId = transaction_id;
      await order.save();
    }

    // 更新用户会员状态
    let user;
    if (order.userId) {
      user = await User.findById(order.userId);
    } else if (order.openid) {
      user = await User.findOne({ openid: order.openid });
    }

    if (user) {
      const expireTime = new Date();
      expireTime.setDate(expireTime.getDate() + order.duration);

      user.membership = 'premium';
      user.membershipExpireTime = expireTime;
      await user.save();
      
      logger.info('用户会员状态已更新', {
        userId: user.id,
        openid: user.openid,
        expireTime
      });
    } else {
      logger.warn('支付成功但未找到用户', {
        orderId: order.orderId,
        userId: order.userId,
        openid: order.openid
      });
    }

    // 更新优惠码使用次数
    if (order.discountCode) {
      const discountCode = await DiscountCode.findOne({
        code: order.discountCode
      });
      if (discountCode && discountCode.use) {
        await discountCode.use();
      }
    }

    logger.info('支付成功处理完成', {
      orderId: order.orderId,
      transactionId: transaction_id
    });

    res.send('success');
  } catch (error) {
    logger.error('处理支付回调失败', { error: error.message, stack: error.stack });
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
    logger.error('查询订单状态失败', { error: error.message, stack: error.stack });
    next(error);
  }
}

/**
 * 查询订单状态
 */
async function getOrder(req, res, next) {
  try {
    const { orderId } = req.params;

    const order = await Order.findOne({ orderId }).populate(
      'userId',
      'openid nickname'
    );

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
    logger.error('查询订单失败', { error: error.message, stack: error.stack });
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

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    const orders = await Order.find({ openid })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    const total = await Order.countDocuments({ openid });

    res.json({
      success: true,
      data: {
        orders,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          pages: Math.ceil(total / limitNum)
        }
      }
    });
  } catch (error) {
    logger.error('获取用户订单列表失败', { error: error.message, stack: error.stack });
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
