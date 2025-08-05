// 页面路径验证脚本
const fs = require('fs');

console.log('🔍 验证微信小程序页面路径...\n');

// 读取 app.json 获取页面配置
try {
  const appJson = JSON.parse(fs.readFileSync('app.json', 'utf8'));
  
  console.log('📋 当前项目配置的页面路径:');
  appJson.pages.forEach((page, index) => {
    console.log(`  ${index + 1}. ${page}`);
    
    // 检查页面文件是否存在
    const jsFile = `${page}.js`;
    const wxmlFile = `${page}.wxml`;
    const wxssFile = `${page}.wxss`;
    
    const jsExists = fs.existsSync(jsFile);
    const wxmlExists = fs.existsSync(wxmlFile);
    const wxssExists = fs.existsSync(wxssFile);
    
    console.log(`     📄 ${jsFile}: ${jsExists ? '✅' : '❌'}`);
    console.log(`     📄 ${wxmlFile}: ${wxmlExists ? '✅' : '❌'}`);
    console.log(`     📄 ${wxssFile}: ${wxssExists ? '✅' : '❌'}`);
    
    if (!jsExists || !wxmlExists || !wxssExists) {
      console.log(`     ⚠️  页面 ${page} 文件不完整`);
    } else {
      console.log(`     ✅ 页面 ${page} 文件完整`);
    }
    console.log('');
  });
  
  // 推荐路径
  console.log('🎯 推荐填写路径:');
  if (appJson.pages.length > 0) {
    console.log(`  主要推荐: ${appJson.pages[0]}`);
    console.log('  (这是首页路径，用户进入小程序时看到的第一个页面)');
  }
  
  console.log('\n📝 其他可选路径:');
  appJson.pages.slice(1).forEach(page => {
    console.log(`  - ${page}`);
  });
  
  console.log('\n⚠️  注意事项:');
  console.log('  1. 路径不要添加 .js、.wxml 等后缀');
  console.log('  2. 确保路径大小写完全匹配');
  console.log('  3. 某些页面可能需要参数才能正常显示');
  
  console.log('\n✅ 验证完成！您可以在微信小程序后台使用上述路径。');
  
} catch (error) {
  console.error('❌ 读取 app.json 失败:', error.message);
} 