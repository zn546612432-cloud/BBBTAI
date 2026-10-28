import {uid} from '../../../../services/id.js';
const saved=(ctx,id)=>ctx.store.get().content.photos?.find(p=>p.id===id);
export function handleViewerAction(action,target,ctx){
 const id=target.dataset.id;
 if(action==='photos-favorite'){
  if(saved(ctx,id))ctx.store.update(s=>{const p=s.content.photos.find(p=>p.id===id);p.favorite=!p.favorite;});
  return true;
 }
 if(action==='photos-wallpaper'){
  const p=saved(ctx,id);
  if(p){ctx.store.update(s=>{s.wallpaper=p.src;});ctx.toast('已设为壁纸');}
  return true;
 }
 if(action==='photos-share'){
  const p=saved(ctx,id);
  if(!p)return true;
  if(ctx.store.get().day<56)throw Error('NoApp 尚未开放');
  ctx.store.update(s=>s.content.conversations.noapp[0].messages.push({id:uid(),from:'me',text:p.src,kind:'image',time:s.clock,actual:true}));
  ctx.router.open({appId:'noapp',route:'/chat/tai'});
  return true;
 }
 if(action==='photos-delete'){
  const p=saved(ctx,id);
  if(!p)return true;
  if(!globalThis.confirm?.('确定删除这张照片吗？此操作不可撤销。'))return true;
  ctx.store.update(s=>{s.content.photos=s.content.photos.filter(item=>item.id!==p.id);});
  ctx.router.back();return true;
 }
 return false;
}
