import pack from '../../story/assets/xin-dog-stickers.json' with {type:'json'};

// Authored NPC media only. Delivery, spacing and persistence stay with messaging.
export const xinDogStickers=pack.assets;
export function xinDogSticker(idOrName){
 const asset=xinDogStickers.find(a=>a.id===idOrName||a.name===idOrName);
 if(!asset)throw Error('未知的小辛表情：'+idOrName);
 if(!asset.path)throw Error('这张表情的原图暂时不可用：'+asset.name);
 return asset.path;
}
