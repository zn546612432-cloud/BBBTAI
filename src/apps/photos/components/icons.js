const paths={
  library:'<rect x="3" y="5" width="17" height="16" rx="2"/><rect x="7" y="2" width="14" height="16" rx="2"/><circle cx="15" cy="7" r="1.5"/><path d="m8 16 3-4 3 3 2-2 4 4"/>',
  collections:'<rect x="3" y="7" width="18" height="14" rx="2.5"/><path d="M6 4h12M8 2h8"/><path d="M5 9h14"/>',
  search:'<circle cx="10.8" cy="10.8" r="7.1"/><path d="m16.2 16.2 5 5"/>',
  more:'<circle cx="4.5" cy="12" r="1.5" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none"/><circle cx="19.5" cy="12" r="1.5" fill="currentColor" stroke="none"/>',
  person:'<circle cx="12" cy="7.8" r="4"/><path d="M4 21v-1.5a8 8 0 0 1 16 0V21"/>',
  filter:'<path d="M4 6h16M7 12h10M10 18h4"/>',
  chevron:'<path d="m8 10 4 4 4-4"/>',
  next:'<path d="m9 5 7 7-7 7"/>',
  clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v6l4 2"/>',
  memory:'<path d="M3 12a9 9 0 1 1 3 6.7M3 18v-6h6"/><path d="M12 7v6l4 2"/>',
  heart:'<path d="M20.7 8.2c0 5-8.7 11.3-8.7 11.3S3.3 13.2 3.3 8.2a4.6 4.6 0 0 1 8.7-2 4.6 4.6 0 0 1 8.7 2Z"/>',
  check:'<path d="m5 12 4.5 4.5L19 7"/>',
  share:'<path d="M12 16V2m0 0L7 7m5-5 5 5"/><path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7"/>',
  back:'<path d="m15.5 4-8 8 8 8"/>',
  trash:'<path d="M4 7h16M9 7V4h6v3m3 0-1 14H7L6 7M10 11v6m4-6v6"/>',
  plus:'<path d="M12 4v16M4 12h16"/>',
  play:'<path d="m9 5 11 7-11 7Z"/>',
  cloud:'<path d="M6 18a4 4 0 0 1-1-7.9 7 7 0 0 1 13-1.1 4.5 4.5 0 0 1 0 9Z"/>',
  close:'<path d="M5 5 19 19M19 5 5 19"/>',
  sliders:'<path d="M4 6h16M4 12h16M4 18h16"/><circle cx="9" cy="6" r="2" fill="white"/><circle cx="16" cy="12" r="2" fill="white"/><circle cx="11" cy="18" r="2" fill="white"/>',
  grid:'<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>'
};
export function phIcon(name,size=24){
 const path=paths[name]||paths.grid;
 return `<svg class="ph-icon ph-icon-${name}" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${path}</svg>`;
}
