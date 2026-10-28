const WECHAT_TABS=new Set(['/','/contacts','/discover','/me']);

// Native tab switches are changes of content inside a single app, not page navigation.
export function isWeChatTabSwitch(before,after){
 return before?.appId==='wechat'&&after?.appId==='wechat'&&
  before.route!==after.route&&WECHAT_TABS.has(before.route)&&WECHAT_TABS.has(after.route);
}

const PHOTOS_TABS=new Set(['/','/collections']);
// All first-level tabs must keep their existing app frame for native, flash-free switching.
export function isPhotosTabSwitch(before,after){
 return before?.appId==='photos'&&after?.appId==='photos'&&
  before.route!==after.route&&PHOTOS_TABS.has(before.route)&&PHOTOS_TABS.has(after.route);
}
const MIRAGE_TABS=new Set(['/','/contacts','/bounties','/bounties/completed','/market','/manage']);
export const isMirageTabSwitch=(before,after)=>before?.appId==='mirage'&&after?.appId==='mirage'&&before.route!==after.route&&MIRAGE_TABS.has(before.route)&&MIRAGE_TABS.has(after.route);
export const isNativeTabSwitch=(before,after)=>isWeChatTabSwitch(before,after)||isPhotosTabSwitch(before,after)||isMirageTabSwitch(before,after);
