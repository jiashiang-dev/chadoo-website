import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { resolve, join, relative, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const dist = join(root, 'dist');
async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  return (await Promise.all(entries.map(entry => entry.isDirectory() ? walk(join(dir, entry.name)) : [join(dir, entry.name)]))).flat();
}
const emitted = new Set((await walk(dist)).map(file => relative(dist, file).replaceAll('\\', '/')));
let checked = 0;
function checkUrl(value, from = 'index.html') {
  if (/^(?:data:|https?:|#)/.test(value)) return;
  assert(!value.startsWith('/'), `Domain-root URL in ${from}: ${value}`);
  const target = relative(dist, resolve(dirname(join(dist, from)), value.split(/[?#]/)[0])).replaceAll('\\', '/');
  // Set comparison is case-sensitive even on Windows, as GitHub Pages requires.
  assert(emitted.has(target), `Missing/case-mismatched asset in ${from}: ${value}`);
  checked++;
}
const html = (await readFile(join(dist, 'index.html'), 'utf8')).replace(/<!--[\s\S]*?-->/g, '');
for (const match of html.matchAll(/(?:src|href|srcset)=["']([^"']+)["']/g)) checkUrl(match[1]);
for (const file of await walk(join(dist, 'src'))) {
  const text = await readFile(file, 'utf8');
  const name = relative(dist, file).replaceAll('\\', '/');
  if (file.endsWith('.css')) for (const m of text.matchAll(/url\(\s*["']?([^\s"')]+)["']?\s*\)/g)) checkUrl(m[1], name);
  if (file.endsWith('.js')) for (const m of text.matchAll(/["']((?:\.\/|\/)(?:images|videos|posters)\/[^"']+)["']/g)) checkUrl(m[1]);
}
let assets = 0;
for (const original of await walk(join(root, 'public'))) {
  const name = relative(join(root, 'public'), original);
  assert.deepEqual(await readFile(join(dist, name)), await readFile(original), `Asset bytes changed: ${name}`);
  assets++;
}
assert(emitted.has('.nojekyll'));
assert(!emitted.has('netlify.toml') && !emitted.has('AGENTS.md') && ![...emitted].some(name => name.startsWith('.qa/')));
console.log(`PASS: ${checked} local asset URLs resolve with exact casing; ${assets} public files preserved byte-for-byte; no Netlify routing required.`);
