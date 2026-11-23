import 'dotenv/config';
import express from 'express';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { WebSocketServer, WebSocket } from 'ws';
import { createApiApp } from './server/createApp.ts';
import { telegramService } from './server/telegramService.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function bootstrap() {
  let activeWsCount = 0;
  const app = createApiApp(() => activeWsCount);

  const httpServer = http.createServer(app);
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

  // Broadcast helper to all connected browser clients
  const broadcastWs = (messageObj: unknown) => {
    const serialized = JSON.stringify(messageObj);
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(serialized);
      }
    });
  };

  // Subscribe WebSocket server to authoritative roulette + Telegram state changes
  telegramService.subscribe((event) => {
    broadcastWs(event);
  });

  wss.on('connection', (ws) => {
    activeWsCount = wss.clients.size;
    (ws as WebSocket & { isAlive?: boolean }).isAlive = true;
    ws.on('pong', () => {
      (ws as WebSocket & { isAlive?: boolean }).isAlive = true;
    });
    ws.on('close', () => {
      activeWsCount = wss.clients.size;
    });
    ws.on('message', (raw) => {
      try {
        const parsed = JSON.parse(String(raw)) as { type?: string };
        if (parsed?.type === 'ping' && ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'pong', ts: Date.now() }));
        }
      } catch {
        // Ignore invalid client messages
      }
    });
    ws.send(
      JSON.stringify({
        type: 'state:init',
        payload: telegramService.getPublicState()
      })
    );
  });

  // Keep WebSocket connections alive across cloud proxies
  const wsHeartbeat = setInterval(() => {
    wss.clients.forEach((client) => {
      const tracked = client as WebSocket & { isAlive?: boolean };
      if (tracked.isAlive === false) {
        tracked.terminate();
        return;
      }
      tracked.isAlive = false;
      if (client.readyState === WebSocket.OPEN) {
        client.ping();
      }
    });
  }, 25000);

  wss.on('close', () => {
    clearInterval(wsHeartbeat);
  });

  // Frontend Serving (Vite middleware in Dev / dist static in Prod)
  if (process.env.NODE_ENV === 'production') {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false
      },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  }

  const port = Number(process.env.PORT) || 3000;
  httpServer.listen(port, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${port}`);
  });
}

bootstrap().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
