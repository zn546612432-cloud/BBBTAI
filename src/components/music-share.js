import {musicIcon,cover} from '../apps/music/features/shared/index.js';
export function renderMusicShareCard(track,s){
 const playing=s.musicPlaying&&s.musicTrack===track.id;
 return `<div class="noapp-music-card"><button type="button" data-action="noapp-play-music" data-track="${track.id}" aria-label="${playing?'暂停':'播放'}${track.title}" class="noapp-music-main">${cover('noapp-music-cover',track)}<span class="noapp-music-copy"><strong>${track.title}</strong><small>${track.artist}</small></span><span class="noapp-music-play">${musicIcon(playing?'pause':'play')}</span></button><div class="noapp-music-source"><span>♫</span> 音乐</div></div>`;
}
