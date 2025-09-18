const fs = require('fs');
const { createCanvas } = require('canvas');

// 创建64x64的画布
function createIcon(width = 64, height = 64) {
    return createCanvas(width, height);
}

// 创建书本图标
function createBookIcon() {
    const canvas = createIcon();
    const ctx = canvas.getContext('2d');
    
    // 清空画布
    ctx.clearRect(0, 0, 64, 64);
    
    // 设置颜色
    ctx.fillStyle = '#4A90E2';
    ctx.strokeStyle = '#4A90E2';
    ctx.lineWidth = 2;
    
    // 绘制书本
    ctx.fillRect(12, 16, 40, 32);
    ctx.strokeRect(12, 16, 40, 32);
    
    // 绘制书页
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(16, 20, 32, 24);
    
    // 绘制文字线条
    ctx.strokeStyle = '#4A90E2';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(20, 26);
    ctx.lineTo(44, 26);
    ctx.moveTo(20, 30);
    ctx.lineTo(44, 30);
    ctx.moveTo(20, 34);
    ctx.lineTo(38, 34);
    ctx.stroke();
    
    return canvas;
}

// 创建复习图标
function createReviewIcon() {
    const canvas = createIcon();
    const ctx = canvas.getContext('2d');
    
    // 清空画布
    ctx.clearRect(0, 0, 64, 64);
    
    // 设置颜色
    ctx.fillStyle = '#4A90E2';
    ctx.strokeStyle = '#4A90E2';
    ctx.lineWidth = 2;
    
    // 绘制圆形背景
    ctx.beginPath();
    ctx.arc(32, 32, 24, 0, 2 * Math.PI);
    ctx.stroke();
    
    // 绘制箭头（表示循环/复习）
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(32, 32, 16, -Math.PI/2, Math.PI/2, false);
    ctx.stroke();
    
    // 绘制箭头头部
    ctx.beginPath();
    ctx.moveTo(44, 32);
    ctx.lineTo(38, 26);
    ctx.moveTo(44, 32);
    ctx.lineTo(38, 38);
    ctx.stroke();
    
    return canvas;
}

// 使用简单的Base64编码创建PNG图片数据
function createSimpleIcon(type) {
    // 这是一个64x64的透明PNG的基础数据
    const pngHeader = Buffer.from([
        0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A
    ]);
    
    // 为了简化，我们创建一个简单的蓝色正方形图标
    if (type === 'book') {
        // 书本图标的简化版本 - 蓝色正方形
        return createBase64Icon('📖');
    } else if (type === 'review') {
        // 复习图标的简化版本 - 蓝色圆形
        return createBase64Icon('🔄');
    }
}

function createBase64Icon(emoji) {
    // 创建一个SVG图标，然后转换为PNG
    const svg = `<svg width="64" height="64" xmlns="http://www.w3.org/2000/svg">
        <rect width="64" height="64" fill="#4A90E2" rx="8"/>
        <text x="32" y="40" font-size="24" text-anchor="middle" fill="white">${emoji}</text>
    </svg>`;
    
    return Buffer.from(svg).toString('base64');
}

// 生成图标文件
try {
    console.log('正在生成缺失的图标文件...');
    
    // 由于没有canvas库，我们使用SVG创建简单图标
    const bookIconSVG = `<svg width="64" height="64" xmlns="http://www.w3.org/2000/svg">
        <rect x="12" y="16" width="40" height="32" fill="#4A90E2" stroke="#4A90E2" stroke-width="2"/>
        <rect x="16" y="20" width="32" height="24" fill="white"/>
        <line x1="20" y1="26" x2="44" y2="26" stroke="#4A90E2" stroke-width="1"/>
        <line x1="20" y1="30" x2="44" y2="30" stroke="#4A90E2" stroke-width="1"/>
        <line x1="20" y1="34" x2="38" y2="34" stroke="#4A90E2" stroke-width="1"/>
    </svg>`;
    
    const reviewIconSVG = `<svg width="64" height="64" xmlns="http://www.w3.org/2000/svg">
        <circle cx="32" cy="32" r="24" fill="none" stroke="#4A90E2" stroke-width="2"/>
        <path d="M 16 32 A 16 16 0 0 1 48 32" fill="none" stroke="#4A90E2" stroke-width="3"/>
        <polyline points="44,32 38,26 44,32 38,38" fill="none" stroke="#4A90E2" stroke-width="3"/>
    </svg>`;
    
    // 保存SVG文件（临时解决方案）
    fs.writeFileSync('./book-icon.svg', bookIconSVG);
    fs.writeFileSync('./review-icon.svg', reviewIconSVG);
    
    console.log('✓ SVG图标文件已生成');
    console.log('请使用在线转换工具将SVG转换为PNG，或者安装图像处理库');
    
} catch (error) {
    console.error('生成图标时出错:', error);
    console.log('请手动创建这些图标文件，或使用在线图标库');
}
