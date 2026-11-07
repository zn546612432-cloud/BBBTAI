// D06 · 2025-05-24. 全面重写人物对白；心愿 ID、银行扣款与收货条件保留。
import {d06WishImage} from '../../services/assets/wish-media.js';
const group=(id,from,text,opts={})=>({id,channel:'wechat',chat:'group',from,text,...opts});
const dm=(id,chat,from,text,opts={})=>({id,channel:'wechat',chat,from,text,...opts});
export const celebration=[
 group('d06-celebrate-01','小辛','等一下，十个比特币？？'),
 group('d06-celebrate-02','小辛','我算一下。我是不是眼花了'),
 group('d06-celebrate-03','胡枫','我在首尔差点把水喷到屏幕上，你真拿到了？'),
 group('d06-celebrate-04','仔仔','阿蒙，这也太厉害了吧'),
 group('d06-celebrate-05','阿威','已经到账了？'),
 group('d06-celebrate-06','熙旺','阿蒙，先收好。钱多也别急着乱花。'),
 group('d06-celebrate-07','小辛','那个……我键盘最近坏得挺彻底的。机械键盘那种，你懂的',{wishId:'d06-keyboard',wishText:'机械键盘'}),
 group('d06-celebrate-08','胡枫','你这申请速度比网速都快'),
 group('d06-celebrate-09','小辛','机会难得嘛！！'),
 group('d06-celebrate-10','仔仔','晚上有空的话，在澳门的几个一起吃顿饭？好久没聚了',{wishId:'d06-dinner',wishText:'一起吃顿饭'}),
 group('d06-celebrate-11','熙旺','我今晚尽量早收车。胡枫在韩国，先别催他飞回来😂')
];
export const privateScenes=[
 dm('d06-shoes-01','hufeng','胡枫','我刚从学校走回来，鞋后跟都快磨穿了。准备在这边找双新球鞋。',{wishId:'d06-shoes',wishText:'新球鞋'}),
 dm('d06-shoes-02','hufeng','胡枫','不过你别真给我买啊。我还没穷到连鞋都换不起。')
];
export const rewardSets={
 'd06-keyboard':[
  dm('wish-keyboard-thanks-1','xiaoxin','小辛','哥！键盘到了！这手感比原来那个强太多了'),
  dm('wish-keyboard-photo','xiaoxin','小辛',d06WishImage('keyboard-received.jpg'),{kind:'image'}),
  dm('wish-keyboard-thanks-2','xiaoxin','我先试试，今晚应该不会再漏按空格了')
 ],
 'd06-shoes':[
  dm('wish-shoes-thanks-1','hufeng','胡枫','阿蒙，你还真给我买了？快递直接送到我在首尔这边。'),
  dm('wish-shoes-photo','hufeng','胡枫',d06WishImage('shoes-received.jpg'),{kind:'image'}),
  dm('wish-shoes-thanks-2','hufeng','胡枫','挺合脚的。等我回澳门请你喝东西，谢了。')
 ],
 'd06-dinner':[
  group('wish-dinner-thanks-01','小辛','那我先说好，我可要点喜欢吃的'),
  group('wish-dinner-thanks-02','胡枫','我人在韩国，先替你们吃一口空气。'),
  group('wish-dinner-thanks-03','阿威','我晚上训练完就过去。谢了阿蒙。'),
  group('wish-dinner-thanks-04','熙旺','阿蒙难得请客。仔仔，你有空帮忙看看哪家还有位置？'),
  group('wish-dinner-booking-ask','仔仔','我看看。你们想吃什么？'),
  group('wish-dinner-booking-reply','小辛','烧鹅也行，海鲜也行！'),
  group('wish-dinner-booking-01','仔仔','订好了，七点半。我把地址发群里，别走错。'),
  group('wish-dinner-02','小辛','我已经开始饿了'),
  group('wish-dinner-03','胡枫','回头给我拍张照片，看你们吃什么'),
  group('wish-dinner-photo','仔仔',d06WishImage('celebration-dinner.jpg'),{kind:'image'})
 ]
};
