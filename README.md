# K12 词汇学习系统

面向 K12 阶段的词汇学习 / 评测微信小程序，集成会员体系、云端数据同步与后台运营工具。

<p align="left">
  <strong>技术栈</strong>：微信小程序 · Node.js · Express · SQLite/MongoDB · 微信支付 · 宝塔/Nginx
</p>

---

## ⭐️ 主要特性

| 模块 | 能力 |
| --- | --- |
| 学习体验 | 按年级/阶段的分组学习、错题本、水平测试、学习日历、动画交互 |
| 会员体系 | 免费/付费权限、测试次数与词汇范围限制、激活码/优惠码 |
| 支付系统 | 微信支付 API v2，创建订单、统一下单、回调验证、订单查询 |
| 数据同步 | 本地缓存 + 云端统计，支持 SQLite 或 MongoDB 存储 |
| 后台运营 | `/admin` Web 管理台，统计总览、用户/课程/订单/优惠码管理 |
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