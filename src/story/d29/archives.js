// Additional personal evidence remains inside the unlocked TAI folder.
const doc=(id,name,text)=>({id:'story-archive-'+id,name:name+'.enc',day:33,text,personal:true});
export const ORPHANAGE_ARCHIVES=[
 doc('intake','嬰兒收容登記表',`REN AI CHILDREN’S HOME, MACAU
INFANT ADMISSION RECORD
澳門仁愛福利院｜嬰兒收容登記表

檔案編號：027
收容日期：1997.05.18
收容時間：06:40

收容人數：3
性別：男
估計年齡：約三個月
出生日期：不詳
父母資料：不詳
親屬關係：疑似三胞胎

後續登記姓名

027-A　熙旺
027-B　熙蒙
027-C　熙泰

收容經過

三名男嬰於本院正門外被發現，置於一個紙箱內，以兩條棉被包裹。未發現任何身份證明文件、姓名或書信。

初步身體檢查

A　5.3 kg　穩定
B　4.9 kg　體重略低
C　5.1 kg　穩定

修女手記

今早開門時發現了他們。

最小的孩子哭了將近一個小時，另外兩個餵過奶後便安靜下來。

今晚先將三個孩子安置在同一間嬰兒室。

已拍照存檔。

Sr. Maria
18/5/97

附件：嬰兒收容登記表原件及照片`),
 doc('names','命名記錄',`旺、蒙、泰。

One more time.

願他們的人生都能有重新開始的機會。`),
 doc('adoption','領養登記表',`姓名：熙泰
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

// One transcription per original image. The encrypted intake and WebP share the same text.
export const ORPHANAGE_IMAGE_RECORDS=Object.freeze([
 {id:'resident-register',name:'兒童名冊.webp',text:"REN AI CHILDREN’S HOME, MACAU\nREGISTER OF RESIDENT CHILDREN\n澳門仁愛福利院｜在院兒童名冊\n\n年份：2002\n部門：住宿照護\n頁次：1/1\n僅供內部使用\n\n編號｜姓名｜性別｜年齡｜收容年份\n021｜梁子健｜男｜8｜1996\n022｜林嘉怡｜女｜7｜1996\n023｜黃文浩｜男｜6｜1997\n024｜陳曉晴｜女｜7｜1997\n025｜李家俊｜男｜6｜1997\n026｜周美琪｜女｜5｜1997\n027-A｜熙旺｜男｜5｜1997\n027-B｜熙蒙｜男｜5｜1997\n028｜胡楓｜男｜4｜1998\n029｜阿威｜男｜4｜1998\n030｜吳志明｜男｜5｜1998\n031｜小辛｜男｜3｜1999\n032｜仔仔｜男｜3｜1999\n033｜何嘉敏｜女｜4｜2000\n034｜鄭家豪｜男｜2｜2000\n035｜蘇雅婷｜女｜2｜2000（原填2001，手寫更正）\n\n健康狀況：全員良好\n\n備註\n021：就讀小學，情況穩定。\n027-A：027-B 的哥哥。\n027-B：佩戴眼鏡，下個月檢查視力。\n029：活躍。\n031：留意咳嗽。\n\n手寫備註\n027-A 與 027-B：安排在一起。\n027-B：下個月進行視力檢查。\n031：請再檢查他的咳嗽。\n\n核對：Sr. Maria"},
 {id:'infant-admission',name:'嬰兒收容登記表.webp',text:ORPHANAGE_ARCHIVES[0].text},
 {id:'xi-wang-record',name:'熙旺個人檔案.webp',text:"REN AI CHILDREN’S HOME, MACAU\nCHILD’S PERSONAL RECORD\n澳門仁愛福利院｜熙旺個人檔案\n\n檔案編號：027-A\n姓名：熙旺\n性別：男\n年齡：5歲\n出生年份：1997\n出生地：澳門（推定）\n收容年份：1997\n父母：不詳\n親屬：熙蒙（弟弟，027-B）\n住宿：男童宿舍\n\n健康記錄\n整體健康良好。\n無已知過敏。\n身體發育正常。\n\n日常觀察\n安靜，大致聽話。\n會幫年幼的孩子吃飯、穿衣。\n外出前經常等弟弟一起。\n通常會留一些食物給弟弟。\n上星期因弟弟的物品與另一名男童發生爭執。\n其後未再有相關事件。\n\n修女備註\n是個好孩子，很少為自己要甚麼。\n又發現他在弟弟床邊睡著了。\n記得給他一雙新鞋。\n\nSr. Maria\n2002"},
 {id:'xi-meng-record',name:'熙蒙個人檔案.webp',text:"REN AI CHILDREN’S HOME, MACAU\nCHILD’S PERSONAL RECORD\n澳門仁愛福利院｜熙蒙個人檔案\n\n檔案編號：C27-B（原件標示；名冊為027-B）\n姓名：熙蒙\n性別：男\n出生年份：1997\n年齡：5歲（2002年）\n出生地：澳門（推定）\n國籍：未確認\n收容年份：1997\n父母：不詳\n親屬：熙旺（哥哥，027-A）\n住宿：男童宿舍\n\n健康記錄\n整體健康良好。\n視力欠佳，已配眼鏡。\n需進一步檢查視力。\n\n日常觀察\n學習很快，對數字和益智遊戲特別感興趣。\n比起戶外遊戲，更喜歡閱讀或擺弄小物件。\n曾拆開活動室的一部舊收音機，把所有零件收在餅乾鐵盒裡。\n心情不好時通常會去找哥哥。\n\n修女備註\n好奇心很強，問題太多了！\n眼鏡又弄壞了，是哥哥拿來給我的。\n不喜歡一個人睡覺。\n\nSr. Maria\n2002"}
]);
