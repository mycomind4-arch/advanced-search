import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const types = { '.json': 'application/json; charset=utf-8', '.html': 'text/html; charset=utf-8' };
export function makeServer({ root = process.cwd() } = {}) {
  const base = resolve(root);
  const allowed = new Map([
    ['/', ['public/index.html', '.html']],
    ['/index.html', ['public/index.html', '.html']],
    ['/data/latest.json', ['data/latest.json', '.json']],
    ['/data/index.json', ['data/index.json', '.json']],
  ]);
  return createServer(async (req, res) => {
    const url = new URL(req.url ?? '/', 'http://localhost');
    if (req.method !== 'GET' || !allowed.has(url.pathname)) {
      res.writeHead(404); res.end('Not found'); return;
    }
    const [filename, ext] = allowed.get(url.pathname);
    try {
      const body = await readFile(resolve(base, filename));
      res.writeHead(200, { 'Content-Type': types[ext], 'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer',
        'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; connect-src 'self'; img-src 'self' data:; object-src 'none'; base-uri 'none'",
      });
      res.end(body);
    } catch (error) {
      res.writeHead(error.code === 'ENOENT' ? 404 : 500);
      res.end(error.code === 'ENOENT' ? 'Research data not found; run npm run scan' : 'Server error');
    }
  });
}
if (process.argv[1] && import.meta.url === new URL('file://' + resolve(process.argv[1])).href) {
  const port = Number(process.env.PORT ?? 8788);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Invalid port');
  makeServer().listen(port, '127.0.0.1', () => console.log('Intelligence dashboard: http://127.0.0.1:' + port));
}
