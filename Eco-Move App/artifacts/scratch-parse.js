const fs = require('fs');
const xml = fs.readFileSync('artifacts/dump.xml', 'utf8');
const nodes = xml.split('<node ');
for (const n of nodes) {
  const textM = n.match(/text="([^"]+)"/);
  const boundsM = n.match(/bounds="([^"]+)"/);
  const classM = n.match(/class="([^"]+)"/);
  if (textM && textM[1].trim()) {
    console.log(`${textM[1]} | ${classM ? classM[1] : ''} | ${boundsM ? boundsM[1] : ''}`);
  }
}
