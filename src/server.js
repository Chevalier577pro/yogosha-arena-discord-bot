import { createServer } from 'node:http';

/**
 * Serveur HTTP minimal, uniquement pour les hébergeurs qui exigent un port
 * (Render, Railway, Fly…). En local, sans variable PORT, il ne démarre pas et
 * le bot fonctionne exactement comme avant.
 *
 *   GET /health -> { ok: true, ready: true, bot: "...", guilds: 3 }
 */
let server = null;

export function startHealthServer(getStatus) {
  if (server) return server;

  const port = Number(process.env.PORT);
  if (!Number.isInteger(port) || port <= 0) return null;

  server = createServer((request, response) => {
    if (request.url === '/' || request.url === '/health') {
      let body;

      try {
        body = JSON.stringify({ ok: true, ...getStatus() });
      } catch {
        body = JSON.stringify({ ok: true });
      }

      response.writeHead(200, {
        'content-type': 'application/json; charset=utf-8',
        'cache-control': 'no-store',
      });
      response.end(body);
      return;
    }

    response.writeHead(404, { 'content-type': 'application/json; charset=utf-8' });
    response.end(JSON.stringify({ ok: false, error: 'not found' }));
  });

  server.on('error', (error) => {
    console.error('[health] échec du serveur HTTP :', error.message);
  });

  server.listen(port, '0.0.0.0', () => {
    console.log(`[health] à l’écoute sur le port ${port} — /health`);
  });

  return server;
}

export function stopHealthServer() {
  if (server) {
    server.close();
    server = null;
  }
}
