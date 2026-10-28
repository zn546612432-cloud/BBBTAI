// User-supplied source images, preserved without recompression in public/.
// Fallback-by-name is intentional: older browser saves still contain letter avatars.
export const wechatAvatars=Object.freeze({
 '熙蒙':'/apps/wechat/avatars/originals/ximeng.jpeg',
 '熙旺':'/apps/wechat/avatars/originals/xiwang.jpeg',
 '阿威':'/apps/wechat/avatars/originals/awei.jpeg',
 '胡枫':'/apps/wechat/avatars/originals/hufeng.jpeg',
 '小辛':'/apps/wechat/avatars/originals/xiaoxin.jpeg',
 '仔仔':'/apps/wechat/avatars/originals/zaizai.jpeg'
});

export function resolveWeChatAvatar(name,source=''){
 const candidate=String(source||'');
 // A player-edited image takes priority over the bundled example asset.
 if(/^(?:\/|data:image\/(?:png|jpeg|webp);base64,|https:\/\/)/i.test(candidate))return candidate;
 return wechatAvatars[name]||candidate||name?.slice(0,1)||'?';
}
