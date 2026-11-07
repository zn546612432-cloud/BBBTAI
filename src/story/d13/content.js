// Verbatim D13 from the saved 稱呼修訂版 (2026-11-07 14:40:23 UTC).
// One row is one authored turn; no truncation to the former 7/8/9 anchors.
export const D13_SOURCE='libfile_2fc50bddc858819190faed543e2825a8';
export const D13_LINES=[
 ['system','屏幕失去響應，重啟沒有恢復。'],
 ['ouroboros','膽子不小。上次拿了錢，還想回來看看有沒有第二份？'],
 ['me','你故意設局？你到底想幹什麼？'],
 ['ouroboros','從來沒有人拒絕過我的邀請。你是第一個。'],
 ['me','你查了我的資料？'],
 ['ouroboros','你的手機比你本人坦率得多。'],
 ['ouroboros','汪傑。五億美元。你的胃口倒是很大。'],
 ['call','未知號碼來電'],
 ['ouroboros','晚上好，nya。歡迎來到 Mirage。看來你不喜歡打字，我只好親自打電話了。'],
 ['me','……你到底是誰？'],
 ['ouroboros','這不重要。重要的是，你應該也不想自己的計劃被別人知道吧？'],
 ['me','你把資料傳出去，就一定會留下痕跡。只要有痕跡，我就找得到你。'],
 ['ouroboros','呵呵，別這麼緊張。我對揭發你沒興趣。恰恰相反，我想參與。'],
 ['me','我憑什麼相信你？'],
 ['ouroboros','事到如今，你有拒絕的權利嗎？'],
 ['system','〔熙蒙正在開啟反追蹤〕'],
 ['ouroboros','別急著追蹤我。放心，我沒有惡意，只是想看看，大名鼎鼎的 nya 究竟能走多遠。'],
 ['me','你有病吧？我說過了，我只單幹。'],
 ['ouroboros','可你的手機裡那些資料告訴我，你似乎不止一個人。'],
 ['system','〔反追蹤失敗〕'],
 ['ouroboros','呵呵，我已經提醒過你了，追蹤我只是白費工夫。晚安，熙蒙。記得檢查你的郵箱。']
];
export const D13_VOICE_INDICES=D13_LINES.flatMap(([actor],index)=>index>7&&actor==='ouroboros'?[index]:[]);
export const D13_LEGACY_LINES=[
 ['system','屏幕失去响应，重启没有恢复。'],
 ['ouroboros','你已经拿走过一次奖池，还敢沿着原来的入口回来；看来你比我原先估计的更愿意冒险。'],
 ['me','你算计我有什么目的？'],
 ['ouroboros','从来没有人敢拒绝我，你是第一个，陈熙蒙。'],
 ['me','你怎么知道我的名字？'],
 ['ouroboros','你手机里的消息比你想的多。看来你要做的事，也不只那十枚比特币。'],
 ['call','未知号码来电'],
 ['ouroboros','晚上好熙蒙。欢迎来到mirage。看起来你不喜欢打字，那么我只好给你打电话了。你应该也不想自己的计划被泄露出去吧。'],
 ['me','你要干什么？'],
 ['ouroboros','我想参与这件事情，而且我能提供你现在缺少的技术和资源；我想看看，你究竟有能力走多远。']
];
