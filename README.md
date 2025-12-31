# K12词汇学习系统 - 后端服务

这是K12词汇学习小程序的Node.js后端服务，提供用户管理、课程管理、支付管理等核心功能。
| 辅助工具 | `check-deploy.js`、`verify-wechat-config.js`、`fix-database.js` 等自动化脚本 |

---

## 📁 仓库结构（摘录）

```
├── frontend/                  # 微信小程序
│   ├── pages/                 # 学习、测试、主页等页面
│   ├── utils/                 # apiConfig、paymentService、userManager...
│   ├── check-deploy.js        # 上线前自检脚本
│   └── docs/                  # 产品/部署文档
├── backend/                   # Node.js 服务
│   ├── server.js              # 入口，自动选择 SQLite / MongoDB
│   ├── routes/                # users、payment、admin ...
│   ├── controllers/           # User/Payment/Admin 业务
│   ├── services/wechatPay.js  # 微信支付封装（统一下单、回调验签）
│   ├── scripts/               # fix-database、create-activation-code 等脚本
│   ├── admin/                 # 运营后台（静态页面）
│   └── verify-wechat-config.js# 快速校验 .env 必填项
├── README.md
└── ...
```

---

## ⚙️ 本地快速开始

```bash
# 1. 克隆仓库
git clone <repo-url>

# 2. 安装前端依赖（按需）
cd frontend
npm install           # 或者直接在微信开发者工具里构建

# 3. 安装后端依赖
cd ../backend
npm install
cp env.example .env   # 填写真实 AppID、商户号、API Key 等

# 4. 启动服务
npm run dev           # 或 npm start
# 默认监听 http://localhost:3000
```

> 如启用 SQLite，首次启动会在 `backend/data/` 下生成 `k12_vocabulary.db`。  
> 若切换 MongoDB，设置 `DB_TYPE=mongodb` 与 `MONGODB_URI` 即可。

---

## 🔐 必填环境变量（backend/.env）

| 键 | 说明 |
| --- | --- |
| `NODE_ENV` | `development` / `production` |
| `WECHAT_APPID` / `WECHAT_SECRET` | 小程序 AppID & Secret，用于登录 code2Session |
| `WECHAT_MCHID` / `WECHAT_API_KEY` | 微信支付商户号 & APIv2 密钥 |
| `WECHAT_NOTIFY_URL` | 支付回调 URL（必须为公网 HTTPS） |
| `WECHAT_CERT_PATH` / `WECHAT_KEY_PATH` | `apiclient_cert.pem` / `apiclient_key.pem` 路径 |
| `ADMIN_API_KEY` | 管理后台访问密钥 |
| `ALLOWED_ORIGINS` | 允许的跨域源 |

辅助脚本：

```bash
node verify-wechat-config.js   # 检查 .env 是否填好
node fix-database.js           # 修复 SQLite 表结构
```

---

## 🚀 上线流程

### 1. 前端
1. `frontend/utils/apiConfig.js`：`USE_DEV=false`，`PROD_API_BASE=https://your-domain.com`
2. `frontend/utils/paymentService.js`：`isDevelopment=false`，填写真实 `appId/mchId`
3. 运行 `node check-deploy.js` 确认配置、日志、关键文件无误
4. 使用微信开发者工具上传构建，填写版本说明并提交审核

### 2. 后端（symbol 服务器示例）
```bash
cd /www/wwwroot/k12-backend/backend
npm install --production
pm2 start server.js --name k12-backend
pm2 save && pm2 startup
```
- 把 `.env`、`certs/`、`data/` 上传到服务器
- Nginx/宝塔配置：域名 → HTTPS → 反向代理 `127.0.0.1:3000`
- 访问 `https://your-domain.com/health`，确认返回 `{status:'ok'}`  

### 3. 微信后台
- 公众平台：开发设置中添加 `https://your-domain.com` 为 request 合法域名
- 微信支付商户平台：设置 APIv2 密钥、证书、回调 URL，与 `.env` 保持一致
- 审核通过后“全量发布”，真机走一遍登录+支付验证

---

## 🧾 管理后台

- 地址：`https://your-domain.com/admin`
- 首次使用需输入 `.env` 中的 `ADMIN_API_KEY`
- 功能：统计仪表盘、用户/课程/订单/优惠码/激活码管理、操作日志

---

## 🧰 常用命令

```bash
# 前端上线自检
cd frontend && node check-deploy.js

# 修复 SQLite 表结构
cd backend && node fix-database.js

# 校验微信配置
cd backend && node verify-wechat-config.js

# PM2 管理
pm2 restart k12-backend
pm2 logs k12-backend
```

---

## 🛡️ 部署拓扑 & 运维建议

```
Mini Program ─HTTP(S)─> Nginx/宝塔 ─> Node.js backend ─> SQLite/MongoDB
                       └────────────> 微信支付（notify 回调）
```

- 推荐服务器：2 核 CPU / 2 GB RAM / 40 GB SSD
- Node.js 18+，使用 PM2 托管
- 定期备份：`backend/data/`、`backend/certs/`、`backend/.env`
- 监控：`pm2 status`、`pm2 logs`、`https://your-domain.com/health`

---

## 📄 许可证

MIT License

---

如需在 README 中补充产品截图、接口文档或 FAQ，可继续 PR/提交 Issue。欢迎贡献！ 🙌
=======
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

>>>>>>> 9dab021d28f5db1276f54ee28bc9bdf60e2de304
