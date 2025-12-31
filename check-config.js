/**
 * 后端配置检查脚本
 * 检查微信支付相关配置是否完整
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');

console.log('🔍 开始检查后端配置...\n');

const checks = {
  envFile: false,
  wechatConfig: {
    appid: false,
    mchid: false,
    apiKey: false,
    notifyUrl: false,
    certPath: false,
    keyPath: false
  },
  certFiles: {
    cert: false,
    key: false
  },
  serverConfig: {
    port: false,
    nodeEnv: false,
    dbType: false
  }
};

// 1. 检查 .env 文件
console.log('📄 检查环境变量文件...');
if (fs.existsSync(path.join(__dirname, '.env'))) {
  checks.envFile = true;
  console.log('  ✅ .env 文件存在');
} else {
  console.log('  ❌ .env 文件不存在');
  console.log('  💡 提示: 请复制 env.example 为 .env 并填写配置');
}

console.log('');

// 2. 检查微信支付配置
console.log('💳 检查微信支付配置...');
const wechatConfig = require('./config/wechat');

if (wechatConfig.appid && wechatConfig.appid !== 'your_wechat_appid') {
  checks.wechatConfig.appid = true;
  console.log(`  ✅ AppID: ${wechatConfig.appid.substring(0, 10)}...`);
} else {
  console.log('  ❌ AppID: 未配置或使用默认值');
}

if (wechatConfig.mchid && wechatConfig.mchid !== 'your_merchant_id') {
  checks.wechatConfig.mchid = true;
  console.log(`  ✅ 商户号: ${wechatConfig.mchid}`);
} else {
  console.log('  ❌ 商户号: 未配置或使用默认值');
}

if (wechatConfig.apiKey && wechatConfig.apiKey !== 'your_api_key') {
  checks.wechatConfig.apiKey = true;
  console.log(`  ✅ API密钥: 已配置 (${wechatConfig.apiKey.length} 字符)`);
} else {
  console.log('  ❌ API密钥: 未配置或使用默认值');
}

if (wechatConfig.notifyUrl && !wechatConfig.notifyUrl.includes('your-domain.com')) {
  checks.wechatConfig.notifyUrl = true;
  console.log(`  ✅ 回调URL: ${wechatConfig.notifyUrl}`);
} else {
  console.log('  ❌ 回调URL: 未配置或使用默认值');
}

const certPath = wechatConfig.certPath || './certs/apiclient_cert.pem';
const keyPath = wechatConfig.keyPath || './certs/apiclient_key.pem';

if (fs.existsSync(path.join(__dirname, certPath))) {
  checks.certFiles.cert = true;
  checks.wechatConfig.certPath = true;
  console.log(`  ✅ 证书文件: ${certPath} 存在`);
} else {
  console.log(`  ❌ 证书文件: ${certPath} 不存在`);
}

if (fs.existsSync(path.join(__dirname, keyPath))) {
  checks.certFiles.key = true;
  checks.wechatConfig.keyPath = true;
  console.log(`  ✅ 密钥文件: ${keyPath} 存在`);
} else {
  console.log(`  ❌ 密钥文件: ${keyPath} 不存在`);
}

console.log('');

// 3. 检查服务器配置
console.log('🖥️  检查服务器配置...');
const port = process.env.PORT || 3000;
const nodeEnv = process.env.NODE_ENV || 'development';
const dbType = process.env.DB_TYPE || 'sqlite';

checks.serverConfig.port = true;
console.log(`  ✅ 端口: ${port}`);

checks.serverConfig.nodeEnv = true;
console.log(`  ✅ 环境: ${nodeEnv} (${nodeEnv === 'development' ? '开发模式' : '生产模式'})`);

checks.serverConfig.dbType = true;
console.log(`  ✅ 数据库类型: ${dbType.toUpperCase()}`);

console.log('');

// 4. 检查开发模式状态
console.log('🔧 检查开发模式状态...');
if (wechatConfig.isDevelopment) {
  console.log('  ⚠️  当前为开发模式，微信支付将被模拟');
  console.log('  💡 提示: 生产环境需要设置 NODE_ENV=production');
} else {
  console.log('  ✅ 当前为生产模式，将使用真实微信支付');
}

console.log('');

// 5. 生成配置报告
console.log('📊 配置检查报告\n');
console.log('='.repeat(50));

const allWechatConfigOk = Object.values(checks.wechatConfig).every(v => v);
const allCertFilesOk = Object.values(checks.certFiles).every(v => v);
const allServerConfigOk = Object.values(checks.serverConfig).every(v => v);

if (checks.envFile && allWechatConfigOk && allCertFilesOk && allServerConfigOk) {
  console.log('✅ 所有配置检查通过！');
  if (!wechatConfig.isDevelopment) {
    console.log('🚀 后端已准备好处理真实微信支付');
  } else {
    console.log('⚠️  当前为开发模式，支付功能将被模拟');
  }
} else {
  console.log('❌ 配置不完整，需要修复以下问题：\n');
  
  if (!checks.envFile) {
    console.log('  - 缺少 .env 文件');
  }
  
  if (!allWechatConfigOk) {
    console.log('  - 微信支付配置不完整:');
    if (!checks.wechatConfig.appid) console.log('    • AppID 未配置');
    if (!checks.wechatConfig.mchid) console.log('    • 商户号未配置');
    if (!checks.wechatConfig.apiKey) console.log('    • API密钥未配置');
    if (!checks.wechatConfig.notifyUrl) console.log('    • 回调URL未配置');
  }
  
  if (!allCertFilesOk) {
    console.log('  - 证书文件缺失:');
    if (!checks.certFiles.cert) console.log(`    • ${certPath} 不存在`);
    if (!checks.certFiles.key) console.log(`    • ${keyPath} 不存在`);
  }
  
  console.log('\n💡 修复建议:');
  console.log('  1. 复制 env.example 为 .env');
  console.log('  2. 填写微信支付相关配置');
  console.log('  3. 下载微信支付证书文件到 certs/ 目录');
  console.log('  4. 设置 NODE_ENV=production (生产环境)');
}

console.log('='.repeat(50));

// 6. 检查依赖
console.log('\n📦 检查依赖包...');
try {
  const packageJson = require('./package.json');
  const requiredDeps = ['wechatpay-node-v3', 'express', 'dotenv'];
  const missingDeps = [];
  
  requiredDeps.forEach(dep => {
    try {
      require(dep);
      console.log(`  ✅ ${dep}`);
    } catch (e) {
      missingDeps.push(dep);
      console.log(`  ❌ ${dep} 未安装`);
    }
  });
  
  if (missingDeps.length > 0) {
    console.log(`\n  💡 请运行: npm install ${missingDeps.join(' ')}`);
  }
} catch (e) {
  console.log('  ⚠️  无法检查依赖');
}

console.log('\n✨ 配置检查完成！\n');

