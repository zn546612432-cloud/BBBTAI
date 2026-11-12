import {veilScanners} from './arcade.js';
import {upstreamScannerPositions} from './arcade-upstream.js';
import {circuit} from '../visuals.js';
const action=(cmd,value,label,cls='',disabled=false,aria=label)=>`<button type="button" class="gh-arcade-cell ${cls}" data-action="gh-arcade-${cmd}" data-value="${value}" aria-label="${aria}" ${disabled?'disabled':''}>${label}</button>`;
export function renderArcade(board,order,remaining){
 if(board.kind==='cipher-slide'){
  return `<section class="gh-arcade" aria-label="資料結構重組">
    <div class="gh-arcade-status"><span>結構重組 / 03×03</span><strong>移動 ${board.steps}</strong></div>
    <div class="gh-arcade-reference">${circuit()}<small>參考結構</small></div>
    <div class="gh-arcade-matrix gh-arcade-slide">${board.tiles.map((tile,i)=>
     tile===board.tiles.length-1?action('tap',i,'','empty',true,'空槽'):
     action('tap',i,circuit(tile)+'<small>'+String(tile+1).padStart(2,'0')+'</small>','','','模塊 '+(tile+1))
    ).join('')}</div>
    <div class="gh-arcade-status"><span>結構待校準</span><span>08 / 09</span></div>
   </section>`;
 }
 if(board.kind==='extract-memory'){
  const done=board.matched.length/2,total=board.cards.length/2;
  return `<section class="gh-arcade" aria-label="資料碎片配對">
    <div class="gh-arcade-status"><span>碎片校驗 / ${board.cards.length}</span><strong>${done} / ${total}</strong></div>
    <div class="gh-arcade-matrix gh-arcade-memory" style="grid-template-columns:repeat(${board.cols},minmax(0,1fr))">
      ${board.cards.map((symbol,i)=>{
       const matched=board.matched.includes(i),open=matched||board.revealed.includes(i);
       return action('tap',i,open?symbol:'▧',matched?'matched':open?'revealed':'',matched||!!board.lockUntil);
      }).join('')}
    </div>
    <div class="gh-arcade-status"><span>不匹配 ${board.errors}</span><span>${board.lockUntil?'校驗中…':'等待輸入'}</span></div>
   </section>`;
 }
 if(board.kind==='veil-maze'){
  const scanners=new Set(upstreamScannerPositions(board));
  return `<section class="gh-arcade" aria-label="隱匿通路">
    <div class="gh-arcade-status"><span>隱匿通路 / ${board.size}×${board.size}</span><strong>警報 ${board.heat}</strong></div>
    <div class="gh-arcade-matrix gh-arcade-stealth gh-arcade-maze" style="--maze-columns:${board.size}">
      ${board.maze.cells.map((walls,i)=>{
       const player=i===board.player,exit=i===board.exit,scanner=scanners.has(i);
       const label=player?'◆':exit?'◎':scanner?'◉':'·';
       const cls=player?'player':exit?'exit':scanner?'scanner':'';
       const border=walls.map(v=>v?'2px solid #446d63':'1px solid #16362f');
       const style='border-top:'+border[0]+';border-right:'+border[1]+';border-bottom:'+border[2]+';border-left:'+border[3];
       return '<span class="gh-arcade-tile '+cls+'" style="'+style+'" aria-label="'+(player?'目前位置':exit?'出口':scanner?'巡檢節點':'通路')+'">'+label+'</span>';
      }).join('')}
    </div>
    <div class="gh-arcade-pad" aria-label="方向控制">
      <span></span>${action('step','up','↑')}<span></span>
      ${action('step','left','←')}${action('step','wait','等待')}${action('step','right','→')}
      <span></span>${action('step','down','↓')}<span></span>
    </div>
    <div class="gh-arcade-status"><span>步數 ${board.steps}</span><span>終點 ◎</span></div>
   </section>`;
 }
 if(board.kind==='strike-mole'){
  const time=Number.isFinite(remaining)?Math.max(0,Math.ceil(remaining/1000)):0;
  return `<section class="gh-arcade" aria-label="目標反應">
    <div class="gh-arcade-status"><span>目標反應 / 04×04</span><strong>${time}s</strong></div>
    <div class="gh-arcade-matrix gh-arcade-strike">
      ${Array.from({length:16},(_,i)=>action('tap',i,i===board.target?'◎':'·',i===board.target?'target':'')).join('')}
    </div>
    <div class="gh-arcade-status"><span>有效 ${board.hits} / ${board.goal}</span><span>誤觸 ${board.misses} / ${board.maxMisses}</span></div>
    <div class="gh-meter"><i style="width:${board.hits/board.goal*100}%"></i></div>
   </section>`;
 }

 if(board.kind==='extract'){
  const done=board.matched.length/2;
  return `<section class="gh-arcade" aria-label="数据包匹配">
    <div class="gh-arcade-status"><span>碎片缓存 / 10</span><strong>${done} / 5 组</strong></div>
    <p class="gh-arcade-help">依次展开两个数据包，匹配校验标签。验证通过的数据将保持可访问。</p>
    <div class="gh-arcade-matrix gh-arcade-memory">${board.cards.map((symbol,i)=>{
     const matched=board.matched.includes(i),open=matched||board.revealed.includes(i);
     return action('tap',i,open?symbol:'▧',matched?'matched':open?'revealed':'',matched||!!board.lockUntil);
    }).join('')}</div>
    <div class="gh-arcade-status"><span>不匹配 ${board.errors} 次</span><span>${board.lockUntil?'校验中…':'继续配对'}</span></div>
  </section>`;
 }
 if(board.kind==='veil'){
  const scanners=new Set(veilScanners(board.phase));
  return `<section class="gh-arcade" aria-label="隐匿路径">
    <div class="gh-arcade-status"><span>隐匿路径 / 5×5</span><strong>警报 ${board.heat}</strong></div>
    <p class="gh-arcade-help">将访问点移动至右下角出口。红色监测节点会随着每次移动调整巡检位置；触发监测将复位到起点。</p>
    <div class="gh-arcade-matrix gh-arcade-stealth">${Array.from({length:25},(_,i)=>{
      const isWall=board.walls.includes(i),isPlayer=i===board.player,isExit=i===board.exit,scanner=scanners.has(i);
      const label=isPlayer?'◆':isExit?'◎':isWall?'▩':scanner?'◉':'·';
      const cls=isPlayer?'player':isExit?'exit':isWall?'wall':scanner?'scanner':'';
      return `<span class="gh-arcade-tile ${cls}" aria-label="${isPlayer?'当前位置':isExit?'出口':isWall?'障碍':scanner?'扫描器':'通路'}">${label}</span>`;
    }).join('')}</div>
    <div class="gh-arcade-pad" aria-label="方向控制">
      <span></span>${action('step','up','↑') }<span></span>
      ${action('step','left','←')}${action('step','wait','等待')}${action('step','right','→')}
      <span></span>${action('step','down','↓')}<span></span>
    </div>
    <div class="gh-arcade-status"><span>已移动 ${board.steps} 步</span><span>终点 ◎</span></div>
  </section>`;
 }
 if(board.kind==='strike'){
  const time=Number.isFinite(remaining)?Math.max(0,Math.ceil(remaining/1000)):0;
  return `<section class="gh-arcade" aria-label="目标响应测试">
    <div class="gh-arcade-status"><span>目标锁定 / 4×4</span><strong>${time}s</strong></div>
    <p class="gh-arcade-help">依次确认 ${board.goal} 个高亮目标。误触达到 ${board.maxMisses} 次将中断测试；请避开暗色干扰节点。</p>
    <div class="gh-arcade-matrix gh-arcade-strike">${Array.from({length:16},(_,i)=>action('tap',i,i===board.target?'◎':'·',i===board.target?'target':'')).join('')}</div>
    <div class="gh-arcade-status"><span>命中 ${board.hits} / ${board.goal}</span><span>误触 ${board.misses} / ${board.maxMisses}</span></div>
    <div class="gh-meter"><i style="width:${board.hits/board.goal*100}%"></i></div>
  </section>`;
 }
 return '';
}
