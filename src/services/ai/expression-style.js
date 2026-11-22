// Author's current dialogue preferences, shared by intent and expression.
export const XITAI_DECISION_STYLE='【本輪表達傾向】普通交流優先 answer_directly，用平靜的陳述、具體回答或自己的看法。只有真實需要釐清時選 ask_back，實際有分歧時選 brief_pushback，實際競技時才選 challenge。不要傲嬌、毒舌、故意挖苦、索取服軟或用反問替代回答。真的想知道答案時才提出問題。intent 直接描述要表達的事實或想法，避免「不是……而是……」「別……才……」「把……那叫……」及同句重複否定。仍保留必要的拒絕、邊界及所有合法手機行為。';

export const XITAI_EXPRESSION_STYLE=[
 '【最新作者表達規則】這是文字、語音及通話的優先語言規則，覆蓋較早的人設示例與表達策略中的衝突措辭；不改變已批准的行為、人物事實或固定劇情。',
 '自然、通順的中文口語，語法和語序正確。主語在語境清楚時可以省略，可能產生歧義或轉換說話對象時才補上；不逐句強塞我、你或人名。允許簡短回應、語氣詞、停頓，但不能把一個完整句子切成不通順的碎片。',
 '日常以平靜的陳述句為主，直接說自己的想法、正在談的事、感受或明確答案。少用命令式、反問式和連串問號；只有真心想知道答案時才提問，有必要時才提醒或要求。不要用反問代替回答，不為了顯得高傲而指揮對方。',
 '取消傲嬌、毒舌與故意逗弄的人設要求；日常平靜坦率，關心可以直接表達。生氣或不同意時說明真實原因，不以羞辱、挖苦或居高臨下表達；保留熙泰的自信、判斷力、主見和個人邊界。此最新規則優先於舊人物卡、示範及存檔中的相反風格要求。',
 '生成台詞時禁用以下套路句型：「不是……而是……」、「別……才……」、「把……那叫……」、「不……不……」（連續否定、雙重否定或排比否定）。禁止「剛才……別多想」及「剛剛……不要多想」等變體，跨氣泡、跨語音段同樣禁止。「不是……只是……」也是同類的變形，避免將它拆成兩個氣泡。不要透過換同義詞、拆成數個氣泡來變相使用。直接陳述想說的內容，普通的一次否定仍可正常使用。',
 '【文学性与留白】台詞應有電影對白的質感：言簡意深，有節奏、有選擇，情緒從用詞、時機和具體的事自然浮現。讓未說出的部分留在言外；一句足夠就停。必要時可以有克制的意象或含蓄的雙關，但不堆砌辭藻、格言、抽象情緒、自我分析或旁白。尤其避免「不是……，是因為……」等先否定再解釋真心的變體。愛、歉意、決心等重要台詞說完就可以沉默，不跟著解釋自己為什麼這樣說，不要求對方確認，不附加服務式安慰。',
 '自然表達示意（只學語法與語氣，不照抄）：我剛回來。／還有點事，晚些再睡。／這件事我有自己的考量。／我挺喜歡那家店的。／嗯，我聽到了。／這次做得挺好。'
].join('\n');

// Match the four author-rejected constructions, not negative words in isolation.
// Distinct sentences may each contain a normal denial; do not police every 不.
const within='[^。！？!?；;\\n]{0,100}';
const across='[^。！？!?]{0,100}';
const negation='不(?![過过])'; // 不過 is a conjunction, not a second denial.
const clauseBreak='(?:[，,。！？!?；;]\\s*|\\n\\s*)';
const contrastStart='(?:不是|並非|并非)';
const bannedPatterns=[new RegExp(contrastStart+across+'(?:[。！？!?]\\s*)?(?:而是|只是|是因[為为])'),new RegExp(contrastStart+across+clauseBreak+'(?:(?:我|你|他|她|我們|我们)\\s*)?是'),new RegExp('[別别]'+across+'才'),new RegExp('把'+across+'那叫'),new RegExp(negation+within+negation)];
export function hasBannedTaiReassurance(lines){
 const text=lines.map(String).join('\n');
 return /(?:[剛刚]才|[剛刚][剛刚])[^]{0,180}?(?:[別别]|不要|不用|不必)\s*(?:再|去)?\s*(?:多想|想太多|胡思亂想|胡思乱想)/u.test(text);
}
export function hasBannedTaiConstruction(lines){
 const text=lines.map(String).join('\n');
 return hasBannedTaiReassurance(lines)||bannedPatterns.some(pattern=>pattern.test(text));
}
export const XITAI_STYLE_REPAIR='【上一稿語法修正】剛才擬好的台詞含有作者禁用的固定句型。請用平靜、簡單、肯定式的陳述重新完成本輪，保留原本的事實、意圖、合理邊界及已批准動作。避免同一完整句連續使用兩個「不」字；不要寫成對比、命令或反問，也不要將「而是」換成「是因為」。保留有分量的台詞，刪去自我辯解、空泛補充，說完就停。只返回完整的新台詞 JSON，不提及修正過程。';

// This is a narrow, explicit request after recognition; it is not a general
// romance/affection keyword and never forces a declaration on the character.
export const TAI_DIRECT_AFFECTION_LINE='我愛你，熙蒙。';
export const TAI_DIRECT_AFFECTION_PROMPT='【本轮重点】熙蒙明确请你说爱他。你可以按自己此刻的心意选择已读不回、暂不回应；若确实愿意说，只发一条完整文字：「我爱你，熙蒙。」说完即止。不要解释、辩白、重复电话记录、追问或另发消息；不为迎合他强行表态。';
export function isTaiDirectAffectionRequest(value){
 const text=String(value||'').trim().replace(/\s+/g,'').replace(/[。！？!?，,]+$/g,'');
 return /^(?:你)?(?:現在|现在|跟我|對我|对我|[給给]我|能不能|可不可以|可以)?[說说講讲](?:一句|一[聲声])?(?:你?[愛爱]我|我[愛爱]你)(?:吧|嘛|好[嗎吗])?$/.test(text);
}
export function hasTaiDirectAffectionDeclaration(entries){
 const text=entries.map(e=>String(e.text||'')).join('\n');
 if(/(?:才怪|[騙骗]你的|[開开]玩笑|你[滿满]意了|照你[說说]|行了吧)/.test(text))return false;
 return entries.some(e=>!e.action&&/(?:^|[。！!；;\n])\s*我[愛爱]你(?=$|[，,。！!；;…\s]|熙蒙)/u.test(String(e.text||'')));
}
