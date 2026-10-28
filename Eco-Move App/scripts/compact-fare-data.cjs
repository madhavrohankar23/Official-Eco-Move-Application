// Lossless build representation: retain every route, key, fare and insertion order.
// The routing/fare service still receives the exact same plain JavaScript object.
function encode(data) {
  const names = [], index = new Map();
  const intern = name => {if (!index.has(name)) {index.set(name, names.length); names.push(name);} return index.get(name);};
  const routes = Object.entries(data).map(([route, fares]) => [route, Object.entries(fares).map(([key, fare]) => {
    const separator = key.indexOf(':');
    if (separator < 0) throw Error('Unexpected fare key; lossless compaction requires a pair separator.');
    return [intern(key.slice(0, separator)), intern(key.slice(separator + 1)), fare];
  })]);
  return {names, routes};
}
function decode({names, routes}) {
  return Object.fromEntries(routes.map(([route, pairs]) => [route, Object.fromEntries(pairs.map(([from, to, fare]) => [names[from] + ':' + names[to], fare]))]));
}
function moduleSource(data) {
  return `const packed=${JSON.stringify(encode(data))};const decode=${decode.toString()};export default decode(packed);`;
}
module.exports = {encode, decode, moduleSource};
