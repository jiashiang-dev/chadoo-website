// Package a plain static site for GitHub Pages without touching approved sources.
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { resolve, join, relative, posix } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const output = resolve(root, 'dist');
const files = new Map();

async function walk(directory, prefix = '') {
  const entries = await readdir(directory, { withFileTypes: true });
  const result = [];
  for (const entry of entries) {
    if (entry.isSymbolicLink()) throw new Error(`Symlink not supported in Pages output: ${entry.name}`);
    const name = posix.join(prefix, entry.name);
    if (entry.isDirectory()) result.push(...await walk(join(directory, entry.name), name));
    else if (entry.isFile()) result.push(name);
  }
  return result;
}

const html = await readFile(join(root, 'index.html'), 'utf8');
// Relative URLs preserve /chadoo-website/ (and work at a custom-domain root).
files.set('index.html', html.replace(/((?:src|href|srcset)=["'])\/(src|images|videos|posters)\//g, '$1./$2/'));

for (const name of await walk(join(root, 'src'))) {
  const content = await readFile(join(root, 'src', name));
  let result = content;
  if (name.endsWith('.js')) {
    // These are document-relative media URLs (e.g. video.src), not module imports.
    result = content.toString().replace(/(["'])\/(images|videos|posters)\//g, '$1./$2/');
  } else if (name.endsWith('.css')) {
    // CSS URLs resolve relative to the stylesheet, unlike video.src.
    const prefix = posix.relative(posix.dirname(`src/${name}`), '.') || '.';
    result = content.toString().replace(/(url\(\s*["']?)\/(images|videos|posters)\//g, `$1${prefix}/$2/`);
  }
  files.set(`src/${name}`, result);
}

// Copy every original public file byte-for-byte, without decoding or recompressing.
for (const name of await walk(join(root, 'public'))) {
  if (files.has(name)) throw new Error(`Conflicting output path: ${name}`);
  files.set(name, await readFile(join(root, 'public', name)));
}
files.set('.nojekyll', '');

// Never delete existing files. Refuse unexpected output rather than shipping it.
let previous = [];
try { previous = await walk(output); }
catch (error) { if (error.code !== 'ENOENT') throw error; }
for (const name of previous) {
  if (!files.has(name)) throw new Error(`Unexpected dist file: ${name}. Review it before rebuilding; nothing was deleted.`);
}
for (const [name, content] of files) {
  const target = resolve(output, name);
  if (relative(output, target).startsWith('..')) throw new Error(`Invalid output path: ${name}`);
  await mkdir(resolve(target, '..'), { recursive: true });
  await writeFile(target, content);
}
console.log(`Prepared ${files.size} files in dist/. Original sources and assets are unchanged.`);
