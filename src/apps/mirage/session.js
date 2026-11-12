// Volatile MIRAGE login state. Never write a reusable login token to the save.
let active=false;
export function isMirageAuthenticated(){return active;}
export function setMirageAuthenticated(value){active=Boolean(value);}

// One-use, in-memory entry intent for the confirmed native Ghost share.
// Ordinary app opens and reloads retain the existing login behavior.
let ghostShareEntry=false;
export function prepareMirageGhostShareEntry(){ghostShareEntry=true;}
export function consumeMirageGhostShareEntry(){
 const prepared=ghostShareEntry;ghostShareEntry=false;return prepared;
}
