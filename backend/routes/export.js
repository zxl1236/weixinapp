/**
 * 导出相关路由
 */

const express = require('express');
const router = express.Router();
const exportController = require('../controllers/exportController');

// 导出单词列表为PDF
router.get('/words-pdf', exportController.exportWordsToPDF);

module.exports = router;

