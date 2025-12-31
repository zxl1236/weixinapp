/**
 * 更新百度TTS配置到 .env 文件
 */

const fs = require('fs');
const path = require('path');

const ENV_FILE = path.join(__dirname, '.env');
const APP_ID = '7342191';
const API_KEY = 'wdfkj6O8WFuejHXewR0ZQCg4';
const SECRET_KEY = 'ZIBV6PO1xGO38g1UP0dlPvRhPepnauws';

if (!fs.existsSync(ENV_FILE)) {
    console.error('❌ .env 文件不存在');
    process.exit(1);
}

// 读取文件
let content = fs.readFileSync(ENV_FILE, 'utf8');
const lines = content.split('\n');

// 检查是否已存在配置
const hasBaiduTTS = lines.some(line => line.trim().startsWith('BAIDU_TTS_APP_ID'));

if (hasBaiduTTS) {
    // 更新现有配置
    const updated = lines.map(line => {
        if (line.trim().startsWith('BAIDU_TTS_APP_ID=')) {
            return `BAIDU_TTS_APP_ID=${APP_ID}`;
        } else if (line.trim().startsWith('BAIDU_TTS_API_KEY=')) {
            return `BAIDU_TTS_API_KEY=${API_KEY}`;
        } else if (line.trim().startsWith('BAIDU_TTS_SECRET_KEY=')) {
            return `BAIDU_TTS_SECRET_KEY=${SECRET_KEY}`;
        }
        return line;
    });
    fs.writeFileSync(ENV_FILE, updated.join('\n'), 'utf8');
    console.log('✅ 已更新现有百度TTS配置');
} else {
    // 添加新配置
    content += '\n# 百度TTS配置\n';
    content += `BAIDU_TTS_APP_ID=${APP_ID}\n`;
    content += `BAIDU_TTS_API_KEY=${API_KEY}\n`;
    content += `BAIDU_TTS_SECRET_KEY=${SECRET_KEY}\n`;
    fs.writeFileSync(ENV_FILE, content, 'utf8');
    console.log('✅ 已添加百度TTS配置');
}

// 验证配置
console.log('\n📋 验证配置:');
const final = fs.readFileSync(ENV_FILE, 'utf8');
final.split('\n')
    .filter(line => line.includes('BAIDU_TTS'))
    .forEach(line => console.log(line.trim()));

console.log('\n✅ 配置更新完成！');

