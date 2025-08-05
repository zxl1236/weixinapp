// 小程序发布状态检查脚本
const fs = require('fs');

console.log('🔍 检查小程序发布状态...\n');

// 检查项目配置
console.log('📋 项目配置检查:');

try {
  // 检查 app.json
  const appJson = JSON.parse(fs.readFileSync('app.json', 'utf8'));
  console.log('  ✅ app.json 配置正确');
  
  // 检查 project.config.json
  const projectConfig = JSON.parse(fs.readFileSync('project.config.json', 'utf8'));
  console.log('  ✅ project.config.json 配置正确');
  
  if (!projectConfig.appid || projectConfig.appid === '') {
    console.log('  ⚠️  AppID 未配置 - 这是导致问题的可能原因');
  } else {
    console.log('  ✅ AppID 已配置');
  }
  
} catch (error) {
  console.log('  ❌ 配置文件读取失败:', error.message);
}

// 检查必需文件
console.log('\n📁 必需文件检查:');
const requiredFiles = [
  'app.js',
  'app.json',
  'app.wxss',
  'sitemap.json',
  'pages/index/index.js',
  'pages/index/index.wxml',
  'pages/index/index.wxss'
];

let allFilesExist = true;
requiredFiles.forEach(file => {
  if (fs.existsSync(file)) {
    console.log(`  ✅ ${file}`);
  } else {
    console.log(`  ❌ ${file} - 文件不存在`);
    allFilesExist = false;
  }
});

// 分析问题原因
console.log('\n🔍 问题原因分析:');

if (!allFilesExist) {
  console.log('  ❌ 项目文件不完整，需要先完善项目');
} else {
  console.log('  ✅ 项目文件完整');
}

console.log('\n🎯 解决方案:');

console.log('\n1. 如果小程序未发布:');
console.log('   - 在微信开发者工具中上传代码');
console.log('   - 在微信公众平台提交审核');
console.log('   - 等待审核通过并发布');
console.log('   - 发布后重新申请小程序码');

console.log('\n2. 如果小程序已发布:');
console.log('   - 检查页面路径是否正确');
console.log('   - 确认页面在发布版本中存在');
console.log('   - 尝试其他页面路径');
console.log('   - 联系微信客服');

console.log('\n3. 当前推荐操作:');
console.log('   - 确保 AppID 已正确配置');
console.log('   - 在微信开发者工具中测试编译');
console.log('   - 上传代码到微信公众平台');
console.log('   - 提交审核并等待发布');

console.log('\n⚠️  重要提醒:');
console.log('   - 只有正式发布的小程序才能申请小程序码');
console.log('   - 开发版本和体验版本都无法申请');
console.log('   - 页面路径必须存在于已发布的版本中');

console.log('\n📞 获取帮助:');
console.log('   - 微信公众平台帮助文档');
console.log('   - 微信小程序客服');
console.log('   - 微信开发者社区'); 