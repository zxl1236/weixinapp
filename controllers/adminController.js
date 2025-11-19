/**
 * 管理后台控制器
 */

const { User, Course, Order, DiscountCode } = require('../models');
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

    res.json({
      success: true,
      data: {
        users,
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

    if (membership) {
      user.membership = membership;
    }
    if (expireTime !== undefined) {
      user.membershipExpireTime = expireTime ? new Date(expireTime) : null;
    }

    await user.save();

    res.json({
      success: true,
      data: user
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
  createDiscountCode
};

