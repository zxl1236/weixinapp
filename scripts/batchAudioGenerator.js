// 批量音频生成脚本
// 使用腾讯云 TTS + COS 批量生成所有年级的音频文件
// 运行: node scripts/batchAudioGenerator.js

const fs = require("fs");
const path = require("path");
const COS = require("cos-nodejs-sdk-v5");
const tencentcloud = require("tencentcloud-sdk-nodejs");

// 腾讯云 TTS 配置
const TtsClient = tencentcloud.tts.v20190823.Client;
const clientConfig = {
  credential: {
    secretId: process.env.TENCENT_SECRET_ID,
    secretKey: process.env.TENCENT_SECRET_KEY,
  },
  region: "ap-beijing",
  profile: { httpProfile: { endpoint: "tts.tencentcloudapi.com" } },
};
const client = new TtsClient(clientConfig);

// 腾讯云 COS 配置
const cos = new COS({
  SecretId: process.env.COS_SECRET_ID,
  SecretKey: process.env.COS_SECRET_KEY,
});
const bucket = process.env.COS_BUCKET || "your-bucket-name";
const region = process.env.COS_REGION || "ap-beijing";
const cdnDomain = process.env.CDN_DOMAIN || "https://cdn.yourdomain.com";

// 音频生成配置
const audioConfig = {
  ModelType: 1,        // 基础模型
  Volume: 1,          // 音量
  VoiceType: 101001,  // 英文女声
  SampleRate: 16000,  // 采样率
  Codec: "mp3",       // 音频格式
  Speed: 1.0,         // 语速
};

// 从预处理数据库提取词表
function extractWordsFromDatabase() {
  const dbPath = path.join(__dirname, "../utils/preprocessedWordDatabase.js");
  const content = fs.readFileSync(dbPath, "utf8");
  
  // 提取所有年级的词汇
  const grades = ['grade3', 'grade4', 'grade5', 'grade6', 'grade7', 'grade8', 'grade9', 'grade10', 'grade11', 'grade12'];
  const allWords = {};
  
  grades.forEach(grade => {
    const regex = new RegExp(`${grade}:\\s*\\[([\\s\\S]*?)\\]`, 'g');
    const match = regex.exec(content);
    
    if (match) {
      try {
        // 提取数组内容并解析
        const arrayContent = match[1];
        const words = [];
        
        // 简单的JSON解析（针对我们的数据结构）
        const wordRegex = /{\s*"word":\s*"([^"]+)",\s*"phonetic":\s*"([^"]+)",\s*"meaning":\s*"([^"]+)",\s*"level":\s*(\d+)\s*}/g;
        let wordMatch;
        
        while ((wordMatch = wordRegex.exec(arrayContent)) !== null) {
          words.push({
            word: wordMatch[1],
            phonetic: wordMatch[2],
            meaning: wordMatch[3],
            level: parseInt(wordMatch[4])
          });
        }
        
        allWords[grade] = words;
        console.log(`📚 提取 ${grade} 词汇: ${words.length} 个`);
      } catch (e) {
        console.error(`❌ 解析 ${grade} 失败:`, e.message);
        allWords[grade] = [];
      }
    } else {
      console.warn(`⚠️ 未找到 ${grade} 数据`);
      allWords[grade] = [];
    }
  });
  
  return allWords;
}

// 生成音频文件名
function generateAudioKey(word, grade) {
  return word.toLowerCase()
    .replace(/[^\w\s]/g, '')  // 移除标点
    .replace(/\s+/g, '_')     // 空格转下划线
    + '.mp3';
}

// 生成单个音频文件
async function generateAndUpload(word, grade) {
  const key = generateAudioKey(word.word, grade);
  const localPath = path.join(__dirname, "audio_output", grade, key);
  
  // 确保目录存在
  const dir = path.dirname(localPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  
  try {
    // 调用腾讯云 TTS
    const params = {
      Text: word.word,
      SessionId: `session-${Date.now()}-${Math.random()}`,
      ...audioConfig
    };
    
    console.log(`🎵 生成音频: ${word.word} (${grade})`);
    const data = await client.TextToVoice(params);
    const audio = Buffer.from(data.Audio, "base64");
    
    // 保存到本地
    fs.writeFileSync(localPath, audio);
    
    // 上传到 COS
    const cosKey = `audio/${grade}/${key}`;
    await cos.putObject({
      Bucket: bucket,
      Region: region,
      Key: cosKey,
      Body: fs.createReadStream(localPath),
      ContentType: "audio/mpeg",
    });
    
    const url = `${cdnDomain}/audio/${grade}/${key}`;
    console.log(`✅ 完成: ${word.word} -> ${url}`);
    
    return {
      word: word.word,
      grade: grade,
      localPath: localPath,
      cosKey: cosKey,
      url: url,
      size: audio.length
    };
    
  } catch (error) {
    console.error(`❌ 失败: ${word.word} (${grade})`, error.message);
    return null;
  }
}

// 批量处理
async function batchGenerateAudio() {
  console.log("🚀 开始批量生成音频文件...");
  
  // 检查环境变量
  if (!process.env.TENCENT_SECRET_ID || !process.env.TENCENT_SECRET_KEY) {
    console.error("❌ 请设置腾讯云 TTS 环境变量:");
    console.error("   TENCENT_SECRET_ID=your_secret_id");
    console.error("   TENCENT_SECRET_KEY=your_secret_key");
    return;
  }
  
  if (!process.env.COS_SECRET_ID || !process.env.COS_SECRET_KEY) {
    console.error("❌ 请设置腾讯云 COS 环境变量:");
    console.error("   COS_SECRET_ID=your_cos_secret_id");
    console.error("   COS_SECRET_KEY=your_cos_secret_key");
    return;
  }
  
  // 提取词表
  const allWords = extractWordsFromDatabase();
  
  // 统计信息
  let totalWords = 0;
  let successCount = 0;
  let failCount = 0;
  const results = {};
  
  // 按年级处理
  for (const [grade, words] of Object.entries(allWords)) {
    if (!words || words.length === 0) continue;
    
    console.log(`\n📖 处理 ${grade} 年级 (${words.length} 个词汇)...`);
    results[grade] = [];
    
    for (const word of words) {
      totalWords++;
      
      // 添加延迟避免API限制
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const result = await generateAndUpload(word, grade);
      if (result) {
        successCount++;
        results[grade].push(result);
      } else {
        failCount++;
      }
    }
    
    console.log(`✅ ${grade} 完成: ${results[grade].length}/${words.length} 成功`);
  }
  
  // 生成结果报告
  const report = {
    timestamp: new Date().toISOString(),
    totalWords: totalWords,
    successCount: successCount,
    failCount: failCount,
    successRate: totalWords > 0 ? (successCount / totalWords * 100).toFixed(2) + '%' : '0%',
    results: results,
    config: {
      bucket: bucket,
      region: region,
      cdnDomain: cdnDomain,
      audioConfig: audioConfig
    }
  };
  
  // 保存报告
  const reportPath = path.join(__dirname, "audio_output", "generation_report.json");
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  
  console.log("\n📊 生成完成统计:");
  console.log(`   总词汇数: ${totalWords}`);
  console.log(`   成功生成: ${successCount}`);
  console.log(`   失败数量: ${failCount}`);
  console.log(`   成功率: ${report.successRate}`);
  console.log(`   报告文件: ${reportPath}`);
}

// 生成音频URL映射文件（供小程序使用）
function generateAudioUrlMap(results) {
  const urlMap = {};
  
  for (const [grade, gradeResults] of Object.entries(results)) {
    urlMap[grade] = {};
    gradeResults.forEach(result => {
      urlMap[grade][result.word] = result.url;
    });
  }
  
  const mapPath = path.join(__dirname, "audio_output", "audio_url_map.json");
  fs.writeFileSync(mapPath, JSON.stringify(urlMap, null, 2));
  
  console.log(`📋 音频URL映射文件: ${mapPath}`);
  return urlMap;
}

// 主函数
async function main() {
  try {
    await batchGenerateAudio();
  } catch (error) {
    console.error("❌ 批量生成失败:", error);
    process.exit(1);
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  main();
}

module.exports = {
  extractWordsFromDatabase,
  generateAndUpload,
  batchGenerateAudio,
  generateAudioUrlMap
};
