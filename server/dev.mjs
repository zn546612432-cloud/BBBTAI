import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {existsSync} from 'node:fs';
import path from 'node:path';
import {loadEnvFile} from 'node:process';
import {handleAIGateway} from './ai-gateway.mjs';

// .env.local is gitignored; secrets never enter dist/ or the browser.
if(existsSync('.env.local'))loadEnvFile('.env.local');
const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.svg':'image/svg+xml','.json':'application/json','.wav':'audio/wav','.mp3':'audio/mpeg','.jpg':'image/jpeg','.webp':'image/webp'};
const root=path.resolve('dist');
http.createServer(async(req,res)=>{
  try{
    let p=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
    if(await handleAIGateway(req,res,p))return;
    if(p==='/')p='/index.html';
    const f=path.resolve(root,'.'+p);
    if(f!==root&&!f.startsWith(root+path.sep))throw Error('blocked');
    const b=await readFile(f);
    res.writeHead(200,{'Content-Type':types[path.extname(f)]||'application/octet-stream','Cache-Control':'no-store'});
    res.end(b);
  }catch{
    res.writeHead(404);res.end('Not found');
  }
}).listen(Number(process.env.PORT||process.argv[process.argv.indexOf('--port')+1])||5173,
  process.env.DEV_HOST||'127.0.0.1',()=>{
    console.log('BBBTAI local preview: http://localhost:'+(process.env.PORT||5173));
  });
