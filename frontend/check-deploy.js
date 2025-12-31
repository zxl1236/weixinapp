/**
 * 部署前配置检查脚本
 * 用于检查上线前的配置是否正确
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 开始检查部署配置...\n');

let hasError = false;
let warnings = [];

// 检查项
const checks = [];

// 1. 检查 app.json
function checkAppJson() {
  console.log('📱 检查 app.json...');
  try {
    const appJson = JSON.parse(fs.readFileSync('app.json', 'utf8'));
    
    if (appJson.debug === true) {
      console.log('  ❌ debug 模式未关闭');
      hasError = true;
    } else {
      console.log('  ✅ debug 模式已关闭');
    }
    
    if (!appJson.pages || appJson.pages.length === 0) {
      console.log('  ❌ 页面配置为空');
      hasError = true;
    } else {
      console.log(`  ✅ 配置了 ${appJson.pages.length} 个页面`);
    }
  } catch (error) {
    console.log('  ❌ 无法读取 app.json:', error.message);
    hasError = true;
  }
  console.log('');
}

// 2. 检查支付配置
function checkPaymentConfig() {
  console.log('💳 检查支付配置...');
  try {
    const paymentService = fs.readFileSync('utils/paymentService.js', 'utf8');
    
    if (paymentService.includes('isDevelopment: true')) {
      console.log('  ⚠️  支付仍为开发模式 (isDevelopment: true)');
      warnings.push('支付配置仍为开发模式，上线前需要改为 false');
    } else if (paymentService.includes('isDevelopment: false')) {
      console.log('  ✅ 支付已配置为生产模式');
    } else {
      console.log('  ⚠️  无法确定支付模式');
      warnings.push('请检查支付配置');
    }
    
    if (paymentService.includes('your-api-domain.com')) {
      console.log('  ⚠️  后端API地址未配置（仍为示例地址）');
      warnings.push('请配置实际的后端API地址');
    } else {
      console.log('  ✅ 后端API地址已配置');
    }
  } catch (error) {
    console.log('  ❌ 无法读取支付配置文件:', error.message);
    hasError = true;
  }
  console.log('');
}

// 3. 检查CDN配置
function checkCDNConfig() {
  console.log('☁️  检查CDN配置...');
  try {
    const config = fs.readFileSync('utils/config.js', 'utf8');
    
    if (config.includes('CDN_BASE')) {
      console.log('  ✅ CDN配置存在');
    } else {
      console.log('  ⚠️  CDN配置可能不完整');
      warnings.push('请检查CDN配置');
    }
  } catch (error) {
    console.log('  ❌ 无法读取CDN配置文件:', error.message);
    hasError = true;
  }
  console.log('');
}

// 4. 检查后端环境变量
function checkBackendEnv() {
  console.log('🔧 检查后端环境变量...');
  const backendDir = path.resolve(__dirname, '../backend');
  const envPath = path.join(backendDir, '.env');
  const envExamplePath = path.join(backendDir, '.env.production');
  
  if (fs.existsSync(envPath)) {
    console.log('  ✅ .env 文件存在');
    
    try {
      const envContent = fs.readFileSync(envPath, 'utf8');
      const meaningfulLines = envContent
        .split('\n')
        .map(line => line.trim())
        .filter(line => line && !line.startsWith('#'));
      
      const hasPlaceholder = meaningfulLines.some(line => line.includes('your_') || line.includes('your-'));
      if (hasPlaceholder) {
        console.log('  ⚠️  环境变量中仍有示例值未替换');
        warnings.push('请检查并替换 .env 文件中的示例值');
      } else {
        console.log('  ✅ 环境变量已配置');
      }
      
      if (envContent.includes('NODE_ENV=production')) {
        console.log('  ✅ 生产环境配置正确');
      } else {
        console.log('  ⚠️  NODE_ENV 可能不是 production');
        warnings.push('请确认 NODE_ENV=production');
      }
    } catch (error) {
      console.log('  ⚠️  无法读取 .env 文件');
    }
  } else {
    console.log('  ℹ️  未找到 backend/.env（可能已在服务器配置）');
    if (fs.existsSync(envExamplePath)) {
      console.log('  💡 提示: 可以从 .env.production 复制创建 .env');
    }
    warnings.push('请确认服务器上的 backend/.env 已配置');
  }
  console.log('');
}

// 5. 检查关键文件
function checkKeyFiles() {
  console.log('📄 检查关键文件...');
  const frontFiles = [
    'app.js',
    'app.json',
    'utils/paymentService.js',
    'utils/config.js',
    'utils/userManager.js'
  ];
  const backendDir = path.resolve(__dirname, '../backend');
  const backendFiles = [
    'server.js',
    'package.json'
  ].map(file => path.join(backendDir, file));

  let missingFiles = [];

  frontFiles.forEach(file => {
    if (fs.existsSync(file)) {
      console.log(`  ✅ ${file}`);
    } else {
      console.log(`  ❌ ${file} 不存在`);
      missingFiles.push(file);
      hasError = true;
    }
  });

  backendFiles.forEach(file => {
    if (fs.existsSync(file)) {
      console.log(`  ✅ ${path.relative(process.cwd(), file)}`);
    } else {
      console.log(`  ❌ ${file} 不存在`);
      missingFiles.push(file);
      hasError = true;
    }
  });
  
  if (missingFiles.length === 0) {
    console.log('  ✅ 所有关键文件存在');
  }
  console.log('');
}

// 6. 检查调试代码
function checkDebugCode() {
  console.log('🐛 检查调试代码...');
  try {
    const pagesDir = 'pages';
    if (!fs.existsSync(pagesDir)) {
      console.log('  ⚠️  pages 目录不存在');
      return;
    }
    
    let debugCount = 0;
    const files = getAllJsFiles(pagesDir);
    
    files.forEach(file => {
      const content = fs.readFileSync(file, 'utf8');
      // 只检查 console.log，保留 console.error 和 console.warn（用于错误处理）
      const matches = content.match(/console\.log\(/g);
      if (matches) {
        debugCount += matches.length;
      }
    });
    
    if (debugCount > 0) {
      console.log(`  ⚠️  发现 ${debugCount} 处 console.log 调用`);
      warnings.push(`建议清理 ${debugCount} 处 console.log 调试代码`);
    } else {
      console.log('  ✅ 未发现 console.log 调试代码（已保留 console.error/warn 用于错误处理）');
    }
  } catch (error) {
    console.log('  ⚠️  检查调试代码时出错:', error.message);
  }
  console.log('');
}

// 获取所有JS文件
function getAllJsFiles(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  
  list.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat && stat.isDirectory()) {
      results = results.concat(getAllJsFiles(filePath));
    } else if (file.endsWith('.js')) {
      results.push(filePath);
    }
  });
  
  return results;
}

// 执行所有检查
checkAppJson();
checkPaymentConfig();
checkCDNConfig();
checkBackendEnv();
checkKeyFiles();
checkDebugCode();

// 输出总结
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('📊 检查总结\n');

if (hasError) {
  console.log('❌ 发现错误，请修复后再上线！');
  process.exit(1);
} else if (warnings.length > 0) {
  console.log('⚠️  发现以下警告：');
  warnings.forEach((warning, index) => {
    console.log(`   ${index + 1}. ${warning}`);
  });
  console.log('\n💡 建议修复警告后再上线');
  process.exit(0);
} else {
  console.log('✅ 所有检查通过！可以准备上线了！');
  console.log('\n📋 下一步：');
  console.log('  1. 确认后端服务器已部署');
  console.log('  2. 配置微信小程序域名');
  console.log('  3. 上传代码到微信平台');
  console.log('  4. 提交审核');
  process.exit(0);
}

