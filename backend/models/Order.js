/**
 * 订单数据模型
 */

const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  orderId: {
    type: String,
    required: true,
    unique: true,
    index: true,
    trim: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    index: true
  },
  openid: {
    type: String,
    required: true,
    index: true
  },
  planId: {
    type: String,
    required: true
  },
  planName: {
    type: String,
    required: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  originalAmount: {
    type: Number,
    default: 0
  },
  discountAmount: {
    type: Number,
    default: 0
  },
  discountCode: {
    type: String,
    default: null
  },
  duration: {
    type: Number,
    required: true,
    min: 1
  },
  status: {
    type: String,
    enum: ['pending', 'paid', 'failed', 'cancelled'],
    default: 'pending',
    index: true
  },
  wxTransactionId: {
    type: String,
    default: null
  },
  wxPrepayId: {
    type: String,
    default: null
  },
  paidTime: {
    type: Date,
    default: null
  },
  expireTime: {
    type: Date,
    default: function() {
      // 订单30分钟后过期
      return new Date(Date.now() + 30 * 60 * 1000);
    }
  }
}, {
  timestamps: true
});

// 索引
orderSchema.index({ orderId: 1 });
orderSchema.index({ userId: 1 });
orderSchema.index({ openid: 1 });
orderSchema.index({ status: 1 });
orderSchema.index({ createdAt: -1 });

// 方法：检查订单是否过期
orderSchema.methods.isExpired = function() {
  return new Date() > this.expireTime;
};

// 方法：标记为已支付
orderSchema.methods.markAsPaid = function(transactionId) {
  this.status = 'paid';
  this.wxTransactionId = transactionId;
  this.paidTime = new Date();
  return this.save();
};

// 静态方法：生成订单号
orderSchema.statics.generateOrderId = function() {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `K12${timestamp}${random}`;
};

const Order = mongoose.model('Order', orderSchema);

module.exports = Order;

