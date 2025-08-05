// 微信小程序部署检查脚本
// 在 Node.js 环境中运行此脚本来检查项目配置

const fs = require('fs');
const path = require('path');

console.log('🔍 开始检查微信小程序项目配置...\n');

// 检查必需文件
const requiredFiles = [
  'app.js',
  'app.json', 
  'app.wxss',
  'sitemap.json',
  'project.config.json',
  'pages/index/index.js',
  'pages/index/index.wxml',
  'pages/index/index.wxss',
  'pages/test/test.js',
  'pages/test/test.wxml',
  'pages/test/test.wxss',
  'pages/result/result.js',
  'pages/result/result.wxml',
  'pages/result/result.wxss',
  'utils/wordDatabase.js'
];

let allFilesExist = true;

console.log('📁 检查必需文件:');
requiredFiles.forEach(file => {
  if (fs.existsSync(file)) {
    console.log(`  ✅ ${file}`);
  } else {
    console.log(`  ❌ ${file} - 文件不存在`);
    allFilesExist = false;
  }
});

// 检查 app.json 配置
console.log('\n📋 检查 app.json 配置:');
try {
  const appJson = JSON.parse(fs.readFileSync('app.json', 'utf8'));
  
  if (appJson.pages && appJson.pages.length > 0) {
    console.log('  ✅ pages 配置正确');
    appJson.pages.forEach(page => {
      const pagePath = page + '.js';
      if (fs.existsSync(pagePath)) {
        console.log(`    ✅ ${pagePath}`);
      } else {
        console.log(`    ❌ ${pagePath} - 页面文件不存在`);
        allFilesExist = false;
      }
    });
  } else {
    console.log('  ❌ pages 配置为空');
    allFilesExist = false;
  }
} catch (error) {
  console.log('  ❌ app.json 格式错误:', error.message);
  allFilesExist = false;
}

// 检查 project.config.json
console.log('\n⚙️ 检查 project.config.json:');
try {
  const projectConfig = JSON.parse(fs.readFileSync('project.config.json', 'utf8'));
  
  if (projectConfig.appid && projectConfig.appid !== 'your-actual-appid-here') {
    console.log('  ✅ AppID 已配置');
  } else {
    console.log('  ⚠️ AppID 未配置或使用占位符');
    console.log('    请在微信公众平台获取 AppID 并更新 project.config.json');
  }
  
  if (projectConfig.compileType === 'miniprogram') {
    console.log('  ✅ 编译类型正确');
  } else {
    console.log('  ❌ 编译类型错误');
    allFilesExist = false;
  }
} catch (error) {
  console.log('  ❌ project.config.json 格式错误:', error.message);
  allFilesExist = false;
}

// 检查代码中的路径引用
console.log('\n🔗 检查代码路径引用:');
const jsFiles = [
  'pages/index/index.js',
  'pages/test/test.js', 
  'pages/result/result.js'
];

jsFiles.forEach(file => {
  if (fs.existsSync(file)) {
    const content = fs.readFileSync(file, 'utf8');
    const requireMatches = content.match(/require\(['"]([^'"]+)['"]\)/g);
    
    if (requireMatches) {
      console.log(`  📄 ${file}:`);
      requireMatches.forEach(match => {
        const pathMatch = match.match(/require\(['"]([^'"]+)['"]\)/);
        if (pathMatch) {
          const requirePath = pathMatch[1];
          if (fs.existsSync(requirePath)) {
            console.log(`    ✅ ${requirePath}`);
          } else {
            console.log(`    ❌ ${requirePath} - 引用的文件不存在`);
            allFilesExist = false;
          }
        }
      });
    }
  }
});

// 总结
console.log('\n📊 检查总结:');
if (allFilesExist) {
  console.log('  ✅ 所有必需文件都存在');
  console.log('  ✅ 配置文件格式正确');
  console.log('\n🎉 项目配置检查通过！可以尝试部署了。');
  console.log('\n📝 下一步操作:');
  console.log('  1. 在微信开发者工具中导入项目');
  console.log('  2. 填入正确的 AppID');
  console.log('  3. 点击编译检查是否有错误');
  console.log('  4. 点击上传进行部署');
} else {
  console.log('  ❌ 发现配置问题，请根据上述提示进行修复');
  console.log('\n🔧 修复建议:');
  console.log('  1. 创建缺失的文件');
  console.log('  2. 修正错误的路径引用');
  console.log('  3. 更新 AppID 配置');
  console.log('  4. 重新运行此检查脚本');
}

console.log('\n📚 更多帮助请查看 部署检查清单.md 文件'); 