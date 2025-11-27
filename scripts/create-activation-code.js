/**
 * 创建激活码脚本
 * 用于批量生成激活码，每个激活码只能使用一次
 * 
 * 使用方法：
 * node backend/scripts/create-activation-code.js [数量] [长度]
 * 
 * 示例：
 * node backend/scripts/create-activation-code.js 10 12
 * 生成10个长度为12的激活码
 * 
 * 默认参数：
 * - 数量：1
 * - 长度：10
 */

const dbConfig = require('../config/database');
const SQLiteDB = require('../db/sqlite');
const mongoose = require('mongoose');

/**
 * 生成随机激活码
 * 排除容易混淆的字符：0, O, I, 1
 */
function generateActivationCode(length = 10) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // 排除容易混淆的字符
  let code = '';
  for (let i = 0; i < length; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

async function createActivationCodes() {
  try {
    // 从命令行参数获取数量和长度
    const count = parseInt(process.argv[2]) || 1;
    const length = parseInt(process.argv[3]) || 10;
    
    if (count < 1 || count > 1000) {
      console.error('❌ 数量必须在 1-1000 之间');
      process.exit(1);
    }
    
    if (length < 6 || length > 20) {
      console.error('❌ 长度必须在 6-20 之间');
      process.exit(1);
    }
    
    console.log(`\n🔑 开始生成激活码...`);
    console.log(`   数量: ${count}`);
    console.log(`   长度: ${length}\n`);
    
    let ActivationCode;
    
    if (dbConfig.type === 'sqlite') {
      // SQLite 模式
      console.log('📦 使用 SQLite 数据库...');
      const db = new SQLiteDB(dbConfig.sqlite.path);
      await db.connect();
      
      // 只初始化 activation_codes 表，避免表结构不完整的问题
      try {
        await db.initTables();
      } catch (error) {
        // 如果初始化失败，尝试只创建 activation_codes 表
        console.log('⚠️  完整表初始化失败，尝试单独创建激活码表...');
        await db.run(`
          CREATE TABLE IF NOT EXISTS activation_codes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            code TEXT UNIQUE NOT NULL,
            used INTEGER DEFAULT 0,
            usedBy TEXT,
            usedAt DATETIME,
            createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
            updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
          )
        `);
        await db.run(`CREATE INDEX IF NOT EXISTS idx_activation_codes_code ON activation_codes(code)`);
        await db.run(`CREATE INDEX IF NOT EXISTS idx_activation_codes_used ON activation_codes(used)`);
        await db.run(`
          CREATE TRIGGER IF NOT EXISTS update_activation_codes_timestamp 
          AFTER UPDATE ON activation_codes
          BEGIN
            UPDATE activation_codes SET updatedAt = CURRENT_TIMESTAMP WHERE id = NEW.id;
          END
        `);
        console.log('✅ 激活码表创建成功');
      }
      
      const SQLiteActivationCode = require('../models/sqlite/ActivationCode');
      ActivationCode = new SQLiteActivationCode(db);
    } else {
      // MongoDB 模式
      console.log('📦 使用 MongoDB 数据库...');
      await mongoose.connect(dbConfig.mongodb.uri, dbConfig.mongodb.options);
      ActivationCode = require('../models/ActivationCode');
    }
    
    const codes = [];
    let successCount = 0;
    let duplicateCount = 0;
    
    console.log('⏳ 正在生成激活码...\n');
    
    for (let i = 0; i < count; i++) {
      let code;
      let attempts = 0;
      let created = false;
      
      // 尝试生成唯一激活码（最多尝试20次）
      while (!created && attempts < 20) {
        code = generateActivationCode(length);
        try {
          // 检查是否已存在
          const existing = await ActivationCode.findOne({ code: code.toUpperCase() });
          if (existing) {
            attempts++;
            duplicateCount++;
            continue;
          }
          
          // 创建激活码
          const activationCode = await ActivationCode.create({ code });
          codes.push(activationCode);
          successCount++;
          created = true;
          
          // 显示进度
          if (successCount % 10 === 0 || successCount === count) {
            process.stdout.write(`\r   已生成: ${successCount}/${count}`);
          }
        } catch (error) {
          // 如果是唯一性冲突，重试
          if (error.code === 11000 || error.message.includes('UNIQUE')) {
            attempts++;
            duplicateCount++;
            continue;
          }
          throw error;
        }
      }
      
      if (!created) {
        console.error(`\n❌ 生成第 ${i + 1} 个激活码失败，已尝试20次`);
      }
    }
    
    console.log('\n\n✅ 激活码生成完成！\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📋 生成的激活码列表：\n');
    
    // 显示所有激活码
    codes.forEach((code, index) => {
      console.log(`   ${(index + 1).toString().padStart(3, ' ')}. ${code.code}`);
    });
    
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`\n📊 统计信息：`);
    console.log(`   ✅ 成功生成: ${successCount} 个`);
    if (duplicateCount > 0) {
      console.log(`   ⚠️  重复尝试: ${duplicateCount} 次`);
    }
    console.log(`   📝 状态: 未使用`);
    console.log(`   🔒 安全性: 每个激活码只能使用一次\n`);
    
    // 保存到文件（可选）
    const fs = require('fs');
    const path = require('path');
    const outputFile = path.join(__dirname, `activation-codes-${Date.now()}.txt`);
    const fileContent = codes.map(c => c.code).join('\n');
    fs.writeFileSync(outputFile, fileContent, 'utf8');
    console.log(`💾 激活码已保存到文件: ${outputFile}\n`);
    
    // 关闭数据库连接
    if (dbConfig.type === 'sqlite') {
      // SQLite 不需要显式关闭
    } else {
      await mongoose.connection.close();
    }
    
    console.log('📝 使用说明:');
    console.log('   1. 用户在前端支付页面选择"激活码激活"');
    console.log('   2. 输入激活码（不区分大小写）');
    console.log('   3. 点击"激活"按钮完成激活');
    console.log('   4. 每个激活码只能使用一次，使用后自动标记为已使用\n');
    
    process.exit(0);
  } catch (error) {
    console.error('\n❌ 生成激活码失败:', error.message);
    if (error.stack) {
      console.error('\n详细错误信息:');
      console.error(error.stack);
    }
    process.exit(1);
  }
}

// 运行脚本
createActivationCodes();

