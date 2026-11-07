// D07 · 2025-05-25. 全新独立生活对白，不改变共享心愿、支付、送货与照片机制。
import {d06WishImage} from '../../services/assets/wish-media.js';
const group=(id,from,text,opts={})=>({id,channel:'wechat',chat:'group',from,text,...opts});
const dm=(id,chat,from,text,opts={})=>({id,channel:'wechat',chat,from,text,...opts});
export const nextDay=[
 group('d07-chat-01','胡枫','首尔今天终于出太阳了'),
 group('d07-chat-02','小辛','你还在韩国啊'),
 group('d07-chat-03','胡枫','不然呢，昨天坐飞机回来逗你玩？'),
 group('d07-chat-04','小辛','我昨晚打到三点，现在脑子都没醒'),
 group('d07-chat-05','阿威','我下午去跑步'),
 group('d07-chat-06','仔仔','我今天得把两件衣服的尺寸改完'),
 group('d07-chat-07','熙旺','我下午要出车，晚点再看消息')
];
export const afternoonDay=[
 group('d07-errand-01','熙旺','车刚洗完，又下雨了',{afterId:'d07-chat-07'}),
 group('d07-errand-02','小辛','哈哈哈哈哈天选打工人',{afterId:'d07-errand-01'}),
 group('d07-errand-03','胡枫','我这边也刚下雨，明天还有课',{afterId:'d07-errand-02'}),
 group('d07-errand-04','仔仔','裁好的布先收起来了，怕淋湿',{afterId:'d07-errand-03'})
];
export const extraDay=[
 dm('d07-awei-01','awei','阿威','我现在用的耳机总有一边断声，跑步听着难受。想换副无线的。',{wishId:'d07-headphones',wishText:'无线耳机'}),
 dm('d07-wang-01','wang','熙旺','出租屋里那套碗缺了两个，改天我再去买一套吧。',{wishId:'d07-tableware',wishText:'新餐具'})
];
export const dinnerAfter=group('d07-dinner-after','小辛','昨天那顿真吃撑了，我现在还没饿');
export const rewardSets={
 'd07-headphones':[
  dm('wish-headphones-thanks-1','awei','阿威','阿蒙，耳机到了。你买的？'),
  dm('wish-headphones-photo','awei','阿威',d06WishImage('headphones-received.jpg'),{kind:'image'}),
  dm('wish-headphones-thanks-2','awei','阿威','我试了，声音挺稳的。谢谢。')
 ],
 'd07-tableware':[
  dm('wish-tableware-thanks-1','wang','熙旺','阿蒙，刚收到个包裹，一套餐具。'),
  dm('wish-tableware-photo','wang','熙旺',d06WishImage('tableware-received.jpg'),{kind:'image'}),
  dm('wish-tableware-thanks-2','wang','熙旺','原来是你买的。你留着钱给自己添点东西，哥这里够用。')
 ]
};
