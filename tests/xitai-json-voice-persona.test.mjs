import test from 'node:test';
import assert from 'node:assert/strict';
import {unpackTaiReply,readableTaiVoiceText} from '../src/services/ai/format.js';
import {prepareXitaiSpeech} from '../src/services/voice/voice-regex.js';
import {buildTaiPrompt} from '../src/services/ai/tai-profile.js';
import {taiHumanPrompt} from '../src/services/ai/humanize.js';
test('JSON voice ARRAY is three real messages; structural data never spoken',()=>{
 const json='[{"text":"还在酒店，没起床。","mode":"voice","tone":"soft"},{"text":"正犹豫要不要出去喝那杯咖啡。","mode":"voice","tone":"neutral"},{"text":"哥，你现在方便说话？","mode":"voice","tone":"neutral"}]';
 const r=unpackTaiReply({text:json},'noapp');
 assert.equal(r.length,3);assert.deepEqual(r.map(m=>m.text),['还在酒店，没起床。','正犹豫要不要出去喝那杯咖啡。','哥，你现在方便说话？']);
 assert.ok(r.every(m=>m.mode==='voice'));
 assert.doesNotMatch(readableTaiVoiceText(json),/mode|tone|text|\[|\{|\}/);
});
test('supports JSON nested strings, fenced replies, and legacy corrupt voice captions',()=>{
 const nested=JSON.stringify(JSON.stringify({messages:[{text:'葡语？Claro.','mode':'voice'}]}));
 assert.equal(unpackTaiReply(nested,'noapp')[0].text,'葡语？Claro.');
 assert.equal(unpackTaiReply('```json\n[{"text":"好。","mode":"voice"}]\n```','noapp')[0].text,'好。');
 assert.equal(readableTaiVoiceText('[{"text":"昨晚没睡好。","mode":"voice"}]'),'昨晚没睡好。');
});
test('broken JSON-looking strings cannot leak into audio captions',()=>{
 assert.throws(()=>unpackTaiReply('[{"text":"speak","mode":"voice"}','noapp'),/解析|结构化/);
 assert.equal(readableTaiVoiceText('[{"text":"speak"'),'语音转写异常，原始数据已隐藏');
});
test('character prompt respects one-line reply and permits topic autonomy and code switching',()=>{
 const prompt=buildTaiPrompt({channel:'noapp',day:62,messages:[{role:'user',content:'在吗？'}]});
 assert.doesNotMatch(prompt,/普通聊天优先连续发2至5条|正常交流优先写出2至5条/);
 assert.match(prompt,/不设最低数量/);
 assert.match(prompt,/葡萄牙|葡语/);
 assert.match(taiHumanPrompt({messages:[{role:'user',content:'在吗'}]}),/不是客服|话题自主性/);
 assert.doesNotMatch(taiHumanPrompt({messages:[{role:'user',content:'在吗'}]}),/刚过隧道|下午陪人看了场秀/);
});
test('long MiniMax sample includes natural three-beat cadence without random three laughs',()=>{
 const speech=prepareXitaiSpeech('刚从外面回来，楼下那家咖啡馆今天竟然关门了，我在路边站了好一会儿，结果还是回酒店了。',{tone:'playful'});
 assert.ok(speech.prosodyBeats>=2);
 assert.ok(['fluent','calm'].includes(speech.emotion));
 assert.doesNotMatch(speech.text,/\{\s*"text"|\[\s*\{/);
 assert.equal(prepareXitaiSpeech('嗯。',{tone:'soft'}).text,'嗯。');
 assert.equal(prepareXitaiSpeech('你到底在想什么？',{tone:'angry'}).emotion,'angry');
});
