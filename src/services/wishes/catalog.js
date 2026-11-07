import {d06WishImage} from '../assets/wish-media.js';
// Reusable authored wish definitions. No purchase or message state lives here.
// Images are optional: a missing asset never blocks the purchase or a chat.
export const WISH_CATALOG=Object.freeze({
  "d06-dinner":{id:"d06-dinner",title:"今晚和大家吃饭",item:"聚餐",owner:"group",price:350,currency:"USD",kind:"event",expires:{day:6,clock:"18:30"},deliveryDays:0,photo:d06WishImage('celebration-dinner.jpg')},
  "d06-keyboard":{id:"d06-keyboard",title:"给小辛买机械键盘",item:"机械键盘",owner:"xin",price:899,currency:"USD",kind:"physical",deliveryDays:2,product:d06WishImage('keyboard-product.jpg'),photo:d06WishImage('keyboard-received.jpg')},
  "d06-shoes":{id:"d06-shoes",title:"给胡枫买新球鞋",item:"新球鞋",owner:"hufeng",price:180,currency:"USD",kind:"physical",deliveryDays:3,product:d06WishImage('shoes-product.jpg'),photo:d06WishImage('shoes-received.jpg')},
  "d07-headphones":{id:"d07-headphones",title:"给阿威买无线耳机",item:"无线耳机",owner:"awei",price:220,currency:"USD",kind:"physical",deliveryDays:2,product:d06WishImage('headphones-product.jpg'),photo:d06WishImage('headphones-received.jpg')},
  "d07-tableware":{id:"d07-tableware",title:"给家里添一套餐具",item:"新餐具",owner:"wang",price:120,currency:"USD",kind:"physical",deliveryDays:1,product:d06WishImage('tableware-product.jpg'),photo:d06WishImage('tableware-received.jpg')}
});
export const wishDefinition=id=>Object.hasOwn(WISH_CATALOG,String(id))?WISH_CATALOG[id]:null;
export const wishIdForMessage=m=>m?.wishId&&wishDefinition(m.wishId)?m.wishId:null;
