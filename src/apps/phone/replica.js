import {btn,esc} from '../../system/ui.js';
import {defaultPhoneData,phoneData} from '../../services/phone-data.js';

export const manifest={id:'phone',name:'电话',icon:7,defaultRoute:'/',kicker:'CALLS'};

const paths={
  back:'<path d="m15 4-8 8 8 8"/>',
  plus:'<path d="M12 4v16M4 12h16"/>',
  search:'<circle cx="10.7" cy="10.7" r="7"/><path d="m16 16 5 5"/>',
  mic:'<rect x="9" y="2" width="6" height="13" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v4m-4 0h8"/>',
  star:'<path d="m12 2 3.1 6.5 7.1 1-5.1 5 .9 7.1-6-3.4-6 3.4.9-7.1-5.1-5 7.1-1z"/>',
  clock:'<circle cx="12" cy="12" r="10"/><path d="M12 5v8h5"/>',
  contact:'<circle cx="12" cy="12" r="10"/><circle cx="12" cy="9.1" r="3.2"/><path d="M5.3 19a7.5 7.5 0 0 1 13.4 0"/>',
  grid:'<circle cx="5" cy="5" r="1.8"/><circle cx="12" cy="5" r="1.8"/><circle cx="19" cy="5" r="1.8"/><circle cx="5" cy="12" r="1.8"/><circle cx="12" cy="12" r="1.8"/><circle cx="19" cy="12" r="1.8"/><circle cx="5" cy="19" r="1.8"/><circle cx="12" cy="19" r="1.8"/><circle cx="19" cy="19" r="1.8"/>',
  voicemail:'<circle cx="6" cy="12" r="5"/><circle cx="18" cy="12" r="5"/><path d="M6 17h12"/>',
  call:'<path d="M6.6 2.8c-.5-.7-1.3-.9-2-.5L2.7 3.5C1.5 4.3 1.4 6 1.9 7.9A21 21 0 0 0 16.1 22c1.9.5 3.6.4 4.4-.8l1.2-1.9c.4-.7.2-1.5-.5-2l-4.6-3.1c-.7-.5-1.5-.3-2 .3l-1.5 1.8a17 17 0 0 1-5.4-5.4l1.8-1.5c.6-.5.8-1.3.3-2z"/>',
  erase:'<path d="M9 4h11a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H9L2 12zM12 9l6 6m0-6-6 6"/>',
  info:'<circle cx="12" cy="12" r="10"/><path d="M12 11v6M12 7h.01"/>',
  chevron:'<path d="m9 5 7 7-7 7"/>'
};
const icon=(name,size=24)=>`<svg class="ios-icon ios-icon-${name}" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.85" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name]}</svg>`;

let selected='recent',filter='all',digits='',search='',personId=null;

function tabs(){
  const items=selected==='keypad'?
    [['favorite','star','个人收藏'],['recent','clock','最近通话'],['contacts','contact','联系人'],['keypad','grid','拨号键盘']]:
    [['favorite','star','个人收藏'],['recent','clock','最近通话'],['contacts','contact','联系人'],['keypad','grid','拨号键盘'],['voicemail','voicemail','语音留言']];
  return `<nav class="ios-phone-tabs" aria-label="电话导航">${items.map(([id,glyph,label])=>btn('phone-tab',`${icon(glyph,27)}<span>${label}</span>`,selected===id?'active':'',`data-tab="${id}" aria-label="${label}"`)).join('')}</nav>`;
}
const ownPortrait='<svg viewBox="0 0 48 48" width="44" height="44" aria-hidden="true"><circle cx="24" cy="16" r="10" fill="white"/><path d="M5 41c2-17 36-17 38 0" fill="white"/></svg>';
function contactAvatar(label,me=false){return `<span class="ios-contact-face ${me?'me':''}">${me?ownPortrait:esc(label.slice(0,Math.min(2,label.length)))}</span>`;}

function contacts(data){
  const matches=data.contacts.filter(x=>`${x.name} ${x.number||''}`.toLowerCase().includes(search.toLowerCase()));
  return `<div class="ios-phone-page ios-contacts-page"><header class="ios-contact-toolbar">${btn('phone-tab',icon('back',27),'ios-round',`data-tab="recent" aria-label="返回最近通话"`)}<strong>联系人</strong>${btn('phone-add',icon('plus',28),'ios-round',`aria-label="添加联系人"`)}</header>
  <label class="ios-contact-search">${icon('search',24)}<input name="phone-search" placeholder="搜索" value="${esc(search)}" aria-label="搜索联系人">${icon('mic',23)}</label>
  <div class="ios-contact-scroll"><div class="ios-my-card">${contactAvatar(data.self.name,true)}<span><strong>${esc(data.self.name)}</strong><small>我的名片 · ${esc(data.self.region)}</small><small>${esc(data.self.number)}</small></span></div><div class="ios-letter-heading">#</div>
  ${matches.map(person=>`<button type="button" class="ios-contact-row" data-action="phone-person" data-id="${esc(person.id)}">${contactAvatar(person.name)}<strong>${esc(person.name)}</strong></button>`).join('')}
  </div><div class="ios-alpha-rail" aria-hidden="true">${'ABCDEFGHIJKLMNOPQRSTUVWXYZ#'.split('').map(x=>`<span>${x}</span>`).join('')}</div>${tabs()}</div>`;
}
function contactDetails(data){
  const person=data.contacts.find(x=>x.id===personId);
  if(!person){selected='contacts';return contacts(data);}
  return `<div class="ios-phone-page ios-person-page"><header class="ios-person-toolbar">${btn('phone-tab',`${icon('back',19)} 联系人`,'',`data-tab="contacts"`)}${btn('phone-add','编辑','',`aria-label="在开发者模式编辑联系人"`)}</header>
  <div class="ios-person-profile">${contactAvatar(person.name,true)}<h1>${esc(person.name)}</h1><p>${esc(data.self.region)}</p></div>
  <div class="ios-person-detail"><small>电话号码</small><strong>${esc(person.number||'未设置号码')}</strong>${person.number?btn('phone-use-number','拨号','ios-person-dial',`data-id="${esc(person.id)}"`):'<p>可以在开发者模式中补充号码。</p>'}</div>${tabs()}</div>`;
}
function keypad(data){
  const keys=[['1',''],['2','ABC'],['3','DEF'],['4','GHI'],['5','JKL'],['6','MNO'],['7','PQRS'],['8','TUV'],['9','WXYZ'],['*',''],['0','+'],['#','']];
  return `<div class="ios-phone-page ios-keypad-page"><header class="ios-region">${btn('phone-region',esc(data.self.region),'',`aria-label="当前地区${esc(data.self.region)}"`)}</header>
  <div class="ios-keypad-spacer"><div class="ios-entered-digits">${digits?esc(digits):'&nbsp;'}</div></div>
  <div class="ios-digit-grid">${keys.map(([n,letters])=>btn('phone-digit',`<span>${n}</span>${letters?`<small>${letters}</small>`:n==='0'?'<small>+</small>':'<small>&nbsp;</small>'}`,'ios-digit',`data-digit="${n}" aria-label="数字${n}"`)).join('')}</div>
  <div class="ios-call-zone">${btn('phone-call',icon('call',34),'ios-green-call',`aria-label="拨打电话"`)}${digits?btn('phone-erase',icon('erase',23),'ios-erase',`aria-label="删除数字"`):''}</div>${tabs()}</div>`;
}
function recents(data){
  const list=data.calls.filter(x=>(filter==='all'||x.missed)&&(!search||`${x.name||''} ${x.number} ${x.place}`.toLowerCase().includes(search.toLowerCase())));
  return `<div class="ios-phone-page ios-recents-page"><header class="ios-recent-toolbar">${btn('phone-edit','编辑','ios-glass-button')}<span class="ios-filter">${btn('phone-filter','所有',filter==='all'?'active':'',`data-filter="all"`)}${btn('phone-filter','未接来电',filter==='missed'?'active':'',`data-filter="missed"`)}</span>${btn('phone-menu','☰','ios-round')}</header><h1>最近通话</h1>
  <label class="ios-contact-search">${icon('search',23)}<input name="phone-search" placeholder="搜索通话" value="${esc(search)}" aria-label="搜索通话">${icon('mic',22)}</label>
  <div class="ios-recent-scroll">${list.map(x=>`<div class="ios-recent-row">${contactAvatar(x.name||x.number)}<span><strong class="${x.missed?'missed':''}">${esc(x.name||x.number)}</strong><small>${esc(x.place||data.self.region)}${x.name?' · '+esc(x.number):''}</small></span><time>${esc(x.day)}</time>${btn('phone-info',icon('info',22),'ios-info',`data-id="${esc(x.id)}"`)}</div>`).join('')||'<p class="ios-no-results">没有通话记录</p>'}</div>${tabs()}</div>`;
}
function blankTab(){return `<div class="ios-phone-page ios-placeholder-tab"><header><h1>${selected==='favorite'?'个人收藏':'语音留言'}</h1></header><p>暂无记录</p>${tabs()}</div>`;}
export function render(ctx){const data=ctx?.store?phoneData(ctx.store.get()):defaultPhoneData();return selected==='keypad'?keypad(data):selected==='contacts'?contacts(data):selected==='person'?contactDetails(data):selected==='recent'?recents(data):blankTab();}
export function handle(a,t,c){
  if(a==='phone-tab'){selected=t.dataset.tab;personId=null;search='';c.refresh();}
  if(a==='phone-filter'){filter=t.dataset.filter;c.refresh();}
  if(a==='phone-digit'){digits+=t.dataset.digit;c.refresh();}
  if(a==='phone-erase'){digits=digits.slice(0,-1);c.refresh();}
  if(a==='phone-region')return;
  if(a==='phone-call')c.toast(digits?'电话功能暂未接入':'请先输入电话号码');
  if(a==='phone-person'){personId=t.dataset.id;selected='person';c.refresh();}
  if(a==='phone-use-number'){const person=phoneData(c.store.get()).contacts.find(x=>x.id===t.dataset.id);if(person?.number){digits=person.number.replace(/[^\d+]/g,'');selected='keypad';c.refresh();}}
  if(['phone-add','phone-edit','phone-menu'].includes(a))c.router.open({appId:'editor',route:'/phone'});
  if(a==='phone-info'){const call=phoneData(c.store.get()).calls.find(x=>x.id===t.dataset.id);if(call)c.toast(`${call.number} · ${call.place||'澳门'} · ${call.day}`);}
}
export function input(el,c){if(el.name==='phone-search'){search=el.value;c.refresh();}}
