// Historical notes left on the phone before the player's first day.
// These are fictional story credentials, not authentication for the Site.
export const authoredNotes = [
 {
  id:'xm-note-credentials',title:'账号',locked:true,authored:true,
  createdDay:1,updatedDay:1,updatedClock:'22:19',
  text:[
   'gh:     xm-0x7f-tmp1       pw: Tmp!1_Dust88',
   'gh:     lanternfish_04     pw: lf04#Harbor',
   'tg:     @nightbus_203      pw: 2fa 关了',
   'mail:   ghost.relay01@proton.example    pw: Relay01!Cold',
   'mail:   ghost.relay02@proton.example    pw: Relay02!Cold',
   'vps-hk-01   root   pw: HK01_taipa!77',
   'vps-hk-02   root   pw: HK02_taipa!78  (已弃)',
   'vps-sg-01   root   pw: sg01-Lotus#2210',
   'vps-de-01   root   pw: de01_Keller#9',
   'fofa 试用   xm_trial   pw: trial0926',
   '论坛 darkbox.example   id: 十七   pw: 十七_not_17'
  ].join('\n')
 },
 {
  id:'xm-note-ledger',title:'账',authored:true,
  createdDay:1,updatedDay:1,updatedClock:'20:24',
  text:[
   '08.20  设备            -38,200   现金',
   '08.25  氹仔房 3个月预付  -36,000   现金',
   '09.02  车 ×3           -61,500   现金',
   '09.09  VPS 年付         -4,800',
   '09.15  老头 预付        +200,000  分次',
   '09.28  哥 零花          -5,000',
   '10.04  卡 ×6           -1,200',
   '10.12  欠 老K          -20,000   拖',
   '10.20  水电·房东         -1,860',
   '10.24  胶带、锁、杂      -420'
  ].join('\n')
 },
 {
  id:'xm-note-links',title:'备查',authored:true,
  createdDay:1,updatedDay:1,updatedClock:'18:08',
  text:[
   'github.com/danielmiessler/SecLists            字典，必装',
   'github.com/swisskyrepo/PayloadsAllTheThings   备查',
   'github.com/sqlmapproject/sqlmap',
   'github.com/projectdiscovery/nuclei',
   'github.com/projectdiscovery/subfinder',
   'github.com/mitmproxy/mitmproxy                抓包调试，自己的流量',
   'github.com/frida/frida',
   'github.com/NationalSecurityAgency/ghidra',
   'github.com/jekil/awesome-hacking',
   'github.com/ibr2/Awesome-Hacking',
   'github.com/xm-0x7f/notes        私有，只放笔记',
   'github.com/xm-0x7f/relay-lab    私有，延迟测试',
   'github.com/xm-0x7f/dust         私有，清理脚本'
  ].join('\n')
 },
 {
  id:'xm-note-scratch',title:'7f_0a',authored:true,
  createdDay:1,updatedDay:1,updatedClock:'04:38',
  text:'8fd7:b4c1:e03a:2f\n0x6f0a >> zQ0/ƒ\n::84:11:0f:22::\nꙮ⊞◌  ░▒▓  7c-a0-a0\nN-03//Δλ//13-π\n7fffff?.0\n1100 0011 1001 ?_?\n⨯⨯⨯  ‹  08 14 08  ›\n\n\u2591\u2592\u2591\u2591  [00:00:00]\n...'
 }
];

export function ensureAuthoredNotes(s){
 const content=s.content;if(!content)return false;
 if(content.notesSeedVersion===1)return false;
 const notes=Array.isArray(content.notes)?content.notes:[];
 // Only drop the untouched sample, never a note edited by the player.
 const kept=notes.filter(n=>!(n.id==='note-1'&&n.demo&&n.title==='留到下次'&&n.text==='那盤棋，改天接著下。'));
 const known=new Set(kept.map(n=>n.id));
 for(const note of authoredNotes)if(!known.has(note.id))kept.push(structuredClone(note));
 content.notes=kept;content.notesSeedVersion=1;
 return true;
}
