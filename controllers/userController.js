/**
 * 用户控制器
 */

const { User, ActivationCode } = require('../models');
const logger = require('../utils/logger');
const { code2Session } = require('../services/wechatAuth');

/**
 * 用户注册/登录（首登即落库）
 * 支持两种方式：
 * 1. 直接传入 openid（保持兼容）
 * 2. 传入 code，通过 code2Session 获取 openid（小程序推荐）
 *
 * 逻辑：
 * - 如果传 code，则优先通过 code 换取 openid；
 * - 如果最终拿不到 openid，则返回 400；
 * - 手动查找用户，不存在则创建，存在则更新 nickname/avatar；
 * - 每次调用都会更新 lastActiveTime；
 * - 返回统一的用户信息结构，包含 user.id。
 */
async function register(req, res, next) {
  try {
    const { openid, code, nickname, avatar } = req.body || {};

    let finalOpenid = openid;

    // 1) 如果传入了 code，优先通过 code 换 openid（小程序推荐走这里）
    if (code) {
      try {
        const sessionData = await code2Session(code);
        finalOpenid = sessionData.openid;
        logger.info('通过 code 获取 openid 成功', {
          openid: finalOpenid
            ? finalOpenid.substring(0, 10) + '...'
            : 'unknown'
        });
      } catch (error) {
        logger.error('code2Session 失败', { error: error.message });
        return res.status(400).json({
          success: false,
          message: `登录失败: ${error.message}`
        });
      }
    }

    // 2) code 和 openid 至少要有一个
    if (!finalOpenid) {
      return res.status(400).json({
        success: false,
        message: 'openid 或 code 参数必填其一'
      });
    }

    // 3) 先找用户，不存在再创建（只用 openid 创建）
    let user = await User.findOne({ openid: finalOpenid });
    if (!user) {
      user = await User.create({
        openid: finalOpenid,
        nickname: nickname || '微信用户',
        avatar: avatar || '',
        registerTime: new Date(),
        membership: 'free'
      });
    } else {
      // 4) 已经存在的用户：允许用本次传入的昵称 / 头像覆盖
      if (nickname !== undefined) user.nickname = nickname;
      if (avatar !== undefined) user.avatar = avatar;
    }

    // 5) 每次调用视为一次活跃，更新 lastActiveTime
    user.lastActiveTime = new Date();
    await user.save();

    // 6) 返回统一的用户信息结构，包含 user.id
    return res.json({
      success: true,
      data: {
        id: user.id,                     // ⭐ 给前端一个自增 id
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
    logger.error('用户注册失败', { error: error.message, stack: error.stack });
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
        lastActiveTime: user.lastActiveTime,
        isActivated: user.isActivated || false,
        activatedAt: user.activatedAt
      }
    });
  } catch (error) {
    logger.error('获取用户信息失败', { error: error.message, stack: error.stack });
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
    logger.error('更新用户信息失败', { error: error.message, stack: error.stack });
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
        lastActiveTime: user.lastActiveTime,
        isActivated: user.isActivated || false,
        activatedAt: user.activatedAt
      }
    });
  } catch (error) {
    logger.error('获取用户统计失败', { error: error.message, stack: error.stack });
    next(error);
  }
}

/**
 * 验证并激活激活码
 */
async function verifyActivationCode(req, res, next) {
  try {
    const { code, openid } = req.body;

    if (!code) {
      return res.status(400).json({
        success: false,
        message: '激活码不能为空'
      });
    }

    if (!openid) {
      return res.status(400).json({
        success: false,
        message: 'openid 不能为空'
      });
    }

    // 查找激活码
    const activationCode = await ActivationCode.findOne({ code: code.toUpperCase() });

    if (!activationCode) {
      return res.status(404).json({
        success: false,
        message: '激活码不存在'
      });
    }

    // 检查激活码是否已被使用
    if (activationCode.used) {
      return res.status(400).json({
        success: false,
        message: '激活码已被使用'
      });
    }

    // 查找用户
    const user = await User.findOne({ openid });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      });
    }

    // 检查用户是否已激活
    if (user.isActivated) {
      return res.status(400).json({
        success: false,
        message: '用户已激活，无需重复激活'
      });
    }

    // 使用激活码
    await activationCode.use(openid);

    // 激活用户
    user.isActivated = true;
    user.activatedAt = new Date();
    await user.save();

    logger.info('用户激活成功', {
      openid: openid.substring(0, 10) + '...',
      code: code.toUpperCase()
    });

    res.json({
      success: true,
      message: '激活成功',
      data: {
        isActivated: true,
        activatedAt: user.activatedAt
      }
    });
  } catch (error) {
    logger.error('验证激活码失败', { error: error.message, stack: error.stack });
    next(error);
  }
}

module.exports = {
  register,
  getUser,
  updateUser,
  getUserStats,
  verifyActivationCode
};
