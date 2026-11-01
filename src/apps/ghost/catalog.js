export const tools=[
 {id:'verify',name:'验证',en:'VERIFY',detail:'按顺序选择模块',glyph:'✓'},
 {id:'cipher',name:'破译',en:'CIPHER',detail:'拼图：交换方块还原参考图',glyph:'◇'},
 {id:'route',name:'链接',en:'ROUTE',detail:'管线：旋转并连接起点终点',glyph:'⌁'},
 {id:'extract',name:'窃取',en:'EXTRACT',detail:'比对：找出正确数据块',glyph:'⊡'},
 {id:'veil',name:'隐匿',en:'VEIL',detail:'快速输入数字序列',glyph:'≋'},
 {id:'strike',name:'攻击',en:'STRIKE',detail:'等待攻击动画完成',glyph:'↯'}
];
export const defaultConfig={seconds:null,retries:3,rounds:3,codeLength:4,attackMs:5200,reward:null};
export const stages=['初始化中','连接已建立','正在传输数据','正在验证结果','操作完成'];
