// Author's uploaded IMG_4621(1).jpeg. Quantities are procurement goals.
// Windows Server appears twice in the image, representing one license.
export const HARDWARE_GOAL=[
 {id:'ws-case',category:'case',qty:1,name:'塔式工作站机箱'},
 {id:'ws-cpu',category:'cpu',qty:1,name:'Intel Xeon 6972P · 96 核 · 2.4GHz'},
 {id:'ws-cooler',category:'cooler',qty:1,name:'360 水冷散热器'},
 {id:'ws-ram',category:'ram',qty:12,name:'64GB DDR5 6400MHz ECC REG'},
 {id:'ws-ssd',category:'ssd',qty:1,name:'8TB M.2 NVMe SSD · PCIe 5.0'},
 {id:'ws-hdd',category:'hdd',qty:4,name:'16TB / 256MB / 7200 转 SATA 企业硬盘'},
 {id:'ws-raid',category:'raid',qty:1,name:'8 口 · 2GB 缓存 RAID 卡'},
 {id:'ws-gpu',category:'gpu',qty:2,name:'NVIDIA RTX Pro 6000 · 96GB 工作站版'},
 {id:'ws-psu',category:'psu',qty:1,name:'2400W + 2400W 双电源'},
 {id:'ws-os',category:'os',qty:1,name:'Windows Server 2025'},
 {id:'ws-platform',category:'motherboard',qty:1,name:'Intel Xeon 6 系列支持平台'}
];
export function hardwareOwned(s,id){return (s.story55?.d02?.purchased||[]).filter(p=>p.id===id).reduce((n,p)=>n+Math.max(0,Number(p.qty)||1),0);}
export const hardwareComplete=s=>HARDWARE_GOAL.every(p=>hardwareOwned(s,p.id)>=p.qty);
