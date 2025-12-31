/**
 * 通用词库模块更新脚本（Node.js）
 *
 * 作用：
 * - 用指定 JSON 的 words 数据，生成/覆盖指定 JS 模块（CommonJS：module.exports = {...}）
 * - 可选：从旧 JS 模块中保留“句子”条目（默认保留：partOfSpeech 包含“句”）
 * - 可选：覆盖 semester / gradeName / 每个 word 的 grade 字段（例如 5.2 -> 5.1）
 *
 * 用法（PowerShell）：
 *   cd frontend
 *   node update-grade-module.js `
 *     --json "cdn-data/grade5_2.json" `
 *     --module "cdn-data/js-modules/grade5_1.js" `
 *     --semester 1 `
 *     --gradeName "小学五年级上册" `
 *     --wordGrade "5.1"
 *
 * 也可关闭句子保留：
 *   node update-grade-module.js --json ... --module ... --keepSentences false
 */
const fs = require('fs');
const path = require('path');

function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i++) {
    const token = argv[i];
    if (!token.startsWith('--')) continue;
    const body = token.slice(2);
    // 支持 --key=value 形式，避免某些终端/脚本环境的编码与引号问题
    const eqIdx = body.indexOf('=');
    if (eqIdx !== -1) {
      const key = body.slice(0, eqIdx);
      const value = body.slice(eqIdx + 1);
      args[key] = value === '' ? true : value;
      continue;
    }

    const key = body;
    const next = argv[i + 1];
    if (!next || next.startsWith('--')) {
      args[key] = true;
    } else {
      args[key] = next;
      i++;
    }
  }
  return args;
}

function toBool(v, defaultValue) {
  if (v === undefined || v === null) return defaultValue;
  if (typeof v === 'boolean') return v;
  const s = String(v).trim().toLowerCase();
  if (['1', 'true', 'yes', 'y', 'on'].includes(s)) return true;
  if (['0', 'false', 'no', 'n', 'off'].includes(s)) return false;
  return defaultValue;
}

function readJson(jsonPath) {
  let raw = fs.readFileSync(jsonPath, 'utf8');
  // 兼容带 BOM 的 UTF-8 JSON（PowerShell/某些编辑器可能写入 BOM）
  raw = raw.replace(/^\uFEFF/, '');
  return JSON.parse(raw);
}

function safeRequireCjs(modulePath) {
  // require 需要绝对路径
  const abs = path.resolve(modulePath);
  try {
    delete require.cache[abs];
  } catch (_) {
    // ignore
  }
  // eslint-disable-next-line import/no-dynamic-require, global-require
  return require(abs);
}

function backupFileIfExists(filePath) {
  if (!fs.existsSync(filePath)) return;
  const dir = path.dirname(filePath);
  const base = path.basename(filePath);
  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  const bak = path.join(dir, `${base}.${ts}.bak`);
  fs.copyFileSync(filePath, bak);
}

function buildOutput({ jsonData, oldModuleData, keepSentences, sentenceKeyword, overrides }) {
  const sourceWords = Array.isArray(jsonData.words) ? jsonData.words : [];

  const wordGrade = overrides.wordGrade;
  const words = wordGrade
    ? sourceWords.map((w) => ({ ...w, grade: String(wordGrade) }))
    : sourceWords.slice();

  let sentences = [];
  if (keepSentences && oldModuleData && Array.isArray(oldModuleData.words)) {
    const keyword = sentenceKeyword || '句';
    sentences = oldModuleData.words.filter(
      (item) => item && typeof item.partOfSpeech === 'string' && item.partOfSpeech.includes(keyword)
    );
  }

  const mergedWords = [...words, ...sentences];

  const grade = overrides.grade !== undefined ? Number(overrides.grade) : jsonData.grade;
  const semester = overrides.semester !== undefined ? Number(overrides.semester) : jsonData.semester;
  const gradeName = overrides.gradeName !== undefined ? String(overrides.gradeName) : jsonData.gradeName;

  return {
    grade,
    semester,
    gradeName,
    total: mergedWords.length,
    lastUpdated: overrides.lastUpdated ? String(overrides.lastUpdated) : (jsonData.lastUpdated || new Date().toISOString()),
    words: mergedWords,
  };
}

function main() {
  const args = parseArgs(process.argv);

  const jsonRel = args.json;
  const moduleRel = args.module;
  if (!jsonRel || !moduleRel) {
    console.error('❌ 缺少参数：--json 和 --module 都是必填');
    console.error('示例：node update-grade-module.js --json cdn-data/grade5_2.json --module cdn-data/js-modules/grade5_1.js');
    process.exit(1);
  }

  const jsonPath = path.resolve(process.cwd(), jsonRel);
  const modulePath = path.resolve(process.cwd(), moduleRel);

  if (!fs.existsSync(jsonPath)) {
    console.error(`❌ JSON 文件不存在: ${jsonPath}`);
    process.exit(1);
  }

  const keepSentences = toBool(args.keepSentences, true);
  const sentenceKeyword = args.sentenceKeyword || '句';

  // 允许用一个 JSON 文件提供覆盖项（尤其适合 gradeName 等中文字段）
  let configOverrides = {};
  if (args.config) {
    const configPath = path.resolve(process.cwd(), String(args.config));
    if (!fs.existsSync(configPath)) {
      console.error(`❌ config 文件不存在: ${args.config}`);
      process.exit(1);
    }
    try {
      configOverrides = readJson(configPath) || {};
    } catch (e) {
      console.error(`❌ 读取 config 失败: ${args.config}`);
      console.error(`   ${e && e.message ? e.message : e}`);
      process.exit(1);
    }
  }

  const overrides = {
    grade: args.grade,
    semester: args.semester,
    gradeName: args.gradeName,
    wordGrade: args.wordGrade,
    lastUpdated: args.lastUpdated,
    ...configOverrides,
  };

  const jsonData = readJson(jsonPath);

  let oldModuleData = null;
  if (keepSentences && fs.existsSync(modulePath)) {
    try {
      oldModuleData = safeRequireCjs(modulePath);
    } catch (e) {
      console.warn(`⚠️ 读取旧 JS 模块失败（将不保留句子）：${modulePath}`);
      console.warn(`   ${e && e.message ? e.message : e}`);
      oldModuleData = null;
    }
  }

  const output = buildOutput({
    jsonData,
    oldModuleData,
    keepSentences,
    sentenceKeyword,
    overrides,
  });

  // 写入前备份
  backupFileIfExists(modulePath);

  const header = `// 自动生成的JS模块 - ${path.basename(jsonPath)}\n// 生成时间: ${new Date().toISOString()}\n\n`;
  fs.mkdirSync(path.dirname(modulePath), { recursive: true });
  fs.writeFileSync(
    modulePath,
    `${header}module.exports = ${JSON.stringify(output, null, 2)};\n`,
    'utf8'
  );

  console.log('✅ 更新完成');
  console.log(`- JSON: ${jsonRel}`);
  console.log(`- JS:   ${moduleRel}`);
  console.log(`- total: ${output.total}`);
  if (overrides.wordGrade) console.log(`- wordGrade: ${overrides.wordGrade}`);
  if (overrides.semester) console.log(`- semester: ${overrides.semester}`);
  if (overrides.gradeName) console.log(`- gradeName: ${overrides.gradeName}`);
  console.log(`- keepSentences: ${keepSentences} (keyword: ${sentenceKeyword})`);
}

main();


