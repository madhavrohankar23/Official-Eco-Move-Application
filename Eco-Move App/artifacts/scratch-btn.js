const fs = require('fs');
const xml = fs.readFileSync('artifacts/dump.xml', 'utf8');
const btnIdx = xml.indexOf('bounds="[74,1092][254,1196]"');
console.log(xml.substring(btnIdx, btnIdx + 3000));
