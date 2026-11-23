import {patchHTML} from './dom.js';

// Keep the actual home nodes mounted while Apps are open. Badges and widgets
// are patched on return; the icon atlas and its DOM nodes are never rebuilt.
export function renderPhoneScreen(screen,{home,body,showHome}){
 let homeLayer=screen.querySelector(':scope > [data-home-layer]');
 let appLayer=screen.querySelector(':scope > [data-app-layer]');
 if(!homeLayer){
  homeLayer=screen.ownerDocument.createElement('div');homeLayer.dataset.homeLayer='';
  appLayer=screen.ownerDocument.createElement('div');appLayer.dataset.appLayer='';
  screen.replaceChildren(homeLayer,appLayer);
 }
 if(showHome||!homeLayer.firstElementChild)patchHTML(homeLayer,home);
 homeLayer.classList.toggle('screen-inactive',!showHome);homeLayer.inert=!showHome;
 homeLayer.setAttribute('aria-hidden',String(!showHome));
 appLayer.classList.toggle('screen-inactive',showHome);appLayer.inert=showHome;
 appLayer.setAttribute('aria-hidden',String(showHome));
 patchHTML(appLayer,showHome?'':body);
}

export const activePhoneScreen=screen=>screen.querySelector(':scope > :not(.screen-inactive)')?.firstElementChild;
