import {trackById} from './catalog.js';
import {publicAssetPath} from '../../../../services/public-assets.js';
const filled={play:'M8 5.5v13l11-6.5z',pause:'M7 5h4v14H7z M14 5h4v14h-4z','skip-forward':'M4 5v14l9-7-9-7z M13 5v14l9-7-9-7z','skip-back':'M20 5v14l-9-7 9-7z M11 5v14l-9-7 9-7z'};
export function musicIcon(name){
 if(filled[name])return `<svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor"><path d="${filled[name]}" stroke-linejoin="round"/></svg>`;
 if(name==='chevron-left')return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" aria-hidden="true"><path d="m15 5-7 7 7 7"/></svg>';
 return `<span class="music-icon" aria-hidden="true" style="--music-icon:url('${publicAssetPath(`assets/lucide/${name}.svg`)}')"></span>`;
}
export const cover=(cls,t=trackById())=>`<img class="${cls}" src="${t.cover}" alt="${t.title}" draggable="false">`;
