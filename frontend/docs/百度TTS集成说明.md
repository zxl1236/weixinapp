# 百度语音合成TTS（后端代理）说明

## 概述

为满足**上线级别安全要求**，小程序端不再直接持有百度 `SECRET_KEY`，也不再在小程序端获取 token。

当前实现改为：

- 小程序端请求你的后端：`GET /api/tts?text=...`
- 后端在服务端读取环境变量（含敏感信息），向百度获取/缓存 token，并返回**可播放的音频URL**（重定向式返回URL方案）
- 小程序端拿到URL后照常播放；失败时继续回退到有道TTS

## 后端配置

在后端 `.env` 中配置（不要提交到 GitHub）：

```env
BAIDU_TTS_APP_ID=your_baidu_tts_app_id
BAIDU_TTS_API_KEY=your_baidu_tts_api_key
BAIDU_TTS_SECRET_KEY=your_baidu_tts_secret_key
```

示例模板见：`backend/env.example`

## 后端接口

- **接口**：`GET /api/tts`
- **参数**：
  - `text`（必填）：要合成的文本
  - `lang`（可选，默认 `en`）
  - `spd` `pit` `vol` `per`（可选，默认与后端一致）
- **响应**：

```json
{ "success": true, "url": "https://tsn.baidu.com/text2audio?..." }
```

## 前端调用

前端通过 `frontend/utils/baiduTTS.js` 调用后端：

- `buildBaiduTTSUrl(text, options)`：异步获取后端返回的可播放URL
- 同步版 `buildBaiduTTSUrlSync` 已废弃（会返回 `null` 并提示使用异步版）

## 安全注意事项

- 不要在任何公开仓库提交真实 `API_KEY/SECRET_KEY`
- 仅把占位符保留在 `env.example` / 文档中
- 如历史上已泄露，请在百度控制台**立即重置密钥**


