const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {execFileSync}=require('node:child_process');
const app=path.resolve(__dirname,'..');process.chdir(app);
const baseline=JSON.parse(fs.readFileSync('docs/migration-baseline.json','utf8'));
const ref=JSON.parse(fs.readFileSync('docs/migration-manifest.json','utf8')).targetBaseline;
const head=file=>execFileSync('git',['show',ref+':Eco-Move App/artifacts/final-export/'+file],{encoding:'utf8'});
const oldMeta=JSON.parse(head('metadata.json'));
const root='artifacts/migration-export',meta=JSON.parse(fs.readFileSync(root+'/metadata.json','utf8'));
const web=html=>html.match(/<script src="\/?([^"]+)"/)[1];
const previousBytes=file=>baseline.artifacts.find(f=>f.path.replace(/\\/g,'/')===file.replace(/\\/g,'/'))?.bytes;
const bytes=file=>fs.statSync(file).size;
const pair=(before,after)=>({before,after,changePercent:+((after-before)/before*100).toFixed(2)});
const report={measuredAt:new Date().toISOString(),runtime:pair(21407187,bytes('assets/runtime.html')),
  web:pair(previousBytes(web(head('index.html'))),bytes(root+'/'+web(fs.readFileSync(root+'/index.html','utf8')))),
  ios:pair(previousBytes(oldMeta.fileMetadata.ios.bundle),bytes(root+'/'+meta.fileMetadata.ios.bundle)),
  android:pair(previousBytes(oldMeta.fileMetadata.android.bundle),bytes(root+'/'+meta.fileMetadata.android.bundle)),
  apk:pair(55127749,bytes('artifacts/Eco-Move-Nagpur.apk'))};
const walk=dir=>fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(dir,e.name)):[path.join(dir,e.name)]);
report.freshExportBytes=walk(root).reduce((n,f)=>n+bytes(f),0);
const build=JSON.parse(fs.readFileSync('artifacts/runtime-metafile.json','utf8'));
report.largestRuntimeInputs=Object.values(build.outputs).flatMap(o=>Object.entries(o.inputs||{}).map(([file,x])=>({file,bytes:x.bytesInOutput}))).sort((a,b)=>b.bytes-a.bytes).slice(0,8);
report.runtimeSha256=crypto.createHash('sha256').update(fs.readFileSync('assets/runtime.html')).digest('hex');
fs.writeFileSync('artifacts/migration-bundle-sizes.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));
