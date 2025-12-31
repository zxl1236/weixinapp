# .env 文件配置说明

## ✅ 已完成的配置

`.env` 文件已创建并填充了以下配置：

### 基础配置
- ✅ **PORT**: 3000
- ✅ **NODE_ENV**: development（开发模式）
- ✅ **DB_TYPE**: sqlite

### 微信支付配置（已填充）
- ✅ **WECHAT_APPID**: `wx89a05f337cb25339`
- ⚠️ **WECHAT_SECRET**: 需要从微信公众平台获取（小程序密钥，用于 code2Session）
- ✅ **WECHAT_MCHID**: `1501244881`
- ⚠️ **WECHAT_API_KEY**: `MIIEpAIBAAKCAQEA74ohG082GujeFO2lT5cqxtZFD3AVHeyPqRL091OJ8l6st4Rz
ZoL+9gjJgZRxh3u8GceVFdDIymif5e3UNXGKEgiBY+vNCBEYSKFRhk/IyiK6mGiY
c3WUSxbmrr5M+0Kwy9meXuUOBQxXhJd6J0s4F4tyo7pF305IjWh6yIH/Tozq+PkP
6BIdfBEtv/RRA9OxegPziYsUoLdtqdMjyonu8NujandLZ4iFUgrHJDjH2t3b0sAb
OMon5DylTuM6Y55a6BROnUszXpBMRKcL03KmSGNAzA3zOxFtkOQgH60Cbfj+KSH1
5JO5zchRIgNG/Skb720++wyJFlLTccCgsDGiHQIDAQABAoIBACuOlXiOzcrU31U0
5WN0nH2thr9I5T4cvv7CiLLUiPf+iS+RsR5J4azBakrawE4fjNOvPAfMgEZ2AeVg
er8BF1cyHr0Zqp215hGG6/kdVuiSqhV+p4IPNlj1IBtUVVE3DkjzGF4vDn6SgPOG
S9sLTXbSj5UAESaK6Jx2DCWbpd4VXah2CrGUzlL2uhx4MVSEXf0kNbof3m6Hgvuk
GgNKGoCEhqzhEbhh6QLeO2dk3DWva8xYLF3aax5EWOfm7e4FygVDc6HVf9sbGq4w
6d9P7NDe3+lMdyFPLT9ITdZTCjZz2mdzSUK3Y6vn/R/AD0SR4HhB0Rlf/5N8WXTQ
CdRtN40CgYEA/sTlG2f3Y9tVT3xkr3Ac9NC1HraU4a/tmhABTKmRZDpr8X50dpDR
QwlSOC3HYGIRUUQ4I6A/wEeIssfaa4UNjxdlso2ycbGK9fLPF5Uuuvu2wgA9KBVK
wPx6Lw3KyY34VzDEzgEIQOPAlTT4ZD4Zs3fUGWubGrIJwlzFQcgaHoMCgYEA8LJl
57+NHkwNEXj65QlVdLqeOzifcWxEhTBG95neXCBib7+4iLf2MUZwSZWISnsmAMbb
eT0YxBk5PSv54btG4D5LTQtXKE2vWYOgOob251npzzMBsts6K6KqfgVMRFB1ftXe
3q2s+cyg9sVBCo9ugfadWXpeAzrDMVKlV+S9Wt8CgYBL5tMvEBFnQaAv9yp0Dh3C
Xi+nv9OpTWWnYZ9RfK9hQfqIzxjZfhmqNCu3qwPcVjs8j+t9ya9UlLtIMDyFjfVV
LS5SPN7t+mwhDD7gksSCVp3DPJj7ySQlTNMGE8DXvaFAMLpheXNBCdmFWmuqScoU
at3Y2PMzx9kae9MU3w3RCwKBgQCemt+dq1JhIXoHBnJFVDY0efhkS7Z89fvcy+gn
pgOpL0nOG0aNCLO42pKJWnh5o9Zx8peSt1jHd1uJXJ4HSfG1ODdEaHGhRDeEw8Bk
cKTn5A62kwTOh7k4IbM44WLVLTOPRXzbvRPbcySqF2b5f3QxPYGIAaNLe4A90xjS
5w6DfwKBgQCOpJv2qTVvrTSGYR+Pu6uqcVYGgrjC8raHI0q64rM8mOj20np6lCbW
nYcUgI4xLf08uyI3alquA+/DcX4PYRqjdZirPpYide06GvOzl2TX4smCQXIvwhuY
bbFV8Khfr8GBAwqP2xRnEDM9TJwJn9Wnu5XvoI57Ur4fG05ysK9r/w==`
- ✅ **WECHAT_CERT_PATH**: `./certs/apiclient_cert.pem`
- ✅ **WECHAT_KEY_PATH**: `./certs/apiclient_key.pem`
- ✅ **WECHAT_NOTIFY_URL**: `http://localhost:3000/api/payment/notify`

### 其他配置
- ⚠️ **ADMIN_API_KEY**: 需要替换为安全的随机字符串
- ✅ **ALLOWED_ORIGINS**: 已配置本地开发地址

## 🔧 需要手动完成的配置

### 1. 配置微信小程序密钥（必需）

**步骤：**
1. 登录 [微信公众平台](https://mp.weixin.qq.com/)
2. 进入"开发" → "开发管理" → "开发设置"
3. 找到"AppSecret(小程序密钥)"，点击"重置"或"查看"
4. 复制密钥（如果重置，请妥善保管，只显示一次）
5. 编辑 `backend/.env` 文件，添加或更新 `WECHAT_SECRET`：

```env
WECHAT_SECRET=你的小程序密钥
```

**注意：** 此密钥用于小程序自动登录功能（code2Session），必须配置才能使用自动登录。

### 2. 替换微信支付 API 密钥

**步骤：**
1. 登录 [微信支付商户平台](https://pay.weixin.qq.com/)
2. 进入"账户中心" → "API安全" → "API密钥"
3. 复制32位API密钥
4. 编辑 `backend/.env` 文件，替换 `WECHAT_API_KEY` 的值

```env
WECHAT_API_KEY=你的32位API密钥
```

### 3. 设置管理后台密钥（可选）

生成一个安全的随机字符串作为管理后台API密钥：

```bash
# 在 PowerShell 中生成随机字符串
-join ((65..90) + (97..122) + (48..57) | Get-Random -Count 32 | ForEach-Object {[char]$_})
```

然后替换 `.env` 文件中的 `ADMIN_API_KEY`。

### 4. 下载微信支付证书（仅生产环境需要）

**注意：** 开发模式下不需要证书，支付功能会被模拟。

**生产环境步骤：**
1. 登录 [微信支付商户平台](https://pay.weixin.qq.com/)
2. 进入"账户中心" → "API安全" → "API证书"
3. 下载证书文件并解压
4. 创建证书目录：
   ```bash
   mkdir backend\certs
   ```
5. 将以下文件复制到 `backend/certs/` 目录：
   - `apiclient_cert.pem`
   - `apiclient_key.pem`

## 📋 配置验证

运行配置检查脚本验证配置：

```bash
cd backend
node check-config.js
```

## 🚀 开发模式 vs 生产模式

### 开发模式（当前配置）

```env
NODE_ENV=development
```

**特点：**
- ✅ 支付功能自动模拟
- ✅ 不需要真实证书
- ✅ 不需要完整API密钥（但建议填写）
- ✅ 适合本地开发和测试

### 生产模式

```env
NODE_ENV=production
```

**要求：**
- ✅ 必须填写真实的API密钥
- ✅ 必须下载并配置证书文件
- ✅ 回调URL必须是HTTPS地址
- ✅ 需要配置公网可访问的服务器

## ⚠️ 安全提示

1. **不要提交 `.env` 文件到 Git**
   - `.env` 文件已在 `.gitignore` 中
   - 包含敏感信息，请妥善保管

2. **API密钥安全**
   - 不要泄露API密钥
   - 定期更换密钥
   - 不要在代码中硬编码

3. **证书文件安全**
   - 证书文件需要妥善保管
   - 不要提交到版本控制系统
   - 定期更新证书

## 📝 配置文件位置

- **环境变量文件**: `backend/.env`
- **配置检查脚本**: `backend/check-config.js`
- **微信支付配置**: `backend/config/wechat.js`

## 🔍 常见问题

### Q: 开发模式需要配置API密钥吗？
A: 不需要，但建议填写，以便测试配置是否正确。

### Q: 证书文件在哪里下载？
A: 微信支付商户平台 → 账户中心 → API安全 → API证书

### Q: 如何切换到生产模式？
A: 修改 `.env` 文件中的 `NODE_ENV=production`，并完成所有必需配置。

### Q: 回调URL应该填什么？
A: 
- 开发环境：`http://localhost:3000/api/payment/notify`（或使用内网穿透工具）
- 生产环境：`https://your-domain.com/api/payment/notify`

---

**最后更新**: 2024-12-19
**配置文件**: `backend/.env`

