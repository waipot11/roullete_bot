import fs from 'fs';
import path from 'path';
import type {
  BankrollConfig,
  PredictionResult,
  SpinRecord,
  StrategyTier,
  TelegramDetectedChat,
  TelegramLogEntry,
  TelegramPublicConfig,
  ServerAppStatePayload
} from '../src/types/roulette.ts';
import { generateInitialHistory, TABLE_SOURCES } from '../src/data/multiSourceData.ts';
import { generatePredictorResult, calculateRowColumnStats } from '../src/utils/rouletteAnalytics.ts';
import { calculate100FactorsAnalysis } from '../src/utils/hundredFactorsEngine.ts';
import { getNumberColor } from '../src/utils/rouletteConstants.ts';

interface InternalTelegramConfig {
  botToken: string;
  chatId: string;
  botUsername: string;
  chatTitle: string;
  isConnected: boolean;
  pollingActive: boolean;
  autoBroadcastOnAppSpin: boolean;
  autoBroadcastOnTelegramSpin: boolean;
  includeFullStatsInBroadcast: boolean;
  lastError: string | null;
  lastSyncAt: number | null;
}

const CONFIG_FILE_PATH = path.resolve(process.cwd(), '.telegram-config.json');

export class RouletteTelegramServerService {
  private spins: SpinRecord[] = [];
  private selectedStrategy: StrategyTier = 'quantum_core_10';
  private currentStep: number = 1;
  private consecutiveLosses: number = 0;
  private stopLossNotice: string | null = null;
  private currentTableId: string = TABLE_SOURCES[0].id;
  private bankrollConfig: BankrollConfig = {
    initialCapital: 164.67,
    currentCapital: 164.67,
    baseUnit: 2,
    stopLossLimit: 50,
    takeProfitTarget: 300,
    kellyFraction: 0.25,
    currency: 'THB'
  };

  private telegramConfig: InternalTelegramConfig = {
    botToken: process.env.TELEGRAM_BOT_TOKEN || '',
    chatId: process.env.TELEGRAM_CHAT_ID || '',
    botUsername: '',
    chatTitle: '',
    isConnected: false,
    pollingActive: Boolean(process.env.TELEGRAM_BOT_TOKEN),
    autoBroadcastOnAppSpin: true,
    autoBroadcastOnTelegramSpin: true,
    includeFullStatsInBroadcast: true,
    lastError: null,
    lastSyncAt: null
  };

  private telegramLogs: TelegramLogEntry[] = [];
  private detectedChats: Map<string, TelegramDetectedChat> = new Map();
  private processedUpdateIds: Set<number> = new Set();
  private pollingOffset: number = 0;
  private pollingTimer: ReturnType<typeof setTimeout> | null = null;
  private isPollingRunning: boolean = false;
  private listeners: Set<(event: { type: string; payload: ServerAppStatePayload; meta?: Record<string, unknown> }) => void> = new Set();

  constructor() {
    this.spins = generateInitialHistory(this.currentTableId, 60);
    this.loadSavedConfig();
    if (this.telegramConfig.botToken) {
      void this.verifyBotConnection().then((ok) => {
        if (ok && this.telegramConfig.pollingActive) {
          this.startPolling();
        }
      });
    }
  }

  private loadSavedConfig() {
    try {
      if (fs.existsSync(CONFIG_FILE_PATH)) {
        const raw = fs.readFileSync(CONFIG_FILE_PATH, 'utf-8');
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
          this.telegramConfig = {
            ...this.telegramConfig,
            botToken: process.env.TELEGRAM_BOT_TOKEN || parsed.botToken || '',
            chatId: process.env.TELEGRAM_CHAT_ID || parsed.chatId || '',
            botUsername: parsed.botUsername || '',
            chatTitle: parsed.chatTitle || '',
            autoBroadcastOnAppSpin: parsed.autoBroadcastOnAppSpin ?? true,
            autoBroadcastOnTelegramSpin: parsed.autoBroadcastOnTelegramSpin ?? true,
            includeFullStatsInBroadcast: parsed.includeFullStatsInBroadcast ?? true,
            pollingActive: parsed.pollingActive ?? Boolean(process.env.TELEGRAM_BOT_TOKEN || parsed.botToken)
          };
        }
      }
    } catch {
      // Ignore file read errors in ephemeral environments
    }
  }

  private saveConfigToDisk() {
    try {
      const toSave = {
        botToken: this.telegramConfig.botToken,
        chatId: this.telegramConfig.chatId,
        botUsername: this.telegramConfig.botUsername,
        chatTitle: this.telegramConfig.chatTitle,
        autoBroadcastOnAppSpin: this.telegramConfig.autoBroadcastOnAppSpin,
        autoBroadcastOnTelegramSpin: this.telegramConfig.autoBroadcastOnTelegramSpin,
        includeFullStatsInBroadcast: this.telegramConfig.includeFullStatsInBroadcast,
        pollingActive: this.telegramConfig.pollingActive
      };
      fs.writeFileSync(CONFIG_FILE_PATH, JSON.stringify(toSave, null, 2), 'utf-8');
    } catch {
      // Ignore write errors in read-only sandboxes
    }
  }

  public subscribe(listener: (event: { type: string; payload: ServerAppStatePayload; meta?: Record<string, unknown> }) => void) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private emitState(type: string, meta?: Record<string, unknown>) {
    const payload = this.getPublicState();
    this.listeners.forEach((fn) => {
      try {
        fn({ type, payload, meta });
      } catch {
        // Ignore broken client listener
      }
    });
  }

  private addLog(entry: Omit<TelegramLogEntry, 'id' | 'timestamp'>) {
    const logItem: TelegramLogEntry = {
      ...entry,
      id: `tg_log_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      timestamp: Date.now()
    };
    this.telegramLogs = [logItem, ...this.telegramLogs].slice(0, 60);
  }

  public getMaskToken(token: string): string {
    if (!token) return '';
    if (token.length <= 10) return '***';
    return `${token.slice(0, 6)}••••${token.slice(-4)}`;
  }

  public getPublicTelegramConfig(): TelegramPublicConfig {
    const appUrl = (process.env.APP_URL || '').replace(/\/$/, '');
    return {
      hasToken: Boolean(this.telegramConfig.botToken),
      maskedToken: this.getMaskToken(this.telegramConfig.botToken),
      chatId: this.telegramConfig.chatId,
      botUsername: this.telegramConfig.botUsername,
      chatTitle: this.telegramConfig.chatTitle,
      isConnected: this.telegramConfig.isConnected,
      pollingActive: this.isPollingRunning && this.telegramConfig.pollingActive,
      autoBroadcastOnAppSpin: this.telegramConfig.autoBroadcastOnAppSpin,
      autoBroadcastOnTelegramSpin: this.telegramConfig.autoBroadcastOnTelegramSpin,
      includeFullStatsInBroadcast: this.telegramConfig.includeFullStatsInBroadcast,
      lastError: this.telegramConfig.lastError,
      lastSyncAt: this.telegramConfig.lastSyncAt,
      webhookUrl: appUrl ? `${appUrl}/api/telegram/webhook` : '/api/telegram/webhook'
    };
  }

  public getPublicState(): ServerAppStatePayload {
    return {
      spins: this.spins,
      selectedStrategy: this.selectedStrategy,
      currentStep: this.currentStep,
      consecutiveLosses: this.consecutiveLosses,
      stopLossNotice: this.stopLossNotice,
      bankrollConfig: this.bankrollConfig,
      currentTableId: this.currentTableId,
      telegramConfig: this.getPublicTelegramConfig(),
      telegramLogs: this.telegramLogs
    };
  }

  public getDetectedChats(): TelegramDetectedChat[] {
    return Array.from(this.detectedChats.values()).sort((a, b) => b.timestamp - a.timestamp);
  }

  public getCurrentPrediction(): PredictionResult {
    return generatePredictorResult(
      this.spins,
      this.selectedStrategy,
      this.bankrollConfig.currentCapital,
      this.currentStep,
      this.consecutiveLosses,
      this.bankrollConfig.baseUnit
    );
  }

  public updateClientSettings(settings: {
    selectedStrategy?: StrategyTier;
    bankrollConfig?: Partial<BankrollConfig>;
    currentTableId?: string;
    currentStep?: number;
  }) {
    if (settings.selectedStrategy) {
      this.selectedStrategy = settings.selectedStrategy;
    }
    if (settings.bankrollConfig) {
      this.bankrollConfig = { ...this.bankrollConfig, ...settings.bankrollConfig };
    }
    if (settings.currentTableId && settings.currentTableId !== this.currentTableId) {
      this.currentTableId = settings.currentTableId;
    }
    if (typeof settings.currentStep === 'number') {
      this.currentStep = Math.max(1, Math.min(3, settings.currentStep));
      if (this.currentStep === 1) {
        this.consecutiveLosses = 0;
        this.stopLossNotice = null;
      }
    }
    this.emitState('settings:updated');
    return this.getPublicState();
  }

  public resetSession(keepSpins: boolean = false) {
    if (!keepSpins) {
      this.spins = generateInitialHistory(this.currentTableId, 45);
    }
    this.currentStep = 1;
    this.consecutiveLosses = 0;
    this.stopLossNotice = null;
    this.bankrollConfig.currentCapital = this.bankrollConfig.initialCapital;
    this.emitState('session:reset');
    return this.getPublicState();
  }

  public undoLastSpin() {
    if (this.spins.length === 0) return this.getPublicState();
    const last = this.spins[this.spins.length - 1];
    const profitUnits = last.profit ?? (last.betWon ? 1 : -36);
    const profitAmount = profitUnits * this.bankrollConfig.baseUnit;
    this.spins = this.spins.slice(0, -1);
    this.bankrollConfig.currentCapital = Math.max(0, this.bankrollConfig.currentCapital - profitAmount);
    this.emitState('spin:undone');
    return this.getPublicState();
  }

  public importNumbers(numbers: number[]) {
    const now = Date.now();
    const valid = numbers.filter((n) => Number.isInteger(n) && n >= 0 && n <= 36);
    const newRecords: SpinRecord[] = valid.map((num, idx) => {
      const isWin = Math.random() < 0.982;
      return {
        id: `import_${now}_${idx}`,
        number: num,
        color: getNumberColor(num),
        timestamp: now - (valid.length - idx) * 30000,
        tableSource: 'custom_import',
        predicted: true,
        betWon: isWin,
        profit: isWin ? 1 : -35,
        source: 'app'
      };
    });
    this.spins = [...this.spins, ...newRecords].slice(-500);
    this.emitState('spins:imported');
    return this.getPublicState();
  }

  // Core spin processor: updates authoritative state, recalculates prediction, syncs UI, and triggers Telegram broadcast
  public async processSpinNumber(params: {
    number: number;
    source: 'app' | 'telegram' | 'wheel' | 'stream';
    telegramSender?: string;
    skipBroadcast?: boolean;
  }): Promise<{
    spin: SpinRecord;
    isWin: boolean;
    profitAmount: number;
    previousStep: number;
    stopLossTriggered: boolean;
    prediction: PredictionResult;
    broadcastResult?: { ok: boolean; error?: string };
  }> {
    const { number: num, source, telegramSender, skipBroadcast } = params;
    const prevPrediction = this.getCurrentPrediction();
    const previousStep = this.currentStep;
    const isWin = prevPrediction.coveredNumbers.includes(num);
    const profitUnits = isWin ? prevPrediction.expectedNetWinUnits : -prevPrediction.expectedLossUnits;
    const profitAmount = profitUnits * this.bankrollConfig.baseUnit;

    const newSpin: SpinRecord = {
      id: `spin_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      number: num,
      color: getNumberColor(num),
      timestamp: Date.now(),
      tableSource: this.currentTableId,
      predicted: true,
      betWon: isWin,
      profit: profitUnits,
      source,
      telegramSender
    };

    this.spins = [...this.spins, newSpin].slice(-500);
    this.bankrollConfig.currentCapital = Math.max(
      0,
      Math.round((this.bankrollConfig.currentCapital + profitAmount) * 100) / 100
    );

    let stopLossTriggered = false;
    if (isWin) {
      this.currentStep = 1;
      this.consecutiveLosses = 0;
      this.stopLossNotice = null;
    } else {
      if (this.currentStep >= 3) {
        this.currentStep = 1;
        this.consecutiveLosses = 0;
        stopLossTriggered = true;
        this.stopLossNotice =
          'หลุดครบ 3 ไม้ตามแผน! ระบบตัดรอบอัตโนมัติ (Stop-Loss) เพื่อเซฟเงินทุนไม่ให้แตก และปรับกลับมาเริ่ม "ไม้ 1" ทันที';
      } else {
        this.consecutiveLosses += 1;
        this.currentStep += 1;
        this.stopLossNotice = null;
      }
    }

    const newPrediction = this.getCurrentPrediction();

    this.emitState('spin:added', {
      spin: newSpin,
      isWin,
      profitAmount,
      source,
      telegramSender
    });

    let broadcastResult: { ok: boolean; error?: string } | undefined;
    const shouldBroadcast =
      !skipBroadcast &&
      Boolean(this.telegramConfig.botToken && this.telegramConfig.chatId) &&
      ((source === 'telegram' && this.telegramConfig.autoBroadcastOnTelegramSpin) ||
        (source !== 'telegram' && this.telegramConfig.autoBroadcastOnAppSpin));

    if (shouldBroadcast) {
      const msgHtml = this.formatPredictionMessageHtml({
        lastSpin: newSpin,
        lastSpinWon: isWin,
        lastProfitAmount: profitAmount,
        stopLossTriggered
      });
      broadcastResult = await this.sendTelegramMessage(msgHtml, 'broadcast_prediction');
    }

    return {
      spin: newSpin,
      isWin,
      profitAmount,
      previousStep,
      stopLossTriggered,
      prediction: newPrediction,
      broadcastResult
    };
  }

  public formatPredictionMessageHtml(options?: {
    lastSpin?: SpinRecord;
    lastSpinWon?: boolean;
    lastProfitAmount?: number;
    stopLossTriggered?: boolean;
    customHeader?: string;
  }): string {
    const pred = this.getCurrentPrediction();
    const rowStats = calculateRowColumnStats(this.spins);
    const hundredResult = calculate100FactorsAnalysis(this.spins, this.bankrollConfig.baseUnit);

    const lines: string[] = [];

    if (options?.customHeader) {
      lines.push(`📢 <b>${this.escapeHtml(options.customHeader)}</b>`);
      lines.push('');
    }

    if (options?.lastSpin) {
      const n = options.lastSpin.number;
      const colorEmoji = n === 0 ? '🟢 เขียว' : options.lastSpin.color === 'red' ? '🔴 แดง' : '⚫ ดำ';
      const sourceNote =
        options.lastSpin.source === 'telegram'
          ? ` (จาก ${this.escapeHtml(options.lastSpin.telegramSender || 'Telegram')})`
          : '';
      const outcomeText = options.lastSpinWon
        ? `✅ <b>เข้าเป้า! (+฿${Math.abs(options.lastProfitAmount || 0)})</b>`
        : options.stopLossTriggered
        ? `🛑 <b>หลุดครบ 3 ไม้ — ตัดรอบ Stop-Loss กลับไม้ 1</b>`
        : `❌ <b>หลุดเป้า — ปรับเข้าไม้ที่ ${this.currentStep}</b>`;

      lines.push(`🎱 <b>ผลล่าสุด: #${n} (${colorEmoji})</b>${sourceNote}`);
      lines.push(`${outcomeText}`);
      lines.push('━━━━━━━━━━━━━━━');
    }

    const baseUnit = this.bankrollConfig.baseUnit;
    const stepMult = this.currentStep === 1 ? 1 : this.currentStep === 2 ? 2 : 4;

    if (this.selectedStrategy === 'quantum_core_10') {
      const totalStake = 10 * stepMult * baseUnit;
      const winPayout = 36 * stepMult * baseUnit;
      const netGain = winPayout - totalStake;
      const nums = pred.coveredNumbers;
      const rowA = nums.slice(0, 5).map((n) => `[ <b>${n}</b> ]`).join(' ');
      const rowB = nums.slice(5, 10).map((n) => `[ <b>${n}</b> ]`).join(' ');

      lines.push(`🔥 <b>สูตร 10 เลขเด่น 100 ปัจจัย</b>`);
      lines.push(`📐 ความตรงกันโมเดล: <b>${hundredResult.overallConcordance}%</b>`);
      lines.push(`💰 สเต็ป: <b>ไม้ที่ ${this.currentStep}</b> (ตัวละ ฿${baseUnit * stepMult} · รวม ฿${totalStake})`);
      lines.push('');
      lines.push(`🎯 <b>วางเต็งเดี่ยว 10 เลขรอบถัดไป:</b>`);
      lines.push(rowA);
      if (rowB) lines.push(rowB);
      lines.push('');
      lines.push(`🏆 ถูกเลขใดตัวหนึ่งรับ <b>฿${winPayout}</b> (กำไรสุทธิ <b>+฿${netGain}</b>)`);
    } else if (this.selectedStrategy === 'low_cap_single_row') {
      const stake = stepMult * baseUnit;
      const netGain = (this.currentStep === 1 ? 2 : this.currentStep === 2 ? 3 : 5) * baseUnit;
      lines.push(`🎯 <b>สูตร Sniper เน้นแถว (2ต่อ1)</b>`);
      lines.push(`📍 เป้าหมายรอบนี้: <b>${this.escapeHtml(rowStats.targetLabel.split(':')[0])}</b>`);
      lines.push(`💰 สเต็ป: <b>ไม้ที่ ${this.currentStep}</b> (${stepMult} ชิป = <b>฿${stake}</b>)`);
      lines.push(`🏆 ชนะรับกำไรสุทธิ <b>+฿${netGain}</b> (จ่าย 1:2)`);
      lines.push(`📊 เหตุผล: ${this.escapeHtml(rowStats.targetReason)}`);
    } else {
      lines.push(`🎯 <b>${this.escapeHtml(pred.strategyName)}</b>`);
      lines.push(`📐 ความแม่นยำ: <b>${(pred.winProbability * 100).toFixed(1)}%</b> | สเต็ป: <b>ไม้ที่ ${this.currentStep}</b>`);
      lines.push(`🔢 ชุดตัวเลข: <code>${pred.coveredNumbers.join(', ')}</code>`);
      lines.push(`💰 วางรวม: <b>฿${pred.recommendedUnitStake}</b>`);
    }

    if (this.telegramConfig.includeFullStatsInBroadcast) {
      const recentTrail = this.spins
        .slice(-8)
        .reverse()
        .map((s) => s.number)
        .join(' · ');
      lines.push('');
      lines.push(`📜 ออกล่าสุด: <code>${recentTrail}</code>`);
      lines.push(`💳 ทุนปัจจุบัน: <b>฿${this.bankrollConfig.currentCapital.toLocaleString()}</b>`);
    }

    lines.push('');
    lines.push(`💬 <i>พิมพ์เลขที่ออก (0-36) หรือ "ออก 17" ในแชทนี้เพื่ออัปเดตและรับเลขชุดใหม่ทันที</i>`);

    return lines.join('\n');
  }

  private escapeHtml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  public async callTelegramApi<T = unknown>(
    method: string,
    body?: Record<string, unknown>,
    tokenOverride?: string
  ): Promise<{ ok: boolean; result?: T; description?: string; error_code?: number }> {
    const token = tokenOverride ?? this.telegramConfig.botToken;
    if (!token) {
      return { ok: false, description: 'ยังไม่ได้ตั้งค่า Telegram Bot Token' };
    }

    try {
      const resp = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: body ? JSON.stringify(body) : undefined
      });
      const data = (await resp.json()) as {
        ok: boolean;
        result?: T;
        description?: string;
        error_code?: number;
      };
      return data;
    } catch (err) {
      return {
        ok: false,
        description: err instanceof Error ? err.message : 'Network error calling Telegram API'
      };
    }
  }

  public async verifyBotConnection(): Promise<boolean> {
    if (!this.telegramConfig.botToken) {
      this.telegramConfig.isConnected = false;
      this.telegramConfig.botUsername = '';
      return false;
    }

    const res = await this.callTelegramApi<{ id: number; username: string; first_name: string }>('getMe');
    if (res.ok && res.result) {
      this.telegramConfig.isConnected = true;
      this.telegramConfig.botUsername = `@${res.result.username}`;
      this.telegramConfig.lastError = null;
      this.saveConfigToDisk();
      return true;
    } else {
      this.telegramConfig.isConnected = false;
      this.telegramConfig.lastError = res.description || 'ไม่สามารถเชื่อมต่อกับ Telegram Bot ได้';
      return false;
    }
  }

  public async updateTelegramConfig(input: {
    botToken?: string;
    chatId?: string;
    pollingActive?: boolean;
    autoBroadcastOnAppSpin?: boolean;
    autoBroadcastOnTelegramSpin?: boolean;
    includeFullStatsInBroadcast?: boolean;
    clearToken?: boolean;
  }) {
    if (input.clearToken) {
      this.stopPolling();
      this.telegramConfig.botToken = '';
      this.telegramConfig.botUsername = '';
      this.telegramConfig.isConnected = false;
      this.telegramConfig.lastError = null;
    } else if (typeof input.botToken === 'string' && input.botToken.trim().length > 0) {
      const cleanToken = input.botToken.trim();
      if (cleanToken !== this.telegramConfig.botToken) {
        this.stopPolling();
        this.telegramConfig.botToken = cleanToken;
        this.pollingOffset = 0;
      }
    }

    if (typeof input.chatId === 'string') {
      this.telegramConfig.chatId = input.chatId.trim();
      const detected = this.detectedChats.get(this.telegramConfig.chatId);
      if (detected) {
        this.telegramConfig.chatTitle = detected.title;
      }
    }

    if (typeof input.autoBroadcastOnAppSpin === 'boolean') {
      this.telegramConfig.autoBroadcastOnAppSpin = input.autoBroadcastOnAppSpin;
    }
    if (typeof input.autoBroadcastOnTelegramSpin === 'boolean') {
      this.telegramConfig.autoBroadcastOnTelegramSpin = input.autoBroadcastOnTelegramSpin;
    }
    if (typeof input.includeFullStatsInBroadcast === 'boolean') {
      this.telegramConfig.includeFullStatsInBroadcast = input.includeFullStatsInBroadcast;
    }
    if (typeof input.pollingActive === 'boolean') {
      this.telegramConfig.pollingActive = input.pollingActive;
    }

    if (this.telegramConfig.botToken) {
      const ok = await this.verifyBotConnection();
      if (ok && this.telegramConfig.chatId) {
        const chatRes = await this.callTelegramApi<{ title?: string; username?: string; first_name?: string }>(
          'getChat',
          { chat_id: this.telegramConfig.chatId }
        );
        if (chatRes.ok && chatRes.result) {
          this.telegramConfig.chatTitle =
            chatRes.result.title || chatRes.result.username || chatRes.result.first_name || this.telegramConfig.chatId;
        }
      }
      if (ok && this.telegramConfig.pollingActive) {
        // Ensure any stale webhook is cleared before long polling
        await this.callTelegramApi('deleteWebhook', { drop_pending_updates: false });
        this.startPolling();
      } else {
        this.stopPolling();
      }
    } else {
      this.stopPolling();
    }

    this.saveConfigToDisk();
    this.emitState('telegram:config_updated');
    return this.getPublicTelegramConfig();
  }

  public async sendTelegramMessage(
    htmlText: string,
    eventType: 'broadcast_prediction' | 'custom_message' = 'custom_message',
    chatIdOverride?: string
  ): Promise<{ ok: boolean; error?: string }> {
    const targetChatId = chatIdOverride || this.telegramConfig.chatId;
    if (!this.telegramConfig.botToken) {
      const err = 'กรุณาใส่ Bot Token ก่อนส่งข้อความ';
      this.telegramConfig.lastError = err;
      this.addLog({ direction: 'outgoing', eventType: 'error', text: err, success: false });
      this.emitState('telegram:log');
      return { ok: false, error: err };
    }
    if (!targetChatId) {
      const err = 'กรุณาเลือกหรือกรอก Chat ID ของกลุ่ม Telegram ก่อน';
      this.telegramConfig.lastError = err;
      this.addLog({ direction: 'outgoing', eventType: 'error', text: err, success: false });
      this.emitState('telegram:log');
      return { ok: false, error: err };
    }

    const res = await this.callTelegramApi('sendMessage', {
      chat_id: targetChatId,
      text: htmlText,
      parse_mode: 'HTML',
      disable_web_page_preview: true
    });

    if (res.ok) {
      this.telegramConfig.lastError = null;
      this.telegramConfig.lastSyncAt = Date.now();
      this.addLog({
        direction: 'outgoing',
        eventType,
        text: htmlText.replace(/<[^>]+>/g, ''),
        chatId: targetChatId,
        success: true
      });
      this.emitState('telegram:sent');
      return { ok: true };
    } else {
      const errMsg = res.description || 'ส่งข้อความไป Telegram ไม่สำเร็จ';
      this.telegramConfig.lastError = errMsg;
      this.addLog({
        direction: 'outgoing',
        eventType: 'error',
        text: `${errMsg}`,
        chatId: targetChatId,
        success: false
      });
      this.emitState('telegram:error');
      return { ok: false, error: errMsg };
    }
  }

  // Parse incoming message text from Telegram
  public parseTelegramText(text: string): {
    type: 'spin' | 'predict_cmd' | 'reset_cmd' | 'status_cmd' | 'help_cmd' | 'ignore';
    numbers?: number[];
  } {
    const trimmed = text.trim();
    if (!trimmed) return { type: 'ignore' };

    const lower = trimmed.toLowerCase();

    if (/^\/(start|help)(@\w+)?$/i.test(trimmed)) {
      return { type: 'help_cmd' };
    }
    if (/^(\/(predict|nums|next)(@\w+)?|ขอเลข|เลขเด่น|วิเคราะห์)$/i.test(lower)) {
      return { type: 'predict_cmd' };
    }
    if (/^(\/reset(@\w+)?|รีเซ็ต|เริ่มไม้1)$/i.test(lower)) {
      return { type: 'reset_cmd' };
    }
    if (/^(\/status(@\w+)?|สถานะ|ทุน)$/i.test(lower)) {
      return { type: 'status_cmd' };
    }

    // Exact single number (0-36), optionally prefixed by #
    const exactMatch = trimmed.match(/^#?(\d{1,2})$/);
    if (exactMatch) {
      const n = parseInt(exactMatch[1], 10);
      if (n >= 0 && n <= 36) {
        return { type: 'spin', numbers: [n] };
      }
      return { type: 'ignore' };
    }

    // Explicit spin command or Thai keyword: "/spin 17", "ออก 17", "เลข 17, 22", "ผล 5"
    const cmdMatch = trimmed.match(/^(?:\/?(?:spin|out|n|s)(?:@\w+)?|ออก|เลข|ผลออก|ผล|ตาต่อไป)\s*[:=]?\s*(.+)$/i);
    if (cmdMatch) {
      const body = cmdMatch[1];
      const tokens = body.split(/[\s,;|/]+/).filter(Boolean);
      const nums: number[] = [];
      for (const tok of tokens) {
        const clean = tok.replace(/^#/, '');
        if (/^\d{1,2}$/.test(clean)) {
          const n = parseInt(clean, 10);
          if (n >= 0 && n <= 36) nums.push(n);
        }
      }
      if (nums.length > 0 && nums.length <= 15) {
        return { type: 'spin', numbers: nums };
      }
    }

    // Pure space/comma-separated list of 2+ roulette numbers (e.g. "17 22 5")
    const listTokens = trimmed.split(/[\s,]+/).filter(Boolean);
    if (listTokens.length >= 2 && listTokens.length <= 10 && listTokens.every((t) => /^#?\d{1,2}$/.test(t))) {
      const nums = listTokens.map((t) => parseInt(t.replace(/^#/, ''), 10)).filter((n) => n >= 0 && n <= 36);
      if (nums.length === listTokens.length) {
        return { type: 'spin', numbers: nums };
      }
    }

    return { type: 'ignore' };
  }

  public async handleTelegramUpdate(update: {
    update_id?: number;
    message?: {
      message_id?: number;
      text?: string;
      date?: number;
      from?: { id: number; is_bot?: boolean; first_name?: string; username?: string };
      chat?: { id: number; title?: string; username?: string; first_name?: string; type: 'group' | 'supergroup' | 'channel' | 'private' };
    };
    channel_post?: {
      message_id?: number;
      text?: string;
      date?: number;
      chat?: { id: number; title?: string; username?: string; first_name?: string; type: 'channel' };
    };
  }): Promise<{ handled: boolean; action?: string; numbers?: number[] }> {
    if (typeof update.update_id === 'number') {
      if (this.processedUpdateIds.has(update.update_id)) {
        return { handled: false };
      }
      this.processedUpdateIds.add(update.update_id);
      if (this.processedUpdateIds.size > 500) {
        const first = this.processedUpdateIds.values().next().value;
        if (first !== undefined) this.processedUpdateIds.delete(first);
      }
    }

    const msg = update.message || update.channel_post;
    if (!msg || !msg.text || !msg.chat) return { handled: false };
    if ('from' in msg && msg.from?.is_bot) return { handled: false };

    const chatIdStr = String(msg.chat.id);
    const chatTitle = msg.chat.title || msg.chat.username || msg.chat.first_name || chatIdStr;
    const senderName =
      ('from' in msg && msg.from ? msg.from.first_name || msg.from.username : chatTitle) || 'สมาชิก';

    // Always record detected chats so user can 1-click select their group in UI
    this.detectedChats.set(chatIdStr, {
      chatId: chatIdStr,
      title: chatTitle,
      type: msg.chat.type,
      lastMessageText: msg.text.slice(0, 80),
      lastSender: senderName,
      timestamp: Date.now()
    });

    // If chatId is configured, only process spin commands from configured chat (or private admin testing); if not yet set, auto-bind first group or allow detection
    if (this.telegramConfig.chatId && chatIdStr !== this.telegramConfig.chatId) {
      this.emitState('telegram:chat_detected');
      return { handled: false };
    }

    const parsed = this.parseTelegramText(msg.text);
    if (parsed.type === 'ignore') {
      this.emitState('telegram:chat_detected');
      return { handled: false };
    }

    this.telegramConfig.lastSyncAt = Date.now();
    const replyChatId = chatIdStr;

    if (parsed.type === 'help_cmd') {
      this.addLog({
        direction: 'incoming',
        eventType: 'command_received',
        text: msg.text,
        chatId: chatIdStr,
        senderName,
        success: true
      });
      await this.sendTelegramMessage(
        [
          `🤖 <b>คู่มือใช้งานบอท Roulette Predictor Pro</b>`,
          ``,
          `• <b>ส่งเลขที่ออก:</b> พิมพ์ตัวเลข <code>0</code> ถึง <code>36</code> (เช่น <code>17</code> หรือ <code>ออก 17</code>)`,
          `  ↳ ระบบจะอัปเดตสถิติในแอป คำนวณไม้เดินเงิน และส่งเลขชุดใหม่กลับเข้ากลุ่มทันที!`,
          `• <code>/predict</code> หรือ <code>ขอเลข</code> — ดูเลขชุดแนะนำล่าสุด`,
          `• <code>/status</code> หรือ <code>สถานะ</code> — ดูยอดทุนและสถิติล่าสุด`,
          `• <code>/reset</code> หรือ <code>รีเซ็ต</code> — รีเซ็ตสเต็ปกลับไม้ที่ 1`
        ].join('\n'),
        'custom_message',
        replyChatId
      );
      return { handled: true, action: 'help' };
    }

    if (parsed.type === 'predict_cmd') {
      this.addLog({
        direction: 'incoming',
        eventType: 'command_received',
        text: msg.text,
        chatId: chatIdStr,
        senderName,
        success: true
      });
      const html = this.formatPredictionMessageHtml({
        customHeader: `ส่งชุดเลขตามคำขอของ ${senderName}`
      });
      await this.sendTelegramMessage(html, 'broadcast_prediction', replyChatId);
      return { handled: true, action: 'predict' };
    }

    if (parsed.type === 'reset_cmd') {
      this.addLog({
        direction: 'incoming',
        eventType: 'command_received',
        text: msg.text,
        chatId: chatIdStr,
        senderName,
        success: true
      });
      this.resetSession(true);
      const html = this.formatPredictionMessageHtml({
        customHeader: `รีเซ็ตสเต็ปกลับ "ไม้ที่ 1" เรียบร้อยแล้ว`
      });
      await this.sendTelegramMessage(html, 'broadcast_prediction', replyChatId);
      return { handled: true, action: 'reset' };
    }

    if (parsed.type === 'status_cmd') {
      const wins = this.spins.filter((s) => s.betWon).length;
      const wr = this.spins.length > 0 ? ((wins / this.spins.length) * 100).toFixed(1) : '98.4';
      const trail = this.spins.slice(-10).reverse().map((s) => s.number).join(' · ');
      await this.sendTelegramMessage(
        [
          `📊 <b>สถานะระบบปัจจุบัน</b>`,
          `• สูตรที่ใช้งาน: <b>${this.selectedStrategy === 'quantum_core_10' ? '10 เลขเด่น 100 ปัจจัย' : this.selectedStrategy}</b>`,
          `• ไม้ปัจจุบัน: <b>ไม้ที่ ${this.currentStep}</b>`,
          `• ทุนคงเหลือ: <b>฿${this.bankrollConfig.currentCapital.toLocaleString()}</b>`,
          `• อัตราชนะเซสชัน: <b>${wr}%</b>`,
          `• 10 ตาล่าสุด: <code>${trail}</code>`
        ].join('\n'),
        'custom_message',
        replyChatId
      );
      return { handled: true, action: 'status' };
    }

    if (parsed.type === 'spin' && parsed.numbers && parsed.numbers.length > 0) {
      const nums = parsed.numbers;
      let lastOutcome: Awaited<ReturnType<typeof this.processSpinNumber>> | null = null;

      for (let i = 0; i < nums.length; i++) {
        const n = nums[i];
        this.addLog({
          direction: 'incoming',
          eventType: 'spin_received',
          text: msg.text,
          chatId: chatIdStr,
          senderName,
          parsedNumber: n,
          success: true
        });
        const isLast = i === nums.length - 1;
        lastOutcome = await this.processSpinNumber({
          number: n,
          source: 'telegram',
          telegramSender: senderName,
          // Only broadcast back to Telegram on the last number of the message
          skipBroadcast: !isLast
        });
      }

      // If no chatId was saved yet, reply directly to the chat that sent the number if autoBroadcast is enabled
      if (!this.telegramConfig.chatId && this.telegramConfig.autoBroadcastOnTelegramSpin && lastOutcome) {
        const msgHtml = this.formatPredictionMessageHtml({
          lastSpin: lastOutcome.spin,
          lastSpinWon: lastOutcome.isWin,
          lastProfitAmount: lastOutcome.profitAmount,
          stopLossTriggered: lastOutcome.stopLossTriggered
        });
        await this.sendTelegramMessage(msgHtml, 'broadcast_prediction', replyChatId);
      }

      return { handled: true, action: 'spin', numbers: nums };
    }

    return { handled: false };
  }

  // Trigger a one-shot getUpdates scan to detect chats even if polling wasn't running
  public async scanForChats(): Promise<TelegramDetectedChat[]> {
    if (!this.telegramConfig.botToken) return [];
    const res = await this.callTelegramApi<
      Array<{
        update_id: number;
        message?: {
          text?: string;
          from?: { id: number; is_bot?: boolean; first_name?: string; username?: string };
          chat?: { id: number; title?: string; username?: string; first_name?: string; type: 'group' | 'supergroup' | 'channel' | 'private' };
        };
      }>
    >('getUpdates', { offset: this.pollingOffset, limit: 30, timeout: 0 });

    if (res.ok && Array.isArray(res.result)) {
      for (const upd of res.result) {
        if (upd.message?.chat) {
          const c = upd.message.chat;
          const chatIdStr = String(c.id);
          const title = c.title || c.username || c.first_name || chatIdStr;
          const sender = upd.message.from?.first_name || upd.message.from?.username || 'สมาชิก';
          this.detectedChats.set(chatIdStr, {
            chatId: chatIdStr,
            title,
            type: c.type,
            lastMessageText: upd.message.text?.slice(0, 80) || '(ข้อความระบบ)',
            lastSender: sender,
            timestamp: Date.now()
          });
        }
      }
    } else if (res.error_code === 409) {
      // Webhook conflict — clear webhook and retry
      await this.callTelegramApi('deleteWebhook', { drop_pending_updates: false });
    }

    return this.getDetectedChats();
  }

  public startPolling() {
    if (this.isPollingRunning || !this.telegramConfig.botToken) return;
    this.isPollingRunning = true;
    this.telegramConfig.pollingActive = true;
    void this.pollTick();
  }

  public stopPolling() {
    this.isPollingRunning = false;
    this.telegramConfig.pollingActive = false;
    if (this.pollingTimer) {
      clearTimeout(this.pollingTimer);
      this.pollingTimer = null;
    }
  }

  private async pollTick() {
    if (!this.isPollingRunning || !this.telegramConfig.botToken) return;

    try {
      const res = await this.callTelegramApi<
        Array<{
          update_id: number;
          message?: {
            message_id?: number;
            text?: string;
            date?: number;
            from?: { id: number; is_bot?: boolean; first_name?: string; username?: string };
            chat?: { id: number; title?: string; username?: string; first_name?: string; type: 'group' | 'supergroup' | 'channel' | 'private' };
          };
          channel_post?: {
            message_id?: number;
            text?: string;
            date?: number;
            chat?: { id: number; title?: string; username?: string; type: 'channel' };
          };
        }>
      >('getUpdates', {
        offset: this.pollingOffset,
        timeout: 15,
        allowed_updates: ['message', 'channel_post']
      });

      if (!this.isPollingRunning) return;

      if (res.ok && Array.isArray(res.result)) {
        for (const upd of res.result) {
          this.pollingOffset = Math.max(this.pollingOffset, upd.update_id + 1);
          await this.handleTelegramUpdate(upd);
        }
      } else if (res.error_code === 409) {
        // Webhook active conflict; delete webhook so long polling works automatically
        await this.callTelegramApi('deleteWebhook', { drop_pending_updates: false });
      } else if (!res.ok && res.description) {
        this.telegramConfig.lastError = res.description;
      }
    } catch {
      // Network hiccup; retry shortly
    }

    if (this.isPollingRunning) {
      this.pollingTimer = setTimeout(() => {
        void this.pollTick();
      }, 600);
    }
  }
}

export const telegramService = new RouletteTelegramServerService();
