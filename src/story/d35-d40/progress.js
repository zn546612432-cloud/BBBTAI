// Fictional, inert milestones only. Dates refer to the existing phone clock.
export const GHOST_CAR_MODEL_FILES=[
 {id:'story-archive-digital-human',name:'數字人模型.enc',messageId:'s55-d39-digital-human',label:'數字人模型'},
 {id:'story-archive-digital-vehicle',name:'數字車輛模型.enc',messageId:'s55-d39-digital-vehicle',label:'數字車輛模型'}
];
export const GHOST_CAR_TASKS=[
 {id:'research',title:'銀行系統資料',day:35},
 {id:'staff',title:'職員資料',day:35},
 {id:'retreat',title:'安全撤離圖',day:35},
 {id:'truck',title:'貨車改裝',day:36},
 {id:'equipment',title:'移動工作站',day:37},
 {id:'clothing',title:'行動服裝',day:38},
 {id:'rehearsal',title:'人員演練',day:38},
 ...GHOST_CAR_MODEL_FILES.map(f=>({id:f.id,title:f.label,day:39,file:f.id})),
 {id:'validation',title:'最終驗收',day:40}
];
