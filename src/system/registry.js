import * as wechat from '../apps/wechat/index.js';import * as noapp from '../apps/noapp/index.js';import * as chess from '../apps/chess/index.js';import * as mirage from '../apps/mirage/index.js';import * as ghost from '../apps/ghost/index.js';import * as kira from '../apps/kira/index.js';import * as bank from '../apps/bank/index.js';import * as schedule from '../apps/schedule/index.js';import * as messages from '../apps/messages/index.js';import * as phone from '../apps/phone/index.js';import * as mail from '../apps/mail/index.js';import * as photos from '../apps/photos/index.js';import * as camera from '../apps/camera/index.js';import * as files from '../apps/files/index.js';import * as notes from '../apps/notes/index.js';import * as maps from '../apps/maps/index.js';import * as browser from '../apps/browser/index.js';import * as music from '../apps/music/index.js';import * as calendar from '../apps/calendar/index.js';import * as clock from '../apps/clock/index.js';import * as weather from '../apps/weather/index.js';import * as aomi from '../apps/aomi/index.js';import * as settings from '../apps/settings/index.js';import * as reminders from '../apps/reminders/index.js';import * as editor from '../editor/index.js';
import * as phoneReplica from '../apps/phone/replica.js';
import * as messagesReplica from '../apps/messages/replica.js';
import * as weatherReplica from '../apps/weather/replica.js';
const modules=[wechat,noapp,chess,mirage,ghost,kira,bank,schedule,messages,phone,mail,photos,camera,files,notes,maps,browser,music,calendar,clock,weather,aomi,settings,reminders,editor];
export const registry=new Map(modules.map(m=>[m.manifest.id,m]));
// Native-style UI replicas are isolated within their app folders; retained
// implementations remain available for legacy fixtures and migrations.
for(const module of [phoneReplica,messagesReplica,weatherReplica])registry.set(module.manifest.id,module);
export const installed=s=>[...registry.values()].filter(m=>!m.manifest.hidden&&(!m.manifest.unlockDay||s.day>=m.manifest.unlockDay)).map(m=>m.manifest);
export const appById=id=>registry.get(id);
export const homePages=[['wechat','photos','camera','notes','calendar','weather','maps','clock'],['mirage','ghost','kira','bank','chess','files','music','schedule'],['reminders','aomi','browser','noapp','settings']];
export const dockApps=['phone','messages'];
