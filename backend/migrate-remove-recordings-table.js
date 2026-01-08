/**
 * 数据库迁移脚本：删除recordings表
 * 用于移除AI打分功能相关的数据库表
 */
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// 数据库路径配置
const dbConfig = require('./config/database');
const dbPath = dbConfig.sqlite.path || path.join(__dirname, 'data', 'k12_vocabulary.db');

console.log('开始执行数据库迁移：删除recordings表...');
console.log('数据库路径:', dbPath);

// 检查数据库文件是否存在
if (!fs.existsSync(dbPath)) {
  console.error('数据库文件不存在:', dbPath);
  process.exit(1);
}

const db = new sqlite3.Database(dbPath);

db.serialize(() => {
  // 检查recordings表是否存在
  db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='recordings'", (err, row) => {
    if (err) {
      console.error('检查recordings表失败:', err.message);
      db.close();
      process.exit(1);
    }

    if (!row) {
      console.log('✅ recordings表不存在，无需删除');
      db.close();
      return;
    }

    console.log('🔍 发现recordings表，正在删除...');

    // 删除recordings表
    db.run('DROP TABLE recordings', (err) => {
      if (err) {
        console.error('删除recordings表失败:', err.message);
        db.close();
        process.exit(1);
      }

      console.log('✅ recordings表已成功删除');

      // 验证删除结果
      db.all("SELECT name FROM sqlite_master WHERE type='table'", (err, tables) => {
        if (err) {
          console.error('验证表删除失败:', err.message);
        } else {
          console.log('📋 当前数据库中的表:');
          tables.forEach(table => {
            console.log('  -', table.name);
          });
        }

        db.close();
        console.log('🎉 数据库迁移完成！');
      });
    });
  });
});
