// Restrict AI context to events that actually happened and are visible at the current time.
export function allowedFacts(state){return state.events.filter(e=>e.day<=state.day&&!e.demo&&['chess_match_started','chess_move','message_sent'].includes(e.type)).map(e=>({...e}));}
