// Run the source project's exact Vite email middleware as a local Node service.
// Server configuration stays in .env; this entry point is never bundled into the APK.
const fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const ts=require('typescript');
const app=path.resolve(__dirname,'..');
const file=path.join(app,'protected/vite.config.ts');
const source=fs.readFileSync(file,'utf8');
const tree=ts.createSourceFile(file,source,ts.ScriptTarget.Latest,true);
const wanted=['getDynamicEnv','emailServerPlugin'];
const declarations=tree.statements.filter(n=>ts.isFunctionDeclaration(n)&&wanted.includes(n.name?.text)).map(n=>n.getText(tree));
if(declarations.length!==2)throw Error('The original email middleware declarations were not found.');
const js=ts.transpileModule(declarations.join('\n')+'\nmodule.exports=emailServerPlugin;',{
  compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}
}).outputText;
const box={exports:{}};
new Function('require','module','fs','path','__dirname',js)(require,box,fs,path,app);
let handler;box.exports().configureServer({middlewares:{use:fn=>{handler=fn}}});
const port=Number(process.env.ECO_EMAIL_PORT||8099),host=process.env.ECO_EMAIL_HOST||'127.0.0.1';
http.createServer((req,res)=>{
  if(req.url==='/health'){res.setHeader('Content-Type','application/json');res.end(JSON.stringify({ok:true,service:'original-eco-move-email-middleware'}));return;}
  handler(req,res,()=>{res.statusCode=404;res.end('Not found');});
}).listen(port,host,()=>console.log(`Original Eco-Move email middleware listening at http://${host}:${port}`));
