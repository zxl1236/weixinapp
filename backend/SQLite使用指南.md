# SQLite 使用指南

## 🎯 为什么选择 SQLite？

- ✅ **完全免费** - 无需支付任何费用
- ✅ **零配置** - 无需安装数据库服务器
- ✅ **单文件** - 数据库就是一个文件，易于备份
- ✅ **高性能** - 对小到中等规模应用性能优秀
- ✅ **跨平台** - Windows、Linux、Mac 全支持

## 🚀 快速开始（3步）

### 1. 安装依赖

```bash
cd backend
npm install sqlite3
```

### 2. 配置环境变量

编辑 `backend/.env` 文件，添加：

```env
DB_TYPE=sqlite
```

### 3. 启动服务器

```bash
npm start
```

完成！数据库会自动创建在 `backend/data/k12_vocabulary.db`

## 📁 数据库文件位置

- **默认路径**：`backend/data/k12_vocabulary.db`
- **自定义路径**：在 `.env` 中设置 `SQLITE_PATH=./your/path/database.db`

## 🔄 切换数据库类型

### 使用 SQLite
```env
DB_TYPE=sqlite
```

### 使用 MongoDB
```env
DB_TYPE=mongodb
MONGODB_URI=mongodb://your-connection-string
```

## 💾 备份数据库

SQLite 备份非常简单，直接复制文件即可：

```bash
# Windows
copy backend\data\k12_vocabulary.db backend\data\k12_vocabulary.db.backup

# Linux/Mac
cp backend/data/k12_vocabulary.db backend/data/k12_vocabulary.db.backup
```

## 🔍 查看数据库内容

可以使用 SQLite 命令行工具或图形化工具：

### 命令行工具

```bash
# 安装 SQLite（如果还没有）
# Windows: 下载 https://www.sqlite.org/download.html
# Mac: brew install sqlite
# Linux: sudo apt-get install sqlite3

# 打开数据库
sqlite3 backend/data/k12_vocabulary.db

# 查看所有表
.tables

# 查看用户表数据
SELECT * FROM users LIMIT 10;

# 退出
.quit
```

### 图形化工具推荐

- **DB Browser for SQLite**（免费）：https://sqlitebrowser.org/
- **DBeaver**（免费）：https://dbeaver.io/
- **VS Code 扩展**：SQLite Viewer

## ⚠️ 注意事项

1. **并发写入**：SQLite 在写入时会锁定数据库，适合小到中等规模应用
2. **数据大小**：单文件最大约 140TB，对大多数应用完全够用
3. **备份**：定期备份数据库文件到安全位置

## 🆘 遇到问题？

1. 检查 `.env` 文件中的 `DB_TYPE=sqlite`
2. 确保 `backend/data` 目录有写入权限
3. 查看服务器日志了解详细错误信息

## 📚 更多信息

详细迁移指南请查看：[数据库迁移指南.md](./数据库迁移指南.md)

