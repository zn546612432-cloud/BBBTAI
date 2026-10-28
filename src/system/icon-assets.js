// Measured tile bounds exclude dark gutters; CSS clips each glass tile.
const original='/icons/glass-atlas.png',utilities='/icons/glass-utilities.png';
const originalIds=['wechat','camera','photos','notes','mail','browser','settings','phone','mirage','ghost','kira','bank','noapp','chess','music','files'];
const utilityIds=['calendar','weather','maps','clock','schedule','messages','reminders','aomi','instagram'];
export const iconAssets={};
originalIds.forEach((id,i)=>{iconAssets[id]={src:original,x:[37,339,641,942][i%4],y:[35,331,627,923][Math.floor(i/4)],w:276,h:272,size:1254};});
utilityIds.forEach((id,i)=>{iconAssets[id]={src:utilities,x:[40,443,839][i%3],y:[46,428,803][Math.floor(i/3)],w:[370,366,371][i%3],h:[356,352,359][Math.floor(i/3)],size:1254};});
