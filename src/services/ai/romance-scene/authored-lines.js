// Approved dialogue only. Never add lines or emotional milestones without
// complete author review. Edges are free-text conditional, not UI buttons.
export const APPROVED_ROMANCE_LINES=Object.freeze({
 askLove:Object.freeze({id:'tai-romance-love-question-v1',text:'你就這麼想聽？'}),
 askSerious:Object.freeze({id:'tai-romance-feelings-question-v1',text:'……你認真的？'})
});
export const APPROVED_ROMANCE_GRAPH=Object.freeze({
 love_request:Object.freeze({enter:'askLove',edges:Object.freeze({askLove:Object.freeze({playful:'askSerious'})})}),
 feelings_question:Object.freeze({enter:'askSerious',edges:Object.freeze({})})
});
export function approvedRomanceLine(topic,node){
 const graph=APPROVED_ROMANCE_GRAPH[topic];
 if(!graph)return null;
 const key=node||graph.enter,line=APPROVED_ROMANCE_LINES[key];
 return line?{...line,key}:null;
}
