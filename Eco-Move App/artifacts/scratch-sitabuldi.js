const fs = require('fs');
const xml = fs.readFileSync('artifacts/dump.xml', 'utf8');
const idx = xml.indexOf('Sitabuldi');
if (idx !== -1) {
  console.log(xml.substring(idx - 300, idx + 400));
} else {
  console.log('Not found');
}
