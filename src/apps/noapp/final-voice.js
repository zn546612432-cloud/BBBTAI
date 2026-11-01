import {finalRecordingStatus} from '../../services/story55/final-recording.js';
export function finalVoiceBubble(s){
 const status=finalRecordingStatus(s),active=['loading','playing'].includes(status);
 return '<div class="noapp-voice-bubble noapp-final-voice'+(status==='playing'?' is-playing':'')+'">'+
 '<button type="button" data-action="s55-final-audio" data-node="ending" aria-label="'+(active?'暂停语音':'播放语音')+'" aria-pressed="'+active+'"'+(status==='loading'?' disabled':'')+'>'+(active?'❚❚':'▶')+'</button>'+
 '<span class="noapp-wave" aria-hidden="true">'+Array.from({length:22},(_,i)=>'<i style="--h:'+(5+(i*13%19))+'px"></i>').join('')+'</span><span class="noapp-voice-duration">23″</span></div>';
}
