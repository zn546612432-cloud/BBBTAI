// Approved optional daily Mirage exchange; the control marker separates
// dialogue before and after the real five LINK checks.
export const TEAR_DIALOGUES={
 'tear-15':[['me','你寫的程序，你自己來。'],['tai','？'],['tai','拿了我的錢，還要我替你幹活？'],['me','售後服務。'],['tai','呵。'],['tai','等著。'],['control',''],['tai','好了。下不為例。']],
 'tear-16':[['me','在嗎？'],['tai','不在。'],['me','那我等你回來。'],['tai','……'],['tai','發過來。'],['control',''],['tai','你倒是很會使喚人。']],
 'tear-17':[['me','Dr Ouroboros，今天有空嗎？'],['tai','無事獻殷勤。'],['me','博士果然聰明。'],['tai','少來這套。'],['tai','手拿開。'],['control',''],['tai','記得更新設備。']],
 'tear-18':[['tai','又來？'],['me','嗯。'],['tai','你是不是覺得我脾氣很好？'],['me','還不錯。'],['tai','你的判斷力令人擔憂。'],['control',''],['tai','行了。']],
 'tear-19':[['me','忙嗎？'],['tai','在喝咖啡。'],['me','那正好。'],['tai','哪裡好了？'],['me','反正你也沒事。'],['tai','……'],['control',''],['tai','咖啡都涼了。']],
 'tear-20':[['tai','今天又不想自己動手？'],['me','能者多勞。'],['tai','你可以試著誇得再真誠一點。'],['me','世界上最厲害的黑客。'],['tai','這還用你說？'],['control',''],['tai','不客氣。']],
 'tear-21':[['me','幫個忙。'],['tai','你現在連招呼都懶得打了？'],['me','Hello，Doctor.'],['tai','Seriously？'],['control',''],['tai','去忙你的吧。']],
 'tear-22':[['me','今天也拜託你了。'],['tai','你就不怕哪天我不理你？'],['me','你會嗎？'],['tai','說不準。'],['control',''],['tai','明天自己做。']],
 'tear-23':[['me','我又來了。'],['tai','看見了。'],['me','不是說明天自己做嗎？'],['tai','所以你為什麼還來？'],['me','看看你說話算不算數。'],['tai','嘖。'],['control',''],['tai','滿意了？']],
 'tear-24':[['me','最後一次。'],['tai','終於捨得放過我了？'],['me','程序快完成了。'],['tai','我知道。'],['tai','交給我吧。'],['control',''],['tai','剩下的，你自己來。'],['me','謝了。'],['tai','Good luck, nya.']]
};
export const isTearShare=p=>/^tear-(1[5-9]|2[0-4])$/.test(p?.script||'');
