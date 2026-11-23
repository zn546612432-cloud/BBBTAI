import {tracks} from '../shared/catalog.js';

export const playlistTracks=state=>tracks.filter(track=>state.musicPlaylist?.includes(track.id));
export function addPlaylistTrack(state,id){
 if(!tracks.some(track=>track.id===id))return;
 const saved=new Set(state.musicPlaylist||[]);
 saved.add(id);
 state.musicPlaylist=[...saved];
}
