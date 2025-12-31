/**
 * 验证微信配置是否已正确设置
 */

require('dotenv').config();

const checks = {
  WECHAT_APPID: {
    value: process.env.WECHAT_APPID,
    required: true,
    description: '小程序AppID'
  },
  WECHAT_SECRET: {
    value: process.env.WECHAT_SECRET,
    required: true,
    description: '小程序Secret'
  },
  WECHAT_MCHID: {
    value: process.env.WECHAT_MCHID,
    required: false,
    description: '商户号（支付功能需要）'
  },
  WECHAT_API_KEY: {
    value: process.env.WECHAT_API_KEY,
    required: false,
    description: 'API密钥（支付功能需要）'
  }
};

console.log('🔍 验证微信配置...\n');

let allRequiredOk = true;
let allOptionalOk = true;

Object.keys(checks).forEach(key => {
  const check = checks[key];
  const isConfigured = check.value && 
    !check.value.includes('your_') && 
    check.value.trim() !== '';

  if (check.required) {
    if (isConfigured) {
      console.log(`✅ ${key}: 已配置 (${check.value.substring(0, 10)}...)`);
    } else {
      console.log(`❌ ${key}: 未配置 - ${check.description}`);
      allRequiredOk = false;
    }
  } else {
    if (isConfigured) {
      console.log(`✅ ${key}: 已配置`);
    } else {
      console.log(`ℹ️  ${key}: 未配置 - ${check.description}`);
      allOptionalOk = false;
    }
  }
});

console.log('\n' + '='.repeat(50) + '\n');

if (!allRequiredOk) {
  console.log('⚠️  必需配置未完成，请编辑 backend/.env 文件：');
  console.log('   1. WECHAT_APPID - 从微信公众平台获取');
  console.log('   2. WECHAT_SECRET - 从微信公众平台获取');
  console.log('\n📖 获取方法：');
  console.log('   登录 https://mp.weixin.qq.com/');
  console.log('   进入 开发 -> 开发管理 -> 开发设置');
  console.log('   查看 AppID 和 AppSecret\n');
  process.exit(1);
} else {
  console.log('✅ 所有必需配置已正确设置！');
  if (!allOptionalOk) {
    console.log('ℹ️  部分可选配置未设置（支付功能需要）\n');
  } else {
    console.log('✅ 所有配置已正确设置！\n');
  }
  process.exit(0);
}

