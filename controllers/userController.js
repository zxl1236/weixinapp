/**
 * 用户控制器
 */

const { User } = require('../models');
const logger = require('../utils/logger');
const { code2Session } = require('../services/wechatAuth');

/**
 * 用户注册/登录
 * 支持两种方式：
 * 1. 直接传入 openid（保持兼容）
 * 2. 传入 code，通过 code2Session 获取 openid（自动登录）
 */
async function register(req, res, next) {
  try {
    const { openid, code, nickname, avatar } = req.body;

    let finalOpenid = openid;

    // 如果传入了 code，优先使用 code 获取 openid
    if (code) {
      try {
        const sessionData = await code2Session(code);
        finalOpenid = sessionData.openid;
        logger.info('通过 code 获取 openid 成功', { 
          openid: finalOpenid.substring(0, 10) + '...' 
        });
      } catch (error) {
        logger.error('code2Session 失败', { error: error.message });
        return res.status(400).json({
          success: false,
          message: `登录失败: ${error.message}`
        });
      }
    }

    // 如果既没有 openid 也没有 code，返回错误
    if (!finalOpenid) {
      return res.status(400).json({
        success: false,
        message: 'openid 或 code 参数必填其一'
      });
    }

    const user = await User.findOrCreate(finalOpenid, { nickname, avatar });

    res.json({
      success: true,
      data: {
        openid: user.openid,
        nickname: user.nickname,
        avatar: user.avatar,
        membership: user.membership,
        membershipExpireTime: user.membershipExpireTime,
        totalTestCount: user.totalTestCount,
        registerTime: user.registerTime
      }
    });
  } catch (error) {
    logger.error('用户注册失败', error);
    next(error);
  }
}

/**
 * 获取用户信息
 */
async function getUser(req, res, next) {
  try {
    const { openid } = req.params;

    const user = await User.findOne({ openid });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      });
    }

    // 检查会员是否过期
    if (user.checkMembershipExpired()) {
      user.membership = 'free';
      user.membershipExpireTime = null;
      await user.save();
    }

    res.json({
      success: true,
      data: {
        openid: user.openid,
        nickname: user.nickname,
        avatar: user.avatar,
        membership: user.membership,
        membershipExpireTime: user.membershipExpireTime,
        dailyUsage: user.dailyUsage,
        totalTestCount: user.totalTestCount,
        registerTime: user.registerTime,
        lastActiveTime: user.lastActiveTime
      }
    });
  } catch (error) {
    logger.error('获取用户信息失败', error);
    next(error);
  }
}

/**
 * 更新用户信息
 */
async function updateUser(req, res, next) {
  try {
    const { openid } = req.params;
    const { nickname, avatar } = req.body;

    const user = await User.findOne({ openid });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      });
    }

    if (nickname !== undefined) user.nickname = nickname;
    if (avatar !== undefined) user.avatar = avatar;
    user.lastActiveTime = new Date();

    await user.save();

    res.json({
      success: true,
      data: {
        openid: user.openid,
        nickname: user.nickname,
        avatar: user.avatar,
        lastActiveTime: user.lastActiveTime
      }
    });
  } catch (error) {
    logger.error('更新用户信息失败', error);
    next(error);
  }
}

/**
 * 获取用户统计
 */
async function getUserStats(req, res, next) {
  try {
    const { openid } = req.params;

    const user = await User.findOne({ openid });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      });
    }

    // 检查会员是否过期
    if (user.checkMembershipExpired()) {
      user.membership = 'free';
      user.membershipExpireTime = null;
      await user.save();
    }

    res.json({
      success: true,
      data: {
        membership: {
          type: user.membership,
          isPremium: user.membership === 'premium',
          expireTime: user.membershipExpireTime
        },
        dailyUsage: user.dailyUsage,
        totalTestCount: user.totalTestCount,
        registerTime: user.registerTime,
        lastActiveTime: user.lastActiveTime
      }
    });
  } catch (error) {
    logger.error('获取用户统计失败', error);
    next(error);
  }
}

module.exports = {
  register,
  getUser,
  updateUser,
  getUserStats
};

