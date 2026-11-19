// Additional personal evidence remains inside the unlocked TAI folder.
const doc=(id,name,text)=>({id:'story-archive-'+id,name:name+'.enc',day:33,text,personal:true});
export const ORPHANAGE_ARCHIVES=[
 doc('intake','嬰兒收容登記表',`澳門孤兒院

收容人數：三名
性別：男
親屬關係：三胞胎
生母資料：未載

登記姓名：
陳熙旺
陳熙蒙
陳熙泰

三名嬰兒同日收容，暫由院內修女照料。
附照片一張。`),
 doc('names','命名記錄',`旺、蒙、泰。

One more time.

願他們的人生都能有重新開始的機會。`),
 doc('adoption','領養登記表',`姓名：陳熙泰
性別：男
領養時年齡：三個月

領養人：葡萄牙籍夫婦

領養手續已辦妥。
孩子將隨養父母離開澳門，前往葡萄牙生活。
原中文姓名予以保留。`),
 doc('nun','修女手記',`今天，阿泰被接走了。

他的養母臨走前又問了一遍他的中文名字，還特意請我寫在紙上。

她問，另外兩個孩子怎麼辦。我告訴她，他們暫時還會留在這裡。

三個孩子的合照給了她一張，院裡也留了一張。

但願他長大以後，還記得自己有兩個哥哥。`)
];
