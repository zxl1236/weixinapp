# CDN词汇数据部署指南

## 概述
本指南说明如何将Excel词汇数据转换为CDN格式并部署到CDN服务。

## 数据结构要求

### Excel文件格式
你的Excel文件应包含以下列：
- `word`: 英文单词
- `meaning`: 中文含义
- `phonetic`: 音标
- `grade`: 年级标识 (3.1, 3.2, 4.1, 4.2, ..., 9.1, 9.2)
- `level`: 难度等级 (3-9)

### 年级标识说明
- `3.1` = 小学三年级上册
- `3.2` = 小学三年级下册
- `4.1` = 小学四年级上册
- `4.2` = 小学四年级下册
- `5.1` = 小学五年级上册
- `5.2` = 小学五年级下册
- `6.1` = 小学六年级上册
- `6.2` = 小学六年级下册
- `7.1` = 初中一年级上册
- `7.2` = 初中一年级下册
- `8.1` = 初中二年级上册
- `8.2` = 初中二年级下册
- `9.1` = 初中三年级上册
- `9.2` = 初中三年级下册

### 示例数据
```csv
word,meaning,phonetic,grade,level
name,名字,/neɪm/,3.1,3
ear,耳朵,/ɪə(r)/,3.1,3
hand,手,/hænd/,3.1,3
eye,眼睛,/aɪ/,3.1,3
mouth,嘴,/maʊθ/,3.1,3
student,学生,/ˈstuː.dənt/,7.1,7
```

## 转换步骤

### 1. 安装依赖
```bash
# 确保Node.js环境
node --version
```

### 2. 转换Excel数据
```bash
# 使用转换工具
node utils/excelToCDNConverter.js your_words.csv
```

### 3. 检查输出
转换完成后，会在 `cdn-data` 文件夹中生成以下文件：
```
cdn-data/
├── grade3_1.json    (小学三年级上册)
├── grade3_2.json    (小学三年级下册)
├── grade4_1.json    (小学四年级上册)
├── grade4_2.json    (小学四年级下册)
├── grade5_1.json    (小学五年级上册)
├── grade5_2.json    (小学五年级下册)
├── grade6_1.json    (小学六年级上册)
├── grade6_2.json    (小学六年级下册)
├── grade7_1.json    (初中一年级上册)
├── grade7_2.json    (初中一年级下册)
├── grade8_1.json    (初中二年级上册)
├── grade8_2.json    (初中二年级下册)
├── grade9_1.json    (初中三年级上册)
└── grade9_2.json    (初中三年级下册)
```

### 4. JSON文件格式
每个年级的JSON文件格式如下：
```json
{
  "grade": 3,
  "semester": 1,
  "gradeName": "小学三年级上册",
  "total": 100,
  "lastUpdated": "2025-01-XX",
  "words": [
    {
      "word": "name",
      "phonetic": "/neɪm/",
      "meaning": "名字",
      "level": 3,
      "semester": 1,
      "example": "",
      "difficulty": "normal",
      "category": "general"
    }
  ]
}
```

## CDN部署

### 阿里云OSS部署
1. 登录阿里云控制台
2. 创建OSS存储桶
3. 上传 `cdn-data` 文件夹到存储桶
4. 配置CDN加速域名
5. 设置CORS规则：
```json
{
  "AllowedOrigins": ["*"],
  "AllowedMethods": ["GET"],
  "AllowedHeaders": ["*"],
  "ExposeHeaders": ["ETag"],
  "MaxAgeSeconds": 3600
}
```

### 腾讯云COS部署
1. 登录腾讯云控制台
2. 创建COS存储桶
3. 上传文件到存储桶
4. 配置CDN加速
5. 设置跨域访问规则

### 其他CDN服务
- AWS S3 + CloudFront
- 七牛云
- 又拍云
- 百度云

## 配置小程序

### 1. 修改配置文件
编辑 `utils/config.js`：
```javascript
const config = {
  cdn: {
    // 替换为你的实际CDN地址
    baseUrl: 'https://your-bucket.oss-cn-hangzhou.aliyuncs.com/words/',
    cacheExpiry: 7 * 24 * 60 * 60 * 1000,
    requestTimeout: 10000,
    cachePrefix: 'cdn_words_'
  }
};
```

### 2. 更新CDN加载器
编辑 `utils/cdnWordLoader.js`：
```javascript
const config = require('./config');

class CDNWordLoader {
  constructor() {
    this.cdnBaseUrl = config.cdn.baseUrl;
    // ... 其他配置
  }
}
```

## 测试CDN连接

### 1. 检查文件可访问性
在浏览器中访问：
```
https://your-cdn-domain.com/words/grade1.json
```

### 2. 小程序测试
在小程序中测试CDN加载：
```javascript
const { cdnWordLoader } = require('../../utils/cdnWordLoader');

// 测试加载
cdnWordLoader.loadWords('grade1').then(words => {
  console.log('CDN加载成功:', words.length, '个词汇');
}).catch(error => {
  console.error('CDN加载失败:', error);
});
```

## 性能优化建议

### 1. 文件压缩
- 启用Gzip压缩
- 使用JSON压缩工具

### 2. 缓存策略
- 设置合适的缓存头
- 使用ETag进行缓存验证

### 3. CDN配置
- 选择就近的CDN节点
- 配置合适的缓存时间

## 故障排除

### 常见问题

1. **CORS错误**
   - 检查CDN的CORS配置
   - 确保允许小程序域名访问

2. **文件404错误**
   - 检查文件路径是否正确
   - 确认文件已成功上传

3. **加载超时**
   - 检查网络连接
   - 调整超时时间设置

4. **数据格式错误**
   - 验证JSON格式是否正确
   - 检查数据字段是否完整

### 调试方法
```javascript
// 启用调试模式
const config = require('./config');
config.app.debug = true;

// 查看缓存状态
const stats = cdnWordLoader.getCacheStats();
console.log('缓存统计:', stats);
```

## 监控和维护

### 1. 访问监控
- 监控CDN访问量
- 检查加载成功率

### 2. 数据更新
- 定期更新词汇数据
- 保持版本一致性

### 3. 性能监控
- 监控加载时间
- 优化缓存策略
