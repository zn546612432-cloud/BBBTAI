// D07 · 2025-05-25. Authored daily-life data only; all timers,
// messages, purchase effects and persistence stay in the shared services.
import {d06WishImage} from '../../services/assets/wish-media.js';
const group=(id,from,text,opts={})=>({id,channel:'wechat',chat:'group',from,text,...opts});
const dm=(id,chat,from,text,opts={})=>({id,channel:'wechat',chat,from,text,...opts});

export const nextDay=[
 group('d07-chat-01','胡枫','今天谁有空？'),
 group('d07-chat-02','小辛','干嘛'),
 group('d07-chat-03','胡枫','陪我打把遊戲啊，今天沒課，無聊死了'),
 group('d07-chat-04','小辛','昨天玩到三点了，饶了我吧'),
 group('d07-chat-05','熙旺','你们下午要是出去，顺路帮我买点东西回来'),
 group('d07-chat-06','仔仔','买什么？'),
 group('d07-chat-07','熙旺','我晚点发你清单。')
];
// D07 13:30: close the morning grocery request through ordinary group chat.
// It is background life, not a new shop order or a mandatory plot gate.
export const afternoonDay=[
 group('d07-errand-01','熙旺','买袋米、洗洁精，还有盐。家里快用完了。',{afterId:'d07-chat-07'}),
 group('d07-errand-02','仔仔','收到，我下午出去的時候順手帶。',{afterId:'d07-errand-01'}),
 group('d07-errand-03','胡枫','小辛你確定不去？',{afterId:'d07-errand-02'}),
 group('d07-errand-04','小辛','我負責精神支持，謝謝。',{afterId:'d07-errand-03'})
];
export const extraDay=[
 dm('d07-awei-01','awei','阿威','我那副耳机接触不良，昨天开会又断了。准备换副无线耳机。',{wishId:'d07-headphones',wishText:'无线耳机'}),
 dm('d07-wang-01','wang','熙旺','家里吃饭的碗有几只都磕了口，过两天我去添一套新餐具。',{wishId:'d07-tableware',wishText:'新餐具'})
];
export const dinnerAfter=group('d07-dinner-after','小辛',
 '昨天吃得太撑了，我今天真的不想看见肉了');

export const rewardSets={
 'd07-headphones':[
  dm('wish-headphones-thanks-1','awei','阿威','耳机收到了。'),
  dm('wish-headphones-photo','awei','阿威',d06WishImage('headphones-received.jpg'),{kind:'image'}),
  dm('wish-headphones-thanks-2','awei','阿威','试过了，声音没问题。谢谢。')
 ],
 'd07-tableware':[
  dm('wish-tableware-thanks-1','wang','熙旺','阿蒙，家里送来一套餐具。你买的？'),
  dm('wish-tableware-photo','wang','熙旺',d06WishImage('tableware-received.jpg'),{kind:'image'}),
  dm('wish-tableware-thanks-2','wang','熙旺','原来那些还能用，不过这套也挺好。晚上回来吃饭。')
 ],
};
