import {d06WishImage} from '../../services/assets/wish-media.js';
// D06 authored conversations and the optional D07 consequences.
// Content lives outside the generic wish service; future days add catalogs, not code.
const group=(id,from,text,opts={})=>({id,channel:'wechat',chat:'group',from,text,...opts});
const dm=(id,chat,from,text,opts={})=>({id,channel:'wechat',chat,from,text,...opts});
export const celebration=[
 group('d06-celebrate-01','小辛','？？？？'),
 group('d06-celebrate-02','小辛','十个？！我去搜一下值多少钱'),
 group('d06-celebrate-03','胡枫','你先说清楚是发财了还是发癫了哈哈哈哈'),
 group('d06-celebrate-04','仔仔','真的假的，阿蒙？'),
 group('d06-celebrate-05','阿威','已经到账了？'),
 group('d06-celebrate-06','熙旺','阿蒙，先把资产保管好。别一下全换了。'),
 group('d06-celebrate-07','小辛','蒙哥我是不是可以申请一把机械键盘哈哈哈哈！我那个空格键都快坏了', {wishId:'d06-keyboard',wishText:'机械键盘'}),
 group('d06-celebrate-08','胡枫','小辛，你上一把不还说能用十年'),
 group('d06-celebrate-09','小辛','现在不能了！！'),
 group('d06-celebrate-10','仔仔','那晚上一起出去吃饭？大家好久没一起出去吃了', {wishId:'d06-dinner',wishText:'一起出去吃饭'}),
 group('d06-celebrate-11','熙旺','我今天收车后再看，不用为了庆祝乱花钱。')
];
export const privateScenes=[
 dm('d06-shoes-01','hufeng','胡枫','说起来，我那双鞋底都快磨平了，准备过两天去看看新球鞋。',{wishId:'d06-shoes',wishText:'新球鞋'}),
 dm('d06-shoes-02','hufeng','胡枫','不用你给我买啊，刚才大家起哄闹着玩呢。')
];
export const rewardSets={
 'd06-keyboard':[
  dm('wish-keyboard-thanks-1','xiaoxin','小辛','蒙哥！！！！键盘到啦哈哈哈哈'),
  dm('wish-keyboard-photo','xiaoxin','小辛',d06WishImage('keyboard-received.jpg'),{kind:'image'}),
  dm('wish-keyboard-thanks-2','xiaoxin','小辛','你下次打游戏可不许再说我设备差了！')
 ],
 'd06-shoes':[
  dm('wish-shoes-thanks-1','hufeng','胡枫','阿蒙，你真给我买了？我刚才还以为快递送错了。'),
  dm('wish-shoes-photo','hufeng','胡枫',d06WishImage('shoes-received.jpg'),{kind:'image'}),
  dm('wish-shoes-thanks-2','hufeng','胡枫','这鞋穿着还挺舒服。谢了啊，改天请你喝东西。')
 ],
 'd06-dinner':[
  group('wish-dinner-thanks-01','小辛','蒙哥万岁！！今晚我可不客气了'),
  group('wish-dinner-thanks-02','胡枫','哈哈哈哈，谢了阿蒙。'),
  group('wish-dinner-thanks-03','阿威','谢了，晚上见。'),
  group('wish-dinner-thanks-04','熙旺','好，那今晚大家一起吃顿饭。仔仔，你看看哪家还有位置。'),
  group('wish-dinner-booking-ask','仔仔','行，我来订。你们有什么想吃的？'),
  group('wish-dinner-booking-reply','小辛','烧鹅！我想吃烧鹅！！'),
  group('wish-dinner-booking-01','仔仔','订好了，晚上七点半。位置我一会儿发群里，大家别迟到。'),
  group('wish-dinner-02','小辛','我宣布今天不减肥了！！'),
  group('wish-dinner-03','胡枫','你什么时候减过哈哈哈哈'),
  group('wish-dinner-photo','仔仔',d06WishImage('celebration-dinner.jpg'),{kind:'image'})
 ]
};
