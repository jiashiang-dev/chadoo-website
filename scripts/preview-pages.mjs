// Serve the actual artifact under a project URL, without localhost asset rewrites.
import { createServer } from 'node:http';
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { resolve, sep, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../dist/', import.meta.url));
const port = Number(process.env.PORT || 4173);
const base = process.env.PAGES_BASE || '/chadoo-website/';
if (!/^\/(?:[A-Za-z0-9_-]+\/)*$/.test(base)) throw new Error('PAGES_BASE must be / or a slash-delimited project path ending in /.');
const mime = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.mp4': 'video/mp4', '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.ico': 'image/x-icon' };

createServer(async (request, response) => {
  if (!['GET', 'HEAD'].includes(request.method)) return response.writeHead(405, { Allow: 'GET, HEAD' }).end();
  try {
    const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    if (base !== '/' && pathname === base.slice(0, -1)) return response.writeHead(301, { Location: base }).end();
    if (!pathname.startsWith(base)) return response.writeHead(404).end();
    const name = pathname.slice(base.length) || 'index.html';
    const file = resolve(root, name);
    if (!file.startsWith(resolve(root) + sep)) return response.writeHead(403).end();
    const info = await stat(file);
    if (!info.isFile()) return response.writeHead(404).end();
    const headers = { 'Content-Type': mime[extname(file)] || 'application/octet-stream', 'Accept-Ranges': 'bytes', 'Cache-Control': 'no-cache' };
    let start = 0, end = info.size - 1;
    if (request.headers.range) {
      const range = /^bytes=(\d*)-(\d*)$/.exec(request.headers.range);
      if (!range || (!range[1] && !range[2])) return response.writeHead(416, { 'Content-Range': `bytes */${info.size}` }).end();
      start = range[1] ? Number(range[1]) : Math.max(0, info.size - Number(range[2]));
      end = range[1] && range[2] ? Math.min(Number(range[2]), end) : end;
      if (start > end || start >= info.size) return response.writeHead(416, { 'Content-Range': `bytes */${info.size}` }).end();
      headers['Content-Range'] = `bytes ${start}-${end}/${info.size}`;
    }
    headers['Content-Length'] = Math.max(0, end - start + 1);
    response.writeHead(request.headers.range ? 206 : 200, headers);
    if (request.method === 'HEAD' || info.size === 0) return response.end();
    const stream = createReadStream(file, { start, end });
    stream.on('error', () => response.destroy());
    response.on('close', () => stream.destroy());
    stream.pipe(response);
  } catch {
    if (!response.headersSent) response.writeHead(404).end();
    else response.destroy();
  }
}).listen(port, '127.0.0.1', () => console.log(`Pages preview: http://127.0.0.1:${port}${base}`));
