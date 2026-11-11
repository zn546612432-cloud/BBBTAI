import {readFileSync,writeFileSync} from 'node:fs';
const read=p=>JSON.parse(readFileSync(p,'utf8')),write=(p,v)=>writeFileSync(p,JSON.stringify(v,null,2)+'\n');
const main=read('docs/chat-v2/main-baseline.json'),now=read('docs/chat-v2/current.json');
const key=s=>s.source+':'+s.id,newScenes=new Map(now.scenes.map(s=>[key(s),s]));
const scenes=main.scenes.filter(s=>JSON.stringify(s)!==JSON.stringify(newScenes.get(key(s)))).map(s=>({before:s,after:newScenes.get(key(s))||null}));
for(const s of now.scenes)if(!main.scenes.some(old=>key(old)===key(s)))scenes.push({before:null,after:s});
const story=main.story.filter(s=>JSON.stringify(s)!==JSON.stringify(now.story.find(n=>n.node.id===s.node.id))).map(s=>({before:s,after:now.story.find(n=>n.node.id===s.node.id)}));
write('docs/chat-v2/old-to-new.json',{mainSha:'cd846d934c53aea7e0aed29bb1f9592a4c3f8460',scenes,story,mails:{before:main.mails,after:now.mails},wishes:{before:main.wishes.d07,after:now.wishes.d07}});
const assets=[],events=[];
function add(lines,{id,day,at,thread,surface='wechat',requires=[]}){
 let last=null;
 for(let i=0;i<lines.length;i++){
  const l=Array.isArray(lines[i])?{who:lines[i][0],text:lines[i][1]}:lines[i];
  if(['camera','disconnect','credit','offline'].includes(l.who))continue; // original loan effects stay owned by Story55
  const kind=l.who==='me'?'player-send':l.kind==='image'?'incoming-image':'incoming-text';
  const eid=id+'-'+i,assetId=kind==='incoming-image'?id+'-image-'+i:null;
  if(assetId)assets.push({id:assetId,source:'bundled-local',path:'public'+l.text});
  events.push({id:eid,kind,surface,owner:surface==='wechat'?'messaging':'story55',capability:'story.d05-d17-v2',actor:l.who,thread,text:l.text,...(assetId?{assetId}:{}),trigger:{type:kind==='player-send'?'user-send':last?'previous-event':'day-time',ref:kind==='player-send'?last||'fact:'+id:last||at},requires:[...requires,...(last?[last]:[])],timing:{day,at:last||kind==='player-send'?'on-trigger':at},once:true,delivery:{late:'silent'}});last=eid;
 }
}
for(const {after:s} of scenes)if(s)add(s.lines,{id:'v2-'+s.source+'-'+s.id,day:s.day,at:s.at,thread:s.chat});
for(const {after:s} of story)add(s.lines,{id:'v2-node-'+s.node.id,day:s.node.day,at:s.node.at,thread:s.node.conversationId,surface:s.node.channel,requires:s.node.requires.map(x=>'node:'+x)});
for(const id of ['s55-d13-wallet-mail','code-mail']){const m=now.mails.find(m=>m.id===id);const day=id==='code-mail'?14:13;events.push({id:'v2-'+id,kind:'email',surface:'kira',owner:'story55',capability:'story.d05-d17-v2',actor:'system',text:m.body,trigger:{type:'day-time',ref:day===13?'22:10':'09:16'},requires:[],timing:{day,at:day===13?'22:10':'09:16'},once:true,delivery:{late:'silent'}});}
const acceptance=['trigger','negative','idempotency','save-restore','cross-app','late-entry','assets','date-clock','dialogue','mobile'].map(type=>({id:'v2-check-'+type,type,verify:({trigger:'Real Send, wish addition and actual deliveries gate their own next lines.',negative:'No purchase/arrival inferred from date; no automatic player speech; no D18/D19 edits.',idempotency:'Stable mail, bank, wish and message IDs survive reload.', 'save-restore':'Exact known NPC/default edits upgrade; preserve real player, custom and pre-D01 history.','cross-app':'WeChat, reminders, paid orders, KIRA, Mirage and bank use existing services.','late-entry':'Deliveries follow purchase day; D15 Wang waits for full loan and timestamps actual delivery.',assets:'Existing user-owned dog sticker pack reused; no new media upload.','date-clock':'D01=2025-05-19; first D13 mail opening clamps only forward to22:30.',dialogue:'Main baseline, old-to-new diff, native Send export and frozen30 comparison.',mobile:'iPhone viewport native composer clicks, source messages, mail, dates and screenshots.'})[type]}));
write('docs/story-packets/d05-d17-v2-chat.json',{schemaVersion:2,day:5,date:'2025-05-23',title:'D05–D17 approved native chat replacement',stage:'review',scope:'mixed',systems:['story55','messaging','wishes','kira','bank'],assets,events,acceptance});
const rows=scenes.map(x=>`| D${x.after?.day||x.before.day} | ${x.after?.id||x.before.id} | ${x.before?.lines.length||0} | ${x.after?.lines.length||0} |`);
writeFileSync('docs/chat-v2/README.md',`# D05–D17 V2 review\n\nMain baseline: cd846d934c53aea7e0aed29bb1f9592a4c3f8460. Isolated branch; do not merge.\n\nThe source definitions are consumed by existing native message tracks and Story55. Runtime upgrade only matches former default copy; actual player speech, custom copy, old history, balances and completed transactions remain.\n\n| Day | Native scene | Main lines | Approved lines |\n| --- | --- | ---: | ---: |\n${rows.join('\n')}\n\nStory55 replacements: ${story.map(x=>x.after.node.id).join(', ')}.\n\nD15 room: current main contains14lines; the user’s complete eight-line target takes precedence, with the16:30/full-loan gate. D17 invitation30lines and all six websites remain unchanged. Existing stickers:112(D10),002(D11 user choice),001(D12); no new images.\n\nEvidence: main-baseline.json, current.json, old-to-new.json; CI artifact chat-v2-review-evidence contains actual native output, screenshots and recording.\n`);
console.log('REVIEW_PACKET',events.length,'events',scenes.length,'chat changes',story.length,'Story55 changes');
