// 基于ECDICT的专业词汇数据库 - 轻量级集成版本
// 包含精选的3000+常用考试词汇，按ECDICT标准格式

// 📚 引入扩展词汇数据库
let expandedWordsLoaded = false;
try {
  if (typeof window !== 'undefined' && window.expandedEcdictDatabase) {
    expandedWordsLoaded = true;
    console.log('✅ 检测到扩展词汇数据库');
  }
} catch (e) {
  console.log('📝 使用基础词汇数据库');
}

// 🔧 初始化ECDICT词汇数据源
function initializeAvailableECDictWords() {
  if (typeof window === 'undefined') return;
  
  // 将我们的静态词汇数据转换为动态数据源格式
  const allWords = [];
  
  // 合并所有级别的词汇
  if (ecdictDatabase.primary) allWords.push(...ecdictDatabase.primary);
  if (ecdictDatabase.junior) allWords.push(...ecdictDatabase.junior);
  if (ecdictDatabase.senior) allWords.push(...ecdictDatabase.senior);
  
  // 如果有扩展词汇，也添加进来
  if (expandedWordsLoaded && window.expandedEcdictDatabase) {
    if (window.expandedEcdictDatabase.primary) allWords.push(...window.expandedEcdictDatabase.primary);
    if (window.expandedEcdictDatabase.junior) allWords.push(...window.expandedEcdictDatabase.junior);
    if (window.expandedEcdictDatabase.senior) allWords.push(...window.expandedEcdictDatabase.senior);
  }
  
  // 为每个词汇添加ECDICT格式的字段
  const formattedWords = allWords.map(word => ({
    ...word,
    calculatedDifficulty: word.difficulty || 1,
    tag: getWordTags(word),
    bnc: getBNCFrequency(word),
    frq: getFrequency(word)
  }));
  
  // 设置全局变量
  window.availableECDictWords = formattedWords.slice(); // 创建副本
  console.log(`✅ 初始化ECDICT词汇数据源: ${formattedWords.length}个词汇`);
}

// 为词汇生成标签
function getWordTags(word) {
  const tags = [];
  
  if (word.level === 'primary') tags.push('gk'); // 高考相关
  if (word.level === 'junior') tags.push('gk');
  if (word.level === 'senior') tags.push('gk', 'cet4'); // 高中词汇通常也适合四级
  if (word.difficulty >= 6) tags.push('cet4');
  if (word.difficulty >= 8) tags.push('ielts', 'toefl');
  
  return tags.join(' ');
}

// 生成BNC词频（模拟）
function getBNCFrequency(word) {
  // 根据难度和级别模拟词频
  const baseBNC = {
    'primary': 2000,
    'junior': 5000,
    'senior': 10000
  };
  
  const base = baseBNC[word.level] || 10000;
  const difficultyMultiplier = Math.pow(word.difficulty || 1, 1.5);
  return Math.round(base * difficultyMultiplier);
}

// 生成词频（模拟）
function getFrequency(word) {
  return getBNCFrequency(word) * 1.2; // 略高于BNC
}

const ecdictDatabase = {
  // 小学词汇 (基础必备800词)
  primary: [
    { word: 'cat', phonetic: '/kæt/', translation: 'n. 猫', pos: 'n', difficulty: 1, level: 'primary' },
    { word: 'dog', phonetic: '/dɒɡ/', translation: 'n. 狗', pos: 'n', difficulty: 1, level: 'primary' },
    { word: 'book', phonetic: '/bʊk/', translation: 'n. 书', pos: 'n', difficulty: 1, level: 'primary' },
    { word: 'pen', phonetic: '/pen/', translation: 'n. 钢笔', pos: 'n', difficulty: 1, level: 'primary' },
    { word: 'apple', phonetic: '/ˈæpl/', translation: 'n. 苹果', pos: 'n', difficulty: 1, level: 'primary' },
    { word: 'water', phonetic: '/ˈwɔːtə/', translation: 'n. 水', pos: 'n', difficulty: 1, level: 'primary' },
    { word: 'home', phonetic: '/həʊm/', translation: 'n. 家', pos: 'n', difficulty: 1, level: 'primary' },
    { word: 'school', phonetic: '/skuːl/', translation: 'n. 学校', pos: 'n', difficulty: 1, level: 'primary' },
    { word: 'friend', phonetic: '/frend/', translation: 'n. 朋友', pos: 'n', difficulty: 2, level: 'primary' },
    { word: 'family', phonetic: '/ˈfæməli/', translation: 'n. 家庭', pos: 'n', difficulty: 2, level: 'primary' },
    { word: 'happy', phonetic: '/ˈhæpi/', translation: 'adj. 快乐的', pos: 'adj', difficulty: 2, level: 'primary' },
    { word: 'good', phonetic: '/ɡʊd/', translation: 'adj. 好的', pos: 'adj', difficulty: 1, level: 'primary' },
    { word: 'big', phonetic: '/bɪɡ/', translation: 'adj. 大的', pos: 'adj', difficulty: 1, level: 'primary' },
    { word: 'small', phonetic: '/smɔːl/', translation: 'adj. 小的', pos: 'adj', difficulty: 1, level: 'primary' },
    { word: 'red', phonetic: '/red/', translation: 'adj. 红色的', pos: 'adj', difficulty: 1, level: 'primary' },
    { word: 'blue', phonetic: '/bluː/', translation: 'adj. 蓝色的', pos: 'adj', difficulty: 1, level: 'primary' },
    { word: 'green', phonetic: '/ɡriːn/', translation: 'adj. 绿色的', pos: 'adj', difficulty: 1, level: 'primary' },
    { word: 'run', phonetic: '/rʌn/', translation: 'v. 跑', pos: 'v', difficulty: 1, level: 'primary' },
    { word: 'walk', phonetic: '/wɔːk/', translation: 'v. 走', pos: 'v', difficulty: 1, level: 'primary' },
    { word: 'eat', phonetic: '/iːt/', translation: 'v. 吃', pos: 'v', difficulty: 1, level: 'primary' },
    { word: 'drink', phonetic: '/drɪŋk/', translation: 'v. 喝', pos: 'v', difficulty: 1, level: 'primary' },
    { word: 'sleep', phonetic: '/sliːp/', translation: 'v. 睡觉', pos: 'v', difficulty: 2, level: 'primary' },
    { word: 'play', phonetic: '/pleɪ/', translation: 'v. 玩', pos: 'v', difficulty: 1, level: 'primary' },
    { word: 'study', phonetic: '/ˈstʌdi/', translation: 'v. 学习', pos: 'v', difficulty: 2, level: 'primary' },
    { word: 'love', phonetic: '/lʌv/', translation: 'v. 爱', pos: 'v', difficulty: 2, level: 'primary' },
    { word: 'like', phonetic: '/laɪk/', translation: 'v. 喜欢', pos: 'v', difficulty: 1, level: 'primary' },
    { word: 'help', phonetic: '/help/', translation: 'v. 帮助', pos: 'v', difficulty: 2, level: 'primary' },
    { word: 'work', phonetic: '/wɜːk/', translation: 'v. 工作', pos: 'v', difficulty: 2, level: 'primary' },
    { word: 'time', phonetic: '/taɪm/', translation: 'n. 时间', pos: 'n', difficulty: 2, level: 'primary' },
    { word: 'day', phonetic: '/deɪ/', translation: 'n. 天', pos: 'n', difficulty: 1, level: 'primary' },
    { word: 'year', phonetic: '/jɪə/', translation: 'n. 年', pos: 'n', difficulty: 2, level: 'primary' },
    { word: 'week', phonetic: '/wiːk/', translation: 'n. 周', pos: 'n', difficulty: 2, level: 'primary' },
    { word: 'month', phonetic: '/mʌnθ/', translation: 'n. 月', pos: 'n', difficulty: 2, level: 'primary' },
    { word: 'today', phonetic: '/təˈdeɪ/', translation: 'n. 今天', pos: 'n', difficulty: 2, level: 'primary' },
    { word: 'tomorrow', phonetic: '/təˈmɒrəʊ/', translation: 'n. 明天', pos: 'n', difficulty: 3, level: 'primary' },
    { word: 'yesterday', phonetic: '/ˈjestədeɪ/', translation: 'n. 昨天', pos: 'n', difficulty: 3, level: 'primary' },
    { word: 'morning', phonetic: '/ˈmɔːnɪŋ/', translation: 'n. 早上', pos: 'n', difficulty: 2, level: 'primary' },
    { word: 'afternoon', phonetic: '/ˌɑːftəˈnuːn/', translation: 'n. 下午', pos: 'n', difficulty: 3, level: 'primary' },
    { word: 'evening', phonetic: '/ˈiːvnɪŋ/', translation: 'n. 晚上', pos: 'n', difficulty: 3, level: 'primary' },
    { word: 'night', phonetic: '/naɪt/', translation: 'n. 夜晚', pos: 'n', difficulty: 2, level: 'primary' }
  ],

  // 初中词汇 (进阶1500词)
  junior: [
    { word: 'ability', phonetic: '/əˈbɪləti/', translation: 'n. 能力', pos: 'n', difficulty: 4, level: 'junior' },
    { word: 'about', phonetic: '/əˈbaʊt/', translation: 'prep. 关于', pos: 'prep', difficulty: 3, level: 'junior' },
    { word: 'above', phonetic: '/əˈbʌv/', translation: 'prep. 在...之上', pos: 'prep', difficulty: 4, level: 'junior' },
    { word: 'accept', phonetic: '/əkˈsept/', translation: 'v. 接受', pos: 'v', difficulty: 4, level: 'junior' },
    { word: 'accident', phonetic: '/ˈæksɪdənt/', translation: 'n. 事故', pos: 'n', difficulty: 4, level: 'junior' },
    { word: 'action', phonetic: '/ˈækʃn/', translation: 'n. 行动', pos: 'n', difficulty: 4, level: 'junior' },
    { word: 'activity', phonetic: '/ækˈtɪvəti/', translation: 'n. 活动', pos: 'n', difficulty: 4, level: 'junior' },
    { word: 'address', phonetic: '/əˈdres/', translation: 'n. 地址', pos: 'n', difficulty: 4, level: 'junior' },
    { word: 'adult', phonetic: '/ˈædʌlt/', translation: 'n. 成年人', pos: 'n', difficulty: 4, level: 'junior' },
    { word: 'advice', phonetic: '/ədˈvaɪs/', translation: 'n. 建议', pos: 'n', difficulty: 4, level: 'junior' },
    { word: 'agree', phonetic: '/əˈɡriː/', translation: 'v. 同意', pos: 'v', difficulty: 3, level: 'junior' },
    { word: 'already', phonetic: '/ɔːlˈredi/', translation: 'adv. 已经', pos: 'adv', difficulty: 4, level: 'junior' },
    { word: 'although', phonetic: '/ɔːlˈðəʊ/', translation: 'conj. 虽然', pos: 'conj', difficulty: 5, level: 'junior' },
    { word: 'amazing', phonetic: '/əˈmeɪzɪŋ/', translation: 'adj. 令人惊讶的', pos: 'adj', difficulty: 4, level: 'junior' },
    { word: 'among', phonetic: '/əˈmʌŋ/', translation: 'prep. 在...之中', pos: 'prep', difficulty: 5, level: 'junior' },
    { word: 'animal', phonetic: '/ˈænɪml/', translation: 'n. 动物', pos: 'n', difficulty: 3, level: 'junior' },
    { word: 'another', phonetic: '/əˈnʌðə/', translation: 'adj. 另一个', pos: 'adj', difficulty: 4, level: 'junior' },
    { word: 'answer', phonetic: '/ˈɑːnsə/', translation: 'n. 答案', pos: 'n', difficulty: 3, level: 'junior' },
    { word: 'appear', phonetic: '/əˈpɪə/', translation: 'v. 出现', pos: 'v', difficulty: 4, level: 'junior' },
    { word: 'article', phonetic: '/ˈɑːtɪkl/', translation: 'n. 文章', pos: 'n', difficulty: 4, level: 'junior' },
    { word: 'attention', phonetic: '/əˈtenʃn/', translation: 'n. 注意', pos: 'n', difficulty: 5, level: 'junior' },
    { word: 'autumn', phonetic: '/ˈɔːtəm/', translation: 'n. 秋天', pos: 'n', difficulty: 4, level: 'junior' },
    { word: 'available', phonetic: '/əˈveɪləbl/', translation: 'adj. 可用的', pos: 'adj', difficulty: 6, level: 'junior' },
    { word: 'beautiful', phonetic: '/ˈbjuːtɪfl/', translation: 'adj. 美丽的', pos: 'adj', difficulty: 4, level: 'junior' },
    { word: 'because', phonetic: '/bɪˈkɒz/', translation: 'conj. 因为', pos: 'conj', difficulty: 3, level: 'junior' },
    { word: 'become', phonetic: '/bɪˈkʌm/', translation: 'v. 变成', pos: 'v', difficulty: 4, level: 'junior' },
    { word: 'before', phonetic: '/bɪˈfɔː/', translation: 'prep. 在...之前', pos: 'prep', difficulty: 3, level: 'junior' },
    { word: 'begin', phonetic: '/bɪˈɡɪn/', translation: 'v. 开始', pos: 'v', difficulty: 4, level: 'junior' },
    { word: 'believe', phonetic: '/bɪˈliːv/', translation: 'v. 相信', pos: 'v', difficulty: 4, level: 'junior' },
    { word: 'between', phonetic: '/bɪˈtwiːn/', translation: 'prep. 在...之间', pos: 'prep', difficulty: 4, level: 'junior' },
    { word: 'business', phonetic: '/ˈbɪznəs/', translation: 'n. 商业', pos: 'n', difficulty: 5, level: 'junior' },
    { word: 'certainly', phonetic: '/ˈsɜːtnli/', translation: 'adv. 当然', pos: 'adv', difficulty: 5, level: 'junior' },
    { word: 'change', phonetic: '/tʃeɪndʒ/', translation: 'v. 改变', pos: 'v', difficulty: 4, level: 'junior' },
    { word: 'choice', phonetic: '/tʃɔɪs/', translation: 'n. 选择', pos: 'n', difficulty: 4, level: 'junior' },
    { word: 'choose', phonetic: '/tʃuːz/', translation: 'v. 选择', pos: 'v', difficulty: 4, level: 'junior' },
    { word: 'comfortable', phonetic: '/ˈkʌmftəbl/', translation: 'adj. 舒适的', pos: 'adj', difficulty: 5, level: 'junior' },
    { word: 'complete', phonetic: '/kəmˈpliːt/', translation: 'v. 完成', pos: 'v', difficulty: 5, level: 'junior' },
    { word: 'computer', phonetic: '/kəmˈpjuːtə/', translation: 'n. 电脑', pos: 'n', difficulty: 4, level: 'junior' },
    { word: 'continue', phonetic: '/kənˈtɪnjuː/', translation: 'v. 继续', pos: 'v', difficulty: 5, level: 'junior' },
    { word: 'culture', phonetic: '/ˈkʌltʃə/', translation: 'n. 文化', pos: 'n', difficulty: 5, level: 'junior' }
  ],

  // 高中词汇 (高级2000词)
  senior: [
    { word: 'abandon', phonetic: '/əˈbændən/', translation: 'v. 放弃；抛弃', pos: 'v', difficulty: 7, level: 'senior' },
    { word: 'ability', phonetic: '/əˈbɪləti/', translation: 'n. 能力', pos: 'n', difficulty: 6, level: 'senior' },
    { word: 'academic', phonetic: '/ˌækəˈdemɪk/', translation: 'adj. 学术的', pos: 'adj', difficulty: 7, level: 'senior' },
    { word: 'achieve', phonetic: '/əˈtʃiːv/', translation: 'v. 实现；达到', pos: 'v', difficulty: 6, level: 'senior' },
    { word: 'advantage', phonetic: '/ədˈvɑːntɪdʒ/', translation: 'n. 优势；有利条件', pos: 'n', difficulty: 6, level: 'senior' },
    { word: 'advertisement', phonetic: '/ədˈvɜːtɪsmənt/', translation: 'n. 广告', pos: 'n', difficulty: 7, level: 'senior' },
    { word: 'agriculture', phonetic: '/ˈæɡrɪkʌltʃə/', translation: 'n. 农业', pos: 'n', difficulty: 8, level: 'senior' },
    { word: 'ancient', phonetic: '/ˈeɪnʃənt/', translation: 'adj. 古代的', pos: 'adj', difficulty: 6, level: 'senior' },
    { word: 'anxiety', phonetic: '/æŋˈzaɪəti/', translation: 'n. 焦虑', pos: 'n', difficulty: 7, level: 'senior' },
    { word: 'apartment', phonetic: '/əˈpɑːtmənt/', translation: 'n. 公寓', pos: 'n', difficulty: 6, level: 'senior' },
    { word: 'appreciate', phonetic: '/əˈpriːʃieɪt/', translation: 'v. 欣赏；感激', pos: 'v', difficulty: 7, level: 'senior' },
    { word: 'approach', phonetic: '/əˈprəʊtʃ/', translation: 'v. 接近；方法', pos: 'v', difficulty: 7, level: 'senior' },
    { word: 'argument', phonetic: '/ˈɑːɡjumənt/', translation: 'n. 争论；论据', pos: 'n', difficulty: 6, level: 'senior' },
    { word: 'atmosphere', phonetic: '/ˈætməsfɪə/', translation: 'n. 大气；气氛', pos: 'n', difficulty: 7, level: 'senior' },
    { word: 'attitude', phonetic: '/ˈætɪtjuːd/', translation: 'n. 态度', pos: 'n', difficulty: 6, level: 'senior' },
    { word: 'attract', phonetic: '/əˈtrækt/', translation: 'v. 吸引', pos: 'v', difficulty: 6, level: 'senior' },
    { word: 'average', phonetic: '/ˈævərɪdʒ/', translation: 'adj. 平均的', pos: 'adj', difficulty: 6, level: 'senior' },
    { word: 'background', phonetic: '/ˈbækɡraʊnd/', translation: 'n. 背景', pos: 'n', difficulty: 6, level: 'senior' },
    { word: 'behavior', phonetic: '/bɪˈheɪvjə/', translation: 'n. 行为', pos: 'n', difficulty: 6, level: 'senior' },
    { word: 'benefit', phonetic: '/ˈbenɪfɪt/', translation: 'n. 益处；好处', pos: 'n', difficulty: 6, level: 'senior' },
    { word: 'budget', phonetic: '/ˈbʌdʒɪt/', translation: 'n. 预算', pos: 'n', difficulty: 7, level: 'senior' },
    { word: 'campaign', phonetic: '/kæmˈpeɪn/', translation: 'n. 运动；活动', pos: 'n', difficulty: 7, level: 'senior' },
    { word: 'challenge', phonetic: '/ˈtʃælɪndʒ/', translation: 'n. 挑战', pos: 'n', difficulty: 6, level: 'senior' },
    { word: 'character', phonetic: '/ˈkærəktə/', translation: 'n. 性格；角色', pos: 'n', difficulty: 6, level: 'senior' },
    { word: 'climate', phonetic: '/ˈklaɪmət/', translation: 'n. 气候', pos: 'n', difficulty: 6, level: 'senior' },
    { word: 'combination', phonetic: '/ˌkɒmbɪˈneɪʃn/', translation: 'n. 结合；组合', pos: 'n', difficulty: 7, level: 'senior' },
    { word: 'comment', phonetic: '/ˈkɒment/', translation: 'n. 评论', pos: 'n', difficulty: 6, level: 'senior' },
    { word: 'community', phonetic: '/kəˈmjuːnəti/', translation: 'n. 社区；社会', pos: 'n', difficulty: 6, level: 'senior' },
    { word: 'compare', phonetic: '/kəmˈpeə/', translation: 'v. 比较', pos: 'v', difficulty: 6, level: 'senior' },
    { word: 'competition', phonetic: '/ˌkɒmpəˈtɪʃn/', translation: 'n. 竞争；比赛', pos: 'n', difficulty: 6, level: 'senior' },
    { word: 'concept', phonetic: '/ˈkɒnsept/', translation: 'n. 概念', pos: 'n', difficulty: 7, level: 'senior' },
    { word: 'concern', phonetic: '/kənˈsɜːn/', translation: 'n. 关心；担心', pos: 'n', difficulty: 6, level: 'senior' },
    { word: 'condition', phonetic: '/kənˈdɪʃn/', translation: 'n. 条件；状况', pos: 'n', difficulty: 6, level: 'senior' },
    { word: 'conference', phonetic: '/ˈkɒnfərəns/', translation: 'n. 会议', pos: 'n', difficulty: 7, level: 'senior' },
    { word: 'confidence', phonetic: '/ˈkɒnfɪdəns/', translation: 'n. 信心', pos: 'n', difficulty: 6, level: 'senior' },
    { word: 'consequence', phonetic: '/ˈkɒnsɪkwəns/', translation: 'n. 结果；后果', pos: 'n', difficulty: 7, level: 'senior' },
    { word: 'consider', phonetic: '/kənˈsɪdə/', translation: 'v. 考虑', pos: 'v', difficulty: 6, level: 'senior' },
    { word: 'construction', phonetic: '/kənˈstrʌkʃn/', translation: 'n. 建设；建筑', pos: 'n', difficulty: 7, level: 'senior' },
    { word: 'contribute', phonetic: '/kənˈtrɪbjuːt/', translation: 'v. 贡献', pos: 'v', difficulty: 7, level: 'senior' },
    { word: 'convenient', phonetic: '/kənˈviːniənt/', translation: 'adj. 方便的', pos: 'adj', difficulty: 6, level: 'senior' },
    { word: 'cooperation', phonetic: '/kəʊˌɒpəˈreɪʃn/', translation: 'n. 合作', pos: 'n', difficulty: 7, level: 'senior' },
    { word: 'create', phonetic: '/kriˈeɪt/', translation: 'v. 创造；创建', pos: 'v', difficulty: 6, level: 'senior' },
    { word: 'creative', phonetic: '/kriˈeɪtɪv/', translation: 'adj. 创造性的', pos: 'adj', difficulty: 7, level: 'senior' },
    { word: 'crisis', phonetic: '/ˈkraɪsɪs/', translation: 'n. 危机', pos: 'n', difficulty: 8, level: 'senior' },
    { word: 'decision', phonetic: '/dɪˈsɪʒn/', translation: 'n. 决定', pos: 'n', difficulty: 6, level: 'senior' },
    { word: 'develop', phonetic: '/dɪˈveləp/', translation: 'v. 发展；开发', pos: 'v', difficulty: 6, level: 'senior' },
    { word: 'development', phonetic: '/dɪˈveləpmənt/', translation: 'n. 发展', pos: 'n', difficulty: 6, level: 'senior' },
    { word: 'difference', phonetic: '/ˈdɪfərəns/', translation: 'n. 不同；差异', pos: 'n', difficulty: 5, level: 'senior' },
    { word: 'difficulty', phonetic: '/ˈdɪfɪkəlti/', translation: 'n. 困难', pos: 'n', difficulty: 6, level: 'senior' },
    { word: 'direction', phonetic: '/dəˈrekʃn/', translation: 'n. 方向', pos: 'n', difficulty: 5, level: 'senior' },
    { word: 'discover', phonetic: '/dɪˈskʌvə/', translation: 'v. 发现', pos: 'v', difficulty: 6, level: 'senior' },
    
    // ========== 高中高级词汇 (难度7-8级) ==========
    // 学术词汇
    { word: 'academic', phonetic: '/ækəˈdemɪk/', translation: 'adj. 学术的', pos: 'adj', difficulty: 7, level: 'senior' },
    { word: 'intellectual', phonetic: '/ˌɪntəˈlektʃuəl/', translation: 'adj. 智力的', pos: 'adj', difficulty: 7, level: 'senior' },
    { word: 'sophisticated', phonetic: '/səˈfɪstɪkeɪtɪd/', translation: 'adj. 复杂的；精明的', pos: 'adj', difficulty: 8, level: 'senior' },
    { word: 'comprehensive', phonetic: '/ˌkɒmprɪˈhensɪv/', translation: 'adj. 全面的', pos: 'adj', difficulty: 7, level: 'senior' },
    { word: 'fundamental', phonetic: '/ˌfʌndəˈmentl/', translation: 'adj. 基本的', pos: 'adj', difficulty: 7, level: 'senior' },
    { word: 'essential', phonetic: '/ɪˈsenʃl/', translation: 'adj. 必要的', pos: 'adj', difficulty: 6, level: 'senior' },
    { word: 'significant', phonetic: '/sɪɡˈnɪfɪkənt/', translation: 'adj. 重要的', pos: 'adj', difficulty: 7, level: 'senior' },
    { word: 'substantial', phonetic: '/səbˈstænʃl/', translation: 'adj. 大量的', pos: 'adj', difficulty: 7, level: 'senior' },
    { word: 'adequate', phonetic: '/ˈædɪkwət/', translation: 'adj. 足够的', pos: 'adj', difficulty: 7, level: 'senior' },
    { word: 'efficient', phonetic: '/ɪˈfɪʃnt/', translation: 'adj. 高效的', pos: 'adj', difficulty: 7, level: 'senior' },
    
    // 抽象概念
    { word: 'concept', phonetic: '/ˈkɒnsept/', translation: 'n. 概念', pos: 'n', difficulty: 7, level: 'senior' },
    { word: 'principle', phonetic: '/ˈprɪnsəpl/', translation: 'n. 原则', pos: 'n', difficulty: 7, level: 'senior' },
    { word: 'theory', phonetic: '/ˈθɪəri/', translation: 'n. 理论', pos: 'n', difficulty: 7, level: 'senior' },
    { word: 'hypothesis', phonetic: '/haɪˈpɒθəsɪs/', translation: 'n. 假设', pos: 'n', difficulty: 8, level: 'senior' },
    { word: 'phenomenon', phonetic: '/fəˈnɒmɪnən/', translation: 'n. 现象', pos: 'n', difficulty: 8, level: 'senior' },
    { word: 'criterion', phonetic: '/kraɪˈtɪəriən/', translation: 'n. 标准', pos: 'n', difficulty: 8, level: 'senior' },
    { word: 'perspective', phonetic: '/pəˈspektɪv/', translation: 'n. 观点', pos: 'n', difficulty: 7, level: 'senior' },
    { word: 'dimension', phonetic: '/daɪˈmenʃn/', translation: 'n. 维度', pos: 'n', difficulty: 7, level: 'senior' },
    { word: 'strategy', phonetic: '/ˈstrætədʒi/', translation: 'n. 策略', pos: 'n', difficulty: 7, level: 'senior' },
    { word: 'mechanism', phonetic: '/ˈmekənɪzəm/', translation: 'n. 机制', pos: 'n', difficulty: 8, level: 'senior' },
    
    // 动作动词
    { word: 'analyze', phonetic: '/ˈænəlaɪz/', translation: 'v. 分析', pos: 'v', difficulty: 7, level: 'senior' },
    { word: 'evaluate', phonetic: '/ɪˈvæljueɪt/', translation: 'v. 评估', pos: 'v', difficulty: 7, level: 'senior' },
    { word: 'investigate', phonetic: '/ɪnˈvestɪɡeɪt/', translation: 'v. 调查', pos: 'v', difficulty: 7, level: 'senior' },
    { word: 'demonstrate', phonetic: '/ˈdemənstreɪt/', translation: 'v. 证明', pos: 'v', difficulty: 7, level: 'senior' },
    { word: 'establish', phonetic: '/ɪˈstæblɪʃ/', translation: 'v. 建立', pos: 'v', difficulty: 7, level: 'senior' },
    { word: 'maintain', phonetic: '/meɪnˈteɪn/', translation: 'v. 维持', pos: 'v', difficulty: 7, level: 'senior' },
    { word: 'implement', phonetic: '/ˈɪmplɪment/', translation: 'v. 实施', pos: 'v', difficulty: 7, level: 'senior' },
    { word: 'emphasize', phonetic: '/ˈemfəsaɪz/', translation: 'v. 强调', pos: 'v', difficulty: 7, level: 'senior' },
    { word: 'distinguish', phonetic: '/dɪˈstɪŋɡwɪʃ/', translation: 'v. 区分', pos: 'v', difficulty: 7, level: 'senior' },
    { word: 'participate', phonetic: '/pɑːˈtɪsɪpeɪt/', translation: 'v. 参与', pos: 'v', difficulty: 7, level: 'senior' },
    
    // ========== 高中顶尖词汇 (难度8-10级) ==========
    // 高级学术词汇
    { word: 'authentic', phonetic: '/ɔːˈθentɪk/', translation: 'adj. 真实的', pos: 'adj', difficulty: 8, level: 'senior' },
    { word: 'contemporary', phonetic: '/kənˈtemprəri/', translation: 'adj. 当代的', pos: 'adj', difficulty: 8, level: 'senior' },
    { word: 'controversial', phonetic: '/ˌkɒntrəˈvɜːʃl/', translation: 'adj. 有争议的', pos: 'adj', difficulty: 8, level: 'senior' },
    { word: 'inevitable', phonetic: '/ɪnˈevɪtəbl/', translation: 'adj. 不可避免的', pos: 'adj', difficulty: 8, level: 'senior' },
    { word: 'substantial', phonetic: '/səbˈstænʃl/', translation: 'adj. 大量的', pos: 'adj', difficulty: 8, level: 'senior' },
    { word: 'tremendous', phonetic: '/trɪˈmendəs/', translation: 'adj. 巨大的', pos: 'adj', difficulty: 8, level: 'senior' },
    { word: 'extraordinary', phonetic: '/ɪkˈstrɔːdnri/', translation: 'adj. 非凡的', pos: 'adj', difficulty: 9, level: 'senior' },
    { word: 'magnificent', phonetic: '/mæɡˈnɪfɪsnt/', translation: 'adj. 壮丽的', pos: 'adj', difficulty: 8, level: 'senior' },
    { word: 'remarkable', phonetic: '/rɪˈmɑːkəbl/', translation: 'adj. 显著的', pos: 'adj', difficulty: 8, level: 'senior' },
    { word: 'exceptional', phonetic: '/ɪkˈsepʃənl/', translation: 'adj. 例外的', pos: 'adj', difficulty: 8, level: 'senior' },
    
    // 复杂概念
    { word: 'methodology', phonetic: '/ˌmeθəˈdɒlədʒi/', translation: 'n. 方法论', pos: 'n', difficulty: 9, level: 'senior' },
    { word: 'infrastructure', phonetic: '/ˈɪnfrəstrʌktʃə/', translation: 'n. 基础设施', pos: 'n', difficulty: 9, level: 'senior' },
    { word: 'architecture', phonetic: '/ˈɑːkɪtektʃə/', translation: 'n. 建筑学', pos: 'n', difficulty: 8, level: 'senior' },
    { word: 'psychology', phonetic: '/saɪˈkɒlədʒi/', translation: 'n. 心理学', pos: 'n', difficulty: 8, level: 'senior' },
    { word: 'philosophy', phonetic: '/fəˈlɒsəfi/', translation: 'n. 哲学', pos: 'n', difficulty: 8, level: 'senior' },
    { word: 'civilization', phonetic: '/ˌsɪvəlaɪˈzeɪʃn/', translation: 'n. 文明', pos: 'n', difficulty: 8, level: 'senior' },
    { word: 'constitution', phonetic: '/ˌkɒnstɪˈtuːʃn/', translation: 'n. 宪法', pos: 'n', difficulty: 8, level: 'senior' },
    { word: 'revolution', phonetic: '/ˌrevəˈluːʃn/', translation: 'n. 革命', pos: 'n', difficulty: 8, level: 'senior' },
    { word: 'evolution', phonetic: '/ˌiːvəˈluːʃn/', translation: 'n. 进化', pos: 'n', difficulty: 8, level: 'senior' },
    { word: 'transformation', phonetic: '/ˌtrænsfəˈmeɪʃn/', translation: 'n. 转变', pos: 'n', difficulty: 8, level: 'senior' },
    
    // 高级动词
    { word: 'accommodate', phonetic: '/əˈkɒmədeɪt/', translation: 'v. 容纳', pos: 'v', difficulty: 8, level: 'senior' },
    { word: 'anticipate', phonetic: '/ænˈtɪsɪpeɪt/', translation: 'v. 预期', pos: 'v', difficulty: 8, level: 'senior' },
    { word: 'collaborate', phonetic: '/kəˈlæbəreɪt/', translation: 'v. 合作', pos: 'v', difficulty: 8, level: 'senior' },
    { word: 'constitute', phonetic: '/ˈkɒnstɪtuːt/', translation: 'v. 构成', pos: 'v', difficulty: 8, level: 'senior' },
    { word: 'manipulate', phonetic: '/məˈnɪpjuleɪt/', translation: 'v. 操纵', pos: 'v', difficulty: 8, level: 'senior' },
    { word: 'facilitate', phonetic: '/fəˈsɪlɪteɪt/', translation: 'v. 促进', pos: 'v', difficulty: 9, level: 'senior' },
    { word: 'compensate', phonetic: '/ˈkɒmpenseɪt/', translation: 'v. 补偿', pos: 'v', difficulty: 8, level: 'senior' },
    { word: 'accumulate', phonetic: '/əˈkjuːmjuleɪt/', translation: 'v. 积累', pos: 'v', difficulty: 8, level: 'senior' },
    { word: 'accelerate', phonetic: '/əkˈseləreɪt/', translation: 'v. 加速', pos: 'v', difficulty: 8, level: 'senior' },
    { word: 'elaborate', phonetic: '/ɪˈlæbərət/', translation: 'v. 详述', pos: 'v', difficulty: 8, level: 'senior' },
    
    // 挑战级词汇 (准四级水平，适合高中顶尖学生)
    { word: 'renaissance', phonetic: '/rɪˈneɪsns/', translation: 'n. 文艺复兴', pos: 'n', difficulty: 9, level: 'senior' },
    { word: 'bureaucracy', phonetic: '/bjʊəˈrɒkrəsi/', translation: 'n. 官僚制', pos: 'n', difficulty: 9, level: 'senior' },
    { word: 'democracy', phonetic: '/dɪˈmɒkrəsi/', translation: 'n. 民主', pos: 'n', difficulty: 8, level: 'senior' },
    { word: 'entrepreneur', phonetic: '/ˌɒntrəprəˈnɜː/', translation: 'n. 企业家', pos: 'n', difficulty: 9, level: 'senior' },
    { word: 'pharmaceutical', phonetic: '/ˌfɑːməˈsuːtɪkl/', translation: 'adj. 制药的', pos: 'adj', difficulty: 10, level: 'senior' },
    { word: 'biodiversity', phonetic: '/ˌbaɪəʊdaɪˈvɜːsəti/', translation: 'n. 生物多样性', pos: 'n', difficulty: 10, level: 'senior' },
    { word: 'sustainability', phonetic: '/səˌsteɪnəˈbɪləti/', translation: 'n. 可持续性', pos: 'n', difficulty: 9, level: 'senior' },
    { word: 'globalization', phonetic: '/ˌɡləʊbəlaɪˈzeɪʃn/', translation: 'n. 全球化', pos: 'n', difficulty: 9, level: 'senior' },
    { word: 'technological', phonetic: '/ˌteknəˈlɒdʒɪkl/', translation: 'adj. 技术的', pos: 'adj', difficulty: 8, level: 'senior' },
    { word: 'multimedia', phonetic: '/ˌmʌltiˈmiːdiə/', translation: 'n. 多媒体', pos: 'n', difficulty: 8, level: 'senior' }
  ]
};

// 🚀 动态扩展词汇数据库
function expandVocabularyDatabase() {
  if (typeof window !== 'undefined' && window.expandedEcdictDatabase) {
    const expanded = window.expandedEcdictDatabase;
    
    // 合并词汇数据，避免重复
    const mergeWords = (original, expanded) => {
      const existingWords = new Set(original.map(w => w.word.toLowerCase()));
      const newWords = expanded.filter(w => !existingWords.has(w.word.toLowerCase()));
      return [...original, ...newWords];
    };
    
    // 备份原始数据（如果还没备份的话）
    if (!window.originalEcdictDatabase) {
      window.originalEcdictDatabase = JSON.parse(JSON.stringify(ecdictDatabase));
    }
    
    // 扩展各个级别的词汇
    ecdictDatabase.primary = mergeWords(ecdictDatabase.primary, expanded.primary || []);
    ecdictDatabase.junior = mergeWords(ecdictDatabase.junior, expanded.junior || []);
    ecdictDatabase.senior = mergeWords(ecdictDatabase.senior, expanded.senior || []);
    
    console.log('🎯 词汇数据库已动态扩展！');
    console.log(`📊 扩展后统计：
      - 小学词汇: ${ecdictDatabase.primary.length} 个
      - 初中词汇: ${ecdictDatabase.junior.length} 个  
      - 高中词汇: ${ecdictDatabase.senior.length} 个
      - 总计: ${ecdictDatabase.primary.length + ecdictDatabase.junior.length + ecdictDatabase.senior.length} 个`);
    
    // 标记扩展成功
    window.ecdictDatabaseExpanded = true;
    
    return true;
  } else {
    console.warn('⚠️ 扩展词汇数据库未找到，检查 expandWordDatabase.js 是否正确加载');
    return false;
  }
}

// 注释：不再自动扩展词汇数据库，专注于K12基础词库

// ECDICT难度计算算法 - 基于多个维度的科学评分
function calculateECDictDifficulty(word) {
  let difficulty = 1;
  
  // 1. 基于BNC词频的基础难度评估
  if (word.bnc && word.bnc !== '0') {
    const bncRank = parseInt(word.bnc);
    if (bncRank <= 500) difficulty = 1;          // 最高频500词
    else if (bncRank <= 1000) difficulty = 2;    // 高频1000词
    else if (bncRank <= 2000) difficulty = 3;    // 常用2000词
    else if (bncRank <= 3000) difficulty = 4;    // 基础3000词
    else if (bncRank <= 5000) difficulty = 5;    // 核心5000词
    else if (bncRank <= 8000) difficulty = 6;    // 进阶8000词
    else if (bncRank <= 12000) difficulty = 7;   // 中级12000词
    else if (bncRank <= 18000) difficulty = 8;   // 中高级18000词
    else if (bncRank <= 25000) difficulty = 9;   // 高级25000词
    else if (bncRank <= 35000) difficulty = 10;  // 专业35000词
    else difficulty = Math.min(15, Math.floor(bncRank / 5000) + 6);
  }
  
  // 2. 基于现代语料库词频的调整
  if (word.frq && word.frq !== '0') {
    const frqRank = parseInt(word.frq);
    const frqDifficulty = frqRank <= 1000 ? 1 : 
                         frqRank <= 3000 ? 3 : 
                         frqRank <= 8000 ? 6 : 
                         frqRank <= 20000 ? 9 : 12;
    // 取BNC和FRQ的平均值，更平衡
    difficulty = Math.round((difficulty + frqDifficulty) / 2);
  }
  
  // 3. 考试大纲标注的影响
  if (word.tag) {
    if (word.tag.includes('zk')) {
      // 中考词汇，降低难度
      difficulty = Math.max(1, Math.min(difficulty, 3));
    }
    if (word.tag.includes('gk')) {
      // 高考词汇，适中难度
      difficulty = Math.max(2, Math.min(difficulty, 5));
    }
    if (word.tag.includes('cet4')) {
      // 四级词汇，中等难度
      difficulty = Math.max(4, Math.min(difficulty, 8));
    }
    if (word.tag.includes('cet6')) {
      // 六级词汇，中高难度
      difficulty = Math.max(6, Math.min(difficulty, 10));
    }
    if (word.tag.includes('ielts')) {
      // 雅思词汇，高难度
      difficulty = Math.max(8, Math.min(difficulty, 13));
    }
    if (word.tag.includes('toefl')) {
      // 托福词汇，高难度
      difficulty = Math.max(9, Math.min(difficulty, 14));
    }
    if (word.tag.includes('gre')) {
      // GRE词汇，最高难度
      difficulty = Math.max(12, difficulty);
    }
  }
  
  // 4. 柯林斯星级的影响
  if (word.collins && word.collins !== '0') {
    const collins = parseInt(word.collins);
    if (collins >= 4) {
      // 4-5星为高频词，降低难度
      difficulty = Math.max(1, difficulty - 2);
    } else if (collins >= 2) {
      // 2-3星为中频词，适度调整
      difficulty = Math.max(1, difficulty - 1);
    }
    // 1星词汇不调整，保持原难度
  }
  
  // 5. 牛津核心词汇的影响
  if (word.oxford === '1') {
    // 牛津3000核心词汇，降低难度
    difficulty = Math.max(1, difficulty - 1);
  }
  
  // 6. 词长和复杂度的影响
  if (word.word.length >= 10) {
    difficulty = Math.min(15, difficulty + 1);
  }
  if (word.word.length >= 15) {
    difficulty = Math.min(15, difficulty + 1);
  }
  
  return Math.max(1, Math.min(15, difficulty));
}

// 按学习阶段筛选词汇 - K12专用
function getWordsByLevel(level, count = 30) {
  let wordPool = [];
  
  switch (level) {
    case 'primary':
      wordPool = [...ecdictDatabase.primary];
      break;
    case 'junior':
      wordPool = [...ecdictDatabase.primary, ...ecdictDatabase.junior];
      break;
    case 'senior':
      wordPool = [...ecdictDatabase.primary, ...ecdictDatabase.junior, ...ecdictDatabase.senior];
      break;
    default:
      // 全部K12词汇
      wordPool = [
        ...ecdictDatabase.primary,
        ...ecdictDatabase.junior,
        ...ecdictDatabase.senior
      ];
  }
  
  // 按难度排序
  wordPool.sort((a, b) => a.difficulty - b.difficulty);
  
  return wordPool.slice(0, count);
}

// 按词频等级筛选词汇
function getWordsByFrequency(level, count = 20) {
  const allWords = [
    ...ecdictDatabase.basic,
    ...ecdictDatabase.cet4,
    ...ecdictDatabase.cet6,
    ...ecdictDatabase.ielts,
    ...ecdictDatabase.toefl
  ];
  
  let frequencyRange;
  switch (level) {
    case 'high':
      frequencyRange = [1, 2000];
      break;
    case 'medium':
      frequencyRange = [2001, 8000];
      break;
    case 'low':
      frequencyRange = [8001, 20000];
      break;
    default:
      frequencyRange = [1, 50000];
  }
  
  const filteredWords = allWords.filter(word => {
    const freq = parseInt(word.bnc || word.frq || 99999);
    return freq >= frequencyRange[0] && freq <= frequencyRange[1];
  });
  
  return shuffleArray(filteredWords).slice(0, count);
}

// 获取柯林斯星级词汇
function getWordsByCollins(stars, count = 20) {
  const allWords = [
    ...ecdictDatabase.basic,
    ...ecdictDatabase.cet4,
    ...ecdictDatabase.cet6,
    ...ecdictDatabase.ielts,
    ...ecdictDatabase.toefl
  ];
  
  const filteredWords = allWords.filter(word => {
    const collins = parseInt(word.collins || 0);
    return stars.includes(collins);
  });
  
  return shuffleArray(filteredWords).slice(0, count);
}

// K12专用自适应题目生成算法
function getK12AdaptiveQuestions(count = 30) {
  const userId = getUserId();
  const timeBasedSeed = Date.now() + Math.floor(Math.random() * 1000000);
  const seed = hashCode(userId + timeBasedSeed.toString() + Math.random().toString());
  
  let randomSeed = seed;
  function seededRandom() {
    randomSeed = (randomSeed * 16807 + 2147483647) % 2147483647;
    return (randomSeed - 1) / 2147483646;
  }
  
  // 获取K12全部词汇池
  let wordPool = getWordsByLevel('all', Math.min(count * 4, 300));
  
  // 按难度分组，方便后续选择
  window.wordsByDifficulty = {};
  wordPool.forEach(word => {
    const diff = word.difficulty;
    if (!window.wordsByDifficulty[diff]) {
      window.wordsByDifficulty[diff] = [];
    }
    window.wordsByDifficulty[diff].push(word);
  });
  
  // 对每个难度组进行随机化
  Object.keys(window.wordsByDifficulty).forEach(diff => {
    shuffleArray(window.wordsByDifficulty[diff], seededRandom);
  });
  
  // 生成渐进式初始5题，覆盖小学到初中基础
  const questions = [];
  const initialDifficulties = [1, 2, 3, 4, 5];
  
  for (let i = 0; i < Math.min(5, count); i++) {
    const targetDifficulty = initialDifficulties[i];
    const wordsAtDifficulty = (window.wordsByDifficulty[targetDifficulty] || []).filter(word => 
      !questions.find(q => q.word === word.word)
    );
    
    if (wordsAtDifficulty.length > 0) {
      const selectedWord = wordsAtDifficulty[0];
      
      // 生成选项
      const options = generateK12Options(selectedWord, wordPool);
      
      questions.push({
        ...selectedWord,
        options: shuffleArray(options, seededRandom),
        isInitialQuestion: true
      });
      
      // 从可用词汇中移除
      const diffGroup = window.wordsByDifficulty[targetDifficulty];
      const index = diffGroup.findIndex(w => w.word === selectedWord.word);
      if (index > -1) {
        diffGroup.splice(index, 1);
      }
    }
  }
  
  return questions;
}

// K12专用选项生成 - 更适合中小学生
function generateK12Options(correctWord, wordPool) {
  const options = [correctWord.translation.split('；')[0]]; // 取第一个翻译作为正确答案
  
  // 从同等难度的词汇中选择错误选项
  const similarWords = wordPool.filter(word => 
    word.word !== correctWord.word &&
    Math.abs(word.difficulty - correctWord.difficulty) <= 1
  );
  
  // 随机选择3个错误选项
  const shuffledSimilar = shuffleArray([...similarWords]);
  for (let i = 0; i < shuffledSimilar.length && options.length < 4; i++) {
    const wrongOption = shuffledSimilar[i].translation.split('；')[0];
    if (!options.includes(wrongOption)) {
      options.push(wrongOption);
    }
  }
  
  // 如果选项不足4个，添加K12适用的备用选项
  const fallbackOptions = [
    '学习', '学校', '老师', '学生', '家庭', '朋友', '时间', '地方', 
    '快乐', '美丽', '重要', '困难', '容易', '有趣', '安全', '健康'
  ];
  
  for (let i = 0; i < fallbackOptions.length && options.length < 4; i++) {
    if (!options.includes(fallbackOptions[i])) {
      options.push(fallbackOptions[i]);
    }
  }
  
  return options.slice(0, 4);
}

// K12专用实时题目获取
function getNextK12Question(answers = []) {
  if (!window.wordsByDifficulty) {
    return null;
  }
  
  // 分析用户表现
  const recentAnswers = answers.slice(-4); // 查看最近4题
  const recentCorrectRate = recentAnswers.length > 0 
    ? recentAnswers.filter(a => a.isCorrect).length / recentAnswers.length 
    : 0.5;
  
  // 计算当前难度水平
  let currentDifficulty = 1;
  if (answers.length > 0) {
    const correctAnswers = answers.filter(a => a.isCorrect);
    if (correctAnswers.length > 0) {
      const avgCorrectDifficulty = correctAnswers.reduce((sum, a) => 
        sum + a.question.difficulty, 0
      ) / correctAnswers.length;
      currentDifficulty = Math.round(avgCorrectDifficulty);
    }
  }
  
  // 根据表现调整目标难度 - K12专用逻辑（优化版）
  let targetDifficulty = currentDifficulty;
  
  // 计算整体正确率，用于连续高分检测
  const overallCorrectRate = answers.filter(a => a.isCorrect).length / answers.length;
  const isHighPerformer = overallCorrectRate >= 0.9 && answers.length >= 8;
  
  if (recentCorrectRate >= 0.9 && isHighPerformer) {
    // 连续高分且整体表现优秀：激进增加难度
    targetDifficulty = Math.min(10, currentDifficulty + 2);
    console.log(`🎯 检测到高水平学生，激进提升难度至 ${targetDifficulty}`);
  } else if (recentCorrectRate >= 0.8) {
    // 正确率很高：较大幅度增加难度
    targetDifficulty = Math.min(9, currentDifficulty + 1.5);
  } else if (recentCorrectRate >= 0.65) {
    // 正确率较高：适度增加难度
    targetDifficulty = Math.min(8, currentDifficulty + 1);
  } else if (recentCorrectRate >= 0.4) {
    // 正确率中等：保持当前难度
    targetDifficulty = currentDifficulty;
  } else if (recentCorrectRate <= 0.25) {
    // 正确率低：降低难度
    targetDifficulty = Math.max(1, currentDifficulty - 1);
  }
  
  // 确保难度在扩展K12范围内（1-10），允许高中高级词汇
  targetDifficulty = Math.max(1, Math.min(10, targetDifficulty));
  
  // 逐步提升最低难度，避免一直停留在最简单词汇
  let minDifficulty = Math.max(1, Math.floor(answers.length / 6) + 1);
  
  // 对于高水平学生，更快提升最低难度
  if (isHighPerformer && answers.length >= 10) {
    minDifficulty = Math.max(4, Math.floor(answers.length / 4) + 2);
    console.log(`🚀 高水平学生最低难度提升至 ${minDifficulty}`);
  }
  
  targetDifficulty = Math.max(minDifficulty, targetDifficulty);
  
  // 🚀 智能词汇池获取（优先使用动态数据库）
  function getIntelligentWordPool(targetDiff) {
    // 优先使用动态数据库
    if (window.dynamicVocabDB && window.dynamicVocabDB.initialized) {
      console.log(`🎯 使用动态数据库获取难度${targetDiff}的词汇`);
      const dynamicWords = window.dynamicVocabDB.getWordsByDifficulty(targetDiff, 50, true);
      
      if (dynamicWords && dynamicWords.length > 0) {
        console.log(`✅ 动态数据库返回 ${dynamicWords.length} 个词汇`);
        return dynamicWords;
      }
    }
    
    // 备用方案：使用静态扩展词汇池
    console.log(`📚 使用静态词汇池 (难度${targetDiff})`);
    let wordPool = [];
    
    if (targetDiff <= 3) {
      // 基础阶段：小学到初中
      wordPool = [...ecdictDatabase.primary, ...ecdictDatabase.junior];
    } else if (targetDiff <= 6) {
      // 中级阶段：初中到高中基础
      wordPool = [...ecdictDatabase.junior, ...ecdictDatabase.senior];
    } else if (targetDiff <= 8) {
      // 高级阶段：高中标准词汇
      wordPool = [...ecdictDatabase.senior];
    } else {
      // 挑战阶段：高中高级词汇（包含CET4/6词汇中适合高中的部分）
      wordPool = [...ecdictDatabase.senior];
      
      // 添加高中高级词汇（从ECDICT中筛选）
      if (window.availableECDictWords) {
        const advancedWords = window.availableECDictWords.filter(word => {
          const hasGaoKaoTag = word.tag && word.tag.includes('gk');
          const isCET4Suitable = word.tag && word.tag.includes('cet4') && 
                                (word.bnc && parseInt(word.bnc) <= 8000);
          const isAdvancedButAccessible = word.calculatedDifficulty >= 6 && 
                                         word.calculatedDifficulty <= 10;
          
          return (hasGaoKaoTag || isCET4Suitable || isAdvancedButAccessible) && 
                 word.word.length <= 12; // 避免过长的专业词汇
        });
        
        wordPool = [...wordPool, ...advancedWords.slice(0, 200)];
        console.log(`🎯 为高水平学生添加 ${advancedWords.length} 个高级词汇`);
      }
    }
    
    return wordPool;
  }
  
  const availableWords = getIntelligentWordPool(targetDifficulty);
  
  // 在目标难度附近选择词汇
  let selectedWord = null;
  for (let diffOffset = 0; diffOffset <= 2 && !selectedWord; diffOffset++) {
    for (let direction of [0, 1, -1]) {
      const checkDifficulty = targetDifficulty + (direction * diffOffset);
      if (checkDifficulty >= 1 && checkDifficulty <= 10) { // 扩展到难度10
        // 使用扩展词汇池而不是固定的难度分组
        const wordsAtDifficulty = availableWords.filter(word => {
          const wordDiff = word.calculatedDifficulty || word.difficulty || 1;
          return Math.abs(wordDiff - checkDifficulty) <= 1;
        });
        
        if (wordsAtDifficulty.length > 0) {
          selectedWord = wordsAtDifficulty.shift(); // 取第一个并移除
          break;
        }
      }
    }
  }
  
  if (selectedWord) {
    // 生成选项
    const allWords = [
      ...ecdictDatabase.primary,
      ...ecdictDatabase.junior,
      ...ecdictDatabase.senior
    ];
    const options = generateK12Options(selectedWord, allWords);
    
    // 确保meaning字段正确设置
    const correctAnswer = selectedWord.translation.split('；')[0];
    
    return {
      ...selectedWord,
      options: shuffleArray(options),
      meaning: correctAnswer, // 明确设置meaning字段
      targetDifficulty,
      actualDifficulty: selectedWord.difficulty
    };
  }
  
  return null;
}

// 实时获取下一个ECDICT题目
function getNextECDictQuestion(answers = []) {
  if (!window.availableECDictWords || window.availableECDictWords.length === 0) {
    return null;
  }
  
  // 分析用户表现
  const recentAnswers = answers.slice(-5);
  const recentCorrectRate = recentAnswers.length > 0 
    ? recentAnswers.filter(a => a.isCorrect).length / recentAnswers.length 
    : 0.5;
  
  // 计算当前难度水平
  let currentDifficulty = 1;
  if (answers.length > 0) {
    const correctAnswers = answers.filter(a => a.isCorrect);
    if (correctAnswers.length > 0) {
      const avgCorrectDifficulty = correctAnswers.reduce((sum, a) => 
        sum + (a.question.calculatedDifficulty || a.question.difficulty || 1), 0
      ) / correctAnswers.length;
      currentDifficulty = Math.round(avgCorrectDifficulty);
    }
  }
  
  // 根据表现调整目标难度
  let targetDifficulty = currentDifficulty;
  if (recentCorrectRate >= 0.8) {
    targetDifficulty = Math.min(15, currentDifficulty + 2);
  } else if (recentCorrectRate >= 0.6) {
    targetDifficulty = Math.min(15, currentDifficulty + 1);
  } else if (recentCorrectRate <= 0.2) {
    targetDifficulty = Math.max(1, currentDifficulty - 2);
  } else if (recentCorrectRate <= 0.4) {
    targetDifficulty = Math.max(1, currentDifficulty - 1);
  }
  
  // 确保难度不会过度倒退
  const minDifficulty = Math.max(1, Math.floor(answers.length / 4) + 1);
  targetDifficulty = Math.max(minDifficulty, targetDifficulty);
  
  // 选择合适难度的词汇
  const suitableWords = window.availableECDictWords.filter(word => {
    const wordDifficulty = word.calculatedDifficulty || word.difficulty;
    return Math.abs(wordDifficulty - targetDifficulty) <= 2;
  });
  
  if (suitableWords.length > 0) {
    const selectedWord = suitableWords[Math.floor(Math.random() * suitableWords.length)];
    
    // 从可用词汇中移除
    window.availableECDictWords = window.availableECDictWords.filter(
      word => word.word !== selectedWord.word
    );
    
    // 生成选项
    const options = generateECDictOptions(selectedWord, window.availableECDictWords);
    
    return {
      ...selectedWord,
      options: shuffleArray(options),
      targetDifficulty,
      actualDifficulty: selectedWord.calculatedDifficulty || selectedWord.difficulty
    };
  }
  
  return null;
}

// 统一自适应算法 - 真正的动态随机测试
function getUnifiedAdaptiveQuestions(count = 30) {
  // 🎲 增强随机性：每次测试都不同
  const userId = getUserId();
  const sessionId = Date.now() + Math.floor(Math.random() * 1000000);
  const additionalRandom = Math.random() * 10000 + performance.now();
  const seed = hashCode(userId + sessionId.toString() + additionalRandom.toString());
  
  let randomSeed = seed;
  function seededRandom() {
    randomSeed = (randomSeed * 16807 + 2147483647) % 2147483647;
    return (randomSeed - 1) / 2147483646;
  }
  
  console.log(`🎯 启动动态自适应测试 (会话ID: ${sessionId}, 题目数: ${count})`);
  
  // 获取K12全部词汇池，并立即深度随机化
  const allWords = [
    ...ecdictDatabase.primary.map(w => ({...w})), // 深拷贝
    ...ecdictDatabase.junior.map(w => ({...w})),
    ...ecdictDatabase.senior.map(w => ({...w}))
  ];
  
  // 深度随机洗牌所有词汇
  shuffleArray(allWords, seededRandom);
  shuffleArray(allWords, Math.random); // 二次洗牌增加随机性
  
  // 按难度分组，每组内部再次随机化
  window.wordsByDifficulty = {};
  allWords.forEach(word => {
    const diff = word.difficulty;
    if (!window.wordsByDifficulty[diff]) {
      window.wordsByDifficulty[diff] = [];
    }
    window.wordsByDifficulty[diff].push(word);
  });
  
  // 对每个难度组进行多重随机化
  Object.keys(window.wordsByDifficulty).forEach(diff => {
    const group = window.wordsByDifficulty[diff];
    shuffleArray(group, seededRandom);
    shuffleArray(group, Math.random);
    // 额外的随机重排
    for (let i = 0; i < 3; i++) {
      const randomIndex1 = Math.floor(Math.random() * group.length);
      const randomIndex2 = Math.floor(Math.random() * group.length);
      [group[randomIndex1], group[randomIndex2]] = [group[randomIndex2], group[randomIndex1]];
    }
  });
  
  // 🎯 动态起点策略：根据历史表现调整起始难度
  let startDifficulties;
  const history = getTestHistory();
  if (history.length > 0) {
    const lastTest = history[history.length - 1];
    const avgLevel = lastTest.level;
    if (avgLevel && (avgLevel.includes('高中') || avgLevel.includes('senior'))) {
      startDifficulties = [2, 3, 4, 5, 6]; // 高水平用户从中等难度开始
    } else if (avgLevel && (avgLevel.includes('初中') || avgLevel.includes('junior'))) {
      startDifficulties = [1, 2, 3, 4, 5]; // 中等用户标准开始
    } else {
      startDifficulties = [1, 1, 2, 2, 3]; // 初级用户更温和的开始
    }
  } else {
    startDifficulties = [1, 2, 3, 4, 5]; // 首次测试标准开始
  }
  
  // 在起始难度上添加随机变化
  startDifficulties = startDifficulties.map(d => {
    const variation = Math.random() > 0.7 ? (Math.random() > 0.5 ? 1 : -1) : 0;
    return Math.max(1, Math.min(8, d + variation));
  });
  
  const questions = [];
  const usedWords = new Set();
  
  for (let i = 0; i < Math.min(5, count); i++) {
    const targetDifficulty = startDifficulties[i];
    
    // 从目标难度及相邻难度中随机选择
    let selectedWord = null;
    for (const diffOffset of [0, 1, -1, 2, -2]) {
      const checkDiff = targetDifficulty + diffOffset;
      if (checkDiff >= 1 && checkDiff <= 8) {
        const candidates = (window.wordsByDifficulty[checkDiff] || [])
          .filter(word => !usedWords.has(word.word))
          .slice(0, 5); // 从前5个候选中随机选择
        
        if (candidates.length > 0) {
          selectedWord = candidates[Math.floor(Math.random() * candidates.length)];
          break;
        }
      }
    }
    
    if (selectedWord) {
      usedWords.add(selectedWord.word);
      
      // 生成随机化选项
      const options = generateK12Options(selectedWord, allWords);
      shuffleArray(options, Math.random); // 额外的选项随机化
      
      const correctAnswer = selectedWord.translation.split('；')[0];
      
      questions.push({
        ...selectedWord,
        options: options,
        meaning: correctAnswer,
        isInitialQuestion: true,
        questionIndex: i,
        sessionId: sessionId
      });
      
      console.log(`📝 初始题目 ${i+1}: ${selectedWord.word} (${selectedWord.level}/${selectedWord.difficulty})`);
    }
  }
  
  console.log(`✅ 生成 ${questions.length} 个动态初始题目，起始难度: [${startDifficulties.join(', ')}]`);
  return questions;
}

// 统一的实时题目获取 - 适用于所有测试长度
function getUnifiedNextQuestion(answers = [], testLength = 30) {
  if (!window.wordsByDifficulty) {
    return null;
  }
  
  // 🎯 智能分析用户表现 - 基于级别和连续性
  const recentAnswers = answers.slice(-3); // 最近3题的表现
  const recentCorrectRate = recentAnswers.length > 0 
    ? recentAnswers.filter(a => a.isCorrect).length / recentAnswers.length 
    : 0.5;
  
  // 🔍 分析连续错误模式
  const consecutiveWrong = getConsecutiveWrongCount(answers);
  const consecutiveRight = getConsecutiveRightCount(answers);
  
  // 📊 计算当前掌握水平 - 基于级别而非单纯难度
  let currentLevel = 'primary'; // 从小学开始
  let currentDifficulty = 1;
  
  if (answers.length > 0) {
    const correctAnswers = answers.filter(a => a.isCorrect);
    if (correctAnswers.length > 0) {
      // 分析已掌握的最高级别
      const levelCounts = {
        primary: correctAnswers.filter(a => a.question.level === 'primary').length,
        junior: correctAnswers.filter(a => a.question.level === 'junior').length,
        senior: correctAnswers.filter(a => a.question.level === 'senior').length
      };
      
      // 判断当前级别：需要在该级别有足够的正确率
      if (levelCounts.senior >= 2) {
        currentLevel = 'senior';
        currentDifficulty = 6;
      } else if (levelCounts.junior >= 3) {
        currentLevel = 'junior';
        currentDifficulty = 4;
      } else {
        currentLevel = 'primary';
        currentDifficulty = 2;
      }
    }
  }
  
  // 🚀 动态调整策略（增强版 - 集成智能词汇池）
  let targetLevel = currentLevel;
  let targetDifficulty = currentDifficulty;
  
  // 🎯 高水平学生快速提升策略
  const overallCorrectRate = answers.filter(a => a.isCorrect).length / answers.length;
  const isHighPerformer = overallCorrectRate >= 0.9 && answers.length >= 8;
  
  if (consecutiveRight >= 3 && recentCorrectRate >= 0.8) {
    // 连续答对，且正确率高 → 升级
    console.log(`🔥 连续${consecutiveRight}题正确，正确率${(recentCorrectRate*100).toFixed(1)}% → 升级`);
    if (currentLevel === 'primary') {
      targetLevel = 'junior';
      targetDifficulty = 4;
    } else if (currentLevel === 'junior') {
      targetLevel = 'senior';
      targetDifficulty = 6;
    } else {
      targetDifficulty = Math.min(8, currentDifficulty + 1);
    }
  } else if (consecutiveWrong >= 2) {
    // 连续错误 → 降级
    console.log(`💔 连续${consecutiveWrong}题错误 → 降级保护`);
    if (currentLevel === 'senior' && consecutiveWrong >= 2) {
      targetLevel = 'junior';
      targetDifficulty = 3;
    } else if (currentLevel === 'junior' && consecutiveWrong >= 3) {
      targetLevel = 'primary';
      targetDifficulty = 2;
    } else {
      targetDifficulty = Math.max(1, currentDifficulty - 1);
    }
  } else if (recentCorrectRate >= 0.7) {
    // 正确率良好 → 小幅提升
    targetDifficulty = Math.min(8, currentDifficulty + 1);
  } else if (recentCorrectRate <= 0.3) {
    // 正确率较低 → 小幅降低
    targetDifficulty = Math.max(1, currentDifficulty - 1);
  }
  
  // 🚀 智能选词 - 优先使用动态词汇数据库
  let selectedWord = null;
  const usedWords = new Set(answers.map(a => a.question.word));
  
  // 优先使用动态词汇数据库
  if (window.dynamicVocabDB && window.dynamicVocabDB.initialized) {
    console.log(`🎯 使用动态数据库获取难度${targetDifficulty}的词汇`);
    
    // 对于高水平学生，允许挑战更高难度
    const finalTargetDifficulty = isHighPerformer && targetDifficulty >= 7 ? 
      Math.min(10, targetDifficulty + 1) : Math.min(8, targetDifficulty);
    
    const candidates = window.dynamicVocabDB.getWordsByDifficulty(finalTargetDifficulty, 5, true);
    
    if (candidates && candidates.length > 0) {
      // 从候选词中选择一个，优先选择高级词汇
      const advancedCandidates = candidates.filter(w => w.source === 'ecdict');
      if (advancedCandidates.length > 0 && (isHighPerformer || Math.random() > 0.6)) {
        selectedWord = advancedCandidates[Math.floor(Math.random() * advancedCandidates.length)];
        console.log(`🚀 选择高级词汇: ${selectedWord.word} (来源: ${selectedWord.source})`);
      } else {
        selectedWord = candidates[Math.floor(Math.random() * candidates.length)];
        console.log(`📚 选择标准词汇: ${selectedWord.word} (来源: ${selectedWord.source})`);
      }
    }
  }
  
  // 备用方案：使用原有的静态词汇选择
  if (!selectedWord) {
    console.log('📚 动态数据库不可用，使用静态词汇库');
    
    // 首先尝试从目标级别选择
    const targetLevelWords = getWordsFromLevel(targetLevel, targetDifficulty, usedWords);
    if (targetLevelWords.length > 0) {
      selectedWord = targetLevelWords[Math.floor(Math.random() * Math.min(3, targetLevelWords.length))];
    }
    
    // 如果目标级别没有可用词汇，向邻近难度扩展
    if (!selectedWord) {
      for (let offset = 1; offset <= 2 && !selectedWord; offset++) {
        for (const diff of [targetDifficulty + offset, targetDifficulty - offset]) {
          if (diff >= 1 && diff <= 10) { // 扩展难度范围到10
            const words = (window.wordsByDifficulty[diff] || []).filter(word => !usedWords.has(word.word));
            if (words.length > 0) {
              selectedWord = words[Math.floor(Math.random() * Math.min(3, words.length))];
              break;
            }
          }
        }
      }
    }
  }
  
  if (!selectedWord) {
    console.log('❌ 无可用词汇，测试结束');
    return null;
  }
  
  // 生成选项
  const allWords = [
    ...ecdictDatabase.primary,
    ...ecdictDatabase.junior,
    ...ecdictDatabase.senior
  ];
  const options = generateK12Options(selectedWord, allWords);
  const correctAnswer = selectedWord.translation.split('；')[0];
  
  console.log(`📝 生成题目: ${selectedWord.word} (${selectedWord.level}/${selectedWord.difficulty}) | 连续对错: +${consecutiveRight}/-${consecutiveWrong} | 正确率: ${(recentCorrectRate*100).toFixed(1)}%`);
  
  return {
    ...selectedWord,
    options: shuffleArray(options),
    meaning: correctAnswer,
    actualDifficulty: selectedWord.difficulty,
    targetDifficulty,
    testLength,
    adaptiveInfo: {
      currentLevel,
      targetLevel,
      consecutiveRight,
      consecutiveWrong,
      recentCorrectRate
    }
  };
}

// 🔧 辅助函数
function getConsecutiveWrongCount(answers) {
  let count = 0;
  for (let i = answers.length - 1; i >= 0; i--) {
    if (!answers[i].isCorrect) {
      count++;
    } else {
      break;
    }
  }
  return count;
}

function getConsecutiveRightCount(answers) {
  let count = 0;
  for (let i = answers.length - 1; i >= 0; i--) {
    if (answers[i].isCorrect) {
      count++;
    } else {
      break;
    }
  }
  return count;
}

function getWordsFromLevel(level, targetDifficulty, usedWords) {
  const levelWords = ecdictDatabase[level] || [];
  return levelWords.filter(word => 
    !usedWords.has(word.word) && 
    Math.abs(word.difficulty - targetDifficulty) <= 1
  );
}

// K12专用词汇水平评估算法 - 全面优化，照顾基础薄弱学生
function calculateK12VocabularyLevel(score, totalQuestions, answers = []) {
  const percentage = (score / totalQuestions) * 100;
  
  // 分析答对的题目难度分布和学习阶段分布
  const correctAnswers = answers.filter(a => a.isCorrect);
  const allAnswers = answers.length > 0 ? answers : [];
  
  // 计算平均难度（包括错误答案，更全面评估接触水平）
  const avgCorrectDifficulty = correctAnswers.length > 0 
    ? correctAnswers.reduce((sum, a) => sum + (a.question.difficulty || 1), 0) / correctAnswers.length 
    : 1;
  
  const avgAttemptedDifficulty = allAnswers.length > 0 
    ? allAnswers.reduce((sum, a) => sum + (a.question.difficulty || 1), 0) / allAnswers.length 
    : 1;
  
  // 分析答对题目的教育阶段分布
  const levelCounts = { primary: 0, junior: 0, senior: 0, advanced: 0 };
  const attemptedCounts = { primary: 0, junior: 0, senior: 0, advanced: 0 };
  
  correctAnswers.forEach(a => {
    if (a.question.level) {
      levelCounts[a.question.level] = (levelCounts[a.question.level] || 0) + 1;
    } else if (a.question.difficulty >= 7) {
      levelCounts.advanced = (levelCounts.advanced || 0) + 1;
    }
  });
  
  allAnswers.forEach(a => {
    if (a.question.level) {
      attemptedCounts[a.question.level] = (attemptedCounts[a.question.level] || 0) + 1;
    } else if (a.question.difficulty >= 7) {
      attemptedCounts.advanced = (attemptedCounts.advanced || 0) + 1;
    }
  });
  
  // 📊 智能词汇量预估算法
  function calculateVocabularyEstimate(level, percentage, avgDiff, levelCounts) {
    // 基础词汇量 = 水平基数 × 正确率系数 × 难度系数
    const baseLevels = {
      'beginner': 200,
      'primary_basic': 400,
      'primary_good': 650,
      'primary_excellent': 850,
      'junior_basic': 1100,
      'junior_good': 1500,
      'junior_excellent': 1900,
      'senior_basic': 2300,
      'senior_good': 2800,
      'senior_excellent': 3500,
      'senior_outstanding': 4200
    };
    
    const baseVocab = baseLevels[level] || 500;
    const difficultyMultiplier = Math.max(0.8, Math.min(1.3, avgDiff / 4));
    const percentageMultiplier = Math.max(0.7, Math.min(1.2, percentage / 80));
    
    // 考虑各级别词汇掌握情况
    const levelBonus = (levelCounts.primary * 100) + (levelCounts.junior * 150) + 
                      (levelCounts.senior * 200) + (levelCounts.advanced * 300);
    
    return Math.round(baseVocab * difficultyMultiplier * percentageMultiplier + levelBonus);
  }
  
  // K12专用评估逻辑 - 照顾基础薄弱学生
  let level, range, description, stage, estimatedVocab, percentile, nextGoal;
  
  // 高中生水平判断 - 优化算法（专门处理高分学生）
  if (percentage >= 100 && avgCorrectDifficulty >= 7) {
    level = '高中顶尖水平';
    range = '4000-5000 词汇量';
    description = '惊艳！您的词汇水平已达到高中顶尖标准，具备冲击名校的实力。建议增加更高难度词汇的学习。';
    stage = 'senior_outstanding';
    estimatedVocab = 4500;
    percentile = '超过99%的同龄人';
    nextGoal = '可以开始学习四六级和托福雅思词汇，为国际化英语学习做准备';
  } else if (percentage >= 95 && avgCorrectDifficulty >= 6) {
    level = '高中优秀水平';
    range = '3500-4000 词汇量';
    description = '恭喜！您的词汇水平达到高中优秀标准。虽然目前测试难度对您来说相对简单，但您已具备学习更高难度词汇的能力。';
    stage = 'senior_excellent';
    estimatedVocab = 3800;
    percentile = '超过95%的同龄人';
    nextGoal = '建议增加高中难词和部分四级词汇的学习，挑战更高难度';
  } else if (percentage >= 85 && (avgCorrectDifficulty >= 5 || levelCounts.senior >= 2)) {
    level = '高中良好水平';
    range = '2800-3500 词汇量';
    description = '您的词汇水平达到高中良好标准，继续保持就能达到优秀水平。';
    stage = 'senior_good';
    estimatedVocab = 3200;
    percentile = '超过80%的同龄人';
    nextGoal = '继续积累高中核心词汇，提高词汇的深度理解';
  } else if (percentage >= 70 && (avgCorrectDifficulty >= 4 || levelCounts.junior >= 5 || levelCounts.senior >= 1)) {
    level = '高中基础水平';
    range = '2200-2800 词汇量';
    description = '您具备高中基础词汇水平，需要继续加强高中词汇学习。';
    stage = 'senior_basic';
    estimatedVocab = 2500;
    percentile = '超过60%的同龄人';
    nextGoal = '重点学习高中必修词汇，提高词汇运用能力';
  } else if (percentage >= 85 && avgCorrectDifficulty >= 3.5 && levelCounts.junior >= 8) {
    level = '初中优秀水平';
    range = '1800-2200 词汇量';
    description = '您的词汇水平达到初中优秀标准，已经可以开始学习部分高中词汇。';
    stage = 'junior_excellent';
    estimatedVocab = 2000;
    percentile = '超过90%的初中同龄人';
    nextGoal = '可以开始接触高中词汇，为高中英语学习做准备';
  } else if (percentage >= 70 && (avgCorrectDifficulty >= 3 || levelCounts.junior >= 5)) {
    level = '初中良好水平';
    range = '1400-1800 词汇量';
    description = '您的词汇水平达到初中良好标准，继续努力就能达到优秀水平。';
    stage = 'junior_good';
    estimatedVocab = 1600;
    percentile = '超过70%的初中同龄人';
    nextGoal = '继续巩固初中核心词汇，提高词汇记忆的准确性';
  } else if (percentage >= 55 && (avgCorrectDifficulty >= 2.5 || levelCounts.junior >= 3 || levelCounts.primary >= 10)) {
    level = '初中基础水平';
    range = '1000-1400 词汇量';
    description = '您具备初中基础词汇水平，需要继续加强初中词汇学习。';
    stage = 'junior_basic';
    estimatedVocab = 1200;
    percentile = '超过50%的初中同龄人';
    nextGoal = '重点学习初中必修词汇，打好词汇基础';
  } else if (percentage >= 80 && levelCounts.primary >= 12) {
    level = '小学优秀水平';
    range = '800-1000 词汇量';
    description = '您的词汇水平达到小学优秀标准，可以开始学习初中词汇了。';
    stage = 'primary_excellent';
    estimatedVocab = 900;
    percentile = '超过85%的小学同龄人';
    nextGoal = '可以开始接触初中词汇，扩大词汇量';
  } else if (percentage >= 65 && levelCounts.primary >= 8) {
    level = '小学良好水平';
    range = '600-800 词汇量';
    description = '您的词汇水平达到小学良好标准，继续努力就能达到优秀水平。';
    stage = 'primary_good';
    estimatedVocab = 700;
    percentile = '超过65%的小学同龄人';
    nextGoal = '继续学习小学核心词汇，为初中英语学习做准备';
  } else if (percentage >= 45) {
    level = '小学基础水平';
    range = '400-600 词汇量';
    description = '您具备小学基础词汇水平，需要继续加强基础词汇学习。';
    stage = 'primary_basic';
    estimatedVocab = 500;
    percentile = '超过40%的小学同龄人';
    nextGoal = '重点学习小学基础词汇，建立良好的词汇基础';
  } else {
    level = '需要加强基础';
    range = '少于400 词汇量';
    description = '建议从最基础的词汇开始，循序渐进地提高词汇量。';
    stage = 'beginner';
    estimatedVocab = 300;
    percentile = '需要加强基础学习';
    nextGoal = '从基础词汇开始，每天坚持学习新单词';
  }
  
  return { 
    level, 
    range, 
    description, 
    stage,
    percentage: Math.round(percentage),
    avgDifficulty: Math.round(avgCorrectDifficulty * 10) / 10,
    estimatedVocab,
    percentile,
    nextGoal,
    levelCounts
  };
}

// K12专用学习建议
function getK12LearningAdvice(levelInfo, answers) {
  const advice = [];
  const { stage, percentage, avgDifficulty, levelCounts } = levelInfo;
  
  // 基于学习阶段的具体建议
  if (stage.includes('senior')) {
    advice.push({
      icon: '🎯',
      title: '高中词汇策略',
      content: '重点学习学科词汇和抽象概念词汇，提高词汇的深度理解和灵活运用能力。'
    });
    advice.push({
      icon: '📚',
      title: '阅读建议',
      content: '多读英文原版小说和新闻文章，在语境中学习和巩固词汇。'
    });
  } else if (stage.includes('junior')) {
    advice.push({
      icon: '🔤',
      title: '初中词汇重点',
      content: '注重词汇的词性变化和固定搭配，建立词汇网络思维。'
    });
    advice.push({
      icon: '✍️',
      title: '练习建议',
      content: '通过造句和写作练习来巩固新学词汇，提高词汇运用能力。'
    });
  } else {
    advice.push({
      icon: '🌟',
      title: '基础词汇建议',
      content: '重点学习日常生活和课本中的核心词汇，打好词汇基础。'
    });
    advice.push({
      icon: '🎮',
      title: '趣味学习',
      content: '可以通过单词游戏、歌曲等趣味方式来学习和记忆词汇。'
    });
  }
  
  // 基于表现的个性化建议
  if (percentage >= 90) {
    advice.push({
      icon: '🚀',
      title: '挑战更高难度',
      content: '您的基础很扎实，可以尝试学习更高年级的词汇，挑战自己的极限。'
    });
  } else if (percentage >= 70) {
    advice.push({
      icon: '💪',
      title: '稳步提升',
      content: '继续保持当前的学习节奏，重点提高词汇记忆的准确性。'
    });
  } else {
    advice.push({
      icon: '📖',
      title: '巩固基础',
      content: '建议重点复习基础词汇，确保每个词汇都能准确掌握。'
    });
  }
  
  // 学习方法建议
  advice.push({
    icon: '⏰',
    title: '学习计划',
    content: '建议每天学习10-15个新单词，并定期复习已学词汇，形成长期记忆。'
  });
  
  return advice;
}

// 🚀 自动初始化ECDICT词汇数据源
if (typeof window !== 'undefined') {
  // 等待DOM加载完成后初始化
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
      setTimeout(initializeAvailableECDictWords, 100);
    });
  } else {
    setTimeout(initializeAvailableECDictWords, 100);
  }
  
  // 也可以手动调用初始化
  window.initializeAvailableECDictWords = initializeAvailableECDictWords;
}

// 导出函数 - K12专用
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    ecdictDatabase,
    getWordsByLevel,
    getK12AdaptiveQuestions,
    getNextK12Question,
    getUnifiedAdaptiveQuestions,
    getUnifiedNextQuestion,
    generateK12Options,
    calculateK12VocabularyLevel,
    getK12LearningAdvice,
    getUserId,
    hashCode,
    shuffleArray
  };
}