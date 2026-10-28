/** Test-only authored conversations; production starts without old demo bubbles. */
export function addTestWeChat(state){
 const wang=state.content.conversations.wechat.find(c=>c.id==='wang');
 wang.messages.push(
  {id:'w1',from:'wang',kind:'text',text:'阿蒙，返嚟記得食宵夜。',time:'21:03',authored:true},
  {id:'w2',from:'me',kind:'text',text:'知道啦，哥。',time:'21:06',authored:true}
 );
 const group=state.content.conversations.wechat.find(c=>c.id==='group');
 group.messages.push(
  {id:'g1',from:'胡枫',kind:'text',text:'聽日有人想去食燒烤嗎？',time:'20:58',authored:true},
  {id:'g2',from:'小辛',kind:'text',text:'@胡枫 你又臨時先講。',time:'21:01',authored:true}
 );
 return state;
}

export function addTestSMS(state){
 const rows=[
  ['sms-delivery','+853 6601 1000','【配送提醒】您有一件包裹待领取，请留意站点通知。'],
  ['sms-offer','+853 2833 7766','【优惠提醒】本周积分活动即将结束。'],
  ['sms-promo','+853 8889 5566','【活动通知】您订阅的促销消息已更新。']
 ];
 state.content.conversations.messages.push(...rows.map(([id,name,text],i)=>({
  id,name,unread:0,messages:[{id:'sms-test-'+i,from:id,kind:'text',text,time:'10:08',authored:true}]
 })));
 return state;
}
