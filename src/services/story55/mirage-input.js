// The anonymous MIRAGE Send gate only; never edits saved conversations.
import {isStory55,taiRecognized} from './state.js';
export function blocksAnonymousMirageInput(s,id,text){
 if(!isStory55(s)||taiRecognized(s))return false;
 const contact=s.content?.conversations?.mirage?.find(c=>c.id===id);
 if(id!=='s55-ouroboros'&&!/ouroboros|衔尾蛇|銜尾蛇/i.test(contact?.name||''))return false;
 const value=String(text||'').normalize('NFKC').toLowerCase().replace(/[\s\p{P}\p{Cf}]/gu,'');
 return /熙泰|xitai|三胞胎/.test(value)||
  /我是你(?:的)?(?:親|亲|二|大)?(?:哥哥?|兄長|兄长|兄弟|弟弟)/.test(value)||
  /你是我(?:的)?(?:親|亲)?(?:弟弟?|兄弟)/.test(value)||
  /(?:我們|我们|咱們|咱们)(?:是|倆是|俩是)(?:親|亲)?兄弟/.test(value);
}
