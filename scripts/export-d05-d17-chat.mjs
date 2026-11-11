import {writeFileSync} from 'node:fs';
import {initialState} from '../src/services/storage.js';
import {activateStory55} from '../src/services/story55/runtime.js';
import {AUTHORED_CHAT_TRACKS} from '../src/services/messaging/lifecycle/registry.js';
import * as d06 from '../src/story/d06/wish-content.js';
import * as d07 from '../src/story/d07/life-content.js';
const s=activateStory55(initialState()),scenes=[];
for(const {track} of AUTHORED_CHAT_TRACKS){if(track.day<5||track.day>17)continue;s.day=track.day;
 for(const d of track.defs)scenes.push({source:track.name,id:d.id,day:d.day,chat:d.chat,at:typeof d.at==='function'?d.at(s):d.at,lines:typeof d.lines==='function'?d.lines(s):d.lines});}
const config=s.story55.config;
const story=config.nodes.filter(n=>n.day>=5&&n.day<=17&&config.scenes[n.id]).map(n=>({node:n,lines:config.scenes[n.id]}));
writeFileSync(process.argv[2]||'docs/chat-v2/current.json',JSON.stringify({scenes,story,mails:config.mails,wishes:{d06,d07}},null,2)+'\n');
