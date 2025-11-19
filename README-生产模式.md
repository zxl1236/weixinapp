# 后端生产模式配置说明

## 🎯 快速开始

要将后端从开发模式切换到生产模式，请按照以下步骤操作：

### 方法一：使用一键脚本（推荐）

在服务器上运行：

```bash
cd /var/www/k12-backend/backend
chmod +x 切换到生产模式.sh
./切换到生产模式.sh
```

### 方法二：手动切换

1. **修改环境变量**
   ```bash
   # 编辑 .env 文件
   nano /var/www/k12-backend/backend/.env
   
   # 将 NODE_ENV 改为 production
   NODE_ENV=production
   ```

2. **验证配置**
   ```bash
   cd /var/www/k12-backend/backend
   node check-config.js
   ```

3. **重启服务**
   ```bash
   pm2 restart k12-backend
   # 或
   systemctl restart k12-backend
   ```

## 📋 生产模式要求

切换到生产模式前，必须完成以下配置：

### 1. 微信支付配置
- ✅ `WECHAT_APPID` - 小程序AppID
- ✅ `WECHAT_MCHID` - 商户号
- ✅ `WECHAT_API_KEY` - API密钥（32位）
- ✅ `WECHAT_CERT_PATH` - 证书文件路径
- ✅ `WECHAT_KEY_PATH` - 密钥文件路径
- ✅ `WECHAT_NOTIFY_URL` - 支付回调URL（必须是HTTPS）

### 2. 证书文件
- ✅ 从微信商户平台下载证书
- ✅ 上传到服务器 `backend/certs/` 目录
- ✅ 设置文件权限：`chmod 600 certs/*.pem`

### 3. 微信商户平台配置
- ✅ 配置支付回调URL：`https://你的域名.com/api/payment/notify`

## 🔍 验证生产模式

切换后，检查服务日志，确认：

```
✅ 没有 "开发模式" 警告
✅ 显示 "微信支付初始化成功"
✅ 环境为 production
```

查看日志：
```bash
pm2 logs k12-backend
# 或
tail -f /var/www/k12-backend/backend/logs/app.log
```

## 📚 详细文档

- **完整部署指南**: [生产环境部署指南.md](./生产环境部署指南.md)
- **快速参考**: [快速切换到生产模式.md](./快速切换到生产模式.md)
- **配置检查**: 运行 `node check-config.js`

## ⚠️ 重要提示

1. **生产模式必须配置完整的微信支付参数和证书**
2. **回调URL必须是HTTPS地址**
3. **证书文件需要妥善保管，不要泄露**
4. **切换后务必测试支付功能**

## 🔄 回退到开发模式

如果需要回退（不推荐在生产环境使用）：

```bash
# 修改 .env 文件
NODE_ENV=development

# 重启服务
pm2 restart k12-backend
```

**注意：** 开发模式下支付功能将被模拟，不会产生真实支付。

