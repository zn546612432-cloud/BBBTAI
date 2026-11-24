// Author-approved 5/29 D11 journal: the original trigger and source scene are unchanged.
// The old Notes copy is kept here only as a strict signature for safe save migration.
export const LEGACY_MEETING_NOTE_TEXT="今晚去了老地方。胡枫还在韩国，明晚落地。\n干爹前天回了澳门，住美景大厦。今晚烧烤时问起大家最近在忙什么。\n我提了汪杰那份五亿美元电子钱包的线索。现在还不能把话说满。\n三个月筹三千万。干爹要看我们做出的东西，不是听我吹。\n明天整理旧据点，哥晚上去机场接胡枫。";
export const MEETING_NOTE={id:'xm-note-d11-meeting',day:11,at:'22:00',title:'老地方',
 text:"乾爹回澳門了，這幾天住在美景大廈。\n\n已經很久沒有像今晚這樣，大家聚在據點裡吃燒烤。炭火燒得正旺，熱氣混著煙往臉上撲，熏得我有些喘不過氣。\n\n乾爹問起我們往後的打算，弟弟們一個個興致勃勃。我原本只想聽他們說，卻忽然想起前幾個月登上報紙的汪傑，還有他在媒體面前大肆炫耀的電子錢包，終究沒忍住，說出了自己盤算已久的計劃。\n\n五億美元的比特幣。\n\n不必闖進金庫，不必費心搬運那些沉甸甸的鈔票。只要拿到那份密鑰，往後幾十年的日子便都有了著落。\n\n我特意帶了電腦，將之前贏下的十枚比特幣展示給乾爹看。\n\n不出所料，他對這些新玩意兒向來抱有疑心。畢竟在他眼裡，錢總該是看得見、摸得著的東西。如今卻有人告訴他，幾行數字就能值上億美元，換作是我，恐怕也不會輕易相信。\n\n我說得信誓旦旦，保證絕不會出問題，所有入侵工作都由我一個人負責。\n\n其實還有幾處反追蹤的問題沒有處理妥當。只是話已經說到這個份上，我也不願再露出半點猶豫。\n\n說來好笑，那一刻，我幾乎連自己都說服了。\n\n至於其他人，顯然也一樣。\n\n乾爹最終點了頭。\n\n畢竟，誰能對五億美元無動於衷？\n\n他提出由自己指揮現場，我自然沒有異議。\n\n反正我只需要負責網絡上的事。"};

export const D11_DIARY={
 title:'老地方',
 afterNode:'return',
 availableAt:MEETING_NOTE.at,
 body:MEETING_NOTE.text
};
