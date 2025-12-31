# 更新代码到 GitHub

## 📋 需要提交的文件

### 后端文件
- `backend/controllers/paymentController.js`
- `backend/controllers/adminController.js`
- `backend/services/baiduTTS.js`
- `backend/controllers/ttsController.js`

### 前端文件
- `frontend/utils/audioManager.js`
- `frontend/utils/baiduTTS.js`

## 🚀 提交步骤

### 方法一：使用 GitHub Desktop

1. 打开 GitHub Desktop
2. 选择仓库：`test-wx - web`
3. 在左侧查看更改的文件
4. 填写提交信息：
   ```
   修复会员状态同步问题，优化TTS功能
   
   - 修复会员到期时间计算逻辑（统一为付款后365天）
   - 添加后台管理会员状态自动同步
   - 优化TTS音频下载和播放逻辑
   - 添加百度TTS超时机制
   ```
5. 点击"提交到 main"
6. 点击"推送 origin"上传到 GitHub

### 方法二：使用命令行（如果 Git 已安装）

```bash
# 进入项目目录
cd "E:\Code\test-wx - web"

# 添加修改的文件
git add backend/controllers/paymentController.js
git add backend/controllers/adminController.js
git add backend/services/baiduTTS.js
git add backend/controllers/ttsController.js
git add frontend/utils/audioManager.js
git add frontend/utils/baiduTTS.js

# 提交更改
git commit -m "修复会员状态同步问题，优化TTS功能

- 修复会员到期时间计算逻辑（统一为付款后365天）
- 添加后台管理会员状态自动同步
- 优化TTS音频下载和播放逻辑
- 添加百度TTS超时机制
- 修复Content-Type判断逻辑"

# 推送到 GitHub
git push origin main
```

### 方法三：使用 VS Code 的 Git 功能

1. 打开 VS Code
2. 点击左侧的"源代码管理"图标（或按 `Ctrl+Shift+G`）
3. 查看更改的文件
4. 点击文件旁边的 `+` 号暂存更改
5. 在消息框中输入提交信息
6. 点击"提交"按钮
7. 点击"同步更改"或"推送"按钮上传到 GitHub

## 📝 提交信息建议

```
修复会员状态同步问题，优化TTS功能

主要更新：
1. 会员到期时间修复
   - 统一改为从付款成功后开始计算，固定365天
   - 修复支付回调和后台管理的计算逻辑

2. 后台管理会员状态同步
   - 添加自动同步逻辑，检查订单状态并修正用户会员状态
   - 改进updateUserMembership接口

3. TTS功能优化
   - 修复Content-Type判断逻辑，避免误判
   - 添加百度TTS超时机制（600ms）
   - 优化音频下载结果校验
   - 修正百度TTS参数配置
```

## ✅ 验证提交

提交后，访问 GitHub 仓库页面：
- https://github.com/zxl1236/phone

确认以下文件已更新：
- `backend/controllers/paymentController.js`
- `backend/controllers/adminController.js`
- `backend/services/baiduTTS.js`
- `backend/controllers/ttsController.js`
- `frontend/utils/audioManager.js`
- `frontend/utils/baiduTTS.js`

## 🔄 服务器更新

提交到 GitHub 后，可以在服务器上执行：

```bash
# SSH 登录服务器
ssh root@your-server

# 进入项目目录
cd /var/www/k12-backend/backend
# 或
cd /www/wwwroot/k12-backend/backend

# 拉取最新代码
git pull origin main

# 重启服务
pm2 restart k12-backend

# 查看日志
pm2 logs k12-backend --lines 50
```

---

**提示**: 如果 Git 命令不可用，可以使用 GitHub Desktop 或 VS Code 的图形界面进行操作。

