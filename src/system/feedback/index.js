// Reusable feedback used by the NoApp hold button and future call controls.
// iOS Safari often lacks Vibration API; visual feedback never depends on it.
export function impact(kind='light'){
 const pattern=kind==='cancel'?25:kind==='success'?15:9;
 try{globalThis.navigator?.vibrate?.(pattern);}catch{}
}
export function pressFeedback(element){
 if(!element)return;
 element.classList.add('is-pressed');
 impact('light');
}
export function releaseFeedback(element,{cancel=false}={}){
 if(!element)return;
 element.classList.remove('is-pressed');
 if(cancel)impact('cancel');else impact('success');
}
