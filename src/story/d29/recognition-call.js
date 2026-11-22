// The invitation unlocks this authored scene on the actual installation day.
export const RECOGNITION_STEPS=[
 ['tai','歡迎回家，nya。……現在可以叫你熙蒙了吧？'],
 ['me','我真不敢相信……熙泰，這是你的中文名嗎？'],
 ['tai','嗯。我養母一直讓我記住自己的中文名字，說將來要是想找回親生兄弟，也能多一條線索。'],
 ['me','所以從那個錢包開始，你就已經知道我的身份了？'],
 ['tai','還要更早一些。我查過孤兒院的檔案。知道你也是個黑客的時候，我倒是挺意外的。你能靠自學做到這個程度，確實讓我對你很感興趣。'],
 ['me','那你為什麼不直接告訴我？'],
 ['tai','如果我一開始就告訴你，我是你失散多年的親兄弟，你會相信嗎？'],
 ['me','……我大概會以為你是個騙子。'],
 ['tai','你和我有很多的相似點，我們都不是會輕易信任別人的人，所以我才讓你自己去找答案。'],
 ['me','這個 app 是怎麼回事？'],
 ['tai','特別加密的軟件，以後有事就在這裡聯繫我。'],
 ['me','我該叫你什麼？Ouroboros、Azathoth？還是熙泰？你身邊的人都怎麼叫你的？'],
 ['tai','我的代號有很多，你喜歡叫什麼就叫什麼。不管哪一個都是我，這才是這些名字真正的分量。'],
 ['me','熙泰'],
 ['me','怎麼不說話？'],
 ['tai','……其實你是第一個這樣叫我的人。'],
 ['tai','聽起來也還不錯。'],
 ['me','既然你喜歡，以後我就這樣叫你。'],
 ['tai','……隨你喜歡。'],
 ['tai','我還有事，先掛了。'],
 ['me','再見，熙泰。'],
 ['tai','再見，熙蒙。']
];
export const RECOGNITION_CALL={id:'recognition-call',triggerKey:'recognitionCallTriggered',pauseTimeUntilComplete:true,autoPlayerLines:true,gapMs:3000,gapAfterMs:{13:5000},steps:RECOGNITION_STEPS};
