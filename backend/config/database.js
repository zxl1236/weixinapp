/**
 * 数据库配置
 * 支持 MongoDB 和 SQLite 两种数据库
 * 
 * 使用方式：
 * - MongoDB: 设置 DB_TYPE=mongodb 或 MONGODB_URI
 * - SQLite: 设置 DB_TYPE=sqlite 或 SQLITE_PATH
 */

const DB_TYPE = process.env.DB_TYPE || (process.env.MONGODB_URI ? 'mongodb' : 'sqlite');

module.exports = {
  type: DB_TYPE,
  
  // MongoDB配置
  mongodb: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/k12_vocabulary',
    options: {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    }
  },
  
  // SQLite配置
  sqlite: {
    path: process.env.SQLITE_PATH || './data/k12_vocabulary.db',
    // SQLite选项
    options: {
      // 启用外键约束
      foreignKeys: true,
      // 启用WAL模式（提高并发性能）
      journalMode: 'WAL'
    }
  }
};
