import express from 'express';
import type { NextFunction, Request, Response } from 'express';
import { telegramService } from './telegramService.ts';
import type { BankrollConfig, StrategyTier } from '../src/types/roulette.ts';

type AsyncHandler = (req: Request, res: Response, next: NextFunction) => Promise<void>;

const asyncRoute = (fn: AsyncHandler) => (req: Request, res: Response, next: NextFunction) => {
  void Promise.resolve(fn(req, res, next)).catch(next);
};

export function createApiApp(getConnectedClients?: () => number): express.Express {
  const app = express();

  // Guard against Vercel @vercel/node pre-parsing req.body without setting req._body
  app.use((req, _res, next) => {
    if (req.body !== undefined) {
      (req as Request & { _body?: boolean })._body = true;
    }
    next();
  });

  app.use(express.json({ limit: '1mb' }));

  // Auto-detect public HTTPS origin & hydrate shared state for every /api/* request
  app.use(
    '/api',
    asyncRoute(async (req, _res, next) => {
      const protoHeader = req.headers['x-forwarded-proto'];
      const proto = Array.isArray(protoHeader) ? protoHeader[0] : protoHeader;
      const fwdHostHeader = req.headers['x-forwarded-host'];
      const fwdHost = Array.isArray(fwdHostHeader) ? fwdHostHeader[0] : fwdHostHeader;
      const host = fwdHost || req.headers.host;

      if ((proto === 'https' || process.env.VERCEL === '1') && host) {
        telegramService.registerPublicOrigin(`https://${host}`);
      }

      const isWebhookEndpoint = req.path === '/telegram/webhook';
      const shouldForceRefresh = req.path === '/state' || req.method === 'POST';

      await telegramService.ensureHydrated({
        forceRefresh: shouldForceRefresh,
        skipAutoWebhook: isWebhookEndpoint
      });

      next();
    })
  );

  // ---------------------------------------------------------------------------
  // Core Game & Predictor State Routes
  // ---------------------------------------------------------------------------
  app.get('/api/health', (_req, res) => {
    res.json({
      ok: true,
      timestamp: Date.now(),
      connectedClients: getConnectedClients ? getConnectedClients() : 0,
      telegram: telegramService.getPublicTelegramConfig()
    });
  });

  app.get('/api/state', (_req, res) => {
    res.json(telegramService.getPublicState());
  });

  app.post(
    '/api/settings',
    asyncRoute(async (req, res) => {
      const body = (req.body || {}) as {
        selectedStrategy?: StrategyTier;
        bankrollConfig?: Partial<BankrollConfig>;
        currentTableId?: string;
        currentStep?: number;
      };

      const state = await telegramService.updateClientSettings({
        selectedStrategy: body.selectedStrategy,
        bankrollConfig: body.bankrollConfig,
        currentTableId: body.currentTableId,
        currentStep: body.currentStep
      });
      res.json({ ok: true, state });
    })
  );

  app.post(
    '/api/spins',
    asyncRoute(async (req, res) => {
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
        skipBroadcast
      });

      res.json({
        ok: true,
        ...outcome,
        state: telegramService.getPublicState()
      });
    })
  );

  app.post(
    '/api/spins/undo',
    asyncRoute(async (_req, res) => {
      const state = await telegramService.undoLastSpin();
      res.json({ ok: true, state });
    })
  );

  app.post(
    '/api/spins/reset',
    asyncRoute(async (req, res) => {
      const keepSpins = Boolean(req.body?.keepSpins);
      const state = await telegramService.resetSession(keepSpins);
      res.json({ ok: true, state });
    })
  );

  app.post(
    '/api/spins/import',
    asyncRoute(async (req, res) => {
      const numbers = req.body?.numbers;
      if (!Array.isArray(numbers)) {
        res.status(400).json({ ok: false, error: 'กรุณาส่งรายการตัวเลขเป็น array' });
        return;
      }
      const state = await telegramService.importNumbers(numbers);
      res.json({ ok: true, state });
    })
  );

  // ---------------------------------------------------------------------------
  // Telegram Integration API Routes
  // ---------------------------------------------------------------------------
  app.post(
    '/api/telegram/config',
    asyncRoute(async (req, res) => {
      const body = req.body || {};
      const config = await telegramService.updateTelegramConfig({
        botToken: typeof body.botToken === 'string' ? body.botToken : undefined,
        chatId: typeof body.chatId === 'string' ? body.chatId : undefined,
        pollingActive: typeof body.pollingActive === 'boolean' ? body.pollingActive : undefined,
        receiverMode:
          body.receiverMode === 'webhook' || body.receiverMode === 'polling' ? body.receiverMode : undefined,
        autoBroadcastOnAppSpin:
          typeof body.autoBroadcastOnAppSpin === 'boolean' ? body.autoBroadcastOnAppSpin : undefined,
        autoBroadcastOnTelegramSpin:
          typeof body.autoBroadcastOnTelegramSpin === 'boolean' ? body.autoBroadcastOnTelegramSpin : undefined,
        includeFullStatsInBroadcast:
          typeof body.includeFullStatsInBroadcast === 'boolean' ? body.includeFullStatsInBroadcast : undefined,
        clearToken: Boolean(body.clearToken)
      });

      res.json({
        ok: true,
        telegramConfig: config,
        state: telegramService.getPublicState()
      });
    })
  );

  app.post(
    '/api/telegram/reconnect',
    asyncRoute(async (_req, res) => {
      const ok = await telegramService.ensureConnectedAndReceiving();
      res.json({
        ok,
        state: telegramService.getPublicState()
      });
    })
  );

  app.get(
    '/api/telegram/detect-chats',
    asyncRoute(async (_req, res) => {
      const chats = await telegramService.scanForChats();
      res.json({
        ok: true,
        chats,
        state: telegramService.getPublicState()
      });
    })
  );

  app.post(
    '/api/telegram/broadcast',
    asyncRoute(async (req, res) => {
      const customHeader = typeof req.body?.customHeader === 'string' ? req.body.customHeader.trim() : undefined;
      const html = telegramService.formatPredictionMessageHtml({
        customHeader: customHeader || undefined
      });
      const result = await telegramService.sendTelegramMessage(html, 'broadcast_prediction');
      res.json({
        ...result,
        previewText: html.replace(/<[^>]+>/g, ''),
        state: telegramService.getPublicState()
      });
    })
  );

  app.post(
    '/api/telegram/send-custom',
    asyncRoute(async (req, res) => {
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
        state: telegramService.getPublicState()
      });
    })
  );

  // Official Telegram Webhook endpoint (for Vercel Serverless & public HTTPS servers)
  app.post(
    '/api/telegram/webhook',
    asyncRoute(async (req, res) => {
      try {
        const result = await telegramService.handleTelegramUpdate(req.body || {});
        res.json({ ok: true, ...result });
      } catch (err) {
        res.json({ ok: false, error: err instanceof Error ? err.message : 'Webhook handling error' });
      }
    })
  );

  app.post(
    '/api/telegram/set-webhook',
    asyncRoute(async (req, res) => {
      const protoHeader = req.headers['x-forwarded-proto'];
      const proto = Array.isArray(protoHeader) ? protoHeader[0] : protoHeader;
      const fwdHostHeader = req.headers['x-forwarded-host'];
      const fwdHost = Array.isArray(fwdHostHeader) ? fwdHostHeader[0] : fwdHostHeader;
      const host = fwdHost || req.headers.host;
      const reqOrigin = (proto === 'https' || process.env.VERCEL === '1') && host ? `https://${host}` : '';
      const rawVercel = process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL || '';
      const vercelOrigin = rawVercel ? `https://${rawVercel.replace(/^https?:\/\//, '')}` : '';
      const baseUrl = (
        process.env.APP_URL ||
        vercelOrigin ||
        process.env.RENDER_EXTERNAL_URL ||
        req.body?.baseUrl ||
        reqOrigin ||
        ''
      ).replace(/\/$/, '');

      if (!baseUrl || !baseUrl.startsWith('https://') || baseUrl.includes('localhost') || baseUrl.includes('ais-dev-')) {
        res.status(400).json({
          ok: false,
          error: 'Webhook ต้องใช้ HTTPS URL สาธารณะ (เช่น Vercel.app)'
        });
        return;
      }

      telegramService.registerPublicOrigin(baseUrl);
      const config = await telegramService.updateTelegramConfig({
        receiverMode: 'webhook',
        pollingActive: true
      });

      res.json({
        ok: Boolean(config.webhookActive),
        webhookUrl: config.webhookUrl,
        state: telegramService.getPublicState()
      });
    })
  );

  // Local test simulator to verify Telegram -> App -> Telegram roundtrip
  app.post(
    '/api/telegram/simulate-incoming',
    asyncRoute(async (req, res) => {
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
          error: 'ข้อความนี้ไม่มีตัวเลข 0-36 หรือคำสั่งที่รองรับ (ลองพิมพ์ 17, ออก 22 หรือ /predict)'
        });
        return;
      }

      if (parsed.type === 'spin' && parsed.numbers && parsed.numbers.length > 0 && (!currentCfg.hasToken || !currentCfg.chatId)) {
        let lastOutcome = null;
        for (const n of parsed.numbers) {
          lastOutcome = await telegramService.processSpinNumber({
            number: n,
            source: 'telegram',
            telegramSender: `${senderName} (ทดสอบ)`,
            skipBroadcast: true
          });
        }
        const previewHtml = telegramService.formatPredictionMessageHtml(
          lastOutcome
            ? {
                lastSpin: lastOutcome.spin,
                lastSpinWon: lastOutcome.isWin,
                lastProfitAmount: lastOutcome.profitAmount,
                stopLossTriggered: lastOutcome.stopLossTriggered
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
          state: telegramService.getPublicState()
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
            type: 'supergroup'
          }
        }
      });

      const previewHtml = telegramService.formatPredictionMessageHtml();
      res.json({
        ok: true,
        ...result,
        previewText: previewHtml.replace(/<[^>]+>/g, ''),
        state: telegramService.getPublicState()
      });
    })
  );

  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    const message = err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในเซิร์ฟเวอร์';
    if (!res.headersSent) {
      res.status(500).json({ ok: false, error: message });
    }
  });

  return app;
}
