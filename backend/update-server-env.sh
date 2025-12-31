#!/bin/bash

# 更新服务器上的百度TTS配置
# 使用方法: bash update-server-env.sh

echo "🔧 更新服务器上的百度TTS配置..."
echo ""

# 配置值
APP_ID="7342191"
API_KEY="wdfkj6O8WFuejHXewR0ZQCg4"
SECRET_KEY="ZIBV6PO1xGO38g1UP0dlPvRhPepnauws"

# 可能的服务器路径（根据实际情况选择）
SERVER_PATHS=(
    "/var/www/k12-backend/backend"
    "/www/wwwroot/k12-backend/backend"
    "$(pwd)"
)

# 查找 .env 文件
ENV_FILE=""
for path in "${SERVER_PATHS[@]}"; do
    if [ -f "$path/.env" ]; then
        ENV_FILE="$path/.env"
        echo "✅ 找到 .env 文件: $ENV_FILE"
        break
    fi
done

if [ -z "$ENV_FILE" ]; then
    echo "❌ 未找到 .env 文件，请手动指定路径"
    echo "使用方法: bash update-server-env.sh /path/to/backend/.env"
    exit 1
fi

# 备份原文件
cp "$ENV_FILE" "${ENV_FILE}.backup.$(date +%Y%m%d_%H%M%S)"
echo "📦 已备份原文件"

# 检查是否已存在配置
if grep -q "BAIDU_TTS_APP_ID" "$ENV_FILE"; then
    # 更新现有配置
    sed -i "s/BAIDU_TTS_APP_ID=.*/BAIDU_TTS_APP_ID=$APP_ID/" "$ENV_FILE"
    sed -i "s/BAIDU_TTS_API_KEY=.*/BAIDU_TTS_API_KEY=$API_KEY/" "$ENV_FILE"
    sed -i "s/BAIDU_TTS_SECRET_KEY=.*/BAIDU_TTS_SECRET_KEY=$SECRET_KEY/" "$ENV_FILE"
    echo "✅ 已更新现有百度TTS配置"
else
    # 添加新配置
    echo "" >> "$ENV_FILE"
    echo "# 百度TTS配置" >> "$ENV_FILE"
    echo "BAIDU_TTS_APP_ID=$APP_ID" >> "$ENV_FILE"
    echo "BAIDU_TTS_API_KEY=$API_KEY" >> "$ENV_FILE"
    echo "BAIDU_TTS_SECRET_KEY=$SECRET_KEY" >> "$ENV_FILE"
    echo "✅ 已添加百度TTS配置"
fi

# 验证配置
echo ""
echo "📋 验证配置:"
grep "BAIDU_TTS" "$ENV_FILE"

echo ""
echo "✅ 配置更新完成！"
echo ""
echo "⚠️  下一步：重启服务使配置生效"
echo "   pm2 restart k12-backend"
echo "   或"
echo "   systemctl restart k12-backend"

