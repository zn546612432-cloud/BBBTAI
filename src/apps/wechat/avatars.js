// User-supplied source images, preserved without recompression in public/.
// Fallback-by-name is intentional: older browser saves still contain letter avatars.
import {publicAssetPath,rebaseBundledPublicAsset} from '../../services/public-assets.js';
// Static assets live in public/, so Pages must prefix the deployed base path.
export const publicWeChatAsset=path=>{
 return publicAssetPath('apps/wechat/'+String(path).replace(/^\/+/, '').replace(/^apps\/wechat\//,''));
};
export const wechatAvatars=Object.freeze({
 '熙蒙':publicWeChatAsset('avatars/originals/ximeng.jpeg'),
 '熙旺':publicWeChatAsset('avatars/originals/xiwang.jpeg'),
 '阿威':publicWeChatAsset('avatars/originals/awei.jpeg'),
 '胡枫':publicWeChatAsset('avatars/originals/hufeng.jpeg'),
 '小辛':publicWeChatAsset('avatars/originals/xiaoxin.jpeg'),
 '仔仔':publicWeChatAsset('avatars/originals/zaizai.jpeg'),
 '傅隆生':publicWeChatAsset('avatars/originals/fulongsheng.jpeg')
});

export function resolveWeChatAvatar(name,source=''){
 const candidate=String(source||'');
 // Old saves can point to a previous /releases/<hash>/ folder; those
 // folders do not survive the next deployment. Rebase before rendering.
 const rebased=rebaseBundledPublicAsset(candidate);
 if(rebased!==candidate)return rebased;
 if(/^\/(?:apps\/wechat\/)/.test(candidate))return publicWeChatAsset(candidate);
 // Preserve custom uploaded data images and intentional remote portraits.
 if(/^(?:\/|data:image\/(?:png|jpeg|webp);base64,|https:\/\/|blob:)/i.test(candidate))return candidate;
 return wechatAvatars[name]||candidate||name?.slice(0,1)||'?';
}
