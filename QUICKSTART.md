# 快速启动指南

## 1. 安装依赖

```bash
cd backend
npm install
```

## 2. 配置环境变量

复制环境变量示例文件：

```bash
# Windows PowerShell
Copy-Item env.example .env

# Linux/Mac
cp env.example .env
```

编辑 `.env` 文件，至少配置以下必需项：

```env
MONGODB_URI=mongodb://localhost:27017/k12_vocabulary
ADMIN_API_KEY=your_secret_key_here
```

## 3. 启动MongoDB

确保MongoDB服务正在运行：

```bash
# Windows
net start MongoDB

# Linux
sudo systemctl start mongod

# Mac
brew services start mongodb-community
```

## 4. 启动服务器

```bash
# 开发模式（自动重启）
npm run dev

# 生产模式
npm start
```

服务器将在 `http://localhost:3000` 启动。

## 5. 访问管理后台

打开浏览器访问：`http://localhost:3000/admin`

在页面顶部输入API密钥（`.env` 中的 `ADMIN_API_KEY`），然后点击"设置密钥"。

## 测试API

### 健康检查
```bash
curl http://localhost:3000/health
```

### 用户注册
```bash
curl -X POST http://localhost:3000/api/users/register \
  -H "Content-Type: application/json" \
  -d '{"openid":"test_openid_123","nickname":"测试用户"}'
```

### 获取课程列表
```bash
curl http://localhost:3000/api/courses
```

## 下一步

1. 配置微信支付（如需要）
2. 初始化课程数据
3. 创建优惠码
4. 查看完整文档：`README.md`

