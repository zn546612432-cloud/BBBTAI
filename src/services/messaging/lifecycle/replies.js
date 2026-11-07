// Authored delayed replies. No AI invents an unsent response or past arrangement.
export const reply=(me,who,...npc)=>[{who:'me',text:me},...npc.map(text=>({who,text}))];
export const LATE_REPLIES={
 d02:{
  wang:{sameDay:reply('配件的事我再看看，錢你先給自己留著。','熙旺','好，有需要再跟我說。'),nextDay:reply('昨天配件的事忘了回，錢你自己留著吧。','熙旺','知道了，別自己硬撐。'),later:reply('配件我還在看，有需要再找你，哥。','熙旺','好。'),resolved:reply('配件已經下單了，哥，你給自己留點錢。','熙旺','好，到了跟我說。')},
  xin:{nextDay:reply('昨天沒顧上回。那台先別買，配置再看看。','小辛','行，我先不下單。'),later:reply('電腦的事還要我幫你看嗎？','小辛','要啊哥，我還沒決定。')}
 },
 d03:{
  xiaoxin:{nextDay:reply('昨天那台先別買，別光看燈。','小辛','知道啦，等你幫我看配置。'),later:reply('電腦買了沒有？沒買的話先把配置發我。','小辛','還沒，我找找。')},
  wang:{nextDay:reply('昨天衣服的事忘了回，我自己收拾一下，哥。','熙旺','好，洗了記得晾。'),later:reply('衣服我自己收拾，哥你別操心了。','熙旺','行，有事叫我。'),resolved:reply('衣服晾好了，謝謝哥。','熙旺','不客氣，別又堆一洗衣機。')}
 },
 d04:{
  'wang-dinner':{sameDay:reply('剛忙完，今天來不及了，改天一起？','熙旺','行，你也記得吃點東西。'),nextDay:reply('昨天忙忘了，下次一起吃？','熙旺','好，等你有空。'),later:reply('前幾天沒顧上回，飯還欠著呢。','熙旺','記著呢，下次一起。')},
  'wang-night':{nextDay:reply('昨天到家忘了說，讓你惦記了，哥。','熙旺','沒事，平安就好。'),later:reply('前幾天忘了回，到家了，哥。','熙旺','知道了，下次記得說一聲。')}
 },
 d05:{
  'wang-morning':{sameDay:reply('剛看到，你出車注意安全，哥。','熙旺','好，你記得吃點東西。'),nextDay:reply('昨天早上忘了回，謝謝哥。','熙旺','知道啦，今天也記得按時吃飯。'),later:reply('前幾天一直忙，謝謝哥哥照顧。','熙旺','少來這套，照顧好自己就行。')},
  'zaizai-paris':{nextDay:reply('昨天沒顧上回，巴黎的事你繼續準備。','仔仔','嗯，我慢慢攢錢。'),later:reply('你那個去巴黎的計劃，準備得怎麼樣了？','仔仔','還在看學校，也在學法語。')},
  'wang-evening':{nextDay:reply('昨晚沒顧上回，哥你也別出車太晚。','熙旺','好，今天我早點收。'),later:reply('前幾天沒顧上回，哥，你這兩天忙不忙？','熙旺','還行，你有事找我？')}
 }
};
