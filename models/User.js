/**
 * 用户数据模型
 */

const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  openid: {
    type: String,
    required: true,
    unique: true,
    index: true,
    trim: true
  },
  nickname: {
    type: String,
    default: ''
  },
  avatar: {
    type: String,
    default: ''
  },
  membership: {
    type: String,
    enum: ['free', 'premium'],
    default: 'free'
  },
  membershipExpireTime: {
    type: Date,
    default: null
  },
  dailyUsage: {
    date: {
      type: String,
      default: () => {
        const today = new Date();
        return `${today.getFullYear()}-${(today.getMonth() + 1).toString().padStart(2, '0')}-${today.getDate().toString().padStart(2, '0')}`;
      }
    },
    testCount: {
      type: Number,
      default: 0
    }
  },
  totalTestCount: {
    type: Number,
    default: 0
  },
  registerTime: {
    type: Date,
    default: Date.now
  },
  lastActiveTime: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// 索引
userSchema.index({ openid: 1 });
userSchema.index({ membership: 1 });
userSchema.index({ membershipExpireTime: 1 });

// 方法：检查会员是否过期
userSchema.methods.checkMembershipExpired = function() {
  if (this.membership === 'premium' && this.membershipExpireTime) {
    return new Date() > this.membershipExpireTime;
  }
  return false;
};

// 方法：更新最后活跃时间
userSchema.methods.updateLastActive = function() {
  this.lastActiveTime = new Date();
  return this.save();
};

// 静态方法：查找或创建用户
userSchema.statics.findOrCreate = async function(openid, userData = {}) {
  let user = await this.findOne({ openid });
  
  if (!user) {
    user = await this.create({
      openid,
      ...userData
    });
  } else {
    // 更新用户信息
    if (userData.nickname) user.nickname = userData.nickname;
    if (userData.avatar) user.avatar = userData.avatar;
    user.lastActiveTime = new Date();
    await user.save();
  }
  
  return user;
};

const User = mongoose.model('User', userSchema);

module.exports = User;

