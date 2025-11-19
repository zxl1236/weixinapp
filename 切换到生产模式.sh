#!/bin/bash

# 切换到生产模式脚本
# 用于快速将后端从开发模式切换到生产模式

set -e

echo "🚀 开始切换到生产模式..."
echo ""

# 获取脚本所在目录
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

# 检查 .env 文件是否存在
if [ ! -f ".env" ]; then
    echo "❌ 错误: .env 文件不存在"
    echo "💡 提示: 请先复制 env.example 为 .env 并填写配置"
    exit 1
fi

# 备份当前 .env 文件
echo "📦 备份当前 .env 文件..."
cp .env .env.backup.$(date +%Y%m%d_%H%M%S)
echo "✅ 备份完成"
echo ""

# 检查是否已经是生产模式
if grep -q "^NODE_ENV=production" .env; then
    echo "⚠️  当前已经是生产模式"
    read -p "是否继续检查配置? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 0
    fi
else
    # 修改 NODE_ENV 为 production
    echo "🔧 修改 NODE_ENV 为 production..."
    if grep -q "^NODE_ENV=" .env; then
        # 替换现有的 NODE_ENV
        sed -i.bak 's/^NODE_ENV=.*/NODE_ENV=production/' .env
        rm -f .env.bak
    else
        # 添加 NODE_ENV
        echo "NODE_ENV=production" >> .env
    fi
    echo "✅ NODE_ENV 已设置为 production"
    echo ""
fi

# 运行配置检查
echo "🔍 运行配置检查..."
echo ""
node check-config.js

# 检查配置检查结果
if [ $? -eq 0 ]; then
    echo ""
    echo "✅ 配置检查完成"
    echo ""
    echo "📋 下一步操作："
    echo "1. 如果配置检查有错误，请修复后重新运行此脚本"
    echo "2. 如果所有配置都正确，请重启服务："
    echo "   - PM2: pm2 restart k12-backend"
    echo "   - systemd: systemctl restart k12-backend"
    echo "   - 直接运行: 停止当前进程后运行 node server.js"
    echo ""
    echo "3. 检查服务日志，确认："
    echo "   - 没有 '开发模式' 警告"
    echo "   - 显示 '微信支付初始化成功'"
    echo "   - 环境为 production"
    echo ""
else
    echo ""
    echo "❌ 配置检查失败，请修复配置后重试"
    exit 1
fi

