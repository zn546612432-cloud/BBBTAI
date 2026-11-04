export const tools=[
 {id:'verify',name:'部署',en:'DEPLOY',detail:'导入授权凭证，安装并初始化工具',glyph:'✓'},
 {id:'cipher',name:'破译',en:'CIPHER',detail:'解析加密结构，恢复可读取的数据',glyph:'◇'},
 {id:'route',name:'链接',en:'ROUTE',detail:'建立节点连接，验证数据传输通路',glyph:'⌁'},
 {id:'extract',name:'窃取',en:'EXTRACT',detail:'定位目标文件，提取并校验数据',glyph:'⊡'},
 {id:'veil',name:'隐匿',en:'VEIL',detail:'分析监测路径，验证隐匿方案',glyph:'≋'},
 {id:'strike',name:'攻击',en:'STRIKE',detail:'执行定向测试，记录目标响应',glyph:'↯'}
];
export const defaultConfig={seconds:null,retries:3,rounds:3,codeLength:4,attackMs:5200,reward:null};
export const stages=['初始化中','连接已建立','正在传输数据','正在验证结果','操作完成'];
export const moduleLabel=token=>({CORE:'核心',LINK:'链接',DATA:'数据',CHECK:'校验',AUTH:'授权',CACHE:'缓存',IO:'读写',MAP:'映射',INDEX:'索引',WATCH:'监测',SYNC:'同步',FRAME:'框架',TRACE:'追踪',ROUTE:'路由',LOCAL:'本地',KEY:'密钥'})[token]||token;
