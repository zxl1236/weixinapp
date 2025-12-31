/**
 * 创建优惠码脚本
 * 用于创建可以抵扣10元的优惠码 "SYMBOL"
 * 
 * 使用方法：
 * node backend/scripts/create-discount-code.js
 */

const dbConfig = require('../config/database');
const SQLiteDB = require('../db/sqlite');
const mongoose = require('mongoose');

async function createDiscountCode() {
  try {
    let DiscountCode;
    
    if (dbConfig.type === 'sqlite') {
      // SQLite 模式
      console.log('📦 使用 SQLite 数据库...');
      const db = new SQLiteDB(dbConfig.sqlite.path);
      await db.connect();
      await db.initTables();
      
      const SQLiteDiscountCode = require('../models/sqlite/DiscountCode');
      DiscountCode = new SQLiteDiscountCode(db);
    } else {
      // MongoDB 模式
      console.log('📦 使用 MongoDB 数据库...');
      await mongoose.connect(dbConfig.mongodb.uri, dbConfig.mongodb.options);
      DiscountCode = require('../models/DiscountCode');
    }
    
    // 检查优惠码是否已存在
    const existingCode = await DiscountCode.findOne({ code: 'SYMBOL' });
    if (existingCode) {
      console.log('⚠️  优惠码 "SYMBOL" 已存在');
      console.log('   是否要更新？(y/n)');
      // 这里简化处理，直接更新
      console.log('   自动更新现有优惠码...');
      
      // 更新优惠码
      const validUntil = new Date();
      validUntil.setFullYear(validUntil.getFullYear() + 1); // 有效期1年
      
      if (dbConfig.type === 'sqlite') {
        await DiscountCode.db.run(
          `UPDATE discount_codes 
           SET discountAmount = ?, 
               discountPercent = 0, 
               type = 'amount', 
               maxUsage = -1, 
               validFrom = ?, 
               validUntil = ?, 
               enabled = 1,
               updatedAt = CURRENT_TIMESTAMP
           WHERE code = 'SYMBOL'`,
          [
            1000, // 10元 = 1000分
            new Date().toISOString(),
            validUntil.toISOString()
          ]
        );
      } else {
        await DiscountCode.findOneAndUpdate(
          { code: 'SYMBOL' },
          {
            discountAmount: 10, // MongoDB 版本存储的是元
            discountPercent: 0,
            type: 'amount',
            maxUsage: -1,
            validFrom: new Date(),
            validUntil: validUntil,
            enabled: true
          },
          { new: true }
        );
      }
      
      console.log('✅ 优惠码 "SYMBOL" 已更新');
      console.log('   优惠金额: 10元');
      console.log('   有效期: 1年');
      console.log('   使用次数: 无限制');
    } else {
      // 创建新优惠码
      const validUntil = new Date();
      validUntil.setFullYear(validUntil.getFullYear() + 1); // 有效期1年
      
      const codeData = {
        code: 'SYMBOL',
        type: 'amount',
        discountAmount: dbConfig.type === 'sqlite' ? 1000 : 10, // SQLite存储分，MongoDB存储元
        discountPercent: 0,
        maxUsage: -1, // -1表示无限制
        validFrom: new Date(),
        validUntil: validUntil,
        enabled: true
      };
      
      const code = await DiscountCode.create(codeData);
      
      console.log('✅ 优惠码创建成功！');
      console.log('   优惠码: SYMBOL');
      console.log('   优惠金额: 10元');
      console.log('   有效期: 1年');
      console.log('   使用次数: 无限制');
    }
    
    // 关闭数据库连接
    if (dbConfig.type === 'sqlite') {
      // SQLite 不需要显式关闭
    } else {
      await mongoose.connection.close();
    }
    
    console.log('\n📝 使用说明:');
    console.log('   用户在前端输入优惠码 "SYMBOL" 或 "symbol"');
    console.log('   原价 29.9 元，使用优惠码后支付 19.9 元');
    console.log('   total_fee 参数会自动设置为折扣后的金额（单位：分）\n');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ 创建优惠码失败:', error);
    process.exit(1);
  }
}

// 运行脚本
createDiscountCode();

