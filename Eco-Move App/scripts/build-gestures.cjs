const fs=require('node:fs');
const path=require('node:path');
const esbuild=require('esbuild');
const app=path.resolve(__dirname,'..');
async function build(){
  const target=path.join(app,'public/gesture');
  fs.mkdirSync(target,{recursive:true});
  const result=await esbuild.build({entryPoints:[path.join(app,'runtime/gesture.ts')],bundle:true,write:false,format:'iife',platform:'browser',target:'es2022',minify:true,define:{'process.env.NODE_ENV':'"production"'}});
  const js=result.outputFiles[0].text.replace(/<\/script/gi,'<\\/script');
  const html='<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>html,body{margin:0;width:100%;height:100%;overflow:hidden;background:#102a23}video{width:100%;height:100%;object-fit:cover;transform:scaleX(-1)}#hint{position:absolute;inset:0;display:grid;place-items:center;color:#e3f3e9;font:12px system-ui}video{position:absolute;inset:0}</style></head><body><div id="hint">Camera preview</div><script>'+js+'</script></body></html>';
  fs.writeFileSync(path.join(target,'index.html'),html);
  fs.writeFileSync(path.join(app,'assets/gesture.html'),html);
  fs.cpSync(path.join(app,'node_modules/@mediapipe/tasks-vision/wasm'),path.join(target,'wasm'),{recursive:true});
  const model=path.join(target,'models/hand_landmarker.task');
  fs.mkdirSync(path.dirname(model),{recursive:true});
  if(!fs.existsSync(model)){
    // Reuse the user's original model byte-for-byte; never write to its folder.
    const source=path.join(app,'../public/models/hand_landmarker.task');
    if(fs.existsSync(source))fs.copyFileSync(source,model);
    else {
      const response=await fetch('https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task');
      if(!response.ok)throw Error('Hand model download failed: '+response.status);
      fs.writeFileSync(model,Buffer.from(await response.arrayBuffer()));
    }
  }
  if(fs.statSync(model).size<1000000)throw Error('Hand tracking model is incomplete');
  console.log('Camera runtime built; version-pinned WASM and hand model available for web. Native loads HTTPS model assets on demand.');
}
module.exports=build;
if(require.main===module)build().catch(e=>{console.error(e);process.exitCode=1});
