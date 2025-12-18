/**
 * 管理后台控制器
 */

const { User, Course, Order, DiscountCode, ActivationCode } = require('../models');
const logger = require('../utils/logger');

/**
 * 获取用户列表
 */
async function getUsers(req, res, next) {
  try {
    const { page = 1, limit = 20, membership, keyword } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const query = {};
    if (membership) query.membership = membership;
    if (keyword) {
      query.$or = [
        { openid: { $regex: keyword, $options: 'i' } },
        { nickname: { $regex: keyword, $options: 'i' } }
      ];
    }

    const users = await User.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await User.countDocuments(query);

    // 为每个用户添加订单统计信息
    const dbConfig = require('../config/database');
    const isSQLite = dbConfig.type === 'sqlite';
    
    const usersWithStats = await Promise.all(
      users.map(async (user) => {
        let orderStats = {
          totalOrders: 0,
          paidOrders: 0,
          totalSpent: 0
        };

        // 查找已支付订单（用于同步会员状态）
        let paidOrders = [];
        
        if (isSQLite && Order.db) {
          // SQLite模式：直接查询数据库
          const db = Order.db;
          
          // 总订单数
          const totalOrdersRow = await db.get(
            'SELECT COUNT(*) as count FROM orders WHERE openid = ?',
            [user.openid]
          );
          orderStats.totalOrders = totalOrdersRow?.count || 0;

          // 已支付订单数
          const paidOrdersRow = await db.get(
            'SELECT COUNT(*) as count FROM orders WHERE openid = ? AND status = ?',
            [user.openid, 'paid']
          );
          orderStats.paidOrders = paidOrdersRow?.count || 0;

          // 总消费金额（分）
          const totalSpentRow = await db.get(
            'SELECT SUM(amount) as total FROM orders WHERE openid = ? AND status = ?',
            [user.openid, 'paid']
          );
          orderStats.totalSpent = totalSpentRow?.total || 0;

          // 获取已支付订单详情（用于同步会员状态）
          if (orderStats.paidOrders > 0) {
            const paidOrdersRows = await db.all(
              'SELECT * FROM orders WHERE openid = ? AND status = ? ORDER BY paidTime DESC, createdAt DESC',
              [user.openid, 'paid']
            );
            paidOrders = paidOrdersRows || [];
          }
        } else {
          // MongoDB模式：使用聚合查询
          try {
            const orders = await Order.find({ openid: user.openid });
            orderStats.totalOrders = orders.length;
            paidOrders = orders.filter(o => o.status === 'paid');
            orderStats.paidOrders = paidOrders.length;
            orderStats.totalSpent = paidOrders.reduce((sum, o) => sum + (o.amount || 0), 0);
          } catch (error) {
            logger.warn('获取用户订单统计失败', { openid: user.openid, error: error.message });
          }
        }

        // ⭐ 关键修复：检查订单状态，同步用户会员状态
        if (paidOrders.length > 0) {
          const currentMembership = user.membership || 'free';
          const currentExpireTime = user.membershipExpireTime ? new Date(user.membershipExpireTime) : null;
          const now = new Date();
          const isExpired = currentExpireTime && currentExpireTime < now;
          const isUserFree = currentMembership !== 'premium';

          // 如果用户有已支付订单，但会员状态是免费或已过期，需要修正
          if (isUserFree || isExpired) {
            // 找到最近的已支付订单
            const latestPaidOrder = paidOrders[0];
            const paidTime = latestPaidOrder.paidTime ? new Date(latestPaidOrder.paidTime) : 
                           (latestPaidOrder.createdAt ? new Date(latestPaidOrder.createdAt) : new Date());
            const durationDays = Number(latestPaidOrder.duration) || 365;

            // 计算新的过期时间
            // 会员到期时间规则：始终从付款成功后开始计算，固定为365天（一年）
            const newExpireTime = new Date(paidTime);
            newExpireTime.setDate(newExpireTime.getDate() + durationDays);

            // 更新用户会员状态
            user.membership = 'premium';
            user.membershipExpireTime = newExpireTime;
            await user.save();

            logger.info('后台管理：检测到数据不一致，已同步用户会员状态', {
              openid: user.openid,
              userId: user.id || user._id,
              orderId: latestPaidOrder.orderId,
              oldMembership: currentMembership,
              newExpireTime
            });

            // 更新返回的用户对象
            user.membership = 'premium';
            user.membershipExpireTime = newExpireTime;
          }
        }

        return {
          ...user,
          orderStats
        };
      })
    );

    res.json({
      success: true,
      data: {
        users: usersWithStats,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });
  } catch (error) {
    logger.error('获取用户列表失败', error);
    next(error);
  }
}

/**
 * 获取用户详情
 */
async function getUserDetail(req, res, next) {
  try {
    const { id } = req.params;

    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      });
    }

    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    logger.error('获取用户详情失败', error);
    next(error);
  }
}

/**
 * 修改用户会员状态
 */
async function updateUserMembership(req, res, next) {
  try {
    const { id } = req.params;
    const { membership, expireTime } = req.body;

    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      });
    }

    // 更新会员状态
    if (membership !== undefined) {
      user.membership = membership;
      // 如果设置为免费，清空过期时间
      if (membership === 'free') {
        user.membershipExpireTime = null;
      }
    }
    
    // 更新过期时间
    if (expireTime !== undefined) {
      if (expireTime) {
        user.membershipExpireTime = new Date(expireTime);
        // 如果设置了过期时间，自动设置为会员
        if (user.membership !== 'premium') {
          user.membership = 'premium';
        }
      } else {
        user.membershipExpireTime = null;
        // 如果清空过期时间，自动设置为免费
        if (user.membership === 'premium') {
          user.membership = 'free';
        }
      }
    }

    await user.save();

    logger.info('后台管理：用户会员状态已更新', {
      userId: user.id || user._id,
      openid: user.openid,
      membership: user.membership,
      expireTime: user.membershipExpireTime
    });

    res.json({
      success: true,
      data: {
        id: user.id || user._id,
        openid: user.openid,
        membership: user.membership,
        membershipExpireTime: user.membershipExpireTime,
        nickname: user.nickname,
        avatar: user.avatar
      }
    });
  } catch (error) {
    logger.error('修改用户会员状态失败', error);
    next(error);
  }
}

/**
 * 获取课程列表（管理）
 */
async function getCourses(req, res, next) {
  try {
    const courses = await Course.find().sort({ level: 1, gradeId: 1 });

    res.json({
      success: true,
      data: courses
    });
  } catch (error) {
    logger.error('获取课程列表失败', error);
    next(error);
  }
}

/**
 * 创建课程
 */
async function createCourse(req, res, next) {
  try {
    const course = await Course.create(req.body);

    res.status(201).json({
      success: true,
      data: course
    });
  } catch (error) {
    logger.error('创建课程失败', error);
    next(error);
  }
}

/**
 * 获取课程详情
 */
async function getCourseDetail(req, res, next) {
  try {
    const { id } = req.params;

    const course = await Course.findById(id);

    if (!course) {
      return res.status(404).json({
        success: false,
        message: '课程不存在'
      });
    }

    res.json({
      success: true,
      data: course
    });
  } catch (error) {
    logger.error('获取课程详情失败', error);
    next(error);
  }
}

/**
 * 更新课程
 */
async function updateCourse(req, res, next) {
  try {
    const { id } = req.params;

    const course = await Course.findByIdAndUpdate(
      id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!course) {
      return res.status(404).json({
        success: false,
        message: '课程不存在'
      });
    }

    res.json({
      success: true,
      data: course
    });
  } catch (error) {
    logger.error('更新课程失败', error);
    next(error);
  }
}

/**
 * 获取订单列表
 */
async function getOrders(req, res, next) {
  try {
    const { page = 1, limit = 20, status, startDate, endDate } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const query = {};
    if (status) query.status = status;
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const orders = await Order.find(query)
      .populate('userId', 'openid nickname')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Order.countDocuments(query);

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
    logger.error('获取订单列表失败', error);
    next(error);
  }
}

/**
 * 获取订单详情
 */
async function getOrderDetail(req, res, next) {
  try {
    const { id } = req.params;

    const order = await Order.findById(id).populate('userId', 'openid nickname avatar');

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
    logger.error('获取订单详情失败', error);
    next(error);
  }
}

/**
 * 获取统计数据
 */
async function getStats(req, res, next) {
  try {
    const totalUsers = await User.countDocuments();
    const premiumUsers = await User.countDocuments({ membership: 'premium' });
    const totalOrders = await Order.countDocuments();
    const paidOrders = await Order.countDocuments({ status: 'paid' });
    const totalRevenue = await Order.aggregate([
      { $match: { status: 'paid' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);

    const recentOrders = await Order.find({ status: 'paid' })
      .sort({ paidTime: -1 })
      .limit(10)
      .populate('userId', 'openid nickname');

    res.json({
      success: true,
      data: {
        users: {
          total: totalUsers,
          premium: premiumUsers,
          free: totalUsers - premiumUsers
        },
        orders: {
          total: totalOrders,
          paid: paidOrders,
          revenue: totalRevenue[0]?.total || 0
        },
        recentOrders
      }
    });
  } catch (error) {
    logger.error('获取统计数据失败', error);
    next(error);
  }
}

/**
 * 获取优惠码列表
 */
async function getDiscountCodes(req, res, next) {
  try {
    const codes = await DiscountCode.find().sort({ createdAt: -1 });

    res.json({
      success: true,
      data: codes
    });
  } catch (error) {
    logger.error('获取优惠码列表失败', error);
    next(error);
  }
}

/**
 * 创建优惠码
 */
async function createDiscountCode(req, res, next) {
  try {
    const code = await DiscountCode.create(req.body);

    res.status(201).json({
      success: true,
      data: code
    });
  } catch (error) {
    logger.error('创建优惠码失败', error);
    next(error);
  }
}

/**
 * 生成随机激活码
 */
function generateActivationCode(length = 10) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // 排除容易混淆的字符
  let code = '';
  for (let i = 0; i < length; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

/**
 * 获取激活码列表
 */
async function getActivationCodes(req, res, next) {
  try {
    const { used } = req.query;
    const query = {};
    if (used !== undefined) {
      query.used = used === 'true';
    }
    
    const codes = await ActivationCode.find(query).sort({ createdAt: -1 });

    res.json({
      success: true,
      data: codes
    });
  } catch (error) {
    logger.error('获取激活码列表失败', error);
    next(error);
  }
}

/**
 * 生成激活码
 */
async function createActivationCode(req, res, next) {
  try {
    const { count = 1, length = 10 } = req.body;
    const codes = [];
    
    for (let i = 0; i < count; i++) {
      let code;
      let attempts = 0;
      let created = false;
      
      // 尝试生成唯一激活码（最多尝试10次）
      while (!created && attempts < 10) {
        code = generateActivationCode(length);
        try {
          const activationCode = await ActivationCode.create({ code });
          codes.push(activationCode);
          created = true;
        } catch (error) {
          // 如果是唯一性冲突，重试
          if (error.code === 11000 || error.message.includes('UNIQUE')) {
            attempts++;
            continue;
          }
          throw error;
        }
      }
      
      if (!created) {
        throw new Error('生成唯一激活码失败，请重试');
      }
    }

    res.status(201).json({
      success: true,
      data: codes,
      message: `成功生成 ${codes.length} 个激活码`
    });
  } catch (error) {
    logger.error('生成激活码失败', error);
    next(error);
  }
}

module.exports = {
  getUsers,
  getUserDetail,
  updateUserMembership,
  getCourses,
  getCourseDetail,
  createCourse,
  updateCourse,
  getOrders,
  getOrderDetail,
  getStats,
  getDiscountCodes,
  createDiscountCode,
  getActivationCodes,
  createActivationCode
};

