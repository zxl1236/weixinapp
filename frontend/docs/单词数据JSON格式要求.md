# 单词数据 JSON 格式要求

## 概述

本文档说明单词数据的 JSON 格式要求，特别是关于字母高亮显示的数据结构。

## 基本格式

单词数据应该是一个对象数组，每个对象代表一个单词：

```json
[
  {
    "word": "baby",
    "phonetic": "/'berbi/",
    "meaning": "婴儿",
    "highlightLetters": "a",
    "wordType": "noun"
  }
]
```

## 字段说明

### 必需字段

| 字段名 | 类型 | 说明 | 示例 |
|--------|------|------|------|
| `word` | string | 单词本身 | `"baby"` |
| `meaning` | string | 中文释义 | `"婴儿"` |

### 可选字段

| 字段名 | 类型 | 说明 | 示例 |
|--------|------|------|------|
| `phonetic` | string | 音标 | `"/'berbi/"` |
| `highlightLetters` | string \| Array<number> | 需要高亮显示的字母 | 见下方说明 |
| `wordType` | string | 词性 | `"noun"`, `"verb"`, `"adjective"` |
| `examples` | Array<string> | 例句数组 | `["The baby is crying."]` |
| `id` | string | 单词唯一标识 | `"baby_001"` |

## highlightLetters 字段详解

`highlightLetters` 字段用于指定需要高亮显示的字母。支持两种格式：

### 格式1：字符串（推荐）

直接指定需要高亮的字母（不区分大小写）：

```json
{
  "word": "baby",
  "highlightLetters": "a"
}
```

**说明：**
- 字符串格式会自动查找单词中所有匹配的字母并高亮
- 例如 `"a"` 会高亮单词中所有的字母 `a`
- 不区分大小写，`"a"` 和 `"A"` 效果相同

### 格式2：索引数组

指定需要高亮的字母在单词中的位置索引（从0开始）：

```json
{
  "word": "baby",
  "highlightLetters": [1, 3]
}
```

**说明：**
- 数组中的数字是字母在单词中的位置索引（从0开始）
- 例如 `[1, 3]` 会高亮第2个和第4个字母（索引1和3）
- 对于 "baby"，索引1是 'a'，索引3是 'y'

### 不提供 highlightLetters

如果不提供 `highlightLetters` 字段，系统会尝试根据音标自动检测需要高亮的字母（作为备用方案）。

## 完整示例

### 示例1：使用字符串格式（推荐）

```json
[
  {
    "word": "baby",
    "phonetic": "/'berbi/",
    "meaning": "婴儿",
    "highlightLetters": "a",
    "wordType": "noun"
  },
  {
    "word": "happy",
    "phonetic": "/'hæpi/",
    "meaning": "快乐的",
    "highlightLetters": "a",
    "wordType": "adjective"
  },
  {
    "word": "cat",
    "phonetic": "/kæt/",
    "meaning": "猫",
    "highlightLetters": "a",
    "wordType": "noun"
  }
]
```

### 示例2：使用索引数组格式

```json
[
  {
    "word": "baby",
    "phonetic": "/'berbi/",
    "meaning": "婴儿",
    "highlightLetters": [1],
    "wordType": "noun"
  },
  {
    "word": "happy",
    "phonetic": "/'hæpi/",
    "meaning": "快乐的",
    "highlightLetters": [1],
    "wordType": "adjective"
  }
]
```

### 示例3：高亮多个字母

```json
[
  {
    "word": "baby",
    "phonetic": "/'berbi/",
    "meaning": "婴儿",
    "highlightLetters": "a",
    "wordType": "noun"
  },
  {
    "word": "book",
    "phonetic": "/bʊk/",
    "meaning": "书",
    "highlightLetters": "o",
    "wordType": "noun"
  }
]
```

### 示例4：不提供 highlightLetters（使用自动检测）

```json
[
  {
    "word": "baby",
    "phonetic": "/'berbi/",
    "meaning": "婴儿",
    "wordType": "noun"
  }
]
```

## 显示效果

- **高亮字母**：会以蓝色显示（颜色可在 CSS 中调整）
- **普通字母**：正常黑色显示
- **备注显示**：如果提供了 `highlightLetters`，会在单词下方显示"字母音"备注

## 注意事项

1. **字符串格式 vs 索引格式**：
   - 字符串格式更直观，推荐使用
   - 如果单词中有多个相同字母，字符串格式会高亮所有匹配的字母
   - 索引格式可以精确控制高亮位置

2. **兼容性**：
   - 也支持 `highlightLetter`（单数形式）作为字段名
   - 如果不提供该字段，系统会尝试自动检测

3. **数据验证**：
   - 索引数组中的数字必须有效（0 到 word.length-1）
   - 无效的索引会被自动过滤

4. **大小写**：
   - 字符串格式不区分大小写
   - 显示时会保持原单词的大小写格式

## 数据文件位置

单词数据 JSON 文件应放在以下位置之一：

1. **CDN 存储**：`https://wex-1344106734.cos.ap-shanghai.myqcloud.com/Words/{gradeId}.json`
2. **本地文件**：`frontend/cdn-data/` 目录下

文件名格式：`{gradeId}.json`，例如 `grade3_1.json`

