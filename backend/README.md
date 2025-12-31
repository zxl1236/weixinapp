# K12词汇学习系统 - 后端服务

## 项目简介

这是K12词汇学习小程序的Node.js后端服务，提供用户管理、课程管理、支付管理等核心功能。

## 技术栈

- **Node.js** 18+
- **Express.js** - Web框架
- **MongoDB** + **Mongoose** - 数据库
- **微信支付API v3** - 支付集成

## 项目结构

```
backend/
├── server.js                 # 主服务器入口
├── package.json              # 项目依赖
├── .env                      # 环境变量配置（需自行创建）
├── config/
│   ├── database.js          # MongoDB连接配置
│   └── wechat.js            # 微信支付配置
├── models/
│   ├── User.js              # 用户数据模型
│   ├── Course.js            # 课程数据模型
│   ├── Order.js             # 订单数据模型
│   └── DiscountCode.js      # 优惠码数据模型
├── routes/
│   ├── users.js             # 用户管理路由
│   ├── courses.js           # 课程管理路由
│   ├── payment.js           # 支付相关路由
│   └── admin.js             # 管理后台路由
├── controllers/
│   ├── userController.js    # 用户业务逻辑
│   ├── courseController.js  # 课程业务逻辑
│   ├── paymentController.js # 支付业务逻辑
│   └── adminController.js   # 管理后台逻辑
├── middleware/
│   ├── auth.js              # 认证中间件
│   └── errorHandler.js      # 错误处理
├── services/
│   └── wechatPay.js         # 微信支付服务
├── utils/
│   └── logger.js            # 日志工具
└── admin/                    # Web管理后台
    ├── index.html           # 管理后台首页
    └── assets/
        ├── css/
        │   └── admin.css    # 管理后台样式
        └── js/
            └── admin.js      # 管理后台脚本
```

## 快速开始

### 1. 安装依赖

```bash
cd backend
npm install
```

### 2. 配置环境变量

复制 `.env.example` 为 `.env` 并填写配置：

```bash
cp .env.example .env
```

编辑 `.env` 文件：

```env
# 服务器配置
PORT=3000
NODE_ENV=development

# MongoDB配置
MONGODB_URI=mongodb://localhost:27017/k12_vocabulary

# 微信支付配置
WECHAT_APPID=your_wechat_appid
WECHAT_MCHID=your_merchant_id
WECHAT_API_KEY=your_api_key
WECHAT_CERT_PATH=./certs/apiclient_cert.pem
WECHAT_KEY_PATH=./certs/apiclient_key.pem
WECHAT_NOTIFY_URL=https://your-domain.com/api/payment/notify

# 管理后台配置
ADMIN_API_KEY=your_admin_api_key_here

# CORS配置
ALLOWED_ORIGINS=http://localhost:3000,https://your-domain.com
```

### 3. 启动MongoDB

确保MongoDB服务已启动：

```bash
# Windows
net start MongoDB

# Linux/Mac
sudo systemctl start mongod
```

### 4. 启动服务器

```bash
# 开发模式（自动重启）
npm run dev

# 生产模式
npm start
```

服务器将在 `http://localhost:3000` 启动。

## API接口文档

### 用户管理 (`/api/users`)

- `POST /api/users/register` - 用户注册/登录
- `GET /api/users/:openid` - 获取用户信息
- `PUT /api/users/:openid` - 更新用户信息
- `GET /api/users/:openid/stats` - 获取用户统计

### 课程管理 (`/api/courses`)

- `GET /api/courses` - 获取所有课程列表
- `GET /api/courses/:gradeId` - 获取指定课程详情

### 支付接口 (`/api/payment`)

- `POST /api/payment/create-order` - 创建订单
- `POST /api/payment/get-params` - 获取微信支付参数
- `POST /api/payment/notify` - 微信支付回调
- `POST /api/payment/complete` - 支付完成确认
- `GET /api/payment/orders/:orderId` - 查询订单状态
- `GET /api/payment/orders/user/:openid` - 获取用户订单列表

### 管理后台 (`/api/admin`)

所有管理后台接口需要 `X-API-Key` 请求头。

- `GET /api/admin/users` - 获取用户列表（分页）
- `GET /api/admin/users/:id` - 获取用户详情
- `PUT /api/admin/users/:id/membership` - 手动修改会员状态
- `GET /api/admin/courses` - 获取所有课程
- `POST /api/admin/courses` - 创建课程
- `PUT /api/admin/courses/:id` - 更新课程
- `GET /api/admin/orders` - 获取订单列表（分页、筛选）
- `GET /api/admin/orders/:id` - 获取订单详情
- `GET /api/admin/stats` - 获取统计数据
- `GET /api/admin/discount-codes` - 获取优惠码列表
- `POST /api/admin/discount-codes` - 创建优惠码

## Web管理后台

访问 `http://localhost:3000/admin` 打开管理后台。

首次使用需要：
1. 在页面顶部输入API密钥（`.env` 中的 `ADMIN_API_KEY`）
2. 点击"设置密钥"按钮

管理后台功能：
- 统计概览：用户数、订单数、收入等
- 用户管理：查看、搜索、编辑用户
- 课程管理：查看、创建、编辑课程
- 订单管理：查看订单列表、筛选、查看详情
- 优惠码管理：创建和管理优惠码

## 数据库模型

### User（用户）
- openid: 微信openid（唯一）
- membership: 会员类型（free/premium）
- membershipExpireTime: 会员到期时间
- dailyUsage: 每日使用统计
- totalTestCount: 总测试次数

### Course（课程）
- gradeId: 年级ID（如grade3_1，唯一）
- gradeName: 年级名称
- stage: 阶段（primary/junior/senior）
- level: 年级级别
- targetWords: 目标词汇数
- enabled: 是否启用

### Order（订单）
- orderId: 订单号（唯一）
- userId: 用户ID
- openid: 用户openid
- amount: 支付金额（分）
- status: 订单状态（pending/paid/failed/cancelled）
- wxTransactionId: 微信交易号

### DiscountCode（优惠码）
- code: 优惠码（唯一）
- type: 类型（amount/percent）
- discountAmount: 优惠金额
- discountPercent: 优惠百分比
- maxUsage: 最大使用次数
- validFrom/validUntil: 有效期

## 微信支付配置

### 1. 获取证书文件

从微信商户平台下载证书文件：
- `apiclient_cert.pem` - 证书文件
- `apiclient_key.pem` - 私钥文件

将文件放置在 `backend/certs/` 目录下。

### 2. 配置回调地址

在微信商户平台配置支付回调地址：
```
https://your-domain.com/api/payment/notify
```

### 3. 开发模式

在开发环境中，支付功能会被模拟，无需真实微信支付配置。

## 部署说明

### 生产环境部署

1. 设置 `NODE_ENV=production`
2. 配置真实的MongoDB连接
3. 配置微信支付参数
4. 配置HTTPS（微信支付回调需要）
5. 使用PM2或类似工具管理进程

### PM2部署示例

```bash
npm install -g pm2
pm2 start server.js --name k12-backend
pm2 save
pm2 startup
```

## 常见问题

### MongoDB连接失败

- 检查MongoDB服务是否启动
- 检查连接字符串是否正确
- 检查防火墙设置

### 微信支付回调失败

- 检查回调URL是否可访问（需要HTTPS）
- 检查证书文件路径是否正确
- 检查签名验证逻辑

### 管理后台无法访问

- 检查API密钥是否正确
- 检查请求头是否包含 `X-API-Key`
- 检查CORS配置

## 开发计划

- [ ] 添加用户认证中间件
- [ ] 实现数据导出功能
- [ ] 添加操作日志记录
- [ ] 实现定时任务（会员过期检查）
- [ ] 添加单元测试
- [ ] 完善管理后台功能

## 许可证

ISC

