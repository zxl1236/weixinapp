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

    // 检查是否有未支付的订单（防止重复支付）
    // SQLite 不支持 $ne，需要查询所有订单然后过滤
    const allOrders = await Order.find({ openid }).exec();
    const unpaidOrders = allOrders.filter(order => order.status !== 'paid');
    
    if (unpaidOrders.length > 0) {
      // 检查最近的未支付订单是否过期（超过30分钟）
      const recentOrder = unpaidOrders.sort((a, b) => {
        const timeA = new Date(a.createdAt || a.created_at || 0).getTime();
        const timeB = new Date(b.createdAt || b.created_at || 0).getTime();
        return timeB - timeA; // 最新的在前
      })[0];
      
      const orderAge = Date.now() - new Date(recentOrder.createdAt || recentOrder.created_at).getTime();
      const thirtyMinutes = 30 * 60 * 1000;
      
      if (orderAge < thirtyMinutes) {
        return res.status(400).json({
          success: false,
          message: '您有未完成的订单，请先完成支付或等待订单过期',
          existingOrderId: recentOrder.orderId
        });
      } else {
        // 订单已过期，可以创建新订单
        logger.info('旧订单已过期，允许创建新订单', {
          oldOrderId: recentOrder.orderId,
          orderAge: Math.round(orderAge / 1000 / 60) + '分钟'
        });
      }
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
      // 会员续期规则：
      // - 如果用户当前仍在会员期内：从当前到期时间续期（避免“买一年反而变短”）
      // - 如果已过期或是免费：从支付时间/当前时间开始计算
      const durationDays = Number(order.duration) || 0;
      const now = new Date();
      const paidAt = order.paidTime ? new Date(order.paidTime) : now;
      const currentExpire = user.membershipExpireTime ? new Date(user.membershipExpireTime) : null;

      const baseTime =
        user.membership === 'premium' &&
        currentExpire &&
        !isNaN(currentExpire.getTime()) &&
        currentExpire > now
          ? currentExpire
          : paidAt;

      const expireTime = new Date(baseTime);
      expireTime.setDate(expireTime.getDate() + durationDays);

      user.membership = 'premium';
      user.membershipExpireTime = expireTime;
      await user.save(); // SQLite 模式下 save 已实现真正 UPDATE

      logger.info('用户会员状态已更新', {
        userId: user.id,
        openid: user.openid,
        durationDays,
        baseTime,
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
 * 修改重点：增加"兜底逻辑"，如果订单已支付，强制返回会员状态
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

    // 1. 查订单 (这是最关键的凭证)
    const order = await Order.findOne({ orderId });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: '订单不存在'
      });
    }

    // 2. 查用户
    let user = null;
    if (order.userId) {
      user = await User.findById(order.userId);
    } else if (order.openid) {
      user = await User.findOne({ openid: order.openid });
    }

    // 3. 构建会员状态 (核心修改都在这里)
    let membershipStatus = null;
    if (user) {
      // 获取数据库中当前的会员信息
      let currentMembership = user.membership || 'free';
      let currentExpireTime = user.membershipExpireTime || null;

      // -----------------------------------------------------------------
      // ⭐ 关键修复：双重确认逻辑
      // 如果 订单是已支付(paid) 状态，但 用户表还是免费(free) 或 过期
      // -----------------------------------------------------------------
      const isOrderPaid = order.status === 'paid';
      const isUserFree = currentMembership !== 'premium';
      
      // 检查当前时间是否超过了数据库里的过期时间
      const isExpiredInDb = currentExpireTime && new Date(currentExpireTime) < new Date();

      if (isOrderPaid && (isUserFree || isExpiredInDb)) {
        logger.warn('检测到数据同步延迟：订单已支付但用户状态未更新，正在修正返回数据', {
          orderId: order.orderId,
          userId: user.id || user._id
        });

        // ✅ 关键修复：这里不仅修正响应，还要把会员状态真正写回数据库
        currentMembership = 'premium';

        const paidTime = order.paidTime ? new Date(order.paidTime) : new Date();
        const durationDays = Number(order.duration) || 365; // 默认值防错

        const newExpireTime = new Date(paidTime);
        newExpireTime.setDate(newExpireTime.getDate() + durationDays);

        // 写回数据库（SQLite 模式下 save 已实现 UPDATE）
        user.membership = 'premium';
        user.membershipExpireTime = newExpireTime;
        await user.save();

        currentExpireTime = newExpireTime;
      }

      // -----------------------------------------------------------------
      // 处理日期格式（SQLite 返回字符串，MongoDB 返回 Date）
      let expireTimeForResponse = currentExpireTime;
      if (expireTimeForResponse && typeof expireTimeForResponse === 'string') {
        // SQLite 返回的字符串，保持字符串格式
        expireTimeForResponse = expireTimeForResponse;
      } else if (expireTimeForResponse && expireTimeForResponse.toISOString) {
        // MongoDB 返回的 Date 对象，转换为 ISO 字符串
        expireTimeForResponse = expireTimeForResponse.toISOString();
      } else if (expireTimeForResponse instanceof Date) {
        // 如果是新计算的 Date 对象，转换为 ISO 字符串
        expireTimeForResponse = expireTimeForResponse.toISOString();
      } else {
        expireTimeForResponse = null;
      }

      membershipStatus = {
        type: currentMembership === 'premium' ? 'premium' : 'free',
        isPremium: currentMembership === 'premium',
        expireTime: expireTimeForResponse
      };

      logger.info('completePayment 返回会员状态', {
        orderId: order.orderId,
        userId: user.id || user._id,
        membershipStatus // 这里打印的一定要是修正后的状态
      });
    } else {
      logger.warn('completePayment 未找到用户', {
        orderId: order.orderId,
        userId: order.userId,
        openid: order.openid
      });
    }

    // 4. 返回订单 + 会员信息
    return res.json({
      success: true,
      data: {
        orderId: order.orderId,
        status: order.status,
        paidTime: order.paidTime || null,
        membershipStatus,   // ⭐ 前端使用的是这个修正后的数据
        user: user
          ? {
              id: user.id || user._id,
              openid: user.openid,
              nickname: user.nickname,
              avatar: user.avatar,
              // 这里也返回修正后的状态，保持一致性
              membership: membershipStatus?.type || user.membership,
              membershipExpireTime: membershipStatus?.expireTime || user.membershipExpireTime
            }
          : null
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
