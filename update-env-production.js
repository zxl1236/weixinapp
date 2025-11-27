/**
 * 更新环境配置为生产模式
 * 自动更新 NODE_ENV，并提示需要手动配置的项
 */

const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '.env');

if (!fs.existsSync(envPath)) {
  console.log('❌ .env 文件不存在，请先运行 check-and-setup-env.js');
  process.exit(1);
}

let envContent = fs.readFileSync(envPath, 'utf8');
let updated = false;

// 更新 NODE_ENV
if (envContent.includes('NODE_ENV=development')) {
  envContent = envContent.replace(/NODE_ENV=development/g, 'NODE_ENV=production');
  updated = true;
  console.log('✅ 已更新 NODE_ENV=production');
} else if (!envContent.includes('NODE_ENV=production')) {
  // 如果没有 NODE_ENV，添加它
  envContent = 'NODE_ENV=production\n' + envContent;
  updated = true;
  console.log('✅ 已添加 NODE_ENV=production');
}

// 保存更新
if (updated) {
  fs.writeFileSync(envPath, envContent);
  console.log('✅ 环境配置已更新\n');
} else {
  console.log('ℹ️  NODE_ENV 已经是 production\n');
}

// 检查需要手动配置的项
console.log('📋 请手动检查并配置以下项（如果还未配置）：');
console.log('   1. WECHAT_APPID - 您的小程序AppID');
console.log('   2. WECHAT_SECRET - 您的小程序Secret（从微信公众平台获取）');
console.log('   3. WECHAT_MCHID - 您的商户号（如果使用支付功能）');
console.log('   4. WECHAT_API_KEY - 您的API密钥（如果使用支付功能）');
console.log('   5. WECHAT_NOTIFY_URL - 支付回调URL（如果使用支付功能）');
console.log('\n💡 提示：');
console.log('   - 登录 https://mp.weixin.qq.com/ 获取 AppID 和 Secret');
console.log('   - 登录 https://pay.weixin.qq.com/ 获取商户号和API密钥\n');

