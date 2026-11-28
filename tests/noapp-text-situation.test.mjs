import test from 'node:test';
import assert from 'node:assert/strict';
import {classifyTaiTextSituation,taiTextSituationPrompt} from '../src/services/ai/text-situation.js';
import {casualChatPunctuation} from '../src/services/ai/chat-punctuation.js';
const cases=[
 [
  [
   {
    "role": "user",
    "content": "这个人的号被我盗了"
   }
  ],
  {},
  "account_claim"
 ],
 [
  [
   {
    "role": "user",
    "content": "我是说熙蒙的号被我盗了"
   },
   {
    "role": "assistant",
    "content": "所以你是盜了熙蒙號的人？"
   },
   {
    "role": "user",
    "content": "对"
   }
  ],
  {},
  "account_claim"
 ],
 [
  [
   {
    "role": "user",
    "content": "我的帳號真的被盜了，密碼被改了"
   }
  ],
  {},
  "security"
 ],
 [
  [
   {
    "role": "user",
    "content": "我的号被盗了，不是开玩笑"
   }
  ],
  {},
  "security"
 ],
 [
  [
   {
    "role": "user",
    "content": "我的号被盗了"
   },
   {
    "role": "assistant",
    "content": "吃飯了嗎？"
   },
   {
    "role": "user",
    "content": "对"
   }
  ],
  {},
  "unknown"
 ],
 [
  [
   {
    "role": "user",
    "content": "想你了"
   }
  ],
  {},
  "affection"
 ],
 [
  [
   {
    "role": "user",
    "content": "别再说了"
   }
  ],
  {},
  "boundary"
 ],
 [
  [
   {
    "role": "user",
    "content": "救命，我想哭"
   }
  ],
  {},
  "distress"
 ],
 [
  [
   {
    "role": "user",
    "content": "你好"
   }
  ],
  {},
  "greeting"
 ],
 [
  [
   {
    "role": "user",
    "content": "帮我处理一下"
   }
  ],
  {},
  "help"
 ],
 [
  [
   {
    "role": "user",
    "content": "你猜"
   }
  ],
  {},
  "banter"
 ],
 [
  [
   {
    "role": "user",
    "content": "今天健身了吗"
   }
  ],
  {},
  "daily"
 ]
];
test('classifies current and adjacent context without inventing facts',()=>{for(const [m,o,k] of cases)assert.equal(classifyTaiTextSituation(m,o).kind,k);});
test('compact banter does not force questioning and keeps Chinese commas',()=>{const p=classifyTaiTextSituation([{role:'user',content:'我的號被盜了'}]);assert.equal(p.compact,true);assert.match(taiTextSituationPrompt(p),/不強制追問/);assert.equal(casualChatPunctuation('我還在忙，晚點陪你玩。'),'我還在忙，晚點陪你玩');});
