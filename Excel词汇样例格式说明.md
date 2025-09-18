# Excel词汇导入样例格式

## 📊 Excel文件结构

请按以下格式创建Excel文件，**第一行为列标题**：

| A列 | B列 | C列 | D列 | E列 |
|-----|-----|-----|-----|-----|
| **单词** | **释义** | **音标** | **词性** | **年级** |
| apple | 苹果 | [ˈæpl] | n. | 3 |
| eat | 吃 | [iːt] | v. | 3 |
| big | 大的 | [bɪɡ] | adj. | 3 |
| quickly | 快速地 | [ˈkwɪkli] | adv. | 3 |
| in | 在...里面 | [ɪn] | prep. | 3 |
| and | 和 | [ænd] | conj. | 3 |
| I | 我 | [aɪ] | pron. | 3 |
| look after | 照顾 | [lʊk ˈɑːftə] | phrase. | 3 |
| chair | 椅子 | [tʃeə] | n. | 3 |
| door | 门 | [dɔː] | n. | 3 |

## 📋 列名要求

**支持的列名（不区分大小写）：**

### 必需列：
- **单词列**：`word`, `Word`, `单词`, `英文`
- **释义列**：`meaning`, `Meaning`, `释义`, `中文`, `意思`
- **词性列**：`partOfSpeech`, `pos`, `词性`, `性质`

### 可选列：
- **音标列**：`phonetic`, `Phonetic`, `音标`, `发音`
- **年级列**：`level`, `Level`, `年级`, `等级`

### 词性标注规范：
- **n.** - 名词（noun）
- **v.** - 动词（verb）
- **adj.** - 形容词（adjective）
- **adv.** - 副词（adverb）
- **prep.** - 介词（preposition）
- **conj.** - 连词（conjunction）
- **pron.** - 代词（pronoun）
- **phrase.** - 短语（phrase）

## 📝 示例数据

### 三年级基础词汇（含各种词性）
```
单词        释义      音标           词性      年级
cat        猫        [kæt]          n.        3
run        跑        [rʌn]          v.        3
big        大的      [bɪɡ]          adj.      3
slowly     慢慢地    [ˈsləʊli]      adv.      3
in         在...里面  [ɪn]          prep.     3
```

### 四年级词汇（含短语）
```
word       meaning   phonetic      pos       level
table      桌子      [ˈteɪbl]      n.        4
study      学习      [ˈstʌdi]      v.        4
beautiful  美丽的    [ˈbjuːtɪfl]   adj.      4
carefully  仔细地    [ˈkeəfəli]    adv.      4
look after 照顾      [lʊk ˈɑːftə]  phrase.   4
```

### 五年级词汇（复杂词性）
```
英文          中文        音标           性质       等级
science      科学        [ˈsaɪəns]      n.         5
understand   理解        [ˌʌndəˈstænd]  v.         5
important    重要的      [ɪmˈpɔːtnt]    adj.       5
however      然而        [haʊˈevə]      conj.      5
take care of 照料        [teɪk keə ʌv]  phrase.    5
```

## 💡 使用提示

1. **列标题必须在第一行**
2. **单词、释义、词性为必填项**，音标和年级可选
3. **支持混合中英文列名**
4. **音标建议使用国际音标格式** `[...]`
5. **词性必须填写**，支持：n. v. adj. adv. prep. conj. pron. phrase.
6. **短语词性标注为 phrase.**，多个词性可以重复行
7. **年级可以留空**，工具中可以统一设置
8. **Excel文件支持** `.xlsx` 和 `.xls` 格式

## 🚀 使用流程

1. 按上述格式创建Excel文件
2. 打开 `utils/excelToJson.html` 工具
3. 上传Excel文件
4. 选择目标年级
5. 选择输出格式
6. 复制生成的代码
7. 粘贴到对应文件中

## 📦 预设示例下载

如果需要完整示例，可以创建包含以下数据的Excel文件：

**Sheet1: 三年级混合词汇（含词性）**
- word,meaning,phonetic,pos,level
- cat,猫,[kæt],n.,3
- run,跑,[rʌn],v.,3
- big,大的,[bɪɡ],adj.,3
- quickly,快速地,[ˈkwɪkli],adv.,3
- look after,照顾,[lʊk ˈɑːftə],phrase.,3

**多词性示例（同一单词不同词性）**
- book,书,[bʊk],n.,3
- book,预订,[bʊk],v.,3

直接复制上述数据到Excel中即可使用！
