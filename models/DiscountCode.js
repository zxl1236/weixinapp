/**
 * 优惠码数据模型
 */

const mongoose = require('mongoose');

const discountCodeSchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
    unique: true,
    index: true,
    trim: true,
    uppercase: true
  },
  discountAmount: {
    type: Number,
    default: 0,
    min: 0
  },
  discountPercent: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  type: {
    type: String,
    enum: ['amount', 'percent'],
    required: true
  },
  maxUsage: {
    type: Number,
    default: -1, // -1表示无限制
    min: -1
  },
  usedCount: {
    type: Number,
    default: 0,
    min: 0
  },
  validFrom: {
    type: Date,
    default: Date.now
  },
  validUntil: {
    type: Date,
    required: true
  },
  enabled: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// 索引
discountCodeSchema.index({ code: 1 });
discountCodeSchema.index({ enabled: 1 });
discountCodeSchema.index({ validFrom: 1, validUntil: 1 });

// 方法：检查优惠码是否有效
discountCodeSchema.methods.isValid = function() {
  const now = new Date();
  return this.enabled &&
         now >= this.validFrom &&
         now <= this.validUntil &&
         (this.maxUsage === -1 || this.usedCount < this.maxUsage);
};

// 方法：计算优惠金额
discountCodeSchema.methods.calculateDiscount = function(originalAmount) {
  if (!this.isValid()) {
    return 0;
  }
  
  if (this.type === 'amount') {
    return Math.min(this.discountAmount, originalAmount);
  } else if (this.type === 'percent') {
    return Math.round(originalAmount * this.discountPercent / 100 * 100) / 100;
  }
  
  return 0;
};

// 方法：使用优惠码
discountCodeSchema.methods.use = async function() {
  if (this.maxUsage !== -1 && this.usedCount >= this.maxUsage) {
    throw new Error('优惠码使用次数已达上限');
  }
  
  this.usedCount += 1;
  return this.save();
};

const DiscountCode = mongoose.model('DiscountCode', discountCodeSchema);

module.exports = DiscountCode;

