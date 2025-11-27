/**
 * 支付相关路由
 */

const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const { validateOpenid } = require('../middleware/auth');

// 创建订单
router.post('/create-order', validateOpenid, paymentController.createOrder);

// 获取微信支付参数
router.post('/get-params', paymentController.getPaymentParams);

// 微信支付回调（需要原始body，微信支付 v2 API 使用 XML 格式）
const rawBodyParser = express.raw({ type: ['text/xml', 'application/xml'], limit: '10mb' });
router.post('/notify', rawBodyParser, paymentController.paymentNotify);

// 支付完成确认
router.post('/complete', paymentController.completePayment);

// 查询订单状态
router.get('/orders/:orderId', paymentController.getOrder);

// 获取用户订单列表
router.get('/orders/user/:openid', paymentController.getUserOrders);

module.exports = router;

