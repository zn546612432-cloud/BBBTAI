// Free NoApp text only: deterministic, conservative context hints, never identity or story facts.
export function classifyTaiTextSituation(messages=[],{text}={}){
 const history=(Array.isArray(messages)?messages:[]).filter(m=>['user','assistant'].includes(m?.role)||['me','tai'].includes(m?.from)).map(m=>({user:m.role==='user'||m.from==='me',text:String(m.content??m.text??'').trim()})).filter(m=>m.text&&!/^\s*\[(?:[遊游][戲戏]系統|游戏系统|[電电][話话]系統|电话系统|系統記錄|系统记录|[語语]音消息)/u.test(m.text));
 const latest=String(text??history.filter(m=>m.user).at(-1)?.text??'').trim();
 const prior=history.at(-1)?.user&&history.at(-1)?.text===latest?history.slice(0,-1):history;
 const short=/^(?:[對对]|是(?:啊|呀|的)?|嗯|[沒没][錯错]|[當当]然|真的|[對对]啊)[。！!？?~～\s]*$/u.test(latest);
 const account=/(?:[帳账賬]號|[帳账賬]号|[號号]|[賬账][戶户]).{0,16}(?:[盜盗]|被[黑駭骇]|[竊窃])|(?:[盜盗]|[竊窃]).{0,16}(?:[帳账賬][號号]|[號号]|[賬账][戶户])|(?:我不是|我不叫|我是別人|我是别人).{0,8}熙蒙/u;
 const seriousness=/(?:不是[開开]玩笑|[認认]真的|[別别]鬧|[別别]闹|[真确確]的被[盜盗]|[真确確]的被[黑駭骇]|[異异]常登[錄录]|密[碼码]被改|登不上|登[錄录]不了|[驗验][證证][碼码]|求救|救命|被威[脅胁])/u;
 const previousUser=prior.filter(m=>m.user).at(-1)?.text||'';
 const adjacent=prior.at(-1);
 const carryAccount=short&&!!adjacent&&!adjacent.user&&account.test(adjacent.text)&&account.test(previousUser);
 const topic=carryAccount?previousUser+'\n'+latest:latest;
 const out=(kind,compact=false)=>({kind,compact,continued:carryAccount});
 if(/(?:別再[聯联][絡络]|别再[聯联][絡络]|不想聊|[別别][煩烦]我|先[別别]回|[別别]再[說说]|不要再[說说])/u.test(latest))return out('boundary',true);
 if(/(?:救命|求救|想死|自[殺杀]|[傷伤]害我|好[難难][過过]|想哭|撐不住|撑不住|被威[脅胁])/u.test(latest))return out('distress');
 if(account.test(topic)&&seriousness.test(topic))return out('security',true);
 if(account.test(topic))return out('account_claim',true);
 if(seriousness.test(latest))return out('serious');
 if(/(?:想你|[愛爱]我|[愛爱]你|喜[歡欢]我|喜[歡欢]你|抱抱|[親亲]我|[親亲]你|撒[嬌娇]|吃醋)/u.test(latest))return out('affection');
 if(/(?:[逗耍]你|[開开]玩笑|你才是|少自[戀恋]|[討讨][厭厌]鬼|笨蛋|[哼嘁]|[騙骗]你的|才不要|你猜|臭[屁美])/u.test(latest))return out('banter',true);
 if(/^(?:hi|hey|hello|你好|早(?:安|上好)?|晚安|嗨|在[嗎吗])[\s。！!？?~～]*$/iu.test(latest))return out('greeting',true);
 if(/(?:能不能[幫帮]|[幫帮]我|求你|怎[麼么][辦办]|[為为]什[麼么]|[教告][我訴诉])/u.test(latest))return out('help');
 if(/(?:吃[飯饭]|健身|睡[覺觉]|上[課课]|下[課课]|在[幹干]什[麼么]|今天|昨天|忙[嗎吗])/u.test(latest))return out('daily');
 return out('unknown');
}
export function taiTextSituationPrompt(situation){
 const direction={
  account_claim:'本輪可能是假裝他人、惡作劇或真實帳號異常，不能把玩家自稱當身份證明。按彼此熟悉程度自然接梗、簡短試探或核實；不要重述他的說法，也不要假裝已追蹤、登入或確認帳號狀態。若有真正異常的跡象，改為謹慎核實；不透露任何私人資料。',
  security:'可能存在真實安全異常，保持戒備，簡短核實，不順著玩笑處理，不披露私密資訊，不聲稱已執行未發生的技術操作。',
  distress:'認真承接對方當下的困難，不調戲、不輕描淡寫、不套用安慰模板。',
  boundary:'尊重對方當下明確提出的界線，不強行追問、解釋或延長聊天。',
  affection:'依已存在的關係與身份門檻自然回應，區分撒嬌、試探和認真表達，不把請求或玩笑當成已確認的告白。',
  banter:'這可能是鬥嘴、試探或玩笑，接住潛台詞，可短答或反過來逗他，不需要解釋笑點，不要用固定的毒舌句型。',
  greeting:'普通問候，按當前時段與生活狀態回應；不必重複問候或強行開新話題。',
  help:'先回應實際問題或需求；需要時才澄清，不要機械反問。',
  daily:'自然承接日常話題，依真實時段與已知事實回應，不虛構行程。',
  serious:'玩家可能在認真澄清，不要自動當成玩笑，按實際上下文理解。',
  unknown:'正則未能可靠識別情境，按最近真實對話理解，不強行套用場景或例句。'
 }[situation?.kind]||'按真實上下文回應。';
 return '【本輪情境識別｜僅供行為與表達使用，不是劇情事實】'+direction+(situation?.compact?' 本輪允許一句、兩句或自然沉默，不為氣泡數而補話，不強制追問。':'')+' 不在台詞中說出情境分類。文字使用繁體中文，同一句內語意需要停頓時正常使用逗號，不用空格代替必要逗號；空格僅偶爾用於獨立短句之間，日常句末不用句號，保留問號、感嘆號、省略號和技術標點。';
}
