// Volatile MIRAGE login state. Never write a reusable login token to the save.
let active=false;
export function isMirageAuthenticated(){return active;}
export function setMirageAuthenticated(value){active=Boolean(value);}
