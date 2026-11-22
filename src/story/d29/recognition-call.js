// The invitation unlocks this authored scene on the actual installation day.
export const RECOGNITION_STEPS=[
 ['tai','歡迎回家，nya，或者我該叫你熙蒙。'],
 ['me','我真不敢相信……熙泰……這是你的中文名嗎？'],
 ['tai','我的養母一直讓我記住這個名字，她說以後回中國找兄弟會容易一些；直到看到你和熙旺的名字，我才知道這個安排為什麼有用。'],
 ['me','你從那個錢包開始，就已經知道我的身份了？'],
 ['tai','還要更早，從我發現那份孤兒院檔案開始；你能自學到這個程度，確實值得我花一些時間，而現在，你終於知道我為什麼一直沒有離開。']
];
export const RECOGNITION_CALL={id:'recognition-call',triggerKey:'recognitionCallTriggered',pauseTimeUntilComplete:true,autoPlayerLines:true,gapMs:3000,steps:RECOGNITION_STEPS};
