/**
 * 课程管理路由
 */

const express = require('express');
const router = express.Router();
const courseController = require('../controllers/courseController');

// 获取所有课程列表
router.get('/', courseController.getCourses);

// 获取指定课程详情
router.get('/:gradeId', courseController.getCourse);

module.exports = router;

