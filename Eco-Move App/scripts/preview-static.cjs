// Serve the verified web export locally without keeping Metro workers running.
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '../artifacts/final-export');
const mime = {'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css','.png':'image/png','.svg':'image/svg+xml','.json':'application/json','.wasm':'application/wasm','.task':'application/octet-stream'};
http.createServer(async (request,response)=>{
  if(await require('./routing-proxy.cjs').routingProxy(request,response))return;
  let file;
  try { file = path.resolve(root, '.' + decodeURIComponent(new URL(request.url,'http://localhost').pathname)); }
  catch { response.writeHead(400).end(); return; }
  if (file !== root && !file.startsWith(root + path.sep)) { response.writeHead(403).end(); return; }
  if (file === root) file = path.join(root,'index.html');
  fs.stat(file,(error,stat)=>{
    if(error || !stat.isFile()) { response.writeHead(404).end('Not found'); return; }
    response.writeHead(200,{'Content-Type':mime[path.extname(file)] || 'application/octet-stream','Content-Length':stat.size,'Cache-Control':'no-cache'});
    const stream=fs.createReadStream(file);
    stream.on('error',()=>response.destroy());
    stream.pipe(response);
  });
}).listen(8082,'127.0.0.1',()=>console.log('Verified export: http://127.0.0.1:8082'));
