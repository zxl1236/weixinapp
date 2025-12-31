/**
 * 激活码数据模型（MongoDB版本）
 */

const mongoose = require('mongoose');

const activationCodeSchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
    unique: true,
    index: true,
    trim: true,
    uppercase: true
  },
  used: {
    type: Boolean,
    default: false,
    index: true
  },
  usedBy: {
    type: String,
    default: null,
    trim: true
  },
  usedAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

// 索引
activationCodeSchema.index({ code: 1 });
activationCodeSchema.index({ used: 1 });

// 方法：检查激活码是否有效
activationCodeSchema.methods.isValid = function() {
  return !this.used;
};

// 方法：使用激活码
activationCodeSchema.methods.use = async function(openid) {
  if (this.used) {
    throw new Error('激活码已被使用');
  }
  
  this.used = true;
  this.usedBy = openid;
  this.usedAt = new Date();
  return this.save();
};

const ActivationCode = mongoose.model('ActivationCode', activationCodeSchema);

module.exports = ActivationCode;

