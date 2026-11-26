import test from 'node:test';
import assert from 'node:assert/strict';
import {boardNotes,addNote,updateNote,moveNote,removeNote} from '../src/apps/board/state.js';
test('BOARD preserves existing content and edits notes inside shared save',()=>{
 const s={day:1,content:{notes:[{id:'existing'}]}};
 assert.deepEqual(boardNotes(s),[]);
 assert.equal(addNote(s,'one',' hello ','blue'),true);
 assert.equal(addNote(s,'one','again'),false);
 assert.equal(updateNote(s,'one','edited','rose'),true);
 assert.equal(moveNote(s,'one',900,-10),true);
 const restored=JSON.parse(JSON.stringify(s));
 assert.equal(boardNotes(restored)[0].text,'edited');
 assert.equal(boardNotes(restored)[0].x,784);
 assert.equal(boardNotes(restored)[0].y,0);
 assert.equal(removeNote(restored,'one'),true);
 assert.deepEqual(restored.content.notes,[{id:'existing'}]);
});
