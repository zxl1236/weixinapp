// 增强版词汇数据库
// 基于现有数据，按年级分类并增加更多词汇

/**
 * K12分级词汇数据库
 * 按难度和年级精心分类的词汇集合
 */

const gradeVocabulary = {
  // 小学阶段 (Grade 1-6)
  grade1: [
    { word: "cat", meaning: "猫", phonetic: "/kæt/", level: 1 },
    { word: "dog", meaning: "狗", phonetic: "/dɒɡ/", level: 1 },
    { word: "apple", meaning: "苹果", phonetic: "/ˈæp.əl/", level: 1 },
    { word: "book", meaning: "书", phonetic: "/bʊk/", level: 1 },
    { word: "red", meaning: "红色", phonetic: "/red/", level: 1 },
    { word: "blue", meaning: "蓝色", phonetic: "/bluː/", level: 1 },
    { word: "big", meaning: "大的", phonetic: "/bɪɡ/", level: 1 },
    { word: "small", meaning: "小的", phonetic: "/smɔːl/", level: 1 },
    { word: "happy", meaning: "快乐的", phonetic: "/ˈhæp.i/", level: 1 },
    { word: "run", meaning: "跑", phonetic: "/rʌn/", level: 1 },
    { word: "jump", meaning: "跳", phonetic: "/dʒʌmp/", level: 1 },
    { word: "eat", meaning: "吃", phonetic: "/iːt/", level: 1 },
    { word: "play", meaning: "玩", phonetic: "/pleɪ/", level: 1 },
    { word: "sun", meaning: "太阳", phonetic: "/sʌn/", level: 1 },
    { word: "moon", meaning: "月亮", phonetic: "/muːn/", level: 1 },
    { word: "water", meaning: "水", phonetic: "/ˈwɔː.tər/", level: 1 },
    { word: "tree", meaning: "树", phonetic: "/triː/", level: 1 },
    { word: "house", meaning: "房子", phonetic: "/haʊs/", level: 1 },
    { word: "car", meaning: "汽车", phonetic: "/kɑːr/", level: 1 },
    { word: "bird", meaning: "鸟", phonetic: "/bɜːrd/", level: 1 }
  ],

  grade2: [
    { word: "school", meaning: "学校", phonetic: "/skuːl/", level: 2 },
    { word: "teacher", meaning: "老师", phonetic: "/ˈtiː.tʃər/", level: 2 },
    { word: "friend", meaning: "朋友", phonetic: "/frend/", level: 2 },
    { word: "family", meaning: "家庭", phonetic: "/ˈfæm.ə.li/", level: 2 },
    { word: "mother", meaning: "妈妈", phonetic: "/ˈmʌð.ər/", level: 2 },
    { word: "father", meaning: "爸爸", phonetic: "/ˈfɑː.ðər/", level: 2 },
    { word: "sister", meaning: "姐妹", phonetic: "/ˈsɪs.tər/", level: 2 },
    { word: "brother", meaning: "兄弟", phonetic: "/ˈbrʌð.ər/", level: 2 },
    { word: "birthday", meaning: "生日", phonetic: "/ˈbɜːrθ.deɪ/", level: 2 },
    { word: "color", meaning: "颜色", phonetic: "/ˈkʌl.ər/", level: 2 },
    { word: "number", meaning: "数字", phonetic: "/ˈnʌm.bər/", level: 2 },
    { word: "animal", meaning: "动物", phonetic: "/ˈæn.ɪ.məl/", level: 2 },
    { word: "food", meaning: "食物", phonetic: "/fuːd/", level: 2 },
    { word: "game", meaning: "游戏", phonetic: "/ɡeɪm/", level: 2 },
    { word: "story", meaning: "故事", phonetic: "/ˈstɔː.ri/", level: 2 },
    { word: "picture", meaning: "图片", phonetic: "/ˈpɪk.tʃər/", level: 2 },
    { word: "music", meaning: "音乐", phonetic: "/ˈmjuː.zɪk/", level: 2 },
    { word: "flower", meaning: "花", phonetic: "/ˈflaʊ.ər/", level: 2 },
    { word: "grass", meaning: "草", phonetic: "/ɡræs/", level: 2 },
    { word: "cloud", meaning: "云", phonetic: "/klaʊd/", level: 2 }
  ],

  grade3: [
    { word: "beautiful", meaning: "美丽的", phonetic: "/ˈbjuː.tɪ.fəl/", level: 3 },
    { word: "important", meaning: "重要的", phonetic: "/ɪmˈpɔːr.tənt/", level: 3 },
    { word: "different", meaning: "不同的", phonetic: "/ˈdɪf.ər.ənt/", level: 3 },
    { word: "special", meaning: "特殊的", phonetic: "/ˈspeʃ.əl/", level: 3 },
    { word: "interesting", meaning: "有趣的", phonetic: "/ˈɪn.trə.stɪŋ/", level: 3 },
    { word: "wonderful", meaning: "精彩的", phonetic: "/ˈwʌn.dər.fəl/", level: 3 },
    { word: "exciting", meaning: "令人兴奋的", phonetic: "/ɪkˈsaɪ.tɪŋ/", level: 3 },
    { word: "terrible", meaning: "可怕的", phonetic: "/ˈter.ə.bəl/", level: 3 },
    { word: "amazing", meaning: "令人惊讶的", phonetic: "/əˈmeɪ.zɪŋ/", level: 3 },
    { word: "fantastic", meaning: "极好的", phonetic: "/fænˈtæs.tɪk/", level: 3 },
    { word: "terrible", meaning: "糟糕的", phonetic: "/ˈter.ə.bəl/", level: 3 },
    { word: "excellent", meaning: "优秀的", phonetic: "/ˈek.səl.ənt/", level: 3 },
    { word: "popular", meaning: "受欢迎的", phonetic: "/ˈpɑːp.jə.lər/", level: 3 },
    { word: "famous", meaning: "著名的", phonetic: "/ˈfeɪ.məs/", level: 3 },
    { word: "modern", meaning: "现代的", phonetic: "/ˈmɑː.dərn/", level: 3 },
    { word: "ancient", meaning: "古老的", phonetic: "/ˈeɪn.ʃənt/", level: 3 },
    { word: "natural", meaning: "自然的", phonetic: "/ˈnætʃ.ər.əl/", level: 3 },
    { word: "healthy", meaning: "健康的", phonetic: "/ˈhel.θi/", level: 3 },
    { word: "dangerous", meaning: "危险的", phonetic: "/ˈdeɪn.dʒər.əs/", level: 3 },
    { word: "comfortable", meaning: "舒适的", phonetic: "/ˈkʌmf.tər.ə.bəl/", level: 3 }
  ],

  grade4: [
    { word: "knowledge", meaning: "知识", phonetic: "/ˈnɑː.lɪdʒ/", level: 4 },
    { word: "education", meaning: "教育", phonetic: "/ˌed.jʊˈkeɪ.ʃən/", level: 4 },
    { word: "experience", meaning: "经验", phonetic: "/ɪkˈspɪr.i.əns/", level: 4 },
    { word: "adventure", meaning: "冒险", phonetic: "/ədˈven.tʃər/", level: 4 },
    { word: "challenge", meaning: "挑战", phonetic: "/ˈtʃæl.ɪndʒ/", level: 4 },
    { word: "discovery", meaning: "发现", phonetic: "/dɪˈskʌv.ər.i/", level: 4 },
    { word: "invention", meaning: "发明", phonetic: "/ɪnˈven.ʃən/", level: 4 },
    { word: "technology", meaning: "技术", phonetic: "/tekˈnɑː.lə.dʒi/", level: 4 },
    { word: "computer", meaning: "电脑", phonetic: "/kəmˈpjuː.tər/", level: 4 },
    { word: "internet", meaning: "互联网", phonetic: "/ˈɪn.tər.net/", level: 4 },
    { word: "communication", meaning: "交流", phonetic: "/kəˌmjuː.nɪˈkeɪ.ʃən/", level: 4 },
    { word: "information", meaning: "信息", phonetic: "/ˌɪn.fərˈmeɪ.ʃən/", level: 4 },
    { word: "development", meaning: "发展", phonetic: "/dɪˈvel.əp.mənt/", level: 4 },
    { word: "improvement", meaning: "改进", phonetic: "/ɪmˈpruːv.mənt/", level: 4 },
    { word: "opportunity", meaning: "机会", phonetic: "/ˌɑː.pərˈtuː.nə.ti/", level: 4 },
    { word: "responsibility", meaning: "责任", phonetic: "/rɪˌspɑːn.səˈbɪl.ə.ti/", level: 4 },
    { word: "creativity", meaning: "创造力", phonetic: "/ˌkri.eɪˈtɪv.ə.ti/", level: 4 },
    { word: "imagination", meaning: "想象力", phonetic: "/ɪˌmædʒ.əˈneɪ.ʃən/", level: 4 },
    { word: "environment", meaning: "环境", phonetic: "/ɪnˈvaɪ.rən.mənt/", level: 4 },
    { word: "community", meaning: "社区", phonetic: "/kəˈmjuː.nə.ti/", level: 4 }
  ],

  grade5: [
    { word: "achievement", meaning: "成就", phonetic: "/əˈtʃiːv.mənt/", level: 5 },
    { word: "contribution", meaning: "贡献", phonetic: "/ˌkɑːn.trəˈbjuː.ʃən/", level: 5 },
    { word: "celebration", meaning: "庆祝", phonetic: "/ˌsel.əˈbreɪ.ʃən/", level: 5 },
    { word: "independence", meaning: "独立", phonetic: "/ˌɪn.dɪˈpen.dəns/", level: 5 },
    { word: "cooperation", meaning: "合作", phonetic: "/koʊˌɑː.pəˈreɪ.ʃən/", level: 5 },
    { word: "competition", meaning: "竞争", phonetic: "/ˌkɑːm.pəˈtɪʃ.ən/", level: 5 },
    { word: "organization", meaning: "组织", phonetic: "/ˌɔːr.ɡən.əˈzeɪ.ʃən/", level: 5 },
    { word: "preparation", meaning: "准备", phonetic: "/ˌprep.əˈreɪ.ʃən/", level: 5 },
    { word: "presentation", meaning: "演示", phonetic: "/ˌpriː.zenˈteɪ.ʃən/", level: 5 },
    { word: "investigation", meaning: "调查", phonetic: "/ɪnˌves.təˈɡeɪ.ʃən/", level: 5 },
    { word: "explanation", meaning: "解释", phonetic: "/ˌek.spləˈneɪ.ʃən/", level: 5 },
    { word: "recommendation", meaning: "推荐", phonetic: "/ˌrek.ə.menˈdeɪ.ʃən/", level: 5 },
    { word: "consideration", meaning: "考虑", phonetic: "/kənˌsɪd.əˈreɪ.ʃən/", level: 5 },
    { word: "concentration", meaning: "专注", phonetic: "/ˌkɑːn.sənˈtreɪ.ʃən/", level: 5 },
    { word: "determination", meaning: "决心", phonetic: "/dɪˌtɜːr.məˈneɪ.ʃən/", level: 5 },
    { word: "appreciation", meaning: "欣赏", phonetic: "/əˌpriː.ʃiˈeɪ.ʃən/", level: 5 },
    { word: "civilization", meaning: "文明", phonetic: "/ˌsɪv.əl.əˈzeɪ.ʃən/", level: 5 },
    { word: "relationship", meaning: "关系", phonetic: "/rɪˈleɪ.ʃən.ʃɪp/", level: 5 },
    { word: "understanding", meaning: "理解", phonetic: "/ˌʌn.dərˈstæn.dɪŋ/", level: 5 },
    { word: "entertainment", meaning: "娱乐", phonetic: "/ˌen.tərˈteɪn.mənt/", level: 5 }
  ],

  grade6: [
    { word: "philosophy", meaning: "哲学", phonetic: "/fəˈlɑː.sə.fi/", level: 6 },
    { word: "psychology", meaning: "心理学", phonetic: "/saɪˈkɑː.lə.dʒi/", level: 6 },
    { word: "architecture", meaning: "建筑学", phonetic: "/ˈɑːr.kə.tek.tʃər/", level: 6 },
    { word: "agriculture", meaning: "农业", phonetic: "/ˈæɡ.rɪ.kʌl.tʃər/", level: 6 },
    { word: "literature", meaning: "文学", phonetic: "/ˈlɪt.ər.ə.tʃər/", level: 6 },
    { word: "mathematics", meaning: "数学", phonetic: "/ˌmæθ.əˈmæt.ɪks/", level: 6 },
    { word: "geography", meaning: "地理", phonetic: "/dʒiˈɑː.ɡrə.fi/", level: 6 },
    { word: "biography", meaning: "传记", phonetic: "/baɪˈɑː.ɡrə.fi/", level: 6 },
    { word: "democracy", meaning: "民主", phonetic: "/dɪˈmɑː.krə.si/", level: 6 },
    { word: "laboratory", meaning: "实验室", phonetic: "/ˈlæb.rə.tɔːr.i/", level: 6 },
    { word: "vocabulary", meaning: "词汇", phonetic: "/voʊˈkæb.jə.ler.i/", level: 6 },
    { word: "democracy", meaning: "民主制度", phonetic: "/dɪˈmɑː.krə.si/", level: 6 },
    { word: "economy", meaning: "经济", phonetic: "/ɪˈkɑː.nə.mi/", level: 6 },
    { word: "society", meaning: "社会", phonetic: "/səˈsaɪ.ə.ti/", level: 6 },
    { word: "authority", meaning: "权威", phonetic: "/əˈθɔːr.ə.ti/", level: 6 },
    { word: "majority", meaning: "大多数", phonetic: "/məˈdʒɔːr.ə.ti/", level: 6 },
    { word: "minority", meaning: "少数", phonetic: "/maɪˈnɔːr.ə.ti/", level: 6 },
    { word: "priority", meaning: "优先", phonetic: "/praɪˈɔːr.ə.ti/", level: 6 },
    { word: "security", meaning: "安全", phonetic: "/sɪˈkjʊr.ə.ti/", level: 6 },
    { word: "prosperity", meaning: "繁荣", phonetic: "/prɑːˈsper.ə.ti/", level: 6 }
  ],

  // 初中阶段 (Grade 7-9)
  grade7: [
    { word: "academic", meaning: "学术的", phonetic: "/ˌæk.əˈdem.ɪk/", level: 7 },
    { word: "analyze", meaning: "分析", phonetic: "/ˈæn.əl.aɪz/", level: 7 },
    { word: "approach", meaning: "方法", phonetic: "/əˈproʊtʃ/", level: 7 },
    { word: "assess", meaning: "评估", phonetic: "/əˈses/", level: 7 },
    { word: "concept", meaning: "概念", phonetic: "/ˈkɑːn.sept/", level: 7 },
    { word: "consistent", meaning: "一致的", phonetic: "/kənˈsɪs.tənt/", level: 7 },
    { word: "context", meaning: "背景", phonetic: "/ˈkɑːn.tekst/", level: 7 },
    { word: "contrast", meaning: "对比", phonetic: "/ˈkɑːn.træst/", level: 7 },
    { word: "create", meaning: "创造", phonetic: "/kriˈeɪt/", level: 7 },
    { word: "data", meaning: "数据", phonetic: "/ˈdeɪ.tə/", level: 7 },
    { word: "define", meaning: "定义", phonetic: "/dɪˈfaɪn/", level: 7 },
    { word: "derive", meaning: "获得", phonetic: "/dɪˈraɪv/", level: 7 },
    { word: "distribute", meaning: "分发", phonetic: "/dɪˈstrɪb.juːt/", level: 7 },
    { word: "economy", meaning: "经济", phonetic: "/ɪˈkɑː.nə.mi/", level: 7 },
    { word: "element", meaning: "元素", phonetic: "/ˈel.ə.mənt/", level: 7 },
    { word: "environment", meaning: "环境", phonetic: "/ɪnˈvaɪ.rən.mənt/", level: 7 },
    { word: "establish", meaning: "建立", phonetic: "/ɪˈstæb.lɪʃ/", level: 7 },
    { word: "evaluate", meaning: "评估", phonetic: "/ɪˈvæl.ju.eɪt/", level: 7 },
    { word: "evidence", meaning: "证据", phonetic: "/ˈev.ɪ.dəns/", level: 7 },
    { word: "factor", meaning: "因素", phonetic: "/ˈfæk.tər/", level: 7 }
  ],

  grade8: [
    { word: "significant", meaning: "重要的", phonetic: "/sɪɡˈnɪf.ɪ.kənt/", level: 8 },
    { word: "hypothesis", meaning: "假设", phonetic: "/haɪˈpɑː.θə.sɪs/", level: 8 },
    { word: "interpret", meaning: "解释", phonetic: "/ɪnˈtɜːr.prət/", level: 8 },
    { word: "phenomenon", meaning: "现象", phonetic: "/fəˈnɑː.mə.nən/", level: 8 },
    { word: "relevant", meaning: "相关的", phonetic: "/ˈrel.ə.vənt/", level: 8 },
    { word: "subsequent", meaning: "随后的", phonetic: "/ˈsʌb.sə.kwənt/", level: 8 },
    { word: "underlying", meaning: "潜在的", phonetic: "/ˌʌn.dərˈlaɪ.ɪŋ/", level: 8 },
    { word: "comprehensive", meaning: "全面的", phonetic: "/ˌkɑːm.prɪˈhen.sɪv/", level: 8 },
    { word: "fundamental", meaning: "基本的", phonetic: "/ˌfʌn.dəˈmen.təl/", level: 8 },
    { word: "sophisticated", meaning: "复杂的", phonetic: "/səˈfɪs.tə.keɪ.tɪd/", level: 8 },
    { word: "ambiguous", meaning: "模糊的", phonetic: "/æmˈbɪɡ.ju.əs/", level: 8 },
    { word: "arbitrary", meaning: "任意的", phonetic: "/ˈɑːr.bə.trer.i/", level: 8 },
    { word: "coherent", meaning: "连贯的", phonetic: "/koʊˈhɪr.ənt/", level: 8 },
    { word: "compatible", meaning: "兼容的", phonetic: "/kəmˈpæt.ə.bəl/", level: 8 },
    { word: "consecutive", meaning: "连续的", phonetic: "/kənˈsek.jə.tɪv/", level: 8 },
    { word: "inevitable", meaning: "不可避免的", phonetic: "/ɪnˈev.ɪ.tə.bəl/", level: 8 },
    { word: "persistent", meaning: "持续的", phonetic: "/pərˈsɪs.tənt/", level: 8 },
    { word: "preliminary", meaning: "初步的", phonetic: "/prɪˈlɪm.ə.ner.i/", level: 8 },
    { word: "spontaneous", meaning: "自发的", phonetic: "/spɑːnˈteɪ.ni.əs/", level: 8 },
    { word: "unprecedented", meaning: "前所未有的", phonetic: "/ʌnˈpres.ɪ.den.tɪd/", level: 8 }
  ],

  grade9: [
    { word: "elaborate", meaning: "详细阐述", phonetic: "/ɪˈlæb.ər.ət/", level: 9 },
    { word: "manipulate", meaning: "操控", phonetic: "/məˈnɪp.jə.leɪt/", level: 9 },
    { word: "synthesize", meaning: "综合", phonetic: "/ˈsɪn.θə.saɪz/", level: 9 },
    { word: "controversial", meaning: "有争议的", phonetic: "/ˌkɑːn.trəˈvɜːr.ʃəl/", level: 9 },
    { word: "contemporary", meaning: "当代的", phonetic: "/kənˈtem.pər.er.i/", level: 9 },
    { word: "deteriorate", meaning: "恶化", phonetic: "/dɪˈtɪr.i.ər.eɪt/", level: 9 },
    { word: "fluctuate", meaning: "波动", phonetic: "/ˈflʌk.tʃu.eɪt/", level: 9 },
    { word: "implement", meaning: "实施", phonetic: "/ˈɪm.plə.mənt/", level: 9 },
    { word: "intensify", meaning: "加强", phonetic: "/ɪnˈten.sə.faɪ/", level: 9 },
    { word: "mechanism", meaning: "机制", phonetic: "/ˈmek.ə.nɪ.zəm/", level: 9 },
    { word: "proportion", meaning: "比例", phonetic: "/prəˈpɔːr.ʃən/", level: 9 },
    { word: "supplement", meaning: "补充", phonetic: "/ˈsʌp.lə.mənt/", level: 9 },
    { word: "transformation", meaning: "转变", phonetic: "/ˌtræns.fərˈmeɪ.ʃən/", level: 9 },
    { word: "accommodation", meaning: "住宿", phonetic: "/əˌkɑː.məˈdeɪ.ʃən/", level: 9 },
    { word: "collaboration", meaning: "合作", phonetic: "/kəˌlæb.əˈreɪ.ʃən/", level: 9 },
    { word: "deterioration", meaning: "恶化", phonetic: "/dɪˌtɪr.i.əˈreɪ.ʃən/", level: 9 },
    { word: "differentiation", meaning: "区别", phonetic: "/ˌdɪf.ər.en.ʃiˈeɪ.ʃən/", level: 9 },
    { word: "implementation", meaning: "实施", phonetic: "/ˌɪm.plə.menˈteɪ.ʃən/", level: 9 },
    { word: "specification", meaning: "规格", phonetic: "/ˌspes.ə.fəˈkeɪ.ʃən/", level: 9 },
    { word: "unprecedented", meaning: "史无前例的", phonetic: "/ʌnˈpres.ɪ.den.tɪd/", level: 9 }
  ],

  // 高中阶段 (Grade 10-12)
  grade10: [
    { word: "abstract", meaning: "抽象的", phonetic: "/ˈæb.strækt/", level: 10 },
    { word: "acquire", meaning: "获得", phonetic: "/əˈkwaɪər/", level: 10 },
    { word: "advocate", meaning: "提倡", phonetic: "/ˈæd.və.keɪt/", level: 10 },
    { word: "allocate", meaning: "分配", phonetic: "/ˈæl.ə.keɪt/", level: 10 },
    { word: "ambiguous", meaning: "模糊的", phonetic: "/æmˈbɪɡ.ju.əs/", level: 10 },
    { word: "arbitrary", meaning: "武断的", phonetic: "/ˈɑːr.bə.trer.i/", level: 10 },
    { word: "comprise", meaning: "包含", phonetic: "/kəmˈpraɪz/", level: 10 },
    { word: "conceive", meaning: "构想", phonetic: "/kənˈsiːv/", level: 10 },
    { word: "crucial", meaning: "关键的", phonetic: "/ˈkruː.ʃəl/", level: 10 },
    { word: "denote", meaning: "表示", phonetic: "/dɪˈnoʊt/", level: 10 },
    { word: "dispose", meaning: "处理", phonetic: "/dɪˈspoʊz/", level: 10 },
    { word: "diversity", meaning: "多样性", phonetic: "/daɪˈvɜːr.sə.ti/", level: 10 },
    { word: "elaborate", meaning: "详细的", phonetic: "/ɪˈlæb.ər.ət/", level: 10 },
    { word: "enhance", meaning: "增强", phonetic: "/ɪnˈhæns/", level: 10 },
    { word: "exploit", meaning: "利用", phonetic: "/ɪkˈsplɔɪt/", level: 10 },
    { word: "facilitate", meaning: "促进", phonetic: "/fəˈsɪl.ə.teɪt/", level: 10 },
    { word: "generate", meaning: "产生", phonetic: "/ˈdʒen.ər.eɪt/", level: 10 },
    { word: "hypothetical", meaning: "假设的", phonetic: "/ˌhaɪ.pəˈθet.ɪ.kəl/", level: 10 },
    { word: "implicit", meaning: "隐含的", phonetic: "/ɪmˈplɪs.ɪt/", level: 10 },
    { word: "incorporate", meaning: "合并", phonetic: "/ɪnˈkɔːr.pər.eɪt/", level: 10 }
  ],

  grade11: [
    { word: "articulate", meaning: "清楚表达", phonetic: "/ɑːrˈtɪk.jə.leɪt/", level: 11 },
    { word: "comprehensive", meaning: "全面的", phonetic: "/ˌkɑːm.prɪˈhen.sɪv/", level: 11 },
    { word: "perpetual", meaning: "永久的", phonetic: "/pərˈpetʃ.u.əl/", level: 11 },
    { word: "intrinsic", meaning: "内在的", phonetic: "/ɪnˈtrɪn.zɪk/", level: 11 },
    { word: "paradigm", meaning: "范式", phonetic: "/ˈper.ə.daɪm/", level: 11 },
    { word: "autonomous", meaning: "自主的", phonetic: "/ɔːˈtɑː.nə.məs/", level: 11 },
    { word: "coherent", meaning: "连贯的", phonetic: "/koʊˈhɪr.ənt/", level: 11 },
    { word: "conducive", meaning: "有利的", phonetic: "/kənˈduː.sɪv/", level: 11 },
    { word: "empirical", meaning: "经验的", phonetic: "/ɪmˈpɪr.ɪ.kəl/", level: 11 },
    { word: "inevitable", meaning: "不可避免的", phonetic: "/ɪnˈev.ɪ.tə.bəl/", level: 11 },
    { word: "legitimate", meaning: "合法的", phonetic: "/lɪˈdʒɪt.ə.mət/", level: 11 },
    { word: "methodology", meaning: "方法论", phonetic: "/ˌmeθ.əˈdɑː.lə.dʒi/", level: 11 },
    { word: "nonetheless", meaning: "尽管如此", phonetic: "/ˌnʌn.ðəˈles/", level: 11 },
    { word: "objective", meaning: "客观的", phonetic: "/əbˈdʒek.tɪv/", level: 11 },
    { word: "preliminary", meaning: "初步的", phonetic: "/prɪˈlɪm.ə.ner.i/", level: 11 },
    { word: "rational", meaning: "理性的", phonetic: "/ˈræʃ.ən.əl/", level: 11 },
    { word: "subsidiary", meaning: "辅助的", phonetic: "/səbˈsɪd.i.er.i/", level: 11 },
    { word: "synthesis", meaning: "综合", phonetic: "/ˈsɪn.θə.sɪs/", level: 11 },
    { word: "ubiquitous", meaning: "普遍存在的", phonetic: "/juˈbɪk.wə.təs/", level: 11 },
    { word: "versatile", meaning: "多才多艺的", phonetic: "/ˈvɜːr.sə.təl/", level: 11 }
  ],

  grade12: [
    { word: "aesthetic", meaning: "美学的", phonetic: "/esˈθet.ɪk/", level: 12 },
    { word: "antithesis", meaning: "对立面", phonetic: "/ænˈtɪθ.ə.sɪs/", level: 12 },
    { word: "bureaucracy", meaning: "官僚制度", phonetic: "/bjʊˈrɑː.krə.si/", level: 12 },
    { word: "catastrophe", meaning: "大灾难", phonetic: "/kəˈtæs.trə.fi/", level: 12 },
    { word: "dichotomy", meaning: "二分法", phonetic: "/daɪˈkɑː.tə.mi/", level: 12 },
    { word: "epitome", meaning: "典型", phonetic: "/ɪˈpɪt.ə.mi/", level: 12 },
    { word: "feasible", meaning: "可行的", phonetic: "/ˈfiː.zə.bəl/", level: 12 },
    { word: "gregarious", meaning: "群居的", phonetic: "/ɡrɪˈɡer.i.əs/", level: 12 },
    { word: "hegemony", meaning: "霸权", phonetic: "/hɪˈdʒem.ə.ni/", level: 12 },
    { word: "idiosyncratic", meaning: "特异的", phonetic: "/ˌɪd.i.oʊ.sɪŋˈkræt.ɪk/", level: 12 },
    { word: "juxtaposition", meaning: "并置", phonetic: "/ˌdʒʌk.stə.pəˈzɪʃ.ən/", level: 12 },
    { word: "kinetic", meaning: "动力学的", phonetic: "/kɪˈnet.ɪk/", level: 12 },
    { word: "lucid", meaning: "清晰的", phonetic: "/ˈluː.sɪd/", level: 12 },
    { word: "metamorphosis", meaning: "变形", phonetic: "/ˌmet.əˈmɔːr.fə.sɪs/", level: 12 },
    { word: "nomenclature", meaning: "命名法", phonetic: "/ˈnoʊ.mən.kleɪ.tʃər/", level: 12 },
    { word: "oscillate", meaning: "振荡", phonetic: "/ˈɑː.sə.leɪt/", level: 12 },
    { word: "paradigmatic", meaning: "范式的", phonetic: "/ˌper.ə.dɪɡˈmæt.ɪk/", level: 12 },
    { word: "quintessential", meaning: "典型的", phonetic: "/ˌkwɪn.təˈsen.ʃəl/", level: 12 },
    { word: "rhetoric", meaning: "修辞学", phonetic: "/ˈret.ər.ɪk/", level: 12 },
    { word: "symbiotic", meaning: "共生的", phonetic: "/ˌsɪm.baɪˈɑː.tɪk/", level: 12 }
  ]
};

/**
 * 获取指定年级的词汇
 * @param {string} gradeId - 年级ID
 * @param {number} count - 需要的词汇数量
 * @returns {Array} 词汇列表
 */
function getGradeVocabulary(gradeId, count = 20) {
  const gradeWords = gradeVocabulary[gradeId] || gradeVocabulary.grade6;
  
  // 如果请求的数量大于可用词汇，重复使用词汇
  const words = [];
  for (let i = 0; i < count; i++) {
    const baseWord = gradeWords[i % gradeWords.length];
    const word = {...baseWord};
    
    // 如果需要重复，给单词加后缀
    if (i >= gradeWords.length) {
      word.word = word.word + '_' + Math.floor(i / gradeWords.length);
    }
    
    word.grade = gradeId;
    words.push(word);
  }
  
  // 为每个单词生成选择题选项
  return words.map(word => generateOptionsForWord(word, gradeWords));
}

/**
 * 为单词生成选择题选项
 * @param {Object} wordData - 单词数据
 * @param {Array} gradeWords - 同年级其他单词
 * @returns {Object} 包含选项的完整题目数据
 */
function generateOptionsForWord(wordData, gradeWords) {
  const correctAnswer = wordData.meaning;
  const options = [correctAnswer];
  
  // 从同年级的其他单词中选择错误选项
  const otherMeanings = gradeWords
    .map(w => w.meaning)
    .filter(m => m !== correctAnswer);
  
  // 随机选择3个错误选项
  while (options.length < 4 && otherMeanings.length > 0) {
    const randomIndex = Math.floor(Math.random() * otherMeanings.length);
    const option = otherMeanings.splice(randomIndex, 1)[0];
    options.push(option);
  }
  
  // 如果选项不够，补充通用选项
  const fallbackOptions = ['重要的', '困难的', '简单的', '特殊的', '普通的', '复杂的', '美好的', '糟糕的'];
  while (options.length < 4) {
    for (const fallback of fallbackOptions) {
      if (!options.includes(fallback)) {
        options.push(fallback);
        break;
      }
    }
  }
  
  // 打乱选项顺序
  return {
    ...wordData,
    options: shuffleArray(options.slice(0, 4))
  };
}

/**
 * 打乱数组
 * @param {Array} array - 原数组
 * @returns {Array} 打乱后的数组
 */
function shuffleArray(array) {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
}

/**
 * 获取年级词汇统计信息
 * @returns {Object} 统计信息
 */
function getVocabularyStatistics() {
  const stats = {};
  for (const [grade, words] of Object.entries(gradeVocabulary)) {
    stats[grade] = {
      count: words.length,
      level: words[0]?.level || 1,
      description: `${grade} 年级词汇`
    };
  }
  return stats;
}

module.exports = {
  getGradeVocabulary,
  getVocabularyStatistics,
  gradeVocabulary
};