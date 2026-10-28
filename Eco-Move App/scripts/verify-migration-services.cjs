// Read-only integration checks. Only public Nagpur coordinates are sent.
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),esbuild=require('esbuild');
const app=path.resolve(__dirname,'..');
const env=Object.fromEntries(fs.readFileSync(path.join(app,'.env'),'utf8').split(/\r?\n/).flatMap(line=>{const m=line.match(/^([\w]+)\s*=\s*(.*)$/);return m?[[m[1],m[2].replace(/^['"]|['"]$/g,'')]]:[]}));
async function main(){
  const report={testedAt:new Date().toISOString(),checks:[]};
  const record=async(name,fn)=>{try{report.checks.push({name,...await fn()});}catch{report.checks.push({name,status:'unavailable'});}};
  const out=path.join(app,'artifacts/test-bundles/migration-live-services.cjs');
  esbuild.buildSync({stdin:{contents:"export {fetchNearbyLiveBuses} from './protected/src/lib/liveBus';",resolveDir:app,loader:'ts'},bundle:true,platform:'node',format:'cjs',outfile:out,alias:{'@':path.join(app,'protected/src')},define:{'import.meta.env':'{}'},logLevel:'silent'});
  await record('Chalo nearby telemetry',async()=>{
    const providerFetch=global.fetch;const responses=[];
    global.fetch=async(...args)=>{const r=await providerFetch(...args);responses.push(r.status);return r;};
    try{const buses=await require(out).fetchNearbyLiveBuses(21.1458,79.0882,2500);return {status:responses.some(s=>s===200)?'reachable':'unavailable',http:responses,vehicles:buses.length,timestamped:buses.filter(b=>b.time>0).length};}
    finally{global.fetch=providerFetch;}
  });
  await record('Supabase commuter table (anonymous read, no rows)',async()=>{
    const r=await fetch(env.VITE_SUPABASE_URL+'/rest/v1/commuter_profiles?select=user_id&limit=0',{headers:{apikey:env.VITE_SUPABASE_ANON_KEY||env.VITE_SUPABASE_PUBLISHABLE_KEY},signal:AbortSignal.timeout(12000)});
    return {status:r.ok?'reachable':'not verified',http:r.status,authenticatedWriteTested:false};
  });
  const {routingProxy}=require('./routing-proxy.cjs');
  const server=http.createServer((req,res)=>void routingProxy(req,res));
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  try{await record('Server-side ORS pedestrian route',async()=>{
    const r=await fetch(`http://127.0.0.1:${server.address().port}/api/routing/walk`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({coordinates:[[79.082,21.144],[79.083,21.146]]}),signal:AbortSignal.timeout(10000)});
    const value=await r.json();return {status:r.ok?'passed':'unavailable',http:r.status,geometryPoints:value.features?.[0]?.geometry?.coordinates?.length||0};
  });}finally{server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
  fs.writeFileSync(path.join(app,'artifacts/migration-services.json'),JSON.stringify(report,null,2));
  console.log(JSON.stringify(report,null,2));
}
main().catch(()=>{console.error('Service verification did not complete.');process.exitCode=1});
