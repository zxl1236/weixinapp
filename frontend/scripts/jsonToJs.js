#!/usr/bin/env node

// 简单工具：将 JSON 文件内容转换为 JS 模块 (module.exports)
// 用法：
//   node scripts/jsonToJs.js frontend/cdn-data/grade7_1.json frontend/cdn-data/js-modules/grade7_1.js

const fs = require('fs');
const path = require('path');

function printUsage() {
  console.log('用法:');
  console.log('  node scripts/jsonToJs.js <源JSON路径> <目标JS路径>');
  console.log('示例:');
  console.log('  node scripts/jsonToJs.js frontend/cdn-data/grade7_1.json frontend/cdn-data/js-modules/grade7_1.js');
}

const [, , srcJson, destJs] = process.argv;

if (!srcJson || !destJs) {
  printUsage();
  process.exit(1);
}

const srcPath = path.resolve(srcJson);
const destPath = path.resolve(destJs);

if (!fs.existsSync(srcPath)) {
  console.error(`源 JSON 文件不存在: ${srcPath}`);
  process.exit(1);
}

let jsonText;
try {
  jsonText = fs.readFileSync(srcPath, 'utf8');
} catch (e) {
  console.error('读取 JSON 文件失败:', e.message);
  process.exit(1);
}

let data;
try {
  data = JSON.parse(jsonText);
} catch (e) {
  console.error('解析 JSON 失败，请检查格式是否正确:', e.message);
  process.exit(1);
}

const now = new Date().toISOString();
const srcBase = path.basename(srcPath);

const jsBody = JSON.stringify(data, null, 2);

const output = [
  `// 自动生成的JS模块 - ${srcBase}`,
  `// 生成时间: ${now}`,
  '',
  'module.exports = ',
  jsBody + ';',
  ''
].join('\n');

// 确保目标目录存在
const destDir = path.dirname(destPath);
if (!fs.existsSync(destDir)) {
  fs.mkdirSync(destDir, { recursive: true });
}

try {
  fs.writeFileSync(destPath, output, 'utf8');
  console.log(`已生成 JS 模块: ${destPath}`);
} catch (e) {
  console.error('写入 JS 文件失败:', e.message);
  process.exit(1);
}
