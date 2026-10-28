// WeChat-specific vector artwork. Icons stay independent from the phone's glass icon atlas.
// Every symbol is an SVG element, not a cropped screenshot, so it stays sharp on Retina displays.
const paths={
  chats:'<path d="M15.8 12.6a8.5 8.5 0 0 1-7.5 4.2c-1.1 0-2.2-.2-3.2-.6L2.2 18l.8-3.2A7.2 7.2 0 0 1 1.6 10c0-4.2 3.5-7.5 8.2-7.5 4.4 0 8 2.8 8.3 6.8"/><path d="M22.4 15.6c0 3.1-2.7 5.6-6.1 5.6-.9 0-1.8-.2-2.6-.5l-2.3 1 .7-2.4a5.4 5.4 0 0 1-1.8-4.1c0-3.2 2.7-5.8 6.1-5.8s6 2.8 6 6.2Z"/>',
  chatsFilled:'<path d="M10 2.3C5.3 2.3 1.5 5.5 1.5 9.8c0 1.8.7 3.4 1.9 4.7l-1 3.4 3.3-1.6c.9.3 2 .5 3 .5.1-4.9 4-8.2 8.8-8.2.3 0 .6 0 .9.1-.6-3.7-4.1-6.4-8.4-6.4Z" fill="currentColor" stroke="none"/><path d="M16.4 9.8c-3.5 0-6.3 2.5-6.3 5.6 0 3.1 2.8 5.6 6.3 5.6.8 0 1.6-.1 2.3-.4l2.8 1-.9-2.4a5.2 5.2 0 0 0 2.1-4.1c0-2.9-2.7-5.3-6.3-5.3Z" fill="currentColor" stroke="none"/><circle cx="6.7" cy="8.3" r=".8" fill="#f8f8f8" stroke="none"/><circle cx="12.4" cy="8.3" r=".8" fill="#f8f8f8" stroke="none"/><circle cx="14" cy="14.4" r=".65" fill="#f8f8f8" stroke="none"/><circle cx="18.8" cy="14.4" r=".65" fill="#f8f8f8" stroke="none"/>',
  contactsFilled:'<circle cx="10" cy="6.5" r="4.2" fill="currentColor" stroke="none"/><path d="M2.3 20c.5-5 3-7.2 7.7-7.2s7.2 2.2 7.7 7.2H2.3Z" fill="currentColor" stroke="none"/><path d="M17.8 13.4h4.6m-4.6 3.1h4.6m-4.6 3.1h4.6" stroke="currentColor" stroke-width="1.6"/>',
  contacts:'<path d="M15 14.4c3.3-1.5 4.3-3.4 4.3-6.2 0-4.4-2.6-7-6.6-7-3.9 0-6.5 2.6-6.5 7 0 2.8 1 4.7 4.3 6.2C6.8 15.6 2 18 2 21h15.2M18 16h4m-4 3h4"/>',
  compass:'<circle cx="12" cy="12" r="9.4"/><path d="m15.8 8.2-2.4 5.2-5.2 2.4 2.4-5.2 5.2-2.4Z"/>',
  me:'<path d="M16 7.6a4 4 0 1 1-8 0 4 4 0 0 1 8 0ZM3.2 21c.3-4.3 3.4-6.4 8.8-6.4s8.5 2.1 8.8 6.4H3.2Z"/>',
  meFilled:'<circle cx="12" cy="7.7" r="4.1" fill="currentColor" stroke="none"/><path d="M2.8 21c.4-4.6 3.3-6.7 9.2-6.7s8.8 2.1 9.2 6.7H2.8Z" fill="currentColor" stroke="none"/>',
  search:'<circle cx="10.7" cy="10.7" r="6.8"/><path d="m16 16 5 5"/>',
  plus:'<path d="M12 4v16M4 12h16"/>',
  more:'<circle cx="4" cy="12" r="1.2" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.2" fill="currentColor" stroke="none"/><circle cx="20" cy="12" r="1.2" fill="currentColor" stroke="none"/>',
  chevron:'<path d="m9 5 7 7-7 7"/>',
  personAdd:'<path d="M15 9a4 4 0 1 1-8 0 4 4 0 0 1 8 0ZM3.5 21c0-3.2 2.9-5.4 7.5-5.4 1.4 0 2.7.2 3.7.7M20 14v7m-3.5-3.5h7"/>',
  bubbles:'<path d="M20 10c0 4-3.6 7.3-8 7.3-1.4 0-2.7-.3-3.9-.8L4 18l1-3.6C4.4 13 4 11.5 4 10c0-4 3.6-7.3 8-7.3s8 3.3 8 7.3Z"/><path d="M15.3 18.3c1 1.4 3.1 2.5 5.4 2.4L20 18"/>',
  group:'<circle cx="9.2" cy="8" r="3"/><path d="M1.9 20c.3-3.9 2.7-5.9 7.3-5.9s7.1 2 7.4 5.9H1.9ZM15.3 5.4a2.7 2.7 0 0 1 1.2 5.2M18.2 14.8c2.5.4 3.6 2 3.9 4.7"/>',
  tag:'<path d="M12 3H5a2 2 0 0 0-2 2v7l9 9 9-9-9-9Z"/><circle cx="7.5" cy="7.5" r="1"/>',
  book:'<path d="M12 6C9.8 3.8 6.3 3.2 3 4v14c3.2-.8 6.8-.2 9 2 2.2-2.2 5.8-2.8 9-2V4c-3.3-.8-6.8-.2-9 2ZM12 6v14"/>',
  globe:'<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3.5 3.4 3.5 14.6 0 18M12 3c-3.5 3.4-3.5 14.6 0 18"/>',
  aperture:'<circle cx="12" cy="12" r="9"/><path d="m8 4 4.5 8m7-2h-9m4.9 9-3.7-8M4.7 14l8.9-2.6"/>',
  live:'<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4"/><circle cx="12" cy="12" r="1.1" fill="currentColor" stroke="none"/>',
  scan:'<path d="M8 3H4a1 1 0 0 0-1 1v4m13-5h4a1 1 0 0 1 1 1v4M3 16v4a1 1 0 0 0 1 1h4m13-5v4a1 1 0 0 1-1 1h-4M3 12h18"/>',
  mini:'<circle cx="12" cy="12" r="9"/><path d="M9 8.4c2 3.2 4 3.2 6 0 1.5 5.5-1.2 9.5-6 8.1"/>',
  service:'<path d="M11.3 3.7c-5 0-8.6 3-8.6 7 0 2.1 1 4 2.6 5.3l-1 3.7 3.5-1.9c1.2.5 2.2.6 3.6.6m4.1-11.8c3.7 0 6.2 2.5 6.2 5.6 0 1.6-.8 3-2.2 4.1l.5 3-3-1.3c-.8.3-1.5.4-2.4.4-3.3 0-6-2.4-6-5.5 0-3.5 2.9-6.3 6.9-6.3Z"/>',
  box:'<path d="m12 2.4 8.5 5v9.2L12 21.5l-8.5-4.9V7.4L12 2.4Z" stroke="#3b91f4"/><path d="m3.5 7.4 8.5 5 8.5-5" stroke="#ffbc36"/><path d="M12 12.4v9.1" stroke="#f25e65"/>',
  photo:'<rect x="3" y="4" width="18" height="16" rx="1.5"/><circle cx="8" cy="9" r="1.5"/><path d="m4 17 6-6 4 4 2-2 4 4"/>',
  work:'<rect x="5" y="6" width="14" height="14" rx="1"/><path d="M9 3h12v13M3 10v12h12"/>',
  shop:'<path d="M3 9 5 4h14l2 5M3 9c0 3 3.5 4 5 1 1 3 7 3 8 0 1.5 3 1.8 5-1v8H3v-8Z"/>',
  smile:'<circle cx="12" cy="12" r="9"/><path d="M8 14.4c1.7 2.3 6.3 2.3 8 0M8 9h.1M16 9h.1"/>',
  settings:'<path d="m9.5 2.8.6 2.2a8 8 0 0 1 3.8 0l.6-2.2 3.3 1.9-1.2 2a8.1 8.1 0 0 1 1.9 3.2l2.3.5v3.8l-2.3.5a8.1 8.1 0 0 1-1.9 3.2l1.2 2-3.3 1.9-.6-2.2a8 8 0 0 1-3.8 0l-.6 2.2-3.3-1.9 1.2-2a8.1 8.1 0 0 1-1.9-3.2l-2.3-.5v-3.8l2.3-.5a8.1 8.1 0 0 1 1.9-3.2l-1.2-2 3.3-1.9Z"/><circle cx="12" cy="12" r="2.6"/>',
  qr:'<path d="M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM15 14h2m4 0v4m-7 3h3m4-3v3m-5-4h1"/><path d="M5.5 5.5h2v2h-2zM16.5 5.5h2v2h-2zM5.5 16.5h2v2h-2z" fill="currentColor" stroke="none"/>'
};
export function wxIcon(name,size=24){
  const body=paths[name]||paths.chats;
  return '<svg class="wx-svg" xmlns="http://www.w3.org/2000/svg" width="'+size+'" height="'+size+'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+body+'</svg>';
}

