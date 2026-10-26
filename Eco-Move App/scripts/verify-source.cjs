const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const app = path.resolve(__dirname, '..');
const root = path.resolve(app, '..');
const baseline = JSON.parse(fs.readFileSync(path.join(app, 'docs/source-baseline.json')));
// Keep the initial baseline intact. Only the explicitly supplied environment refresh
// has a newer, exact checksum; later edits to that file still fail verification.
const environment = JSON.parse(fs.readFileSync(path.join(app, 'docs/environment-baseline.json')));
let failures = [];
for (const f of baseline.files) {
  for (const [label, p] of [['original', path.join(root, f.path)], ...(fs.existsSync(path.join(app, 'protected', f.path)) ? [['copy', path.join(app, 'protected', f.path)]] : [])]) {
    const expected = label === 'original' && f.path === '.env' ? environment.sha256 : f.sha256;
    if (!fs.existsSync(p) || crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex') !== expected) failures.push(`${label}: ${f.path}`);
  }
}
if (failures.length) { console.error(failures.join('\n')); process.exit(1); }
console.log(`PASS: ${baseline.files.length - 1} original files match the initial baseline; original .env matches the user-supplied environment checkpoint; all protected copies match.`);
