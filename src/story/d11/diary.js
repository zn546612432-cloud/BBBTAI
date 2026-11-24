// Canonical D11 5/29 meeting record. This belongs to the 日程 journal,
// not the Notes App. The five original sentences are deliberately unchanged.
export const MEETING_NOTE={id:'xm-note-d11-meeting',day:11,at:'22:00',title:'5/29 · 备忘',
 text:['今晚去了老地方。胡枫还在韩国，明晚落地。',
 '干爹前天回了澳门，住美景大厦。今晚烧烤时问起大家最近在忙什么。',
 '我提了汪杰那份五亿美元电子钱包的线索。现在还不能把话说满。',
 '三个月筹三千万。干爹要看我们做出的东西，不是听我吹。',
 '明天整理旧据点，哥晚上去机场接胡枫。'].join('\n')};

export const D11_DIARY={
 title:'老地方',
 afterNode:'return',
 availableAt:MEETING_NOTE.at,
 body:MEETING_NOTE.text
};
