// MIRAGE uses Macau Traditional Chinese for interface and displayed history.
// Conversion is presentation-only: authored source text and sent history stay intact.
const phrases=[
 ['漏洞扫描','漏洞掃描'],['扫描程序','掃描程式'],['密钥','密鑰'],
 ['前两天','前兩天'],['测试工具','測試工具'],['不及时','不及時'],
 ['联系','聯絡'],['消息','訊息'],['聊天','聊天'],
 ['比对','比對'],['已完成','已完成'],['账户','帳戶'],['数字币','數字幣'],
 ['打开','打開'],['检查','檢查'],['看到','看到']
];
const simplified='测扫发复开数换条里现间机动对个会问没做获过经刚进试给说还时门别应来来样报线较张从处风';
const traditionalChars='測掃發復開數換條裡現間機動對個會問沒做獲過經剛進試給說還時門別應來來樣報線較張從處風';
const charMap=new Map([...simplified].map((char,i)=>[char,[...traditionalChars][i]]));
export function traditional(input){
 let value=String(input??'');
 for(const [from,to] of phrases)value=value.replaceAll(from,to);
 return [...value].map(char=>charMap.get(char)||char).join('');
}
