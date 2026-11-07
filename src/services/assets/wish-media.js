// One public-image origin for authored D06–D07 life photographs.
// Production never includes Supabase secret/service-role keys: these are
// immutable public assets and the Storage bucket is read-only to browsers.
const BASE='https://zmnufhswpnreeseyamlv.supabase.co/storage/v1/object/public/ximeng-assets';
export const D06_WISH_IMAGE_NAMES=Object.freeze([
 'celebration-dinner.jpg','celebration-street.jpg','celebration-cake.jpg',
 'keyboard-product.jpg','keyboard-received.jpg','keyboard-received-alternate.jpg',
 'shoes-product.jpg','shoes-received.jpg','headphones-product.jpg',
 'headphones-received.jpg','tableware-product.jpg','tableware-received.jpg'
]);
const allowed=new Set(D06_WISH_IMAGE_NAMES);
export function d06WishImage(name){
 if(!allowed.has(name))throw Error('Unknown authored D06 image asset');
 return BASE+'/d06/'+encodeURIComponent(name);
}
export const D06_WISH_IMAGES=Object.freeze(Object.fromEntries(
 D06_WISH_IMAGE_NAMES.map(name=>[name,d06WishImage(name)])
));
