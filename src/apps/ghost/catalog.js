export const tools=[
 {id:'verify',name:'部署',en:'DEPLOY',detail:'按顺序选择模块',glyph:'✓'},
 {id:'cipher',name:'破译',en:'CIPHER',detail:'拼图：交换方块，还原电路图',glyph:'◇'},
 {id:'route',name:'链接',en:'ROUTE',detail:'管线：旋转并连接起点终点',glyph:'⌁'},
 {id:'extract',name:'窃取',en:'EXTRACT',detail:'翻牌配对，找回五组数据',glyph:'⊡'},
 {id:'veil',name:'隐匿',en:'VEIL',detail:'迷宫潜行，避开巡逻扫描器',glyph:'≋'},
 {id:'strike',name:'攻击',en:'STRIKE',detail:'限时锁定目标，完成六次命中',glyph:'↯'}
];
export const defaultConfig={seconds:null,retries:3,rounds:3,codeLength:4,attackMs:5200,reward:null};
export const stages=['初始化中','连接已建立','正在传输数据','正在验证结果','操作完成'];
export const moduleLabel=token=>({CORE:'核心',LINK:'链接',DATA:'数据',CHECK:'校验',AUTH:'授权',CACHE:'缓存',IO:'读写',MAP:'映射',INDEX:'索引',WATCH:'监测',SYNC:'同步',FRAME:'框架',TRACE:'追踪',ROUTE:'路由',LOCAL:'本地',KEY:'密钥'})[token]||token;
