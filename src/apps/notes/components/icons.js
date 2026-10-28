const paths={
 back:'<path d="m15.8 3.8-8.2 8.2 8.2 8.2"/>',
 more:'<circle cx="5" cy="12" r="1.7" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.7" fill="currentColor" stroke="none"/><circle cx="19" cy="12" r="1.7" fill="currentColor" stroke="none"/>',
 check:'<path d="m4 12 5.5 5.5L20 6"/>',
 search:'<circle cx="10.5" cy="10.5" r="7.1"/><path d="m16 16 5.2 5.2"/>',
 compose:'<path d="M11 4H6a3 3 0 0 0-3 3v11a3 3 0 0 0 3 3h11a3 3 0 0 0 3-3v-5"/><path d="M11 13 21 3m0 0h-6m6 0v6"/>',
 share:'<path d="M12 16V2m0 0L7 7m5-5 5 5"/><path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7"/>',
 microphone:'<rect x="9" y="2" width="6" height="13" rx="3"/><path d="M5 11v1a7 7 0 0 0 14 0v-1M12 19v3m-5 0h10"/>',
 chevron:'<path d="m7 10 5 5 5-5"/>',
 folder:'<path d="M3 7V5a2 2 0 0 1 2-2h5l2 3h7a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z"/>',
 checklist:'<circle cx="5" cy="6" r="2"/><path d="m4 6 1 1 2-3M11 6h10"/><circle cx="5" cy="17" r="2"/><path d="M11 17h10"/>',
 table:'<rect x="2" y="3" width="20" height="18" rx="2"/><path d="M2 9h20M2 15h20M10 3v18"/>',
 paperclip:'<path d="m8 12 8.4-8.4a4 4 0 0 1 5.6 5.6l-11.3 11.3a6 6 0 0 1-8.5-8.5L13.5 1.7"/>',
 pen:'<circle cx="12" cy="12" r="10"/><path d="m9 18 5-13 4 13M10.5 14h6"/>',
 format:'<path d="M4 19V5h16M8 14h8M11 9h5"/>',
 lock:'<rect x="5" y="10" width="14" height="12" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
 pin:'<path d="M8 3h8l-2 6 3 3v2H7v-2l3-3Zm4 11v8"/>',
 trash:'<path d="M4 7h16M9 7V4h6v3m3 0-1 14H7L6 7M10 11v6m4-6v6"/>',
 close:'<path d="M5 5 19 19M19 5 5 19"/>',
 plus:'<path d="M12 4v16M4 12h16"/>'
};
export function ntIcon(name,size=24){return `<svg class="nt-icon nt-icon-${name}" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name]||paths.folder}</svg>`;}
