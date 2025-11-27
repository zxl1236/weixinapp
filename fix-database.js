/**
 * 数据库修复脚本 - 添加缺失的列
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbConfig = require('./config/database');

async function fixDatabase() {
  return new Promise((resolve, reject) => {
    const dbPath = dbConfig.sqlite.path;
    console.log('📂 数据库路径:', dbPath);
    
    const db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        console.error('❌ 数据库连接失败:', err.message);
        reject(err);
        return;
      }
      console.log('✅ 数据库连接成功');
    });
    
    // 获取当前表结构
    db.all('PRAGMA table_info(users)', (err, columns) => {
      if (err) {
        console.error('❌ 获取表结构失败:', err.message);
        db.close();
        reject(err);
        return;
      }
      
      const columnNames = columns.map(c => c.name);
      console.log('\n当前 users 表的列:', columnNames.join(', '));
      
      // 需要添加的列
      const requiredColumns = [
        { name: 'isActivated', type: 'INTEGER', default: 'DEFAULT 0' },
        { name: 'activatedAt', type: 'DATETIME', default: '' }
      ];
      
      const migrations = [];
      requiredColumns.forEach(col => {
        if (!columnNames.includes(col.name)) {
          let sql = `ALTER TABLE users ADD COLUMN ${col.name} ${col.type}`;
          if (col.default) {
            sql += ` ${col.default}`;
          }
          migrations.push({ name: col.name, sql });
        }
      });
      
      if (migrations.length === 0) {
        console.log('\n✅ 数据库表结构已是最新，无需迁移');
        db.close();
        resolve();
        return;
      }
      
      console.log(`\n🔄 发现 ${migrations.length} 个缺失的列，开始迁移...\n`);
      
      // 执行迁移
      let completed = 0;
      migrations.forEach((migration, index) => {
        db.run(migration.sql, (err) => {
          if (err) {
            console.error(`❌ 添加列 "${migration.name}" 失败:`, err.message);
            console.error('SQL:', migration.sql);
          } else {
            completed++;
            console.log(`✅ [${completed}/${migrations.length}] 成功添加列: ${migration.name}`);
          }
          
          if (completed === migrations.length) {
            console.log('\n✅ 数据库迁移完成！');
            db.close();
            resolve();
          }
        });
      });
    });
  });
}

// 执行修复
if (require.main === module) {
  fixDatabase()
    .then(() => {
      console.log('\n🎉 修复完成，现在可以重新启动服务器了！');
      process.exit(0);
    })
    .catch((err) => {
      console.error('\n❌ 修复失败:', err);
      process.exit(1);
    });
}

module.exports = fixDatabase;