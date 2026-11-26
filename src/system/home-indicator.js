// Only app transitions restart the 3-second visual timer. Message and clock renders do not.
const indicators=new WeakMap();
export function syncHomeIndicator(phone,appId){
 let state=indicators.get(phone);
 if(state&&state.appId===appId)return;
 if(state)clearTimeout(state.timer);
 state={appId,timer:null};indicators.set(phone,state);
 phone.classList.remove('home-indicator-hidden');
 if(appId)state.timer=setTimeout(()=>{if(indicators.get(phone)===state)phone.classList.add('home-indicator-hidden');},3000);
}
