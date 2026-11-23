import {btn,esc} from '../../../../system/ui.js';
import {APPLE_ACCOUNT_NAME} from '../../../../system/apple-account.js';
import {musicIcon,cover} from '../shared/index.js';
import {tracks,trackById,matchingTracks} from '../shared/catalog.js';
const tabs=[['listen','house','主页'],['library','library','资料库'],['search','search','搜索']];
const track=t=>btn('music-play-track',`${cover('music-track-art',t)}<span class="music-track-copy"><strong>${t.title}</strong><small>${t.artist}</small></span>${musicIcon('play')}`,'music-track',`data-track="${t.id}"`);
const album=t=>btn('music-play-track',`${cover('music-album-art',t)}<strong>${t.title}</strong><small>${t.artist}</small>`,'music-album',`data-track="${t.id}"`);
const account=()=>btn('music-account',APPLE_ACCOUNT_NAME[0],'music-avatar',`aria-label="${APPLE_ACCOUNT_NAME} 的帐户"`);
export const trackRows=query=>matchingTracks(query).map(track).join('');
export function musicLibrary({playing,tab,query='',current=trackById()}){
 const showTrack=matchingTracks(query).length>0;
 return `<div class="music-library"><div class="music-scroll"><header class="music-header"><h1>${tabs.find(t=>t[0]===tab)?.[2]||'主页'}</h1>${account()}</header>
 ${tab==='search'?`<label class="music-search">${musicIcon('search')}<input name="music-search" placeholder="歌曲、艺人和专辑" value="${esc(query)}" autocomplete="off"></label><h2>资料库</h2><div class="music-tracks" ${showTrack?'':'hidden'}>${trackRows(query)}</div><p class="music-no-results" ${showTrack?'hidden':''}>未找到歌曲</p>`:tab==='library'?`<section class="music-library-list">${[['list','我的歌单'],['music','歌曲'],['library','专辑'],['user','艺人']].map(([icon,label])=>btn('music-browse',`${musicIcon(icon)}<span>${label}</span>${musicIcon('chevron-right')}`,'music-library-row',`data-category="${label}"`)).join('')}</section><h2>最近添加</h2><div class="music-albums">${tracks.map(album).join('')}</div>`:`<h2>最近播放</h2><div class="music-albums">${album(current)}</div><h2>你的音乐</h2><div class="music-tracks">${tracks.map(track).join('')}</div>`}</div>
 <div class="music-bottom"><div class="music-mini-player">${btn('music-open',`${cover('music-mini-art',current)}<span>${current.title}</span>`,'music-mini-title','aria-label="打开正在播放"')}${btn('music-toggle',musicIcon(playing?'pause':'play'),'music-mini-toggle',`aria-label="${playing?'暂停':'播放'}"`)}${btn('music-next',musicIcon('skip-forward'),'music-mini-toggle','aria-label="下一首"')}</div><nav class="music-tabs">${tabs.map(([id,glyph,label])=>btn('music-tab',`${musicIcon(glyph)}<span>${label}</span>`,tab===id?'active':'',`data-tab="${id}"`)).join('')}</nav></div></div>`;
}
export const musicAccount=()=>`<div class="music-account"><header><h2>帐户</h2>${btn('music-library','完成','music-done')}</header><div class="music-account-profile"><span>${APPLE_ACCOUNT_NAME[0]}</span><h1>${APPLE_ACCOUNT_NAME}</h1><small>Apple 帐户</small></div></div>`;
export const musicBrowse=(category,items=tracks)=>`<div class="music-browse"><header>${btn('music-library',`${musicIcon('chevron-left')}资料库`,'music-done')}</header><h1>${esc(category)}</h1><div class="music-tracks">${items.map(track).join('')}</div>${items.length?'':'<p class="music-no-results">还没有歌曲</p>'}</div>`;
