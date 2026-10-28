export const tools=[
 {id:'cipher',name:'破译',en:'CIPHER',detail:'MATRIX RECONSTRUCTION',glyph:'◇'},
 {id:'route',name:'链接',en:'ROUTE',detail:'SIGNAL ROUTING',glyph:'⌁'},
 {id:'extract',name:'窃取',en:'EXTRACT',detail:'DATA MATCHING',glyph:'⊡'},
 {id:'veil',name:'隐匿',en:'VEIL',detail:'TRACE OVERRIDE',glyph:'≋'},
 {id:'strike',name:'攻击',en:'STRIKE',detail:'EXECUTION',glyph:'↯'}
];
export const defaultConfig={seconds:null,retries:3,rounds:3,codeLength:4,attackMs:5200,reward:null};
export const stages=['INITIALIZING','LINK ESTABLISHED','STREAMING PAYLOAD','VERIFYING RESPONSE','OPERATION COMPLETE'];
