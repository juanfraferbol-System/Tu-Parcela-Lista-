import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const moduleDirectory = fileURLToPath(new URL('.', import.meta.url));
const siteRoot = resolve(moduleDirectory, '..', '..');
const portArgument = process.argv.indexOf('--port');
const requestedPort = portArgument >= 0 ? Number(process.argv[portArgument + 1]) : Number(process.env.PORT);
const port = Number.isInteger(requestedPort) && requestedPort > 0 ? requestedPort : 8765;
const host = '127.0.0.1';

const contentTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp'
};

function safePath(pathname) {
  const decoded = decodeURIComponent(pathname);
  const relative = decoded.endsWith('/') ? `${decoded}index.html` : decoded;
  const target = resolve(siteRoot, `.${relative}`);
  return target === siteRoot || target.startsWith(`${siteRoot}${sep}`) ? target : null;
}

const server = createServer(async (request, response) => {
  try {
    const requestUrl = new URL(request.url || '/', `http://${host}:${port}`);
    const target = safePath(requestUrl.pathname);
    if (!target || !(await stat(target)).isFile()) {
      response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      response.end('No encontrado');
      return;
    }
    const body = await readFile(target);
    response.writeHead(200, {
      'Cache-Control': 'no-store',
      'Content-Type': contentTypes[extname(target).toLowerCase()] || 'application/octet-stream'
    });
    response.end(body);
  } catch {
    response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    response.end('No encontrado');
  }
});

server.listen(port, host, () => {
  console.log(`Vista previa disponible en http://${host}:${port}/plataforma/publicar-parcela/`);
});

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => server.close(() => process.exit(0)));
}

