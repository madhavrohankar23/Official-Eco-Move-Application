// Narrow server-only ORS adapter. No arbitrary URLs or credentials accepted from clients.
const fs = require('node:fs');
const path = require('node:path');
function readKey() {
  if (process.env.ORS_API_KEY) return process.env.ORS_API_KEY;
  const envPath = path.join(__dirname, '../.env');
  if (!fs.existsSync(envPath)) return '';
  const match = fs.readFileSync(envPath, 'utf8').match(/^(?:VITE_)?ORS_API_KEY\s*=\s*(.+)$/m);
  return match?.[1].trim().replace(/^['"]|['"]$/g, '') || '';
}
function validCoordinates(points) {
  return Array.isArray(points) && points.length === 2 && points.every(point => Array.isArray(point) && point.length === 2 &&
    point.every(Number.isFinite) && point[0] >= 78.45 && point[0] <= 79.7 && point[1] >= 20.55 && point[1] <= 21.65);
}
const buckets = new Map();
async function routingProxy(req, res) {
  if (req.url !== '/api/routing/walk') return false;
  res.setHeader('Content-Type', 'application/json');
  const send = (status, body) => {res.statusCode = status; res.end(JSON.stringify(body));};
  if (req.method !== 'POST') {send(405, {error: 'POST required'}); return true;}
  const now = Date.now();
  for (const [key, value] of buckets) if (value.until <= now) buckets.delete(key);
  const id = req.socket.remoteAddress || 'local';
  const bucket = buckets.get(id) || {count: 0, until: now + 60000};
  buckets.set(id, bucket);
  if (++bucket.count > 40) {send(429, {error: 'Please retry shortly'}); return true;}
  try {
    const key = readKey();
    if (!key) {send(503, {error: 'Pedestrian provider is not configured'}); return true;}
    let raw = '';
    for await (const chunk of req) {raw += chunk; if (raw.length > 2048) {send(413, {error: 'Request too large'}); return true;}}
    const input = JSON.parse(raw);
    if (!validCoordinates(input.coordinates)) {send(400, {error: 'Two Nagpur coordinates required'}); return true;}
    const response = await fetch('https://api.openrouteservice.org/v2/directions/foot-walking/geojson', {
      method: 'POST', headers: {'Content-Type': 'application/json', Authorization: key},
      body: JSON.stringify({coordinates: input.coordinates, preference: 'shortest', geometry_simplify: false, instructions: false}),
      signal: AbortSignal.timeout(4500),
    });
    if (!response.ok) {send(response.status, {error: 'Pedestrian provider unavailable'}); return true;}
    const body = await response.json();
    send(200, {type: 'FeatureCollection', features: body.features});
  } catch {send(502, {error: 'Pedestrian routing unavailable'});}
  return true;
}
module.exports = {routingProxy, validCoordinates};
