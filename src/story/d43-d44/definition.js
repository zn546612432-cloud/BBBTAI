// Author-approved fixed dialogue. Runtime delivery remains in Story55.
export const PARIS_PHOTO='/assets/story55/d43-eiffel.webp';
export const D43_PARIS_LINES=[
 ['tai','〔巴黎鐵塔照片〕'],
 ['me','澳門也有巴黎鐵塔'],
 ['tai','想不想來看真的巴黎鐵塔？'],
 ['me','我更想看金字塔'],
 ['tai','逃出來，全世界都會為你展開'],
 ['me','你要幫我？'],
 ['tai','作為 Azathoth 的管理員，我當然會庇護我的信徒。'],
 ['me','哦？所以對於你而言，我只是一個信徒？'],
 ['me','你對所有的信徒都這麼感興趣嗎？'],
 ['tai','你是世界上另一個我，另一種可能'],
 ['me','我是你哥。'],
 ['me','叫聲哥哥來聽聽。'],
 ['tai','我還以為你會更想扮演弟弟的角色。你被熙旺保護得太好，當不了一個合格的哥哥。'],
 ['tai','不過也沒關係。哥哥也好，弟弟也罷，乖乖待在我身後就好。'],
 ['tai','段志鴻的帳戶我會替你找，入侵程序的源代碼我也會給你。'],
 ['tai','所以別讓我失望，熙蒙。我們巴黎見。'],
];
export const D44_CONFIDE_LINES=[
 ['熙旺','臉還疼嗎？'],
 ['me','不疼了'],
 ['熙旺','前天的事，是哥不好。'],
 ['me','又不是你打的我'],
 ['熙旺','……'],
 ['me','哥，我想搬回孤兒院住幾天。'],
 ['熙旺','什麼時候搬？'],
 ['me','今天吧'],
 ['熙旺','好，等我回來幫你搬東西。'],
 ['me','你不問我為什麼？'],
 ['熙旺','你長大了，哥相信你知道自己在做什麼。'],
 ['me','嗯'],
 ['me','那哥你會無條件站在我這邊嗎？'],
 ['熙旺','當然會。你是我弟弟，你做什麼我都會兜著。'],
 ['me','即使我要殺死干爹呢？'],
 ['熙旺','蒙蒙，你冷靜一點，不要說氣話。'],
 ['me','他是狼，我們是狼崽子，我們從來都不是真正的家人，哥，這麼多年了，你還沒明白嗎？'],
 ['me','為什麼當年在越南，只有傅隆生一個人逃出來了？他出賣了笨蛋，他當然也可以出賣我們。'],
 ['me','15億美金，現在警察已經盯上他了，他根本不可能出境的，我們等不了那麼久。'],
 ['熙旺','你想怎麼做？'],
 ['me','我要你把他送到孤兒院，警察一定會跟著，到時候，就在孤兒院把他和警察一起處理掉。'],
 ['me','哥，你只需要送他，後面的事情我會處理。'],
 ['熙旺','警察還沒有動靜，我們不如先按兵不動，等你這邊拿電子錢包的計劃部署好後再動手，好嗎？'],
 ['me','你就是心軟了。'],
 ['me','哥，你總要做出選擇。這一次就聽我的吧。'],
];
export const D44_DIARY={title:'十天',afterNode:'confide',body:`不知道是不是天意，十天以後，永利的巴黎畫展將要撤展。我們正好可以藉此機會離開澳門。

今天跟哥攤牌了。

原本沒打算這麼早告訴他，但實在忍不住想知道，到了非選不可的時候，他究竟會選誰。

他還是心軟。

有時候真不知道該拿他怎麼辦。明明是六個人裡最早學會殺人的那個，偏偏又是最重感情的那個。

我知道他欠傅隆生一條命。但這麼多年，我們替他做過多少事，也早該還清了吧？

下午搬回了孤兒院。哥幫我搬了半天設備，臨走前還囑咐我記得吃飯，也沒再提中午的事。

突然想起小時候，我們也曾坐在這裡，商量長大以後要去哪兒。

那時候連澳門有多大都不知道。

昨天熙泰問我想不想去巴黎。

其實去哪裡都好。等拿到那筆錢，先給弟弟們各自置辦一套房子。至於哥，他要是願意跟我走，我就帶他去里斯本見熙泰。

不知道他們見面以後，會不會也像我和熙泰一樣，為了誰是哥哥這種無聊的事情吵起來。

還挺想看看的。

再給我十天吧。

這一次，換我來照顧哥。`};

export function applyD43D44Definition(c){
 if(c.d43D44Revision===1)return;
 const entries=[
  [{id:'paris',day:43,at:'10:20',title:'巴黎見',channel:'noapp',conversationId:'tai',requires:['target','d42-group','recognition'],gateDay:43,messagePrefix:'s55-d43-paris',initialDelayMs:0,pauseMs:3000,lineDelayMs:{9:10000},imageLines:{0:PARIS_PHOTO}},D43_PARIS_LINES],
  [{id:'confide',day:44,at:'13:15',title:'告訴熙旺',channel:'wechat',conversationId:'wang',requires:['paris'],gateDay:44,messagePrefix:'s55-d44-confide',initialDelayMs:0,pauseMs:1900},D44_CONFIDE_LINES],
 ];
 for(const [node,lines] of entries){
  const index=c.nodes.findIndex(n=>n.id===node.id);
  const next={...node,kind:'scene',delivery:'queued',pauseTimeUntilComplete:true};
  if(index<0)c.nodes.push(next);else c.nodes[index]=next;
  c.scenes[node.id]=structuredClone(lines);
 }
 // The earlier draft put this conversation on D50. Keep its stable
 // dependency ID for D53, but do not duplicate it or the relocation.
 c.d43D44Revision=1;
}
