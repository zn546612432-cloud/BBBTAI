// A deterministic *speech intention* for Xi Tai, not an AI-generated reply.
// The unified worldbook remains the only source of plot knowledge; the
// existing relationship director and mood remain the only authorities for
// affection and emotional continuity. This module creates no save or API call.
const norm=value=>String(value||'').normalize('NFKC').toLowerCase().trim();
const system=/^\s*\[(?:游戏系统事件|遊戲系統事件|电话系统事件|電話系統事件|系统记录|系統記錄)/;
const getLastUser=messages=>{
 const rows=Array.isArray(messages)?messages:[];
 const latest=[...rows].reverse().find(m=>m?.role==='user'&&typeof m.content==='string');
 const text=String(latest?.content||'').slice(0,400);
 return system.test(text)?'':norm(text);
};
const explicitStop=/^(?:不想聊|别说了|別說了|别再问|別再問|不用回|不用回复|不用回覆|安静点|安靜點|先别聊|先別聊|晚安|拜拜|先掛了|先挂了)[！!。.\s]*$/;
const dryFacts=/(?:是誰|是谁|誰是|谁是|是什麼|是什么|什麼是|什么是|介紹一下|介绍一下|解釋一下|解释一下|具體有哪些|具体有哪些|多少人|多少錢|多少钱)/;
const graveSubjects=/(?:傅隆生|干爹|乾爹|老頭子|老头子|熙旺|哥哥|大哥|永利|撤離|撤离|僱傭兵|雇佣兵|傭兵|佣兵|警察|黃德忠|黄德忠|孤兒院|孤儿院|逃不掉|逃不出去|活著|活着|死|失敗|失败|報復|报复|金庫|金库)/;
const fear=/(?:[害擔担]怕|擔心|担心|不安|睡不著|睡不着|逃不掉|活不下|萬一|万一|會不會.{0,12}(?:放過|放过|死|抓|發現|发现|失敗|失败)|(?:放過|放过)我嗎|(?:放過|放过)我吗|真的會.{0,8}(?:死|出事))/;
const guilt=/(?:後悔|后悔|是不是我(?:害|錯|错)|我是不是(?:害|錯|错)|我不該|我不该|對不起|对不起|我害了|我害死)/;
const suspicion=/(?:你是不是早就|你早就知道|你是不是瞞|你是不是瞒|你騙我|你骗我|你根本就知道|你故意|你把我當)/;
const seekJudgment=/(?:你覺得|你觉得|你說|你说|你認為|你认为|怎麼辦|怎么办|該不該|该不该|到底要|還有(?:救|辦法)|还有(?:救|办法)|我能怎樣|我能怎样)/;

const instructions={
 fear:'熙蒙表面在推測危險，可能更在問自己的恐懼是否有根據。正面回應他的疑慮；若有確切的既有談話，可抓住一件已知安排與他此刻的猶豫形成張力。不要宣稱讀心、替他定罪或給空泛的「別擔心」。',
 guilt:'熙蒙可能在自責或後悔。先分辨他究竟對什麼事負責，允許熙泰有不同意見，不用「你沒有錯」一筆帶過；不要推斷尚未發生的死傷或結局。',
 suspicion:'熙蒙正在試探或質疑你。保持熙泰的自尊和獨立立場，針對已證實的分歧答，不要立即用反問掩飾，不能為戲劇效果自認知道未聽過的秘密。',
 judgment:'熙蒙想聽你的判斷，不是百科定義。明確說出你的看法或你尚不確定的部分，選一個對這個人真正重要的代價或矛盾來講，不背行動清單。'
};

export function planTaiStoryResponse({messages=[],worldbookSnapshot=null,channel='noapp',recognized=false}={}){
 if(channel!=='noapp'||recognized!==true)return null;
 const text=getLastUser(messages);
 if(!text||explicitStop.test(text)||dryFacts.test(text))return null;
 // Don't turn an unrelated conversation into a melodramatic scripted scene.
 if(!graveSubjects.test(text))return null;
 const intent=guilt.test(text)?'guilt':
  suspicion.test(text)?'suspicion':
  fear.test(text)?'fear':
  seekJudgment.test(text)?'judgment':null;
 if(!intent)return null;
 // Grounding is inspected, not copied: only the read-only existing snapshot
 // decides whether concrete details are available to this character.
 const facts=(worldbookSnapshot?.entries||[]).filter(e=>String(e?.id||'').startsWith('story-lore:'));
 return {intent,hasLore:facts.length>0,sourceIds:facts.map(e=>e.id).slice(0,6)};
}

export function taiStoryResponsePrompt(direction){
 if(!direction)return '';
 return '【本輪劇情反應導演｜程序判定；不是劇情台詞，禁止念出】'+instructions[direction.intent]+
  (direction.hasLore?
   '可從本輪已生效世界書挑一件真正知道的事作為支點；已知安排、判斷、承諾和實際結果要分清。':
   '沒有可靠的已解鎖證據就不要講具體人數、計劃、通話或已完成結果；可以坦誠說出不確定性和自己的立場。')+
  '先回答熙蒙真正想問的，再選擇是否延伸到他話裡的矛盾。允許短句之後接一段真正講清楚的話，或只用一段完整口語。可以生氣、直言、心疼、意見相左，但必須有眼前的原因。'+
  '不要列條目、逐條復述資料、匯報 D 編號或時間軸；不要固定「一句反問＋分析＋心理質問」公式，也不要每輪都替他下心理診斷。沒有自然的問題就不追問，能收住就收住。'+
  '此輪以內容完整為先，1～3 個自然語意段落足夠；段落長短不固定，不為抽中的氣泡數凑字、強行連發或使用分號拆句。真正已形成的親密度、情緒與保密邊界仍服從現有系統。';
}

// A story moment suppresses RANDOM bubble quotas and forced questions.
// The cap remains the previously approved UI max; no mandatory continuation.
export function tuneTaiStoryTurnPlan(plan,direction){
 if(!plan||!direction||plan.target<1||plan.privacyBoundary)return plan;
 return {...plan,target:Math.min(3,plan.target),guide:false,semicolonBurst:false,
  optionalBeats:true,storyResponseIntent:direction.intent};
}
