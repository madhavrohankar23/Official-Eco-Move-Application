const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const app = path.resolve(__dirname, '..');
const root = path.resolve(app, '..');
const baseline = JSON.parse(fs.readFileSync(path.join(app, 'docs/source-baseline.json')));
// Keep the initial baseline intact. Only the explicitly supplied environment refresh
// has a newer, exact checksum; later edits to that file still fail verification.
const environment = JSON.parse(fs.readFileSync(path.join(app, 'docs/environment-baseline.json')));
const migrationPath = path.join(app, 'docs/migration-manifest.json');
const migration = fs.existsSync(migrationPath) ? JSON.parse(fs.readFileSync(migrationPath)) : {files: []};
const migrated = new Map(migration.files.map(f => [f.path, f]));
let failures = [];
for (const f of baseline.files) {
  for (const [label, p] of [['original', path.join(root, f.path)], ...(fs.existsSync(path.join(app, 'protected', f.path)) ? [['copy', path.join(app, 'protected', f.path)]] : [])]) {
    const expected = label === 'original' && f.path === '.env' ? environment.sha256 : label === 'copy' && migrated.has(f.path) ? migrated.get(f.path).sha256 : f.sha256;
    if (!fs.existsSync(p) || crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex') !== expected) failures.push(`${label}: ${f.path}`);
  }
}
for (const f of migration.files) {
  const target = path.resolve(app, 'protected', f.path);
  if (!target.startsWith(path.resolve(app, 'protected') + path.sep) || !fs.existsSync(target) || crypto.createHash('sha256').update(fs.readFileSync(target)).digest('hex') !== f.sha256) failures.push(`migration: ${f.path}`);
}
if (failures.length) { console.error(failures.join('\n')); process.exit(1); }
console.log(`PASS: ${baseline.files.length - 1} original files match the initial baseline; original .env matches the user-supplied environment checkpoint; protected copies match initial hashes or ${migration.files.length} explicitly audited migration entries.`);
