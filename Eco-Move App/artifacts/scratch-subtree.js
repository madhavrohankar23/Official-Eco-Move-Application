const fs = require('fs');
const xml = fs.readFileSync('artifacts/dump.xml', 'utf8');
// Find where "Airport" or "Destination" or "Starting point" or "Choose" is
const terms = ['Starting', 'Destination', 'Sitabuldi', 'Airport', 'buses', 'Bot'];
for (const t of terms) {
  let idx = 0;
  while ((idx = xml.indexOf(t, idx)) !== -1) {
    console.log('--- FOUND ' + t + ' AT ' + idx + ' ---');
    console.log(xml.substring(Math.max(0, idx - 400), Math.min(xml.length, idx + 400)));
    idx += t.length;
  }
}
