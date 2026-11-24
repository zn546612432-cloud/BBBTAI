// The anonymous MIRAGE Send gate only; never edits saved conversations.
import {isStory55,taiRecognized} from './state.js';
export function blocksAnonymousMirageInput(s,id,text){
 // Identity stays secret until the actual recognition, not merely the photo clue.
 if(!isStory55(s)||taiRecognized(s))return false;
 const contact=s.content?.conversations?.mirage?.find(c=>c.id===id);
 if(id!=='s55-ouroboros'&&!/ouroboros|衔尾蛇|銜尾蛇/i.test(contact?.name||''))return false;
 // Fold tone marks and separators, so Xi Tai / Xī Tài / xi-tai cannot
 // bypass the same pre-recognition plot gate as the Chinese name.
 const value=String(text||'').normalize('NFKD').toLowerCase()
  .replace(/[\p{M}\s\p{P}\p{Cf}]/gu,'');
 const name=/(?:xi[1-4]?tai[1-4]?|[熙希曦羲惜西夕溪晰昔喜戲戏細细吸奚錫锡稀嘻犀嬉熄習习璽玺][泰太台臺胎汰態态](?!平洋))/;
 return name.test(value)||/三胞胎/.test(value)||
  /我是你(?:的)?(?:親|亲|二|大)?(?:哥哥?|兄長|兄长|兄弟|弟弟)/.test(value)||
  /你是我(?:的)?(?:親|亲)?(?:弟弟?|兄弟)/.test(value)||
  /(?:我們|我们|咱們|咱们)(?:是|倆是|俩是)(?:親|亲)?兄弟/.test(value);
}
