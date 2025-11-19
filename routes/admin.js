/**
 * 管理后台路由
 */

const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { adminAuth } = require('../middleware/auth');

// 所有管理后台路由都需要认证
router.use(adminAuth);

// 用户管理
router.get('/users', adminController.getUsers);
router.get('/users/:id', adminController.getUserDetail);
router.put('/users/:id/membership', adminController.updateUserMembership);

// 课程管理
router.get('/courses', adminController.getCourses);
router.get('/courses/:id', adminController.getCourseDetail);
router.post('/courses', adminController.createCourse);
router.put('/courses/:id', adminController.updateCourse);

// 订单管理
router.get('/orders', adminController.getOrders);
router.get('/orders/:id', adminController.getOrderDetail);

// 统计数据
router.get('/stats', adminController.getStats);

// 优惠码管理
router.get('/discount-codes', adminController.getDiscountCodes);
router.post('/discount-codes', adminController.createDiscountCode);

module.exports = router;

