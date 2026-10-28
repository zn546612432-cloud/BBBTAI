// Backward-compatible alias: KIRA is the only installed mail app.
import {manifest as kira} from '../kira/index.js';
export {render,handle} from '../kira/index.js';
export const manifest={...kira,id:'mail',hidden:true};
