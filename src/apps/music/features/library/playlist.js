import {tracks} from '../shared/catalog.js';

export const playlistTracks=state=>tracks.filter(track=>state.musicPlaylist?.includes(track.id));
export function togglePlaylistTrack(state,id){
 if(!tracks.some(track=>track.id===id))return;
 const saved=new Set(state.musicPlaylist||[]);
 if(saved.has(id))saved.delete(id);else saved.add(id);
 state.musicPlaylist=[...saved];
}
