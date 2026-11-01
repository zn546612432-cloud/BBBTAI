// Story version and editable definitions; no player progress or provider keys.
export const STORY55_CONFIG={
  "format": "ximeng-story55-config-v1",
  "version": 1,
  "finalAudio": "/assets/story55/ximeng-final-keywords.mp3",
  "startDate": "2025-05-19",
  "totalDays": 55,
  "nodes": [
    {
      "id": "intro",
      "day": 1,
      "title": "普通早晨",
      "kind": "scene",
      "requires": [],
      "gateDay": 1
    },
    {
      "id": "flow-d03",
      "day": 3,
      "title": "Flow 的漏洞扫描工具",
      "kind": "flow",
      "requires": ["intro"],
      "gateDay": 3
    },
    {
      "id": "wallet",
      "day": 6,
      "title": "管理者的钱包比赛",
      "kind": "project",
      "requires": [
        "intro"
      ],
      "project": "wallet",
      "gateDay": 6
    },
    {
      "id": "invitation",
      "day": 6,
      "title": "拒绝团队邀请",
      "kind": "scene",
      "requires": [
        "wallet"
      ],
      "gateDay": 6
    },
    {
      "id": "return",
      "day": 11,
      "title": "干爹回来了",
      "kind": "scene",
      "requires": [
        "invitation"
      ],
      "gateDay": 11
    },
    {
      "id": "move",
      "day": 12,
      "title": "搬回共同据点",
      "kind": "scene",
      "requires": [
        "return"
      ],
      "gateDay": 12
    },
    {
      "id": "intrusion",
      "day": 13,
      "title": "绿屏与未知来电",
      "kind": "scene",
      "requires": [
        "exhibition"
      ],
      "gateDay": 13
    },
    {
      "id": "exhibition",
      "day": 13,
      "title": "二十九天的行动窗口",
      "kind": "scene",
      "requires": [
        "move"
      ],
      "gateDay": 13
    },
    {
      "id": "code",
      "day": 14,
      "title": "基础框架邮件",
      "kind": "mail",
      "requires": [
        "intrusion"
      ],
      "mail": "code-mail",
      "gateDay": 14
    },
    {
      "id": "base",
      "day": 14,
      "title": "部署基础框架",
      "kind": "project",
      "requires": [
        "code"
      ],
      "project": "base",
      "gateDay": 24
    },
    {
      "id": "loan",
      "day": 15,
      "title": "机房与一百万借款",
      "kind": "scene",
      "requires": [
        "code"
      ],
      "credit": 1000000,
      "liability": true
    },
    {
      "id": "rumours",
      "day": 17,
      "title": "检索MIRAGE",
      "kind": "page",
      "requires": [
        "code"
      ],
      "page": "mirage"
    },
    {
      "id": "lead",
      "day": 24,
      "title": "熟悉的黑客",
      "kind": "scene",
      "requires": [
        "rumours"
      ],
      "gateDay": 24
    },
    {
      "id": "plan",
      "day": 29,
      "title": "鬼车计划与调查IP",
      "kind": "scene",
      "requires": [
        "base",
        "lead"
      ],
      "gateDay": 29
    },
    {
      "id": "identity",
      "day": 30,
      "title": "解析调查入口",
      "kind": "project",
      "requires": [
        "plan"
      ],
      "project": "identity"
    },
    {
      "id": "dossier",
      "day": 30,
      "title": "打开解密资料",
      "kind": "file",
      "requires": [
        "identity"
      ],
      "document": "dossier"
    },
    {
      "id": "uk",
      "day": 30,
      "title": "核对英国线索",
      "kind": "map",
      "requires": [
        "dossier"
      ],
      "location": "uk"
    },
    {
      "id": "harvard",
      "day": 30,
      "title": "学籍资料",
      "kind": "page",
      "requires": [
        "uk"
      ],
      "page": "harvard"
    },
    {
      "id": "ig",
      "day": 30,
      "title": "一张相同的脸",
      "kind": "page",
      "requires": [
        "harvard"
      ],
      "page": "ig"
    },
    {
      "id": "questions",
      "day": 30,
      "title": "向衔尾蛇发出五条质问",
      "kind": "questions",
      "requires": [
        "ig"
      ]
    },
    {
      "id": "photo-decrypt",
      "day": 30,
      "title": "最后一个文件夹",
      "kind": "project",
      "requires": [
        "questions"
      ],
      "project": "photo"
    },
    {
      "id": "photo",
      "day": 30,
      "title": "孤儿院档案照片",
      "kind": "file",
      "requires": [
        "photo-decrypt"
      ],
      "document": "triplets"
    },
    {
      "id": "invite",
      "day": 30,
      "title": "NoApp内测邀请",
      "kind": "mail",
      "requires": [
        "photo"
      ],
      "mail": "invite-mail"
    },
    {
      "id": "recognition",
      "day": 30,
      "title": "欢迎回家，哥哥",
      "kind": "scene",
      "requires": [
        "invite"
      ],
      "gateDay": 38
    },
    {
      "id": "prep",
      "day": 30,
      "title": "鬼车行动准备",
      "kind": "project",
      "requires": [
        "plan"
      ],
      "project": "prep",
      "gateDay": 40
    },
    {
      "id": "show",
      "day": 41,
      "title": "第一次秀场",
      "kind": "scene",
      "requires": [
        "prep",
        "recognition"
      ],
      "gateDay": 41
    },
    {
      "id": "target",
      "day": 42,
      "title": "新的十五亿美元目标",
      "kind": "scene",
      "requires": [
        "show"
      ],
      "gateDay": 42
    },
    {
      "id": "paris",
      "day": 43,
      "title": "巴黎与孤儿院",
      "kind": "scene",
      "requires": [
        "target"
      ],
      "gateDay": 43
    },
    {
      "id": "second",
      "day": 43,
      "title": "部署第二套程序",
      "kind": "project",
      "requires": [
        "paris"
      ],
      "project": "second",
      "gateDay": 52
    },
    {
      "id": "mercenary",
      "day": 44,
      "title": "雇佣兵定金",
      "kind": "payment",
      "requires": [
        "paris"
      ],
      "cost": 10000000,
      "gateDay": 52
    },
    {
      "id": "confide",
      "day": 50,
      "title": "告诉熙旺",
      "kind": "scene",
      "requires": [
        "paris"
      ],
      "gateDay": 52
    },
    {
      "id": "failure",
      "day": 53,
      "title": "刺杀失败与新的报价",
      "kind": "scene",
      "requires": [
        "confide",
        "second",
        "mercenary"
      ],
      "gateDay": 53
    },
    {
      "id": "ready",
      "day": 54,
      "title": "最后的准备",
      "kind": "scene",
      "requires": [
        "failure"
      ],
      "gateDay": 54
    },
    {
      "id": "ending",
      "day": 55,
      "title": "最后的同步",
      "kind": "scene",
      "requires": [
        "ready"
      ]
    }
  ],
  "projects": [
    {
      "id": "wallet",
      "title": "WALLET CHALLENGE",
      "node": "wallet",
      "day": 6,
      "batches": 1,
      "gains": [
        100
      ],
      "steps": [
        "extract"
      ],
      "key": "MIRAGE-D06",
      "minimumHardware": 1
    },
    {
      "id": "base",
      "title": "LOCAL FRAMEWORK",
      "node": "base",
      "day": 14,
      "batches": 11,
      "gains": [
        9,
        9,
        9,
        9,
        9,
        9,
        9,
        9,
        9,
        9,
        10
      ],
      "steps": [
        "cipher",
        "route",
        "extract",
        "veil",
        "verify"
      ],
      "key": "OUROBOROS-14",
      "minimumHardware": 2,
      "gate": "code"
    },
    {
      "id": "identity",
      "title": "REMOTE ARCHIVE",
      "node": "identity",
      "day": 30,
      "batches": 1,
      "gains": [
        100
      ],
      "steps": [
        "cipher",
        "route",
        "extract",
        "veil",
        "verify"
      ],
      "key": "203.0.113.29",
      "minimumHardware": 2,
      "gate": "plan"
    },
    {
      "id": "photo",
      "title": "FINAL ARCHIVE",
      "node": "photo-decrypt",
      "day": 30,
      "batches": 1,
      "gains": [
        100
      ],
      "steps": [
        "cipher"
      ],
      "key": "ARCHIVE-03",
      "minimumHardware": 2,
      "gate": "questions"
    },
    {
      "id": "prep",
      "title": "GHOST CAR",
      "node": "prep",
      "day": 30,
      "batches": 5,
      "gains": [
        20,
        20,
        20,
        20,
        20
      ],
      "steps": [
        "cipher",
        "route",
        "extract",
        "veil",
        "verify"
      ],
      "key": "GHOST-CAR-29",
      "minimumHardware": 2,
      "gate": "plan",
      "streams": [
        "CCTV",
        "COMMUNICATION",
        "EXIT ROUTE",
        "LOCAL SERVER"
      ]
    },
    {
      "id": "second",
      "title": "ORPHANAGE FRAMEWORK",
      "node": "second",
      "day": 43,
      "batches": 5,
      "gains": [
        20,
        20,
        20,
        20,
        20
      ],
      "steps": [
        "cipher",
        "route",
        "extract",
        "veil",
        "verify"
      ],
      "key": "PARIS-43",
      "minimumHardware": 3,
      "gate": "paris"
    }
  ],
  "scenes": {
    "intro": [
      [
        "wang",
        "起床了没有？我出车经过你那边，要不要给你带点吃的。"
      ],
      [
        "me",
        "给我带一份吧，我先看看今天有没有能接的单。"
      ]
    ],
    "return": [
      [
        "wang",
        "起床了没有？干爹回来了，今天回据点一趟。"
      ],
      [
        "me",
        "真的？我马上过去。"
      ],
      [
        "father",
        "好好干。"
      ]
    ],
    "move": [
      [
        "wang",
        "先把自己的东西搬回来。胡枫晚上到，我去机场接他。"
      ],
      [
        "xin",
        "谁把这屋子的插座全占了，我手机快没电了。"
      ],
      [
        "me",
        "先别动那排，那是我的服务器。"
      ]
    ],
    "intrusion": [
      [
        "system",
        "屏幕失去响应，重启没有恢复。"
      ],
      [
        "ouroboros",
        "你已经拿走过一次奖池，还敢沿着原来的入口回来；看来你比我原先估计的更愿意冒险。"
      ],
      [
        "me",
        "你算计我有什么目的？"
      ],
      [
        "ouroboros",
        "从来没有人敢拒绝我，你是第一个，陈熙蒙。"
      ],
      [
        "me",
        "你怎么知道我的名字？"
      ],
      [
        "ouroboros",
        "你的日程里写着汪杰和他的电子钱包，我想我们有必要把接下来的事情谈清楚。"
      ],
      [
        "call",
        "未知号码来电"
      ],
      [
        "ouroboros",
        "晚上好熙蒙。欢迎来到mirage。看起来你不喜欢打字，那么我只好给你打电话了。你应该也不想自己的计划被泄露出去吧。"
      ],
      [
        "me",
        "你要干什么？"
      ],
      [
        "ouroboros",
        "我想参与这件事情，而且我能提供你现在缺少的技术和资源；我想看看，你究竟有能力走多远。"
      ]
    ],
    "loan": [
      [
        "ouroboros",
        "你迟迟没有拿出能运行的版本，我想知道，究竟是设备拖住了你，还是你还不打算告诉我问题出在哪里。"
      ],
      [
        "me",
        "你的代码要跑起来，得花不少钱。"
      ],
      [
        "ouroboros",
        "自己搭的机房吗？第一眼我还以为是货车车厢呢。陈熙蒙，你怎么住在这种破地方？"
      ],
      [
        "me",
        "我们只是合作关系，你不能随随便便侵犯我的隐私。"
      ],
      [
        "ouroboros",
        "我们不是合作关系，我是你的老板。"
      ],
      [
        "ouroboros",
        "我会借给你一百万更新设备，我不希望自己挑中的人，最后被一间连程序都跑不动的机房拖垮。"
      ]
    ],
    "lead": [
      [
        "hacker",
        "听说是个很年轻的家伙，IP在葡萄牙和英国出现过，其他的我也不清楚。"
      ],
      [
        "me",
        "知道了。我自己查。"
      ]
    ],
    "plan": [
      [
        "father",
        "撤离计划叫鬼车行动，行动代号用国际象棋的术语。"
      ],
      [
        "ouroboros",
        "你到现在还没有查到我的消息，我几乎要怀疑你是不是忘记了这件事；既然如此，我可以给你一个提示。"
      ],
      [
        "system",
        "IP已存入备忘录：203.0.113.29"
      ],
      [
        "ouroboros",
        "我很期待你的侵入，希望这一次，你能给我一些值得等待的结果。"
      ]
    ],
    "recognition": [
      [
        "tai",
        "欢迎回家，熙蒙。或者说……欢迎回家，哥哥。"
      ],
      [
        "me",
        "我真不敢相信……熙泰……这是你的中文名吗？"
      ],
      [
        "tai",
        "我的养母一直让我记住这个名字，她说以后回中国找兄弟会容易一些；直到看到你和熙旺的名字，我才知道这个安排为什么有用。"
      ],
      [
        "me",
        "你从那个钱包开始，就已经知道我的身份了？"
      ],
      [
        "tai",
        "还要更早，从我发现那份孤儿院档案开始；你能自学到这个程度，确实值得我花一些时间，而现在，你终于知道我为什么一直没有离开。"
      ]
    ],
    "show": [
      [
        "wang",
        "密钥拿到了，大家都回来了。"
      ],
      [
        "zai",
        "以后想去巴黎。"
      ],
      [
        "tai",
        "我在英国和葡萄牙都有房子，平时空着，你和熙旺可以考虑过去；我想听听，你自己准备去哪。"
      ],
      [
        "me",
        "我其实一直都不太信任你。"
      ],
      [
        "tai",
        "你愿意亲自查到这里，已经比最初有趣得多；至于你还没有说完的那些意见，我们可以在下一盘棋里继续。"
      ]
    ],
    "target": [
      [
        "system",
        "金辉资金中心：发现段志鸿的十五亿美元账户密钥，行动受阻。"
      ],
      [
        "wang",
        "你先回来，别一个人憋着。"
      ],
      [
        "me",
        "陈熙泰，这次我真的需要你的帮忙。"
      ]
    ],
    "paris": [
      [
        "tai",
        "我刚下飞机，接下来有一场学术会议，现在人在巴黎；你昨天发来的消息，我已经看到了。"
      ],
      [
        "me",
        "澳门也有巴黎铁塔。"
      ],
      [
        "tai",
        "等这件事情结束，你有命活着回来，就带我去看看那座铁塔；我会帮你，不过你也得把自己的计划讲清楚。"
      ],
      [
        "system",
        "熙蒙搬往孤儿院，重新安排计划。"
      ]
    ],
    "confide": [
      [
        "me",
        "如果除不掉黄德忠，就把傅隆生杀掉。"
      ],
      [
        "wang",
        "我知道了。"
      ]
    ],
    "failure": [
      [
        "system",
        "熙旺刺杀黄德忠失败。"
      ],
      [
        "mercenary",
        "炸警察金库，要五千万。"
      ]
    ],
    "ready": [
      [
        "me",
        "明天按计划走，东西都带好。"
      ]
    ],
    "ending": [
      [
        "system",
        "孤儿院事件：围杀失败，熙旺死亡。"
      ],
      [
        "me",
        "赶紧集合，上车！"
      ],
      [
        "tai",
        "我从监控里看到了，傅隆生可能已经发现我了；你必须先想办法离开，不要再把时间浪费在那里。"
      ],
      [
        "me",
        "如果我有什么不测，密钥和账户你拿好，一定要把钱分给仔仔他们。"
      ],
      [
        "tai",
        "你要好好活着，亲口把密钥带给我，熙蒙，我在巴黎等你。"
      ],
      [
        "watch",
        "手表同步：最后一段语音"
      ],
      [
        "tai",
        "熙蒙！熙蒙！"
      ]
    ],
    "invitation": [
      [
        "ouroboros",
        "四十分钟就能完成这个挑战，你的能力确实值得我亲自联系；我希望你考虑加入我的团队，让自己的时间花在更有价值的事情上。"
      ],
      [
        "me",
        "我单干，没有加入团队的打算。"
      ],
      [
        "ouroboros",
        "我会记住你的回答，也希望以后还有合作的机会；我很想看看，你准备靠自己做到什么程度。"
      ]
    ],
    "exhibition": [
      [
        "system",
        "傅隆生注意到外国展览公司将在D42撤展离开澳门。行动、撤离、排班与演练必须在接下来的29天内完成。"
      ]
    ]
  },
  "mails": [
    {
      "id": "code-mail",
      "node": "code",
      "subject": "本地部署授权 / LOCAL FRAMEWORK",
      "body": "基础框架已交付。授权码：{{projectKey}}。打开附件，将项目加入GHOST；程序需要本地设备与逐批验证。",
      "project": "base"
    },
    {
      "id": "invite-mail",
      "node": "invite",
      "subject": "NoApp / PRIVATE BETA",
      "body": "内测邀请仅供你本人使用。完成安装后，打开陈熙泰的私人联络。"
    }
  ],
  "economics": {
    "hardwarePrices": [
      0,
      60000,
      180000
    ],
    "openingBalance": 1280,
    "dailyExpense": 2000
  },
  "documents": [
    {
      "id": "dossier",
      "title": "archive-UK.txt",
      "body": "已关联公开资料：英国现居记录。将记录中的地点与地图核对，继续查找学籍资料。",
      "node": "dossier"
    },
    {
      "id": "triplets",
      "title": "orphanage-archive.enc",
      "body": "澳门孤儿院档案已解密。三名婴儿登记名：陈熙旺、陈熙蒙、陈熙泰。",
      "node": "photo",
      "asset": "/assets/story55/triplets-baby-photo.jpg"
    }
  ],
  "pages": [
    {
      "id": "mirage",
      "title": "MIRAGE / 失效的入口",
      "body": "大部分旧入口已无法访问。一份论坛缓存提到MIRAGE是匿名交易网络，创办者的身份没有公开。",
      "node": "rumours"
    },
    {
      "id": "harvard",
      "title": "研究人员资料",
      "body": "Chen Xitai — Computer Science doctoral study, Harvard. 档案中同时留有英国联系记录。",
      "node": "harvard"
    },
    {
      "id": "ig",
      "title": "Chen Xitai / private journal",
      "body": "英国与葡萄牙，研究、训练、旅行和展览。照片里的人，和熙蒙有着相同的面孔。",
      "node": "ig"
    }
  ],
  "locations": [
    {
      "id": "base",
      "name": "Training House",
      "area": "MACAU",
      "x": 34,
      "y": 29,
      "node": "move",
      "description": "花王堂区，废弃大屋改造的共同据点。"
    },
    {
      "id": "orphanage",
      "name": "Old Orphanage",
      "area": "MACAU",
      "x": 53,
      "y": 43,
      "node": "paris",
      "description": "旧孤儿院，独立设备与第二计划。"
    },
    {
      "id": "bank",
      "name": "Funds Centre",
      "area": "MACAU",
      "x": 74,
      "y": 61,
      "node": "show",
      "description": "澳兴大厦金辉资金中心。"
    },
    {
      "id": "uk",
      "name": "United Kingdom",
      "area": "WORLD",
      "x": 43,
      "y": 31,
      "node": "uk",
      "description": "文件中提取的英国现居线索；读取地点后可关联学籍资料。"
    },
    {
      "id": "paris",
      "name": "Paris",
      "area": "WORLD",
      "x": 48,
      "y": 40,
      "node": "paris",
      "description": "学术会议与约定见面的城市。"
    }
  ]
};
export const STORY55_DAYS=[
  {
    "day": 1,
    "title": "无聊的早晨"
  },
  {
    "day": 2,
    "title": "接单与结算"
  },
  {
    "day": 3,
    "title": "第一件设备"
  },
  {
    "day": 4,
    "title": "有用的漏洞"
  },
  {
    "day": 5,
    "title": "比赛之前"
  },
  {
    "day": 6,
    "title": "电子钱包挑战"
  },
  {
    "day": 7,
    "title": "拒绝之后"
  },
  {
    "day": 8,
    "title": "把程序跑起来"
  },
  {
    "day": 9,
    "title": "平静的日子"
  },
  {
    "day": 10,
    "title": "新手阶段收束"
  },
  {
    "day": 11,
    "title": "干爹回来了"
  },
  {
    "day": 12,
    "title": "搬回据点"
  },
  {
    "day": 13,
    "title": "绿屏与未知来电"
  },
  {
    "day": 14,
    "title": "基础代码与两百万"
  },
  {
    "day": 15,
    "title": "机房与一百万"
  },
  {
    "day": 16,
    "title": "把货车变成机房"
  },
  {
    "day": 17,
    "title": "网上的MIRAGE"
  },
  {
    "day": 18,
    "title": "机房里的晚饭"
  },
  {
    "day": 19,
    "title": "设备账与人情账"
  },
  {
    "day": 20,
    "title": "训练结束之后"
  },
  {
    "day": 21,
    "title": "把心愿记下来"
  },
  {
    "day": 22,
    "title": "机房的照片"
  },
  {
    "day": 23,
    "title": "最后的调试"
  },
  {
    "day": 24,
    "title": "略有耳闻"
  },
  {
    "day": 25,
    "title": "程序终于能用了"
  },
  {
    "day": 26,
    "title": "胡枫的消息"
  },
  {
    "day": 27,
    "title": "衣服与街上的摄像头"
  },
  {
    "day": 28,
    "title": "演练的差几秒"
  },
  {
    "day": 29,
    "title": "鬼车计划与棋局"
  },
  {
    "day": 30,
    "title": "四条行动准备"
  },
  {
    "day": 31,
    "title": "从文件找到网页"
  },
  {
    "day": 32,
    "title": "住在英国的人"
  },
  {
    "day": 33,
    "title": "一张和自己相同的脸"
  },
  {
    "day": 34,
    "title": "最后一个文件夹"
  },
  {
    "day": 35,
    "title": "准备完成之后"
  },
  {
    "day": 36,
    "title": "继续调查或开始熟悉"
  },
  {
    "day": 37,
    "title": "把该问的问题问完"
  },
  {
    "day": 38,
    "title": "调查窗口收束"
  },
  {
    "day": 39,
    "title": "最后检查"
  },
  {
    "day": 40,
    "title": "计划里的人"
  },
  {
    "day": 41,
    "title": "第一次秀场"
  },
  {
    "day": 42,
    "title": "目标改变"
  },
  {
    "day": 43,
    "title": "巴黎与孤儿院"
  },
  {
    "day": 44,
    "title": "雇佣兵的价码"
  },
  {
    "day": 45,
    "title": "孤儿院的机器"
  },
  {
    "day": 46,
    "title": "资源与风险"
  },
  {
    "day": 47,
    "title": "第二套程序完成"
  },
  {
    "day": 48,
    "title": "筹齐定金"
  },
  {
    "day": 49,
    "title": "计划进入准备"
  },
  {
    "day": 50,
    "title": "告诉熙旺"
  },
  {
    "day": 51,
    "title": "行动前的空隙"
  },
  {
    "day": 52,
    "title": "该交出去的文件"
  },
  {
    "day": 53,
    "title": "刺杀失败与五千万"
  },
  {
    "day": 54,
    "title": "最后一天的准备"
  },
  {
    "day": 55,
    "title": "十一个密钥与熄屏"
  }
];
