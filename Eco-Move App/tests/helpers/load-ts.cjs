const vm=require('node:vm'),fs=require('node:fs'),esbuild=require('esbuild');
exports.load=(file,modules={},extra={})=>{
  const box={module:{exports:{}},exports:{},console,Date,Error,SyntaxError,URL,AbortController,setTimeout,clearTimeout,
    require:name=>{if(!(name in modules))throw Error('Unexpected import '+name);return modules[name]},...extra};
  vm.runInNewContext(esbuild.transformSync(fs.readFileSync(file,'utf8'),{loader:file.endsWith('tsx')?'tsx':'ts',format:'cjs'}).code,box);
  return box.module.exports;
};
exports.tick=()=>new Promise(resolve=>setImmediate(resolve));
exports.deferred=()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b});return {promise,resolve,reject}};
