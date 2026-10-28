// Consistent line art for every installed app; the glass tile is drawn by CSS.
const art={
wechat:'<path d="M5 11c0-4 4-7 9-7s9 3 9 7-4 7-9 7a13 13 0 0 1-4-.6L5 20l1-4a6 6 0 0 1-1-5Z"/><circle cx="11" cy="11" r=".8"/><circle cx="17" cy="11" r=".8"/>',
noapp:'<path d="M5 7c0-2 2-4 5-4h10c3 0 5 2 5 5v7c0 3-2 5-5 5h-4l-5 4v-4h-1c-3 0-5-2-5-5Z"/><path d="M13 10h5m-5 4h3"/><path d="M20 5v4m-2-2h4"/>',
chess:'<path d="M9 24h14M11 21h10l-2-5 2-3-5-9-7 7 4 3-2 7Z"/><path d="m11 11 4 2"/><circle cx="17" cy="9" r=".7"/>',
mirage:'<circle cx="16" cy="16" r="11"/><path d="M6 11 15 5l9 7-3 10-11 2-4-13Zm0 0 15 11m3-10L10 24M15 5l-5 19"/><circle cx="16" cy="16" r="2"/>',
ghost:'<path d="M6 25V13a10 10 0 0 1 20 0v12l-4-3-4 3-3-3-5 3-4-3Z"/><circle cx="12" cy="15" r="1"/><circle cx="20" cy="15" r="1"/>',
kira:'<path d="M9 3h10l6 6v17a3 3 0 0 1-3 3H9a3 3 0 0 1-3-3V6a3 3 0 0 1 3-3Zm10 0v6h6M10 14h10m-10 4h7"/><circle cx="21" cy="22" r="4"/>',
bank:'<path d="m3 12 13-8 13 8H3Zm3 14h20M4 29h24M8 14v10m5-10v10m6-10v10m5-10v10"/>',
schedule:'<rect x="5" y="6" width="22" height="22" rx="4"/><path d="M5 13h22M11 3v6m10-6v6M10 19h4m4 0h4m-12 5h4"/>',
messages:'<path d="M5 9a5 5 0 0 1 5-5h12a5 5 0 0 1 5 5v11a5 5 0 0 1-5 5h-8l-7 4v-4a5 5 0 0 1-2-4Z"/><path d="M10 14h12m-12 5h8"/>',
phone:'<path d="M9 4c-2-1-5 1-5 4 0 10 10 20 20 20 3 0 5-3 4-5l-5-4-4 3c-4-2-7-5-9-9l3-4-4-5Z"/>',
mail:'<rect x="3" y="7" width="26" height="19" rx="4"/><path d="m4 9 12 10L28 9"/>',
photos:'<path d="M16 16C8 3 4 7 10 17 1 17 3 24 13 21c-2 11 5 12 7 2 10 5 14-2 5-6 8-8 2-13-6-5 1-10-6-11-3 4Z"/><circle cx="16" cy="17" r="3"/>',
camera:'<rect x="3" y="9" width="26" height="19" rx="4"/><path d="m9 9 2-4h10l2 4"/><circle cx="16" cy="18" r="6"/><circle cx="25" cy="13" r=".8"/>',
files:'<path d="M3 10a4 4 0 0 1 4-4h7l3 4h8a4 4 0 0 1 4 4v10a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4Z"/><path d="M3 15h26"/>',
notes:'<path d="M8 3h11l6 6v19H8a3 3 0 0 1-3-3V6a3 3 0 0 1 3-3Zm11 0v6h6M10 15h12m-12 5h12m-12 5h7"/>',
maps:'<path d="m4 8 8-4 8 4 8-4v20l-8 4-8-4-8 4V8Zm8-4v20m8-16v20"/><circle cx="17" cy="15" r="3"/>',
browser:'<circle cx="16" cy="16" r="12"/><path d="M16 5c-6 7-6 15 0 22m0-22c6 7 6 15 0 22M4 16h24M7 9h18M7 23h18"/>',
instagram:'<rect x="4" y="4" width="24" height="24" rx="7"/><circle cx="16" cy="16" r="6"/><circle cx="23" cy="9" r="1"/>',
music:'<path d="M12 24V7l14-3v17M12 11l14-3"/><ellipse cx="8" cy="25" rx="4" ry="3"/><ellipse cx="22" cy="22" rx="4" ry="3"/>',
calendar:'<rect x="4" y="6" width="24" height="22" rx="4"/><path d="M4 13h24M10 3v6m12-6v6"/><path d="M11 18h4m4 0h3m-11 5h4"/>',
clock:'<circle cx="16" cy="16" r="12"/><path d="M16 8v9l6 4"/>',
weather:'<circle cx="12" cy="11" r="5"/><path d="M12 2v2m-9 7h2m3-7 1 2m8-2-1 2M7 26h18a5 5 0 0 0 0-10 7 7 0 0 0-13-1 6 6 0 0 0-5 11Z"/>',
aomi:'<circle cx="16" cy="16" r="11"/><path d="M6 21c5-2 6-8 10-8s5 6 10 8M10 10l2-3m8 0 2 3"/>',
settings:'<circle cx="16" cy="16" r="5"/><path d="m13 3 1 3h4l1-3 4 2-1 4 3 3 4-1v6l-4 1-1 3 2 4-4 3-3-3-4 1-2 3-5-2 1-4-3-3-4 1v-6l4-1 1-4-2-3 4-3Z"/>',
reminders:'<rect x="5" y="4" width="22" height="24" rx="4"/><path d="m9 11 2 2 4-4m2 3h6M9 20l2 2 4-4m2 3h6"/>'
};
export function iconArt(id){return `<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${art[id]||art.notes}</svg>`;}
