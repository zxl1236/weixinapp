/**
 * K12词汇学习系统 - 后端服务器
 * 主入口文件
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');

// 导入配置
const dbConfig = require('./config/database');
const { errorHandler } = require('./middleware/errorHandler');
const logger = require('./utils/logger');

// 根据数据库类型导入相应的模块
let mongoose, SQLiteDB;
if (dbConfig.type === 'sqlite') {
  SQLiteDB = require('./db/sqlite');
} else {
  mongoose = require('mongoose');
}

// 路由在数据库初始化后再注册，避免模型未初始化

// 创建Express应用
const app = express();
const PORT = process.env.PORT || 3000;

// 中间件配置
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
  credentials: true
}));
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));

// 请求超时处理
app.use((req, res, next) => {
  // 设置30秒超时
  req.setTimeout(30000, () => {
    if (!res.headersSent) {
      res.status(504).json({
        success: false,
        message: '请求超时'
      });
    }
  });
  next();
});

// 静态文件服务（管理后台）
app.use('/admin', express.static(path.join(__dirname, 'admin')));

// 请求日志
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`, {
    ip: req.ip,
    body: req.method !== 'GET' ? req.body : undefined
  });
  next();
});

// API路由将于数据库连接完成后注册

// 健康检查
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// 根路径（仅展示保留的接口）
app.get('/', (req, res) => {
  res.json({
    message: 'K12词汇学习系统后端API',
    version: '1.0.0',
    endpoints: {
      users: '/api/users',
      payment: '/api/payment',
      tts: '/api/tts',
      health: '/health'
    }
  });
});

// 连接数据库并启动服务器
async function startServer() {
  try {
    let db = null;
    
    if (dbConfig.type === 'sqlite') {
      // 连接SQLite
      db = new SQLiteDB(dbConfig.sqlite.path);
      await db.connect();
      await db.initTables();
      logger.info('SQLite连接成功', { path: dbConfig.sqlite.path });
      
      // 初始化SQLite模型
      const { initSQLiteModels } = require('./models/index');
      initSQLiteModels(db);
    } else {
      // 连接MongoDB
      await mongoose.connect(dbConfig.mongodb.uri, dbConfig.mongodb.options);
      logger.info('MongoDB连接成功', { uri: dbConfig.mongodb.uri });
    }

    // 数据库与模型初始化完成后再加载并注册路由
    const userRoutes = require('./routes/users');
    const adminRoutes = require('./routes/admin');
    const paymentRoutes = require('./routes/payment');
    const exportRoutes = require('./routes/export');
    const ttsRoutes = require('./routes/tts');
    app.use('/api/users', userRoutes);
    app.use('/api/admin', adminRoutes);
    app.use('/api/payment', paymentRoutes);
    app.use('/api/export', exportRoutes);
    app.use('/api/tts', ttsRoutes);

    // 路由之后注册404处理
    app.use((req, res) => {
      res.status(404).json({
        success: false,
        message: '接口不存在'
      });
    });

    // 错误处理中间件
    app.use(errorHandler);

    // 启动服务器
    // 监听所有网络接口（0.0.0.0），允许通过局域网IP访问
    app.listen(PORT, '0.0.0.0', () => {
      logger.info(`服务器启动成功`, {
        port: PORT,
        host: '0.0.0.0',
        env: process.env.NODE_ENV || 'development',
        dbType: dbConfig.type
      });
      console.log(`\n🚀 服务器启动成功！`);
      console.log(`📍 监听地址: http://0.0.0.0:${PORT} (所有网卡)`);
      console.log(`🌐 本地访问: http://localhost:${PORT}`);
      console.log(`📊 管理后台: http://localhost:${PORT}/admin`);
      console.log(`💚 健康检查: http://localhost:${PORT}/health`);
      console.log(`💾 数据库类型: ${dbConfig.type.toUpperCase()}\n`);
    });
  } catch (error) {
    logger.error('服务器启动失败', error);
    process.exit(1);
  }
}

// 处理未捕获的异常
process.on('unhandledRejection', (error, promise) => {
  logger.error('未处理的Promise拒绝', {
    error: error.message,
    stack: error.stack,
    promise: promise
  });
  // 不退出进程，但记录错误
  // 尝试发送错误响应（如果可能）
  console.error('未处理的Promise拒绝:', error);
});

process.on('uncaughtException', (error) => {
  logger.error('未捕获的异常', {
    error: error.message,
    stack: error.stack
  });
  console.error('未捕获的异常:', error);
  // 给时间记录错误，然后退出
  setTimeout(() => {
    console.error('由于未捕获的异常，服务器即将退出');
    process.exit(1);
  }, 2000);
});

// 监听进程退出信号
process.on('SIGTERM', () => {
  logger.info('收到SIGTERM信号，正在关闭服务器...');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('收到SIGINT信号，正在关闭服务器...');
  process.exit(0);
});

// 监听警告
process.on('warning', (warning) => {
  logger.warn('进程警告', {
    name: warning.name,
    message: warning.message,
    stack: warning.stack
  });
});

// 启动服务器
startServer();

module.exports = app;

