import {esc} from '../../../../system/ui.js';

// Native Unicode emojis use the device's own Apple Color Emoji / Android emoji font.
// Keeping them as codepoints means no remote image requests or blurry sprite crops.
export const emojiCategories=[
  {id:'faces',label:'笑脸',icon:'😊',items:['😀','😃','😄','😁','😆','😅','🤣','😂','🙂','🙃','😉','😊','😇','🥰','😍','🤩','😘','😗','😚','😋','😛','😜','🤪','😝','🤑','🤗','🤭','🫢','🤔','🫡','🤫','🤐','😐','😑','😶','🙄','😏','😒','😔','😴','😷','🤒','🤕','🥳','🥹','😢','😭','😤','😠','😡','🤯','😳','🥺','😱','😎','🤓']},
  {id:'gestures',label:'手势',icon:'👍',items:['👍','👎','👏','🙌','🫶','🤝','🙏','✌️','🤞','🤟','👌','🤌','👋','✋','🤚','🖐️','🖖','👊','✊','🤛','🤜','👈','👉','👆','👇','☝️','💪','🫰','🤲','👐','👀','🧠']},
  {id:'love',label:'爱心',icon:'❤️',items:['❤️','🩷','🧡','💛','💚','💙','🩵','💜','🖤','🤍','🤎','💔','❤️‍🔥','💕','💞','💓','💗','💖','💘','💝','💟','❣️','💋','🌹','🌷','🌸','🌼','💐','✨','⭐','🌟','💫']},
  {id:'more',label:'其他',icon:'🎉',items:['🎉','🎊','🎁','🎂','🍰','🍓','🍒','🍉','🥑','🍜','🍕','🍟','☕','🧋','🍻','🎮','♟️','🎵','🎧','📱','📷','🐱','🐶','🐼','🐰','🎃','🎄','❄️','🌙','☀️','🌈','🔥']}
];

const emojiGrid=id=>{
  const category=emojiCategories.find(c=>c.id===id)||emojiCategories[0];
  return category.items.map(emoji=>'<button type="button" class="wx-emoji-item" data-action="wx-emoji-insert" data-emoji="'+esc(emoji)+'" aria-label="插入 '+esc(emoji)+'">'+emoji+'</button>').join('');
};

export function renderEmojiPanel(){
  return '<section class="wx-emoji-panel" hidden aria-label="系统表情选择面板" data-wx-emoji-panel="faces">'+
    '<div class="wx-emoji-grid" role="group" aria-label="笑脸表情">'+emojiGrid('faces')+'</div>'+
    '<nav class="wx-emoji-tabs" aria-label="表情分类">'+emojiCategories.map((category,i)=>
      '<button type="button" class="wx-emoji-category '+(i===0?'selected':'')+'" data-action="wx-emoji-category" data-category="'+category.id+'" aria-label="'+category.label+'"'+(i===0?' aria-current="page"':'')+'>'+category.icon+'</button>').join('')+
    '<button type="button" class="wx-emoji-delete" data-action="wx-emoji-delete" aria-label="删除一个字符">⌫</button></nav></section>';
}

export function selectEmojiCategory(panel,id){
  const category=emojiCategories.find(c=>c.id===id);
  if(!panel||!category)return false;
  panel.dataset.wxEmojiPanel=id;
  const grid=panel.querySelector('.wx-emoji-grid');
  grid.innerHTML=emojiGrid(id);grid.setAttribute('aria-label',category.label+'表情');
  panel.querySelectorAll('.wx-emoji-category').forEach(b=>{
    const active=b.dataset.category===id;b.classList.toggle('selected',active);
    if(active)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current');
  });
  return true;
}

export function insertEmoji(text,start,end,emoji){
  const value=String(text),position=Math.max(0,Math.min(value.length,Number(start)||0));
  const finish=Math.max(position,Math.min(value.length,Number(end)||position));
  return {text:value.slice(0,position)+emoji+value.slice(finish),caret:position+emoji.length};
}

export function eraseEmoji(text,caret){
  const value=String(text),position=Math.max(0,Math.min(value.length,Number(caret)||0));
  const before=value.slice(0,position),segments=typeof Intl.Segmenter==='function'?[...new Intl.Segmenter(undefined,{granularity:'grapheme'}).segment(before)].map(x=>x.segment):Array.from(before);
  const removed=segments.pop()||'';
  return {text:before.slice(0,-removed.length)+value.slice(position),caret:position-removed.length};
}

export function editEmojiInput(input,emoji=null){
  if(!input)return;
  const selection=input.selectionStart??input.value.length,end=input.selectionEnd??selection;
  const change=emoji===null?eraseEmoji(input.value,selection):insertEmoji(input.value,selection,end,emoji);
  input.value=change.text;input.setSelectionRange(change.caret,change.caret);
  input.dispatchEvent(new Event('input',{bubbles:true}));
}
