import {createConversationTrack} from '../../services/messaging/lifecycle/engine.js';

const lines=[
 ['熙旺','蒙蒙'],['me','在'],['熙旺','早上給你買的麵包吃了沒？'],
 ['me','吃了一半'],['熙旺','就吃了一半？'],['me','不好吃，太甜了'],
 ['熙旺','上次不是還說喜歡這家的嗎'],['me','我要吃肉鬆的！'],
 ['熙旺','行，下次給你買肉鬆的'],['熙旺','今天掛三號風球，別出門了'],
 ['me','那你還出車？'],['熙旺','下午就回來'],
 ['me','哥回來的時候給我帶杯奶茶'],['熙旺','少冰？'],['me','嗯嗯'],
 ['me','愛你哥哥'],['熙旺','哈哈，就知道哄我']
].map(([who,text])=>({who,text}));
export const d25Track=createConversationTrack({day:25,prefix:'d25',
 scenes:[{id:'wang-milk-tea',chat:'wang',at:'11:38',lines}],
 progress:s=>(s.story55.authoredDays??={}).d25??={},lockChats:['wang']
});
