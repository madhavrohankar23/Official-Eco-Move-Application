const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '../..');
const out = path.resolve(__dirname, '../docs');
fs.mkdirSync(out, { recursive: true });
const files = [];
function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (['node_modules', '.git', 'Eco-Move App', 'dist', 'build'].includes(e.name)) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p);
    else {
      const bytes = fs.readFileSync(p);
      const rel = path.relative(root, p).replaceAll('\\', '/');
      const text = /\.(ts|tsx|css|json|sql|md|js)$/.test(rel) ? bytes.toString('utf8') : '';
      files.push({ path: rel, bytes: bytes.length, sha256: crypto.createHash('sha256').update(bytes).digest('hex'),
        classification: rel.startsWith('src/data/') || rel.endsWith('.sql') || rel==='agent.json' ? 'protected-data-or-workflow' : rel.startsWith('src/lib/') || rel.startsWith('src/services/') || rel.includes('AuthContext') || rel.includes('supabaseClient') ? 'protected-logic' : rel.startsWith('src/components/ui/') ? 'web-presentation-primitive' : rel.startsWith('src/components/') || rel.startsWith('src/routes/') ? 'mixed-presentation-and-orchestration' : 'configuration-or-asset',
        imports: [...text.matchAll(/(?:import|export)[\s\S]*?from\s+["']([^"']+)["']/g)].map(m=>m[1]),
        exports: [...text.matchAll(/export (?:async )?(?:function|class|const|interface|type) (\w+)/g)].map(m=>m[1]),
        browserDependencies: ['localStorage','sessionStorage','navigator.','window.','document.','import.meta.env'].filter(s=>text.includes(s)) });
    }
  }
}
walk(root);
fs.writeFileSync(path.join(out,'source-baseline.json'), JSON.stringify({phase:1,createdAt:new Date().toISOString(),files},null,2));
fs.writeFileSync(path.join(out,'FILE-INVENTORY.md'), '# Source file inventory\n\nEvery project-owned file is fingerprinted; installed third-party node_modules are represented by package.json and package-lock.json. Binary assets are inventoried, not interpreted as code.\n\n| File | Classification | Bytes | Dependencies |\n|---|---|---:|---|\n'+files.map(f=>`| ${f.path} | ${f.classification} | ${f.bytes} | ${f.imports.join(', ')} |`).join('\n')+'\n');
console.log(`Phase 1: inventoried and fingerprinted ${files.length} source files.`);
