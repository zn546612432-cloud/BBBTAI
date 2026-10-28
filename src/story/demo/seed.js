// UI fixtures only. Reviewed story dialogue lives in separately imported story content.
export const demoContent={
  smsSeedVersion:2,
  wechatRosterVersion:1,
  conversations:{
    wechat:[
      {id:'wang',name:'熙旺',avatar:'旺',messages:[]},
      {id:'group',name:'GROUP',avatar:'六',messages:[]},
      {id:'hufeng',name:'胡枫',avatar:'胡',messages:[]},
      {id:'awei',name:'阿威',avatar:'威',messages:[]},
      {id:'xiaoxin',name:'小辛',avatar:'辛',messages:[]},
      {id:'zaizai',name:'仔仔',avatar:'仔',messages:[]},
      {id:'fulongsheng',name:'傅隆生',avatar:'傅',messages:[]}
    ],
    noapp:[{id:'tai',name:'Dr Ouroboros',avatar:'D',messages:[{id:'n1',from:'tai',text:'下一局？',time:'21:17',demo:true},{id:'n2',from:'tai',kind:'app_invitation',targetApp:'chess',invitationId:'demo-inv-001',time:'21:18',demo:true}]}],
    mirage:[],
    messages:[]
  },
  notes:[{id:'note-1',title:'留到下次',text:'那盤棋，改天接著下。',demo:true}],
  orders:[{id:'order-1',title:'離線資料整理',owner:'Rookery 13',reward:'MOP 240',status:'开放',demo:true}],
  photos:[],
  reminders:[{id:'reminder-demo-1',title:'给手机充电',done:false,demo:true},{id:'reminder-demo-2',title:'整理照片',done:false,demo:true},{id:'reminder-demo-3',title:'继续上次的棋局',done:false,demo:true}],
  mail:[{id:'mail-1',from:'KIRA',subject:'档案索引',body:'演示邮件：附件可以在文件 App 中打开。',demo:true}],
};
export const demoInvitation={id:'demo-inv-001',senderId:'tai',recipientId:'player',source:'demo-fixture',status:'pending',createdDay:56,expiresDay:58,matchId:null};
