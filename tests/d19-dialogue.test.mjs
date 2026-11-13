import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const content = JSON.parse(
  readFileSync(new URL('../src/story/d14-d24/content.json', import.meta.url), 'utf8')
);

const expected = [
  ['熙旺', '晚點要跟干爹碰面。'],
  ['me', '好'],
  ['熙旺', '你要的貨車我去廢棄站給你聯繫了，報廢沒多久，到時候拉回來改裝一下，你看看怎麼弄適合'],
  ['me', '夠大就行，我要在裡面搭建一個小工作站。'],
  ['熙旺', '好，等確認了我跟你說。'],
  ['me', '哥一會路過糖朝盛世嗎？'],
  ['熙旺', '想吃雙皮奶了？'],
  ['me', '嘿'],
  ['熙旺', '回來的時候給你帶'],
  ['me', '買兩份也行，哥給自己也買一份'],
];

function validateDialogue(lines) {
  if (!Array.isArray(lines) || lines.length !== 10) {
    throw new Error('D19 熙旺私聊必須恰好有 10 句');
  }
  lines.forEach((line, i) => {
    if (!line || !['熙旺', 'me'].includes(line.who) || typeof line.text !== 'string' || !line.text.trim()) {
      throw new Error('D19 第 ' + (i + 1) + ' 句格式或內容無效');
    }
  });
}

test('D19 17:33 熙旺私聊逐字符合已確認的 10 句', () => {
  const matches = content.wechat.filter(({ day, id }) => day === 19 && id === 'dessert');
  assert.equal(matches.length, 1);
  assert.equal(matches[0].chat, 'wang');
  assert.equal(matches[0].at, '17:33');
  validateDialogue(matches[0].lines);
  assert.deepEqual(matches[0].lines.map(({ who, text }) => [who, text]), expected);
});

test('邊界：D19 保留五句熙蒙預設發送，與五句熙旺消息交替', () => {
  const item = content.wechat.find(({ day, id }) => day === 19 && id === 'dessert');
  assert.equal(item.lines.filter(({ who }) => who === 'me').length, 5);
  assert.deepEqual(item.lines.map(({ who }) => who), expected.map(([who]) => who));
});

test('異常：D19 消息缺失或空文本會被檢查攔截', () => {
  assert.throws(() => validateDialogue([]), /10 句/);
  const broken = expected.map(([who, text]) => ({ who, text }));
  broken[2].text = '';
  assert.throws(() => validateDialogue(broken), /無效/);
});
