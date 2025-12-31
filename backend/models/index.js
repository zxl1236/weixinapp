/**
 * 模型适配器
 * 根据数据库类型自动选择使用 MongoDB 或 SQLite
 */

const dbConfig = require('../config/database');

let User, Course, Order, DiscountCode, ActivationCode;
let dbInstance = null;

// 初始化SQLite模型
function initSQLiteModels(db) {
  dbInstance = db;
  
  const SQLiteUser = require('./sqlite/User');
  const SQLiteCourse = require('./sqlite/Course');
  const SQLiteOrder = require('./sqlite/Order');
  const SQLiteDiscountCode = require('./sqlite/DiscountCode');
  const SQLiteActivationCode = require('./sqlite/ActivationCode');
  
  User = new SQLiteUser(db);
  Course = new SQLiteCourse(db);
  Order = new SQLiteOrder(db);
  DiscountCode = new SQLiteDiscountCode(db);
  ActivationCode = new SQLiteActivationCode(db);
}

if (dbConfig.type === 'sqlite') {
  // SQLite模型将在数据库连接后初始化
  // 这里先导出初始化函数
  module.exports = {
    initSQLiteModels,
    get User() {
      if (!User) throw new Error('SQLite数据库未初始化，请先连接数据库');
      return User;
    },
    get Course() {
      if (!Course) throw new Error('SQLite数据库未初始化，请先连接数据库');
      return Course;
    },
    get Order() {
      if (!Order) throw new Error('SQLite数据库未初始化，请先连接数据库');
      return Order;
    },
    get DiscountCode() {
      if (!DiscountCode) throw new Error('SQLite数据库未初始化，请先连接数据库');
      return DiscountCode;
    },
    get ActivationCode() {
      if (!ActivationCode) throw new Error('SQLite数据库未初始化，请先连接数据库');
      return ActivationCode;
    }
  };
} else {
  // 使用 MongoDB 模型
  User = require('./User');
  Course = require('./Course');
  Order = require('./Order');
  DiscountCode = require('./DiscountCode');
  ActivationCode = require('./ActivationCode');
  
  module.exports = {
    User,
    Course,
    Order,
    DiscountCode,
    ActivationCode
  };
}

