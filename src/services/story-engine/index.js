import {isStory55,taiRecognized} from '../story55/state.js';
// Future reviewed story packages register by day and trigger. Demo fixtures are never published story.
export function visibleEvents(state){return state.events.filter(e=>e.day<=state.day);}
export function availableApp(id,state){return isStory55(state)?(!['noapp','instagram'].includes(id)||taiRecognized(state)):id!=='noapp'&&id!=='instagram'||state.day>=56;}
export function loadReviewedContent(packageData){if(!packageData||packageData.reviewStatus!=='approved'||!Array.isArray(packageData.events))throw Error('仅可载入已审核剧情包');return packageData.events;}
