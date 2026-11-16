import 'dotenv/config';
import express from 'express';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { WebSocketServer, WebSocket } from 'ws';
import { telegramService } from './server/telegramService.ts';
import type { BankrollConfig, StrategyTier } from './src/types/roulette.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function bootstrap() {
  const app = express();
  app.use(express.json({ limit: '1mb' }));

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
    ws.send(
      JSON.stringify({
        type: 'state:init',
        payload: telegramService.getPublicState(),
      })
    );
  });

  // ---------------------------------------------------------------------------
  // REST API Routes
  // ---------------------------------------------------------------------------
  app.get('/api/health', (_req, res) => {
    res.json({
      ok: true,
      timestamp: Date.now(),
      connectedClients: wss.clients.size,
      telegram: telegramService.getPublicTelegramConfig(),
    });
  });

  app.get('/api/state', (_req, res) => {
    res.json(telegramService.getPublicState());
  });

  app.post('/api/settings', (req, res) => {
    const body = req.body as {
      selectedStrategy?: StrategyTier;
      bankrollConfig?: Partial<BankrollConfig>;
      currentTableId?: string;
      currentStep?: number;
    };

    const state = telegramService.updateClientSettings({
      selectedStrategy: body?.selectedStrategy,
      bankrollConfig: body?.bankrollConfig,
      currentTableId: body?.currentTableId,
      currentStep: body?.currentStep,
    });
    res.json({ ok: true, state });
  });

  app.post('/api/spins', async (req, res) => {
    const rawNum = req.body?.number;
    const num = typeof rawNum === 'number' ? rawNum : parseInt(String(rawNum), 10);
    if (!Number.isInteger(num) || num < 0 || num > 36) {
      res.status(400).json({ ok: false, error: 'ตัวเลขต้องอยู่ระหว่าง 0 ถึง 36' });
      return;
    }

    const source = (req.body?.source as 'app' | 'telegram' | 'wheel' | 'stream') || 'app';
    const skipBroadcast = Boolean(req.body?.skipBroadcast);
    const telegramSender = typeof req.body?.telegramSender === 'string' ? req.body.telegramSender : undefined;

    const outcome = await telegramService.processSpinNumber({
      number: num,
      source,
      telegramSender,
      skipBroadcast,
    });

    res.json({
      ok: true,
      ...outcome,
      state: telegramService.getPublicState(),
    });
  });

  app.post('/api/spins/undo', (_req, res) => {
    const state = telegramService.undoLastSpin();
    res.json({ ok: true, state });
  });

  app.post('/api/spins/reset', (req, res) => {
    const keepSpins = Boolean(req.body?.keepSpins);
    const state = telegramService.resetSession(keepSpins);
    res.json({ ok: true, state });
  });

  app.post('/api/spins/import', (req, res) => {
    const numbers = req.body?.numbers;
    if (!Array.isArray(numbers)) {
      res.status(400).json({ ok: false, error: 'กรุณาส่งรายการตัวเลขเป็น array' });
      return;
    }
    const state = telegramService.importNumbers(numbers);
    res.json({ ok: true, state });
  });

  // ---------------------------------------------------------------------------
  // Telegram Integration API Routes
  // ---------------------------------------------------------------------------
  app.post('/api/telegram/config', async (req, res) => {
    const body = req.body || {};
    const config = await telegramService.updateTelegramConfig({
      botToken: typeof body.botToken === 'string' ? body.botToken : undefined,
      chatId: typeof body.chatId === 'string' ? body.chatId : undefined,
      pollingActive: typeof body.pollingActive === 'boolean' ? body.pollingActive : undefined,
      autoBroadcastOnAppSpin:
        typeof body.autoBroadcastOnAppSpin === 'boolean' ? body.autoBroadcastOnAppSpin : undefined,
      autoBroadcastOnTelegramSpin:
        typeof body.autoBroadcastOnTelegramSpin === 'boolean' ? body.autoBroadcastOnTelegramSpin : undefined,
      includeFullStatsInBroadcast:
        typeof body.includeFullStatsInBroadcast === 'boolean' ? body.includeFullStatsInBroadcast : undefined,
      clearToken: Boolean(body.clearToken),
    });

    res.json({
      ok: true,
      telegramConfig: config,
      state: telegramService.getPublicState(),
    });
  });

  app.get('/api/telegram/detect-chats', async (_req, res) => {
    const chats = await telegramService.scanForChats();
    res.json({
      ok: true,
      chats,
      state: telegramService.getPublicState(),
    });
  });

  app.post('/api/telegram/broadcast', async (req, res) => {
    const customHeader = typeof req.body?.customHeader === 'string' ? req.body.customHeader.trim() : undefined;
    const html = telegramService.formatPredictionMessageHtml({
      customHeader: customHeader || undefined,
    });
    const result = await telegramService.sendTelegramMessage(html, 'broadcast_prediction');
    res.json({
      ...result,
      previewText: html.replace(/<[^>]+>/g, ''),
      state: telegramService.getPublicState(),
    });
  });

  app.post('/api/telegram/send-custom', async (req, res) => {
    const message = typeof req.body?.message === 'string' ? req.body.message.trim() : '';
    if (!message) {
      res.status(400).json({ ok: false, error: 'กรุณากรอกข้อความก่อนส่ง' });
      return;
    }

    const escaped = message
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    const html = `📢 <b>ประกาศจากห้องวิเคราะห์ Roulette Predictor Pro</b>\n\n${escaped}`;
    const result = await telegramService.sendTelegramMessage(html, 'custom_message');

    res.json({
      ...result,
      state: telegramService.getPublicState(),
    });
  });

  // Official Telegram Webhook endpoint (for public production URLs)
  app.post('/api/telegram/webhook', async (req, res) => {
    try {
      const result = await telegramService.handleTelegramUpdate(req.body || {});
      res.json({ ok: true, ...result });
    } catch (err) {
      res.json({ ok: false, error: err instanceof Error ? err.message : 'Webhook handling error' });
    }
  });

  app.post('/api/telegram/set-webhook', async (req, res) => {
    const baseUrl = (process.env.APP_URL || req.body?.baseUrl || '').replace(/\/$/, '');
    if (!baseUrl || !baseUrl.startsWith('https://')) {
      res.status(400).json({
        ok: false,
        error: 'Webhook ต้องใช้ HTTPS URL สาธารณะ (สำหรับระบบพัฒนา ใช้โหมด Polling อัตโนมัติได้เลยไม่ต้องตั้ง Webhook)',
      });
      return;
    }

    const webhookUrl = `${baseUrl}/api/telegram/webhook`;
    telegramService.stopPolling();
    const apiRes = await telegramService.callTelegramApi('setWebhook', {
      url: webhookUrl,
      allowed_updates: ['message', 'channel_post'],
    });

    res.json({
      ok: apiRes.ok,
      description: apiRes.description,
      webhookUrl,
      state: telegramService.getPublicState(),
    });
  });

  // Local test simulator to verify Telegram -> App -> Telegram roundtrip
  app.post('/api/telegram/simulate-incoming', async (req, res) => {
    const text = typeof req.body?.text === 'string' ? req.body.text.trim() : '';
    const senderName = typeof req.body?.senderName === 'string' ? req.body.senderName.trim() : 'สมาชิกกลุ่ม Telegram';
    if (!text) {
      res.status(400).json({ ok: false, error: 'กรุณาพิมพ์ข้อความจำลอง เช่น 17 หรือ ออก 22' });
      return;
    }

    const currentCfg = telegramService.getPublicTelegramConfig();
    const chatIdNum = Number(currentCfg.chatId);
    const simChatId = Number.isFinite(chatIdNum) && currentCfg.chatId ? chatIdNum : -100999888777;

    const parsed = telegramService.parseTelegramText(text);
    if (parsed.type === 'ignore') {
      res.status(400).json({
        ok: false,
        error: 'ข้อความนี้ไม่มีตัวเลข 0-36 หรือคำสั่งที่รองรับ (ลองพิมพ์ 17, ออก 22 หรือ /predict)',
      });
      return;
    }

    // If testing locally without real Telegram credentials, still run the app-side spin update cleanly
    if (parsed.type === 'spin' && parsed.numbers && parsed.numbers.length > 0 && (!currentCfg.hasToken || !currentCfg.chatId)) {
      let lastOutcome = null;
      for (const n of parsed.numbers) {
        lastOutcome = await telegramService.processSpinNumber({
          number: n,
          source: 'telegram',
          telegramSender: `${senderName} (ทดสอบ)`,
          skipBroadcast: true,
        });
      }
      const previewHtml = telegramService.formatPredictionMessageHtml(
        lastOutcome
          ? {
              lastSpin: lastOutcome.spin,
              lastSpinWon: lastOutcome.isWin,
              lastProfitAmount: lastOutcome.profitAmount,
              stopLossTriggered: lastOutcome.stopLossTriggered,
            }
          : undefined
      );
      res.json({
        ok: true,
        handled: true,
        action: 'spin',
        numbers: parsed.numbers,
        simulatedOnly: true,
        previewText: previewHtml.replace(/<[^>]+>/g, ''),
        state: telegramService.getPublicState(),
      });
      return;
    }

    const result = await telegramService.handleTelegramUpdate({
      update_id: Math.floor(Date.now() / 1000) + Math.floor(Math.random() * 1000),
      message: {
        message_id: Math.floor(Math.random() * 100000),
        text,
        date: Math.floor(Date.now() / 1000),
        from: { id: 9001, is_bot: false, first_name: senderName, username: 'tg_member' },
        chat: {
          id: simChatId,
          title: currentCfg.chatTitle || 'กลุ่มสมาชิก VIP Roulette',
          type: 'supergroup',
        },
      },
    });

    const previewHtml = telegramService.formatPredictionMessageHtml();
    res.json({
      ok: true,
      ...result,
      previewText: previewHtml.replace(/<[^>]+>/g, ''),
      state: telegramService.getPublicState(),
    });
  });

  // ---------------------------------------------------------------------------
  // Frontend Serving (Vite middleware in Dev / dist static in Prod)
  // ---------------------------------------------------------------------------
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
        hmr: false,
      },
      appType: 'spa',
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
