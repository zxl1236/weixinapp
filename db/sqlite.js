/**
 * SQLite数据库连接和初始化
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

class SQLiteDB {
  constructor(dbPath) {
    this.dbPath = dbPath;
    this.db = null;
  }

  /**
   * 连接数据库
   */
  async connect() {
    return new Promise((resolve, reject) => {
      // 确保数据目录存在
      const dbDir = path.dirname(this.dbPath);
      if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
      }

      this.db = new sqlite3.Database(this.dbPath, (err) => {
        if (err) {
          reject(err);
        } else {
          // 启用外键约束
          this.db.run('PRAGMA foreign_keys = ON');
          // 启用WAL模式
          this.db.run('PRAGMA journal_mode = WAL');
          resolve();
        }
      });
    });
  }

  /**
   * 初始化数据库表
   */
  async initTables() {
    const tables = [
      // 用户表
      `CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        openid TEXT UNIQUE NOT NULL,
        nickname TEXT DEFAULT '',
        avatar TEXT DEFAULT '',
        membership TEXT DEFAULT 'free' CHECK(membership IN ('free', 'premium')),
        membershipExpireTime DATETIME,
        dailyUsageDate TEXT DEFAULT (strftime('%Y-%m-%d', 'now')),
        dailyUsageTestCount INTEGER DEFAULT 0,
        totalTestCount INTEGER DEFAULT 0,
        registerTime DATETIME DEFAULT CURRENT_TIMESTAMP,
        lastActiveTime DATETIME DEFAULT CURRENT_TIMESTAMP,
        isActivated INTEGER DEFAULT 0,
        activatedAt DATETIME,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,
      
      // 创建索引
      `CREATE INDEX IF NOT EXISTS idx_users_openid ON users(openid)`,
      `CREATE INDEX IF NOT EXISTS idx_users_membership ON users(membership)`,
      `CREATE INDEX IF NOT EXISTS idx_users_isActivated ON users(isActivated)`,
      
      // 课程表
      `CREATE TABLE IF NOT EXISTS courses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        gradeId TEXT UNIQUE NOT NULL,
        gradeName TEXT NOT NULL,
        stage TEXT NOT NULL CHECK(stage IN ('primary', 'junior', 'senior')),
        level INTEGER NOT NULL,
        targetWords INTEGER DEFAULT 0,
        description TEXT DEFAULT '',
        enabled INTEGER DEFAULT 1,
        wordCount INTEGER DEFAULT 0,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,
      
      `CREATE INDEX IF NOT EXISTS idx_courses_gradeId ON courses(gradeId)`,
      `CREATE INDEX IF NOT EXISTS idx_courses_stage ON courses(stage)`,
      `CREATE INDEX IF NOT EXISTS idx_courses_enabled ON courses(enabled)`,
      
      // 订单表
      `CREATE TABLE IF NOT EXISTS orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        orderId TEXT UNIQUE NOT NULL,
        userId INTEGER,
        openid TEXT NOT NULL,
        planId TEXT NOT NULL,
        planName TEXT NOT NULL,
        amount REAL NOT NULL CHECK(amount >= 0),
        originalAmount REAL DEFAULT 0,
        discountAmount REAL DEFAULT 0,
        discountCode TEXT,
        duration INTEGER NOT NULL CHECK(duration >= 1),
        status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'paid', 'failed', 'cancelled')),
        wxTransactionId TEXT,
        wxPrepayId TEXT,
        paidTime DATETIME,
        expireTime DATETIME,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (userId) REFERENCES users(id) ON DELETE SET NULL
      )`,
      
      `CREATE INDEX IF NOT EXISTS idx_orders_orderId ON orders(orderId)`,
      `CREATE INDEX IF NOT EXISTS idx_orders_userId ON orders(userId)`,
      `CREATE INDEX IF NOT EXISTS idx_orders_openid ON orders(openid)`,
      `CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status)`,
      
      // 优惠码表
      `CREATE TABLE IF NOT EXISTS discount_codes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        code TEXT UNIQUE NOT NULL,
        discountAmount REAL DEFAULT 0 CHECK(discountAmount >= 0),
        discountPercent INTEGER DEFAULT 0 CHECK(discountPercent >= 0 AND discountPercent <= 100),
        type TEXT NOT NULL CHECK(type IN ('amount', 'percent')),
        maxUsage INTEGER DEFAULT -1 CHECK(maxUsage >= -1),
        usedCount INTEGER DEFAULT 0 CHECK(usedCount >= 0),
        validFrom DATETIME DEFAULT CURRENT_TIMESTAMP,
        validUntil DATETIME NOT NULL,
        enabled INTEGER DEFAULT 1,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,
      
      `CREATE INDEX IF NOT EXISTS idx_discount_codes_code ON discount_codes(code)`,
      `CREATE INDEX IF NOT EXISTS idx_discount_codes_enabled ON discount_codes(enabled)`,
      
      // 触发器：自动更新 updatedAt
      `CREATE TRIGGER IF NOT EXISTS update_users_timestamp 
       AFTER UPDATE ON users
       BEGIN
         UPDATE users SET updatedAt = CURRENT_TIMESTAMP WHERE id = NEW.id;
       END`,
      
      `CREATE TRIGGER IF NOT EXISTS update_courses_timestamp 
       AFTER UPDATE ON courses
       BEGIN
         UPDATE courses SET updatedAt = CURRENT_TIMESTAMP WHERE id = NEW.id;
       END`,
      
      `CREATE TRIGGER IF NOT EXISTS update_orders_timestamp 
       AFTER UPDATE ON orders
       BEGIN
         UPDATE orders SET updatedAt = CURRENT_TIMESTAMP WHERE id = NEW.id;
       END`,
      
      `CREATE TRIGGER IF NOT EXISTS update_discount_codes_timestamp 
       AFTER UPDATE ON discount_codes
       BEGIN
         UPDATE discount_codes SET updatedAt = CURRENT_TIMESTAMP WHERE id = NEW.id;
       END`,
      
      // 激活码表
      `CREATE TABLE IF NOT EXISTS activation_codes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        code TEXT UNIQUE NOT NULL,
        used INTEGER DEFAULT 0,
        usedBy TEXT,
        usedAt DATETIME,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,
      
      `CREATE INDEX IF NOT EXISTS idx_activation_codes_code ON activation_codes(code)`,
      `CREATE INDEX IF NOT EXISTS idx_activation_codes_used ON activation_codes(used)`,
      
      `CREATE TRIGGER IF NOT EXISTS update_activation_codes_timestamp 
       AFTER UPDATE ON activation_codes
       BEGIN
         UPDATE activation_codes SET updatedAt = CURRENT_TIMESTAMP WHERE id = NEW.id;
       END`
    ];

    for (const sql of tables) {
      await this.run(sql);
    }
  }

  /**
   * 执行SQL语句（不返回结果）
   */
  run(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, function(err) {
        if (err) {
          reject(err);
        } else {
          resolve({ lastID: this.lastID, changes: this.changes });
        }
      });
    });
  }

  /**
   * 查询单条记录
   */
  get(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.get(sql, params, (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row);
        }
      });
    });
  }

  /**
   * 查询多条记录
   */
  all(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }

  /**
   * 关闭数据库连接
   */
  close() {
    return new Promise((resolve, reject) => {
      if (this.db) {
        this.db.close((err) => {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        });
      } else {
        resolve();
      }
    });
  }
}

module.exports = SQLiteDB;

