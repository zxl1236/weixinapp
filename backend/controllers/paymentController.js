/**
 * 支付控制器
 */

const { Order, User, DiscountCode } = require('../models');
const wechatPay = require('../services/wechatPay');
const logger = require('../utils/logger');
const { parseString } = require('xml2js');

/**
 * 本地订单号生成工具
 * 形如：ORD20251123012340123
 */
function generateOrderId() {
  const now = new Date();
  const yyyyMMdd = now.toISOString().slice(0, 10).replace(/-/g, ''); // 20251123
  const ms = now.getTime().toString().slice(-5); // 时间戳后5位
  const rand = Math.floor(Math.random() * 1000).toString().padStart(3, '0'); // 000~999
  return `ORD${yyyyMMdd}${ms}${rand}`;
}

/**
 * 微信支付 V2 回调：正确的 XML 响应
 */
function wechatV2ReplySuccess(res) {
  res.set('Content-Type', 'text/xml');
  return res.send(
    '<xml><return_code><![CDATA[SUCCESS]]></return_code><return_msg><![CDATA[OK]]></return_msg></xml>'
  );
}
function wechatV2ReplyFail(res, msg = 'FAIL') {
  res.set('Content-Type', 'text/xml');
  return res.send(
    `<xml><return_code><![CDATA[FAIL]]></return_code><return_msg><![CDATA[${msg}]]></return_msg></xml>`
  );
}

/**
 * 解析 XML（Promise 版）
 */
function parseXmlAsync(xmlBody) {
  return new Promise((resolve, reject) => {
    parseString(xmlBody, { trim: true, explicitArray: false }, (err, result) => {
      if (err) return reject(err);
      resolve(result?.xml || result);
    });
  });
}

/**
 * 简单并发锁（单进程 fork 模式下有效）
 * 目的：降低微信重试/并发回调导致的重复处理概率
 */
const processingOrders = new Map(); // orderId -> timestamp(ms)
function acquireOrderLock(orderId, ttlMs = 30_000) {
  const now = Date.now();
  const existed = processingOrders.get(orderId);
  if (existed && now - existed < ttlMs) return false;
  processingOrders.set(orderId, now);
  return true;
}
function releaseOrderLock(orderId) {
  processingOrders.delete(orderId);
}

/**
 * 创建订单
 */
async function createOrder(req, res, next) {
  try {
    const { openid, planId, planName, price, originalPrice, discountCode, duration } = req.body || {};

    if (!openid || !planId || !planName || !price || !duration) {
      return res.status(400).json({ success: false, message: '缺少必要参数' });
    }

    // 验证用户是否存在
    const user = await User.findOne({ openid });
    if (!user) {
      return res.status(404).json({ success: false, message: '用户不存在' });
    }

    // 检查是否有未支付的订单（防止重复支付）
    // SQLite 不支持 $ne，需要查询所有订单然后过滤
    const allOrders = await (Order.find({ openid }).exec ? Order.find({ openid }).exec() : Order.find({ openid }));
    const unpaidOrders = (allOrders || []).filter(o => o.status !== 'paid');

    if (unpaidOrders.length > 0) {
      const recentOrder = unpaidOrders
        .sort((a, b) => {
          const timeA = new Date(a.createdAt || a.created_at || 0).getTime();
          const timeB = new Date(b.createdAt || b.created_at || 0).getTime();
          return timeB - timeA;
        })[0];

      const createdAt = recentOrder.createdAt || recentOrder.created_at;
      const orderAge = createdAt ? Date.now() - new Date(createdAt).getTime() : Number.MAX_SAFE_INTEGER;
      const thirtyMinutes = 30 * 60 * 1000;

      if (orderAge < thirtyMinutes) {
        return res.status(400).json({
          success: false,
          message: '您有未完成的订单，请先完成支付或等待订单过期',
          existingOrderId: recentOrder.orderId
        });
      } else {
        logger.info('旧订单已过期，允许创建新订单', {
          oldOrderId: recentOrder.orderId,
          orderAge: Math.round(orderAge / 1000 / 60) + '分钟'
        });
      }
    }

    // 处理优惠码
    let finalPrice = Number(price);
    let discountAmount = 0;
    let usedDiscountCode = null;

    if (discountCode) {
      const code = await DiscountCode.findOne({ code: String(discountCode).toUpperCase() });
      if (code && code.isValid && code.isValid()) {
        discountAmount = code.calculateDiscount ? code.calculateDiscount(originalPrice || price) : 0;
        finalPrice = Math.max(0, Number(originalPrice || price) - Number(discountAmount || 0));
        usedDiscountCode = code.code;
      }
    }

    // 生成订单号
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
      amount: Math.round(Number(finalPrice) * 100), // 分
      // 注意：以下字段单位/含义依赖你模型既有定义；为避免破坏前端/旧数据，这里保持原写法
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
      return res.status(400).json({ success: false, message: '订单号必填' });
    }

    const order = await Order.findOne({ orderId });
    if (!order) {
      return res.status(404).json({ success: false, message: '订单不存在' });
    }

    if (order.status !== 'pending') {
      return res.status(400).json({ success: false, message: '订单状态不正确' });
    }

    if (order.isExpired && order.isExpired()) {
      order.status = 'cancelled';
      await order.save();
      return res.status(400).json({ success: false, message: '订单已过期' });
    }

    // 创建微信支付
    const paymentResult = await wechatPay.createPayment({
      orderId: order.orderId,
      openid: order.openid,
      amount: order.amount, // 分
      planName: order.planName,
      body: `K12词汇学习系统-${order.planName}`,
      // 优惠相关参数（如你服务端/微信侧不需要，可忽略）
      discountAmount: order.discountAmount || 0,
      discountCode: order.discountCode || null
    });

    if (!paymentResult.success) {
      logger.error('创建支付失败', {
        orderId: order.orderId,
        error: paymentResult.message,
        amount: order.amount
      });
      return res.status(500).json({ success: false, message: paymentResult.message || '创建支付失败' });
    }

    // 保存预支付ID
    order.wxPrepayId = paymentResult.prepayId;
    await order.save();

    return res.json({ success: true, data: paymentResult.paymentParams });
  } catch (error) {
    logger.error('获取支付参数失败', { error: error.message, stack: error.stack });
    next(error);
  }
}

/**
 * 微信支付回调（v2 API，XML 格式）
 */
async function paymentNotify(req, res, next) {
  let out_trade_no = null;
  let transaction_id = null;

  try {
    let xmlBody = req.body;

    // 如果是Buffer，转换为字符串
    if (Buffer.isBuffer(xmlBody)) {
      xmlBody = xmlBody.toString('utf8');
    }

    if (!xmlBody || typeof xmlBody !== 'string') {
      logger.error('支付回调数据格式错误', { bodyType: typeof xmlBody });
      return wechatV2ReplyFail(res, 'invalid body');
    }

    logger.info('收到支付回调', { bodyPreview: xmlBody.substring(0, 200) });

    // 解析 XML
    const notifyData = await parseXmlAsync(xmlBody);

    out_trade_no = notifyData?.out_trade_no || null;
    transaction_id = notifyData?.transaction_id || null;

    logger.info('支付回调解析成功', {
      return_code: notifyData?.return_code,
      result_code: notifyData?.result_code,
      out_trade_no
    });

    // 基本字段校验
    if (!out_trade_no) {
      logger.warn('支付回调缺少订单号', { notifyData });
      return wechatV2ReplyFail(res, 'missing out_trade_no');
    }

    // 并发锁（降低并发重复处理概率）
    if (!acquireOrderLock(out_trade_no)) {
      logger.warn('订单回调正在处理中，跳过本次重复通知', { orderId: out_trade_no });
      return wechatV2ReplySuccess(res);
    }

    // 验证签名（仍然以你的 verifyNotify 为准）
    const isValid = await wechatPay.verifyNotify(xmlBody);
    if (!isValid) {
      logger.warn('支付回调签名验证失败', { orderId: out_trade_no });
      return wechatV2ReplyFail(res, 'invalid signature');
    }

    // 检查返回码
    if (notifyData.return_code !== 'SUCCESS') {
      logger.error('支付回调 return_code 错误', {
        return_code: notifyData.return_code,
        return_msg: notifyData.return_msg
      });
      return wechatV2ReplyFail(res, 'return_code not success');
    }

    // 检查支付结果
    if (notifyData.result_code !== 'SUCCESS') {
      logger.warn('支付失败（微信回调 result_code != SUCCESS）', {
        orderId: out_trade_no,
        err_code: notifyData.err_code,
        err_code_des: notifyData.err_code_des
      });
      // 对微信而言：失败也需要返回 SUCCESS（否则会一直重试）
      return wechatV2ReplySuccess(res);
    }

    const order = await Order.findOne({ orderId: out_trade_no });
    if (!order) {
      logger.warn('支付回调订单不存在', { orderId: out_trade_no });
      // 订单不存在也返回 SUCCESS，避免微信持续重试轰炸
      return wechatV2ReplySuccess(res);
    }

    // 金额一致性校验（强烈建议）
    const total_fee = Number(notifyData.total_fee || 0); // 分
    if (total_fee && Number(order.amount) && total_fee !== Number(order.amount)) {
      logger.error('支付金额不一致，拒绝处理', {
        orderId: out_trade_no,
        total_fee,
        orderAmount: order.amount
      });
      return wechatV2ReplyFail(res, 'amount mismatch');
    }

    // 幂等：订单已处理直接返回 SUCCESS
    if (order.status === 'paid') {
      logger.info('订单已处理，跳过重复处理', { orderId: out_trade_no });
      return wechatV2ReplySuccess(res);
    }

    // 更新订单状态
    if (order.markAsPaid) {
      await order.markAsPaid(transaction_id);
    } else {
      order.status = 'paid';
      order.paidTime = new Date();
      order.wxTransactionId = transaction_id;
      await order.save();
    }

    // 更新用户会员状态
    let user = null;
    if (order.userId) {
      user = await User.findById(order.userId);
    } else if (order.openid) {
      user = await User.findOne({ openid: order.openid });
    }

    if (user) {
      // 会员到期时间规则：从付款成功后开始计算；duration 不存在则默认 365 天
      const durationDays = Number(order.duration) || 365;
      const paidAt = order.paidTime ? new Date(order.paidTime) : new Date();

      const expireTime = new Date(paidAt);
      expireTime.setDate(expireTime.getDate() + durationDays);

      user.membership = 'premium';
      user.membershipExpireTime = expireTime;
      await user.save();

      logger.info('用户会员状态已更新', {
        userId: user.id || user._id,
        openid: user.openid,
        durationDays,
        paidAt: paidAt.toISOString(),
        expireTime: expireTime.toISOString()
      });
    } else {
      logger.warn('支付成功但未找到用户', {
        orderId: order.orderId,
        userId: order.userId,
        openid: order.openid
      });
    }

    // 更新优惠码使用次数（注意：若回调被并发处理，仍可能重复消耗；建议在模型层做幂等）
    if (order.discountCode) {
      const discountCode = await DiscountCode.findOne({ code: order.discountCode });
      if (discountCode && discountCode.use) {
        await discountCode.use();
      }
    }

    logger.info('支付成功处理完成', {
      orderId: order.orderId,
      transactionId: transaction_id
    });

    return wechatV2ReplySuccess(res);
  } catch (error) {
    logger.error('处理支付回调失败', {
      orderId: out_trade_no,
      transactionId: transaction_id,
      error: error.message,
      stack: error.stack
    });
    // 微信回调场景：不建议返回 500（会导致反复重试）；除非你明确希望微信继续推送
    return wechatV2ReplyFail(res, 'internal error');
  } finally {
    if (out_trade_no) releaseOrderLock(out_trade_no);
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
      return res.status(400).json({ success: false, message: '订单号必填' });
    }

    // 1. 查订单
    const order = await Order.findOne({ orderId });
    if (!order) {
      return res.status(404).json({ success: false, message: '订单不存在' });
    }

    // 2. 查用户
    let user = null;
    if (order.userId) {
      user = await User.findById(order.userId);
    } else if (order.openid) {
      user = await User.findOne({ openid: order.openid });
    }

    // 3. 构建会员状态（含兜底修复写回）
    let membershipStatus = null;

    if (user) {
      let currentMembership = user.membership || 'free';
      let currentExpireTime = user.membershipExpireTime || null;

      const isOrderPaid = order.status === 'paid';
      const isUserFree = currentMembership !== 'premium';
      const isExpiredInDb = currentExpireTime && new Date(currentExpireTime) < new Date();
      const isExpireMissing = !currentExpireTime;

      if (isOrderPaid && (isUserFree || isExpiredInDb || isExpireMissing)) {
        logger.warn('检测到数据同步延迟：订单已支付但用户状态未更新，正在修正并写回', {
          orderId: order.orderId,
          userId: user.id || user._id
        });

        currentMembership = 'premium';

        const paidTime = order.paidTime ? new Date(order.paidTime) : new Date();
        const durationDays = Number(order.duration) || 365;

        const newExpireTime = new Date(paidTime);
        newExpireTime.setDate(newExpireTime.getDate() + durationDays);

        user.membership = 'premium';
        user.membershipExpireTime = newExpireTime;
        await user.save();

        currentExpireTime = newExpireTime;
      }

      // 日期格式兼容（SQLite 可能返回字符串）
      let expireTimeForResponse = currentExpireTime;
      if (expireTimeForResponse && typeof expireTimeForResponse === 'string') {
        // 保持字符串
      } else if (expireTimeForResponse && expireTimeForResponse.toISOString) {
        expireTimeForResponse = expireTimeForResponse.toISOString();
      } else if (expireTimeForResponse instanceof Date) {
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
        membershipStatus
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
        membershipStatus,
        user: user
          ? {
              id: user.id || user._id,
              openid: user.openid,
              nickname: user.nickname,
              avatar: user.avatar,
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

    let query = Order.findOne({ orderId });
    // SQLite 兼容：如果没有 populate，则跳过
    if (query && typeof query.populate === 'function') {
      query = query.populate('userId', 'openid nickname');
    }

    const order = await query;

    if (!order) {
      return res.status(404).json({ success: false, message: '订单不存在' });
    }

    return res.json({ success: true, data: order });
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

    // 兼容 SQLite：如果 sort/skip/limit 不可用，则降级为内存分页
    let ordersResult = Order.find({ openid });
    let orders;

    const canChain =
      ordersResult &&
      typeof ordersResult.sort === 'function' &&
      typeof ordersResult.skip === 'function' &&
      typeof ordersResult.limit === 'function';

    if (canChain) {
      orders = await ordersResult.sort({ createdAt: -1 }).skip(skip).limit(limitNum);
    } else {
      const all = await (ordersResult.exec ? ordersResult.exec() : ordersResult);
      const allSorted = (all || []).sort((a, b) => {
        const ta = new Date(a.createdAt || a.created_at || 0).getTime();
        const tb = new Date(b.createdAt || b.created_at || 0).getTime();
        return tb - ta;
      });
      orders = allSorted.slice(skip, skip + limitNum);
    }

    // total 兼容：countDocuments 可能不存在
    let total = 0;
    if (typeof Order.countDocuments === 'function') {
      total = await Order.countDocuments({ openid });
    } else {
      const all = await (Order.find({ openid }).exec ? Order.find({ openid }).exec() : Order.find({ openid }));
      total = (all || []).length;
    }

    return res.json({
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
