// Phone book and call history belong to the editable local save, not UI fixtures.
// Unknown story phone numbers are deliberately masked until authored.
export const defaultPhoneData=()=>({
  self:{name:'熙蒙',number:'+853 6XXX XXXX',region:'澳门'},
  contacts:[
    {id:'contact-brother',name:'哥',number:''},
    {id:'contact-dentist',name:'口腔前台',number:''},
    {id:'contact-fu',name:'傅隆生',number:''},
    {id:'contact-awai',name:'阿威',number:''},
    {id:'contact-xiaoxin',name:'小辛',number:''},
    {id:'contact-zaizai',name:'仔仔',number:''},
    {id:'contact-hufeng',name:'胡枫',number:''}
  ],
  calls:[
    {id:'macau-call-1',number:'+853 6XXX 0741',place:'澳门',day:'昨天',missed:false},
    {id:'macau-call-2',number:'+853 6XXX 0509',place:'澳门',day:'星期日',missed:true},
    {id:'macau-call-3',number:'+853 6XXX 0690',place:'澳门',day:'星期六',missed:false},
    {id:'macau-call-4',number:'+853 6XXX 6081',place:'澳门',day:'星期六',missed:false},
    {id:'macau-call-5',number:'+853 6XXX 5581',place:'澳门',day:'星期四',missed:false}
  ]
});

export function ensurePhoneData(state){
  if(!state.content.phone||!Array.isArray(state.content.phone.contacts)||!Array.isArray(state.content.phone.calls)){
    state.content.phone=defaultPhoneData();
    return true;
  }
  return false;
}

export const phoneData=state=>state.content.phone||defaultPhoneData();
