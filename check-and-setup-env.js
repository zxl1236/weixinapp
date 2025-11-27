/**
 * 环境配置检查和设置脚本
 * 用于检查和设置生产环境所需的配置
 */

const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '.env');
const envExamplePath = path.join(__dirname, 'env.example');

console.log('🔍 检查环境配置...\n');

// 检查 .env 文件是否存在
if (!fs.existsSync(envPath)) {
  console.log('⚠️  .env 文件不存在');
  
  if (fs.existsSync(envExamplePath)) {
    console.log('📋 从 env.example 创建 .env 文件...');
    const exampleContent = fs.readFileSync(envExamplePath, 'utf8');
    fs.writeFileSync(envPath, exampleContent);
    console.log('✅ 已创建 .env 文件，请编辑并填写实际配置值\n');
  } else {
    console.log('❌ env.example 文件也不存在，无法创建 .env');
    process.exit(1);
  }
}

// 读取 .env 文件
const envContent = fs.readFileSync(envPath, 'utf8');
const envLines = envContent.split('\n');

// 检查关键配置
const checks = {
  NODE_ENV: { found: false, value: '', required: true, shouldBe: 'production' },
  WECHAT_APPID: { found: false, value: '', required: true },
  WECHAT_SECRET: { found: false, value: '', required: true },
  WECHAT_MCHID: { found: false, value: '', required: false },
  WECHAT_API_KEY: { found: false, value: '', required: false }
};

envLines.forEach(line => {
  const trimmed = line.trim();
  if (trimmed && !trimmed.startsWith('#')) {
    const [key, ...valueParts] = trimmed.split('=');
    const value = valueParts.join('=').trim();
    
    if (checks[key]) {
      checks[key].found = true;
      checks[key].value = value;
    }
  }
});

console.log('📊 配置检查结果：\n');

let hasIssues = false;
let needsUpdate = false;

// 检查 NODE_ENV
if (checks.NODE_ENV.found) {
  if (checks.NODE_ENV.value !== 'production') {
    console.log(`⚠️  NODE_ENV: ${checks.NODE_ENV.value} (应该是 production)`);
    needsUpdate = true;
    hasIssues = true;
  } else {
    console.log(`✅ NODE_ENV: ${checks.NODE_ENV.value}`);
  }
} else {
  console.log('❌ NODE_ENV: 未配置');
  hasIssues = true;
}

// 检查 WECHAT_APPID
if (checks.WECHAT_APPID.found) {
  if (checks.WECHAT_APPID.value && checks.WECHAT_APPID.value !== 'your_wechat_appid') {
    console.log(`✅ WECHAT_APPID: ${checks.WECHAT_APPID.value.substring(0, 10)}...`);
  } else {
    console.log('⚠️  WECHAT_APPID: 未配置或使用默认值');
    hasIssues = true;
  }
} else {
  console.log('❌ WECHAT_APPID: 未配置');
  hasIssues = true;
}

// 检查 WECHAT_SECRET
if (checks.WECHAT_SECRET.found) {
  if (checks.WECHAT_SECRET.value && checks.WECHAT_SECRET.value !== 'your_wechat_secret') {
    console.log(`✅ WECHAT_SECRET: 已配置 (${checks.WECHAT_SECRET.value.length} 字符)`);
  } else {
    console.log('⚠️  WECHAT_SECRET: 未配置或使用默认值');
    hasIssues = true;
  }
} else {
  console.log('❌ WECHAT_SECRET: 未配置');
  hasIssues = true;
}

// 检查 WECHAT_MCHID（可选）
if (checks.WECHAT_MCHID.found && checks.WECHAT_MCHID.value && checks.WECHAT_MCHID.value !== 'your_merchant_id') {
  console.log(`✅ WECHAT_MCHID: ${checks.WECHAT_MCHID.value}`);
} else {
  console.log('ℹ️  WECHAT_MCHID: 未配置（支付功能需要）');
}

// 检查 WECHAT_API_KEY（可选）
if (checks.WECHAT_API_KEY.found && checks.WECHAT_API_KEY.value && checks.WECHAT_API_KEY.value !== 'your_api_key') {
  console.log(`✅ WECHAT_API_KEY: 已配置 (${checks.WECHAT_API_KEY.value.length} 字符)`);
} else {
  console.log('ℹ️  WECHAT_API_KEY: 未配置（支付功能需要）');
}

console.log('\n' + '='.repeat(50) + '\n');

// 如果需要更新 NODE_ENV
if (needsUpdate) {
  console.log('🔄 更新 NODE_ENV 为 production...');
  
  const updatedLines = envLines.map(line => {
    if (line.trim().startsWith('NODE_ENV=')) {
      return 'NODE_ENV=production';
    }
    return line;
  });
  
  fs.writeFileSync(envPath, updatedLines.join('\n'));
  console.log('✅ 已更新 NODE_ENV=production\n');
}

if (hasIssues) {
  console.log('⚠️  发现配置问题，请编辑 .env 文件并填写以下配置：');
  console.log('   1. NODE_ENV=production');
  console.log('   2. WECHAT_APPID=你的小程序AppID');
  console.log('   3. WECHAT_SECRET=你的小程序Secret');
  console.log('\n💡 提示：');
  console.log('   - AppID 和 Secret 可以从微信公众平台获取');
  console.log('   - 登录 https://mp.weixin.qq.com/');
  console.log('   - 进入 开发 -> 开发管理 -> 开发设置');
  console.log('   - 查看 AppID 和 AppSecret\n');
  process.exit(1);
} else {
  console.log('✅ 所有必需配置已正确设置！');
  console.log('🚀 可以启动后端服务了\n');
  process.exit(0);
}

