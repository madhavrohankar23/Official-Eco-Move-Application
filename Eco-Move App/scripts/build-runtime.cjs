const fs = require('node:fs');
const path = require('node:path');
const esbuild = require('esbuild');
const ts = require('typescript');
const app = path.resolve(__dirname, '..');
const src = path.join(app, 'protected/src');
const env = {};
const allowed = new Set(['VITE_SUPABASE_URL','VITE_SUPABASE_ANON_KEY','VITE_SUPABASE_PUBLISHABLE_KEY','VITE_ORS_API_KEY','VITE_GOOGLE_MAPS_API_KEY','VITE_CARTO_API_KEY']);
for (const line of fs.readFileSync(path.join(app,'.env'),'utf8').split(/\r?\n/)) {
  const m = line.match(/^\s*([^#=]+)=(.*)$/);
  if(m && allowed.has(m[1].trim())) env[m[1].trim()] = m[2].trim().replace(/^['"]|['"]$/g,'');
}
function extract(file, name) {
  const text=fs.readFileSync(path.join(src,file),'utf8');
  const sf=ts.createSourceFile(file,text,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
  let result;
  function visit(n) {if(ts.isVariableDeclaration(n) && n.name.getText(sf)===name) result=n.initializer.getText(sf);ts.forEachChild(n,visit)}
  visit(sf); if(!result)throw Error(`Missing source declaration ${name}`);return result;
}
fs.writeFileSync(path.join(app,'runtime/source-constants.ts'),
  '// Generated verbatim from source declarations. Do not edit.\n'+
  'export const REWARD_MILESTONES = '+extract('components/GreenRewardsPanel.tsx','REWARD_MILESTONES')+';\n'+
  'export const POPULAR_SAVED_PLACES = '+extract('routes/app.tsx','POPULAR_SAVED_PLACES')+';\n'+
  'export const POPULAR_ROUTE_PRESETS = '+extract('routes/app.tsx','POPULAR_ROUTE_PRESETS')+';\n'+
  'export const getUberDeepLink = (origin:any,destination:any,prod?:any) => ('+extract('components/CabOptions.tsx','getUberDeepLink')+')(prod);\n'+
  'export const ticketQrPayload = (currentTicket:any,isCompleted:boolean) => ('+extract('components/DigitalTicketPass.tsx','payloadData')+');\n'+
  'export const paymentQrPayload = (finalAmount:number,source:string,destination:string) => ('+extract('components/DummyPaymentModal.tsx','upiPayload')+');\n');
// The issuance handler contains business rules; extract it verbatim instead of rewriting them.
fs.writeFileSync(path.join(app,'runtime/source-issue.ts'),
  `import {generateTicketId,saveIssuedTicket} from '@/lib/ticketing';\n`+
  `import {saveUserTicket as persistTicket} from '@/services/ticketService';\n`+
  `import {recordTripCo2Savings as persistSavings} from '@/services/ecoRewardsService';\n`+
  `import {sendTicketConfirmationEmail as deliverEmail} from '@/services/emailService';\n`+
  `export async function issueFromSource(input:any,auth:any){\n`+
  `const writes:Promise<any>[]=[];const saveUserTicket=(...args:any[])=>{const p=persistTicket(...args);writes.push(p);return p};const recordTripCo2Savings=(...args:any[])=>{const p=persistSavings(...args);writes.push(p);return p};\n`+
  `const {selectedCategory,legs,fareSummary,passengers,paymentMethod,txnRef,emailDelivery}=input;\n`+
  `const {user,profile}=auth;const userId=user.id;const totalPassengerCount=passengers.adult+passengers.student+passengers.senior;\n`+
  `let issued:any;const setIssuedTicket=(t:any)=>{issued=t};const setIsPaymentOpen=()=>{};const onTicketPurchased=undefined;\n`+
  `const sendTicketConfirmationEmail=(params:any)=>emailDelivery?deliverEmail(params):Promise.resolve({success:false,message:'Email not requested'});\n`+
  `const handlePaymentSuccess=${extract('components/TicketBookingModal.tsx','handlePaymentSuccess')};\n`+
  `handlePaymentSuccess(paymentMethod,txnRef);await Promise.all(writes);return issued;\n}\n`);
async function main(){
  require('./build-service-config.cjs')();
  await require('./build-gestures.cjs')();
  const result=await esbuild.build({entryPoints:[path.join(app,'runtime/bootstrap.ts')],bundle:true,write:false,outdir:'out',minify:true,format:'iife',platform:'browser',target:'es2022',jsx:'automatic',alias:{'@':src},define:{'import.meta.env':JSON.stringify({...env,DEV:false}),'process.env.NODE_ENV':'"production"'},loader:{'.png':'dataurl'},logLevel:'warning'});
  const js=result.outputFiles.find(f=>f.path.endsWith('.js')).text;
  const css=(result.outputFiles.find(f=>f.path.endsWith('.css'))?.text||'')+fs.readFileSync(path.join(app,'runtime/map.css'),'utf8');
  const html='<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1"><title>Eco-Move map runtime</title><style>'+css+'</style></head><body><div id="root"></div><script>'+js.replace(/<\/script/gi,'<\\/script')+'</script></body></html>';
  fs.mkdirSync(path.join(app,'public/runtime'),{recursive:true});
  fs.writeFileSync(path.join(app,'assets/runtime.html'),html);
  fs.writeFileSync(path.join(app,'public/runtime/index.html'),html);
  console.log(`Protected runtime built: ${(Buffer.byteLength(html)/1024/1024).toFixed(1)} MB; ${Object.keys(env).length} public configuration keys. SMTP excluded.`);
}
main().catch(e=>{console.error(e.message);process.exit(1)});
