// Only repair empty/malformed generations. A deliberately short reply is
// legitimate character behavior and must never trigger a mandatory essay.
export function needsTaiResponseRepair({entries=[]}={}){
 return !Array.isArray(entries)||!entries.some(e=>typeof e?.text==='string'&&e.text.trim());
}
export function taiResponseRepairScene(){
 return '上一稿没有可显示的台词，请重试。熙泰可说一句短话、完整分享近况、拒绝回答或自然结束；不因字数强制扩写，不凑2至5条，不写文艺金句或客服式安慰。只输出包含messages数组的合法JSON，每个元素有text、mode、tone。';
}
