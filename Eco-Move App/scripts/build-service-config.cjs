const fs=require('node:fs');const path=require('node:path');
function parseServiceEnvironment(contents){
 const values={};
 for(const line of contents.split(/\r\n|\n|\r/)){
  const match=line.match(/^\s*(VITE_N8N_WEBHOOK_URL|VITE_N8N_TEST_WEBHOOK_URL)\s*=\s*(.*)$/);
  if(match)values[match[1]]=match[2].trim().replace(/^['"]|['"]$/g,'');
 }
 const config={production:values.VITE_N8N_WEBHOOK_URL||'',test:values.VITE_N8N_TEST_WEBHOOK_URL||''};
 if(!config.production)throw Error('Configure VITE_N8N_WEBHOOK_URL in the mobile .env before building.');
 for(const value of Object.values(config))if(value){const url=new URL(value);if(url.protocol!=='https:'||url.username||url.password||url.search||url.hash)throw Error('n8n public endpoint must use HTTPS without embedded credentials or query secrets.');}
 return config;
}
module.exports=function buildServiceConfig(){
 const app=path.resolve(__dirname,'..');const config=parseServiceEnvironment(fs.readFileSync(path.join(app,'.env'),'utf8'));
 fs.mkdirSync(path.join(app,'src/generated'),{recursive:true});
 fs.writeFileSync(path.join(app,'src/generated/serviceConfig.ts'),'// Generated from the app .env public VITE_N8N endpoints only. No credentials.\nexport const N8N_CONFIG = '+JSON.stringify(config)+' as const;\n');
};
module.exports.parseServiceEnvironment=parseServiceEnvironment;
if(require.main===module)module.exports();
