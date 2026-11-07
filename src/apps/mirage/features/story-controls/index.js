import {esc} from '../../../../system/ui.js';
import {currentScript55} from '../../../../services/story55/scripted-chat.js';

// A fictional session indicator; never requests device/camera permissions.
export function storySessionControls(s,conversationId){
 const line=currentScript55(s,'mirage',conversationId),camera=s.story55?.sceneCamera;
 if(!line||camera?.node!==line.id||!camera.active)return '';
 return '<aside class="mc-story-incoming mc-session-warning" role="status" aria-label="遠端連線警示"><span>相機權限異常／遠端畫面連線</span><button type="button" data-action="s55-disconnect-session" data-node="'+esc(line.id)+'"'+(line.kind==='disconnect'?'':' disabled')+'>切斷連線</button></aside>';
}
