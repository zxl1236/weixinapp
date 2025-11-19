#!/bin/bash

# K12词汇学习系统 - CentOS快速部署脚本
# 使用方法: bash deploy-centos.sh

set -e  # 遇到错误立即退出

echo "🚀 开始部署 K12词汇学习系统..."
echo ""

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 检查是否为root用户
if [ "$EUID" -ne 0 ]; then 
    echo -e "${RED}❌ 请使用root用户运行此脚本${NC}"
    exit 1
fi

# 1. 更新系统
echo -e "${GREEN}📦 更新系统包...${NC}"
yum update -y
yum install -y wget curl git vim

# 2. 安装Node.js
echo -e "${GREEN}📦 安装Node.js 18.x...${NC}"
if ! command -v node &> /dev/null; then
    curl -fsSL https://rpm.nodesource.com/setup_18.x | bash -
    yum install -y nodejs
else
    echo -e "${YELLOW}⚠️  Node.js已安装，跳过${NC}"
fi

# 验证Node.js安装
NODE_VERSION=$(node --version)
echo -e "${GREEN}✅ Node.js版本: $NODE_VERSION${NC}"

# 3. 安装PM2
echo -e "${GREEN}📦 安装PM2...${NC}"
if ! command -v pm2 &> /dev/null; then
    npm install -g pm2
else
    echo -e "${YELLOW}⚠️  PM2已安装，跳过${NC}"
fi

# 验证PM2安装
PM2_VERSION=$(pm2 --version)
echo -e "${GREEN}✅ PM2版本: $PM2_VERSION${NC}"

# 4. 安装Nginx
echo -e "${GREEN}📦 安装Nginx...${NC}"
if ! command -v nginx &> /dev/null; then
    yum install -y nginx
    systemctl enable nginx
    systemctl start nginx
else
    echo -e "${YELLOW}⚠️  Nginx已安装，跳过${NC}"
fi

# 5. 配置防火墙
echo -e "${GREEN}🔥 配置防火墙...${NC}"
if systemctl is-active --quiet firewalld; then
    firewall-cmd --permanent --add-service=http
    firewall-cmd --permanent --add-service=https
    firewall-cmd --permanent --add-port=3000/tcp
    firewall-cmd --reload
    echo -e "${GREEN}✅ 防火墙规则已添加${NC}"
else
    echo -e "${YELLOW}⚠️  防火墙未运行，跳过${NC}"
fi

# 6. 创建项目目录
PROJECT_DIR="/var/www/k12-backend"
echo -e "${GREEN}📁 创建项目目录: $PROJECT_DIR${NC}"
mkdir -p $PROJECT_DIR
cd $PROJECT_DIR

# 7. 检查是否已有代码
if [ -f "package.json" ]; then
    echo -e "${YELLOW}⚠️  项目目录已存在代码${NC}"
    read -p "是否继续安装依赖? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${RED}❌ 部署已取消${NC}"
        exit 1
    fi
else
    echo -e "${YELLOW}⚠️  项目目录为空，请先上传代码${NC}"
    echo -e "${YELLOW}   可以使用以下方式上传代码:${NC}"
    echo -e "${YELLOW}   1. Git: git clone <repo-url> .${NC}"
    echo -e "${YELLOW}   2. SCP: scp -r backend/* root@server:$PROJECT_DIR/${NC}"
    echo -e "${YELLOW}   3. FTP/SFTP工具${NC}"
    read -p "代码已上传? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${RED}❌ 请先上传代码后再运行此脚本${NC}"
        exit 1
    fi
fi

# 8. 安装依赖
echo -e "${GREEN}📦 安装项目依赖...${NC}"
if [ -f "package.json" ]; then
    npm install --production
    echo -e "${GREEN}✅ 依赖安装完成${NC}"
else
    echo -e "${RED}❌ 未找到package.json文件${NC}"
    exit 1
fi

# 9. 创建必要目录
echo -e "${GREEN}📁 创建必要目录...${NC}"
mkdir -p data certs
chmod 755 data certs
echo -e "${GREEN}✅ 目录创建完成${NC}"

# 10. 检查.env文件
echo -e "${GREEN}⚙️  检查环境变量配置...${NC}"
if [ ! -f ".env" ]; then
    if [ -f "env.example" ]; then
        cp env.example .env
        echo -e "${YELLOW}⚠️  已创建.env文件，请编辑配置:${NC}"
        echo -e "${YELLOW}   vim $PROJECT_DIR/.env${NC}"
    else
        echo -e "${RED}❌ 未找到.env或env.example文件${NC}"
        exit 1
    fi
else
    echo -e "${GREEN}✅ .env文件已存在${NC}"
fi

# 11. 启动服务
echo -e "${GREEN}🚀 启动服务...${NC}"
if pm2 list | grep -q "k12-backend"; then
    echo -e "${YELLOW}⚠️  服务已存在，重启服务...${NC}"
    pm2 restart k12-backend
else
    pm2 start server.js --name k12-backend
    pm2 save
    echo -e "${GREEN}✅ 服务已启动${NC}"
fi

# 12. 设置PM2开机自启
echo -e "${GREEN}⚙️  配置PM2开机自启...${NC}"
pm2 startup systemd -u root --hp /root
echo -e "${GREEN}✅ PM2开机自启已配置${NC}"

# 13. 显示服务状态
echo ""
echo -e "${GREEN}📊 服务状态:${NC}"
pm2 status

echo ""
echo -e "${GREEN}✅ 部署完成！${NC}"
echo ""
echo -e "${YELLOW}📝 后续步骤:${NC}"
echo -e "${YELLOW}1. 编辑环境变量: vim $PROJECT_DIR/.env${NC}"
echo -e "${YELLOW}2. 配置Nginx: vim /etc/nginx/conf.d/k12-backend.conf${NC}"
echo -e "${YELLOW}3. 配置SSL证书（如需要）${NC}"
echo -e "${YELLOW}4. 查看日志: pm2 logs k12-backend${NC}"
echo -e "${YELLOW}5. 测试服务: curl http://localhost:3000/health${NC}"
echo ""
echo -e "${GREEN}详细部署指南请查看: CentOS服务器部署指南.md${NC}"

