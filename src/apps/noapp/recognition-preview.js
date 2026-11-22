import {prepareStory55NodeAtDay} from '../../services/story55/rebuild.js';
import {recognitionCallDue} from '../../services/story55/state.js';

// The direct test entrance uses the existing developer reconstruction and
// native call scheduler, never a parallel dialogue player.
export function prepareRecognitionPreview(s){
 prepareStory55NodeAtDay(s,'recognition');
 s.story55.noappInstalled=true;
 const chat=s.content.conversations.noapp?.find(c=>c.id==='tai');
 if(chat)chat.name='陳熙泰';
 s.unlocked=true;
 s.nav.current={appId:'noapp',route:'/chat/tai',params:{node:'recognition'}};
 s.nav.stack=[];
 if(!recognitionCallDue(s))throw Error('相認通話測試前置未完成');
 return s;
}
