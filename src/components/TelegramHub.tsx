import React, { useState, useMemo } from 'react';
import {
  BankrollConfig,
  PredictionResult,
  RowColumnStats,
  SpinRecord,
  StrategyTier,
  TelegramDetectedChat,
  TelegramLogEntry,
  TelegramPublicConfig
} from '../types/roulette';
import { RED_NUMBERS } from '../utils/rouletteConstants';
import {
  Send,
  Bot,
  Radio,
  Search,
  CheckCircle2,
  AlertCircle,
  MessageSquare,
  Sparkles,
  RefreshCw,
  Eye,
  EyeOff,
  Trash2,
  ArrowDownLeft,
  ArrowUpRight,
  SlidersHorizontal,
  Play,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Wifi
} from 'lucide-react';

interface TelegramHubProps {
  telegramConfig: TelegramPublicConfig;
  telegramLogs: TelegramLogEntry[];
  detectedChats: TelegramDetectedChat[];
  wsConnected: boolean;
  syncTransport?: 'ws' | 'http';
  prediction: PredictionResult;
  rowStats: RowColumnStats;
  selectedStrategy: StrategyTier;
  currentStep: number;
  bankrollConfig: BankrollConfig;
  recentSpins: SpinRecord[];
  onSaveConfig: (payload: {
    botToken?: string;
    chatId?: string;
    pollingActive?: boolean;
    receiverMode?: 'webhook' | 'polling';
    autoBroadcastOnAppSpin?: boolean;
    autoBroadcastOnTelegramSpin?: boolean;
    includeFullStatsInBroadcast?: boolean;
    clearToken?: boolean;
  }) => Promise<{ ok: boolean; error?: string }>;
  onReconnect?: () => Promise<boolean>;
  onDetectChats: () => Promise<TelegramDetectedChat[]>;
  onBroadcastPrediction: (customHeader?: string) => Promise<{ ok: boolean; error?: string }>;
  onSendCustomMessage: (message: string) => Promise<{ ok: boolean; error?: string }>;
  onSimulateIncoming: (text: string, senderName?: string) => Promise<{ ok: boolean; error?: string; previewText?: string }>;
}

export const TelegramHub: React.FC<TelegramHubProps> = ({
  telegramConfig,
  telegramLogs,
  detectedChats,
  wsConnected,
  syncTransport = 'ws',
  prediction,
  rowStats,
  selectedStrategy,
  currentStep,
  bankrollConfig,
  recentSpins,
  onSaveConfig,
  onReconnect,
  onDetectChats,
  onBroadcastPrediction,
  onSendCustomMessage,
  onSimulateIncoming
}) => {
  const [tokenInput, setTokenInput] = useState('');
  const [chatIdInput, setChatIdInput] = useState(telegramConfig.chatId || '');
  const [showToken, setShowToken] = useState(false);
  const [showGuide, setShowGuide] = useState(!telegramConfig.hasToken || !telegramConfig.chatId);

  const [customMessage, setCustomMessage] = useState('');
  const [broadcastHeader, setBroadcastHeader] = useState('');
  const [simInput, setSimInput] = useState('17');
  const [simPreview, setSimPreview] = useState<string | null>(null);

  const [isSaving, setIsSaving] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [isSendingCustom, setIsSendingCustom] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);

  const [statusFeedback, setStatusFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  React.useEffect(() => {
    if (telegramConfig.chatId && telegramConfig.chatId !== chatIdInput) {
      setChatIdInput(telegramConfig.chatId);
    }
  }, [telegramConfig.chatId]);

  const showNotice = (type: 'success' | 'error', text: string) => {
    setStatusFeedback({ type, text });
    setTimeout(() => {
      setStatusFeedback((prev) => (prev?.text === text ? null : prev));
    }, 5000);
  };

  // Live preview of the Telegram message matching server formatting
  const messagePreview = useMemo(() => {
    const baseUnit = bankrollConfig.baseUnit;
    const stepMult = currentStep === 1 ? 1 : currentStep === 2 ? 2 : 4;
    const recentTrail = recentSpins.slice(-8).reverse().map((s) => s.number).join(' · ');
    const lines: string[] = [];

    if (broadcastHeader.trim()) {
      lines.push(`📢 ${broadcastHeader.trim()}`);
      lines.push('');
    }

    if (selectedStrategy === 'quantum_core_10') {
      const totalStake = 10 * stepMult * baseUnit;
      const winPayout = 36 * stepMult * baseUnit;
      const netGain = winPayout - totalStake;
      const nums = prediction.coveredNumbers;
      lines.push(`🔥 สูตร 10 เลขเด่น 100 ปัจจัย`);
      lines.push(`📐 ความตรงกันโมเดล: ${prediction.confidenceScore}%`);
      lines.push(`💰 สเต็ป: ไม้ที่ ${currentStep} (ตัวละ ฿${baseUnit * stepMult} · รวม ฿${totalStake})`);
      lines.push('');
      lines.push(`🎯 วางเต็งเดี่ยว 10 เลขรอบถัดไป:`);
      lines.push(nums.slice(0, 5).map((n) => `[ ${n} ]`).join(' '));
      if (nums.length > 5) {
        lines.push(nums.slice(5, 10).map((n) => `[ ${n} ]`).join(' '));
      }
      lines.push('');
      lines.push(`🏆 ถูกเลขใดตัวหนึ่งรับ ฿${winPayout} (กำไรสุทธิ +฿${netGain})`);
    } else if (selectedStrategy === 'low_cap_single_row') {
      const stake = stepMult * baseUnit;
      const netGain = (currentStep === 1 ? 2 : currentStep === 2 ? 3 : 5) * baseUnit;
      lines.push(`🎯 สูตร Sniper เน้นแถว (2ต่อ1)`);
      lines.push(`📍 เป้าหมายรอบนี้: ${rowStats.targetLabel.split(':')[0]}`);
      lines.push(`💰 สเต็ป: ไม้ที่ ${currentStep} (${stepMult} ชิป = ฿${stake})`);
      lines.push(`🏆 ชนะรับกำไรสุทธิ +฿${netGain} (จ่าย 1:2)`);
    } else {
      lines.push(`🎯 ${prediction.strategyName}`);
      lines.push(`📐 ความแม่นยำ: ${(prediction.winProbability * 100).toFixed(1)}% | ไม้ที่ ${currentStep}`);
      lines.push(`🔢 ชุดตัวเลข: ${prediction.coveredNumbers.join(', ')}`);
      lines.push(`💰 วางรวม: ฿${prediction.recommendedUnitStake}`);
    }

    if (telegramConfig.includeFullStatsInBroadcast) {
      lines.push('');
      lines.push(`📜 ออกล่าสุด: ${recentTrail}`);
      lines.push(`💳 ทุนปัจจุบัน: ฿${bankrollConfig.currentCapital.toLocaleString()}`);
    }

    lines.push('');
    lines.push(`💬 พิมพ์เลขที่ออก (0-36) หรือ "ออก 17" ในแชทนี้เพื่ออัปเดตและรับเลขชุดใหม่ทันที`);

    return lines.join('\n');
  }, [
    broadcastHeader,
    selectedStrategy,
    currentStep,
    bankrollConfig.baseUnit,
    bankrollConfig.currentCapital,
    prediction,
    rowStats,
    recentSpins,
    telegramConfig.includeFullStatsInBroadcast
  ]);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const res = await onSaveConfig({
        botToken: tokenInput.trim() ? tokenInput.trim() : undefined,
        chatId: chatIdInput.trim(),
        pollingActive: true
      });
      if (res.ok) {
        setTokenInput('');
        await onDetectChats();
        showNotice('success', 'บันทึกการเชื่อมต่อ Telegram และเปิดรับเลขสด 2 ทางเรียบร้อยแล้ว');
      } else {
        showNotice('error', res.error || 'บันทึกการตั้งค่าไม่สำเร็จ');
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleScanChats = async () => {
    setIsScanning(true);
    try {
      const chats = await onDetectChats();
      if (chats.length > 0) {
        showNotice('success', `ตรวจพบ ${chats.length} แชท/กลุ่มที่เคยทักบอทเข้ามา สามารถคลิกเลือกได้ทันที`);
      } else {
        showNotice('error', 'ยังไม่พบข้อความในบอท กรุณาดึงบอทเข้ากลุ่มแล้วพิมพ์ข้อความ 1 ครั้งก่อนกดค้นหา');
      }
    } finally {
      setIsScanning(false);
    }
  };

  const handleSelectDetectedChat = async (chat: TelegramDetectedChat) => {
    setChatIdInput(chat.chatId);
    setIsSaving(true);
    try {
      const res = await onSaveConfig({ chatId: chat.chatId, pollingActive: true });
      if (res.ok) {
        showNotice('success', `ผูกกลุ่ม "${chat.title}" (${chat.chatId}) เรียบร้อยแล้ว`);
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleBroadcast = async () => {
    setIsBroadcasting(true);
    try {
      const res = await onBroadcastPrediction(broadcastHeader.trim() || undefined);
      if (res.ok) {
        showNotice('success', 'ส่งชุดเลขแนะนำรอบนี้เข้ากลุ่ม Telegram สำเร็จ!');
      } else {
        showNotice('error', res.error || 'ส่งข้อความไม่สำเร็จ');
      }
    } finally {
      setIsBroadcasting(false);
    }
  };

  const handleSendCustom = async () => {
    if (!customMessage.trim()) return;
    setIsSendingCustom(true);
    try {
      const res = await onSendCustomMessage(customMessage.trim());
      if (res.ok) {
        setCustomMessage('');
        showNotice('success', 'ส่งข้อความประกาศเข้ากลุ่ม Telegram สำเร็จ!');
      } else {
        showNotice('error', res.error || 'ส่งข้อความไม่สำเร็จ');
      }
    } finally {
      setIsSendingCustom(false);
    }
  };

  const handleTestIncoming = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!simInput.trim()) return;
    setIsSimulating(true);
    try {
      const res = await onSimulateIncoming(simInput.trim(), 'สมาชิกทดสอบ');
      if (res.ok) {
        if (res.previewText) setSimPreview(res.previewText);
        showNotice('success', `รับข้อความ "${simInput.trim()}" จาก Telegram แล้ว: อัปเดตแอปและคำนวณเลขชุดใหม่ทันที`);
      } else {
        showNotice('error', res.error || 'จำลองไม่สำเร็จ');
      }
    } finally {
      setIsSimulating(false);
    }
  };

  const quickTemplates = [
    '🟢 เปิดโต๊ะพร้อมลุยครับ ตั้งเป้าตามสเต็ป 3 ไม้',
    '🏆 ถึงเป้าหมายกำไรรอบนี้แล้ว เก็บกำไรพักก่อนนะครับ',
    '⚠️ ชะลอรอดูจังหวะล้อหมุน 1-2 ตาก่อนวางครับ'
  ];

  return (
    <div className="space-y-5 max-w-6xl mx-auto pb-8">
      {/* Live Status Strip */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 md:p-5 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-xl bg-sky-500/15 border border-sky-500/30 text-sky-400 shrink-0">
              <Bot className="w-6 h-6" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-black text-white">
                  ศูนย์ควบคุม Telegram 2 ทาง (App ↔ Group Bot)
                </h2>
                {telegramConfig.isConnected ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    บอทออนไลน์ {telegramConfig.botUsername}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-bold bg-slate-800 text-slate-300 border border-slate-700">
                    ยังไม่เชื่อมต่อบอท
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-1">
                ส่งชุดเลขแนะนำเข้ากลุ่มสมาชิกอัตโนมัติ และรับเลขที่ออกจริงจากแชท Telegram เพื่ออัปเดตสถิติ + ส่งเลขชุดใหม่กลับทันทีแบบ Real-Time
              </p>
            </div>
          </div>

          {/* Live Sync Telemetry Badges */}
          <div className="flex flex-wrap items-center gap-2 text-xs shrink-0">
            <div
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border ${
                wsConnected
                  ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300'
                  : 'bg-amber-950/60 border-amber-500/40 text-amber-300'
              }`}
            >
              <Wifi className="w-3.5 h-3.5" />
              <span className="font-semibold whitespace-nowrap">
                {telegramConfig.serverRuntime === 'vercel' || syncTransport === 'http'
                  ? wsConnected
                    ? 'ซิงค์สด (Vercel Live Sync)'
                    : 'กำลังซิงค์ข้อมูล...'
                  : wsConnected
                  ? 'ซิงค์ Real-Time (WS)'
                  : 'กำลังเชื่อมต่อ WS...'}
              </span>
            </div>

            <div
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border ${
                telegramConfig.pollingActive
                  ? 'bg-sky-950/60 border-sky-500/40 text-sky-300'
                  : 'bg-slate-950 border-slate-800 text-slate-400'
              }`}
            >
              <Radio className="w-3.5 h-3.5" />
              <span className="font-semibold whitespace-nowrap">
                {telegramConfig.pollingActive
                  ? telegramConfig.webhookActive
                    ? telegramConfig.serverRuntime === 'vercel'
                      ? 'Webhook 24 ชม. (Vercel Active)'
                      : 'รับเลข Webhook 24 ชม. (Active)'
                    : 'รับเลข Polling สด (Active)'
                  : 'โหมดรับเลขปิดอยู่'}
              </span>
            </div>

            {onReconnect && telegramConfig.hasToken && (
              <button
                type="button"
                disabled={isReconnecting}
                onClick={async () => {
                  setIsReconnecting(true);
                  try {
                    const ok = await onReconnect();
                    if (ok) {
                      showNotice('success', 'เชื่อมต่อ Telegram Bot ใหม่เรียบร้อยแล้ว!');
                    } else {
                      showNotice('error', 'กำลังลองเชื่อมต่อใหม่ในพื้นหลังอัตโนมัติ...');
                    }
                  } finally {
                    setIsReconnecting(false);
                  }
                }}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl border bg-slate-950 hover:bg-slate-800 border-slate-700 text-slate-200 font-semibold whitespace-nowrap"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-sky-400 ${isReconnecting ? 'animate-spin' : ''}`} />
                <span>เชื่อมต่อใหม่</span>
              </button>
            )}
          </div>
        </div>

        {/* Feedback Alert */}
        {(statusFeedback || telegramConfig.lastError) && (
          <div
            className={`mt-4 p-3 rounded-xl border text-xs flex items-center gap-2 ${
              statusFeedback?.type === 'success'
                ? 'bg-emerald-950/70 border-emerald-500/50 text-emerald-200'
                : 'bg-rose-950/70 border-rose-500/50 text-rose-200'
            }`}
          >
            {statusFeedback?.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            )}
            <span>{statusFeedback?.text || telegramConfig.lastError}</span>
          </div>
        )}
      </div>

      {/* Main 2-Column Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Column: Bot Connection, Group Binding & Automation Rules */}
        <div className="lg:col-span-5 space-y-5">
          {/* Setup Guide Collapsible */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg">
            <button
              type="button"
              onClick={() => setShowGuide((v) => !v)}
              className="w-full flex items-center justify-between text-left min-h-[36px]"
            >
              <div className="flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-sky-400" />
                <span className="text-xs font-bold text-white">วิธีเชื่อมต่อกลุ่ม Telegram ใน 4 ขั้นตอน</span>
              </div>
              {showGuide ? (
                <ChevronUp className="w-4 h-4 text-slate-400" />
              ) : (
                <ChevronDown className="w-4 h-4 text-slate-400" />
              )}
            </button>

            {showGuide && (
              <ol className="mt-3 pt-3 border-t border-slate-800 space-y-2 text-xs text-slate-300 list-decimal list-inside leading-relaxed">
                <li>
                  เปิด Telegram ค้นหา <code className="px-1.5 py-0.5 rounded bg-slate-800 text-sky-300">@BotFather</code> แล้วพิมพ์ <code className="px-1.5 py-0.5 rounded bg-slate-800 text-emerald-300">/newbot</code> เพื่อรับ <strong>Bot Token</strong>
                </li>
                <li>
                  ดึงบอทเข้า <strong>กลุ่มสมาชิก Telegram</strong> (และแนะนำตั้งเป็น Admin เพื่อให้อ่านข้อความในกลุ่มได้ทุกข้อความ หรือพิมพ์สั่งขึ้นต้นด้วยตัวเลข)
                </li>
                <li>
                  ส่งข้อความทักทายในกลุ่มนั้น 1 ครั้ง เช่น <code className="px-1.5 py-0.5 rounded bg-slate-800 text-amber-300">สวัสดี</code>
                </li>
                <li>
                  วาง Token ด้านล่างแล้วกด <strong>"บันทึก &amp; ค้นหากลุ่มอัตโนมัติ"</strong> แล้วคลิกเลือกกลุ่มที่พบได้ทันที
                </li>
              </ol>
            )}
          </div>

          {/* Bot Configuration Form */}
          <form onSubmit={handleSaveSettings} className="bg-slate-900 border border-slate-800 rounded-2xl p-4 md:p-5 space-y-4 shadow-lg">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-sky-400" />
                <span>ตั้งค่าการเชื่อมต่อบอท &amp; กลุ่มสมาชิก</span>
              </h3>
              {telegramConfig.hasToken && (
                <button
                  type="button"
                  onClick={() => onSaveConfig({ clearToken: true })}
                  className="text-[11px] text-rose-400 hover:text-rose-300 flex items-center gap-1 px-2 py-1 rounded-lg bg-rose-950/40 border border-rose-500/30"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>ล้าง Token</span>
                </button>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 block">
                Telegram Bot Token (จาก @BotFather)
              </label>
              <div className="relative">
                <input
                  type={showToken ? 'text' : 'password'}
                  value={tokenInput}
                  onChange={(e) => setTokenInput(e.target.value)}
                  placeholder={
                    telegramConfig.hasToken
                      ? `บันทึกไว้แล้ว (${telegramConfig.maskedToken}) — เว้นว่างหากไม่เปลี่ยน`
                      : 'เช่น 7412891032:AAHxxxxxxxxxxxxxxxxxxxxxxxx'
                  }
                  className="w-full min-h-[44px] bg-slate-950 border border-slate-700 focus:border-sky-500 rounded-xl pl-3 pr-10 text-xs font-mono text-white placeholder:text-slate-500 outline-none transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowToken((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-white"
                  title={showToken ? 'ซ่อน Token' : 'แสดง Token'}
                >
                  {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-300">
                  Group Chat ID {telegramConfig.chatTitle ? `(${telegramConfig.chatTitle})` : ''}
                </label>
                <button
                  type="button"
                  onClick={handleScanChats}
                  disabled={isScanning || !telegramConfig.hasToken}
                  className="text-[11px] text-sky-300 hover:text-sky-200 disabled:opacity-40 flex items-center gap-1 font-semibold"
                >
                  <Search className="w-3 h-3" />
                  <span>{isScanning ? 'กำลังสแกน...' : 'ค้นหากลุ่มอัตโนมัติ'}</span>
                </button>
              </div>
              <input
                type="text"
                value={chatIdInput}
                onChange={(e) => setChatIdInput(e.target.value)}
                placeholder="เช่น -1001234567890 หรือกดค้นหากลุ่มอัตโนมัติ"
                className="w-full min-h-[44px] bg-slate-950 border border-slate-700 focus:border-sky-500 rounded-xl px-3 text-xs font-mono text-white placeholder:text-slate-500 outline-none transition-colors"
              />
            </div>

            {/* Detected Chats List */}
            {detectedChats.length > 0 && (
              <div className="bg-slate-950/90 border border-slate-800 rounded-xl p-3 space-y-2">
                <span className="text-[11px] font-bold text-sky-300 block">
                  กลุ่ม / แชทที่ตรวจพบล่าสุด (แตะเพื่อผูกกับแอป):
                </span>
                <div className="space-y-1.5 max-h-40 overflow-y-auto">
                  {detectedChats.map((chat) => {
                    const isSelected = telegramConfig.chatId === chat.chatId;
                    return (
                      <button
                        key={chat.chatId}
                        type="button"
                        onClick={() => handleSelectDetectedChat(chat)}
                        className={`w-full min-h-[44px] p-2.5 rounded-lg border text-left flex items-center justify-between gap-2 transition-all ${
                          isSelected
                            ? 'bg-emerald-950/70 border-emerald-500/60 text-white'
                            : 'bg-slate-900 hover:bg-slate-800 border-slate-800 text-slate-300'
                        }`}
                      >
                        <div className="min-w-0">
                          <div className="text-xs font-bold truncate">{chat.title}</div>
                          <div className="text-[10px] text-slate-400 font-mono truncate">
                            ID: {chat.chatId} · "{chat.lastMessageText}"
                          </div>
                        </div>
                        <span
                          className={`text-[10px] font-bold px-2 py-1 rounded-md shrink-0 whitespace-nowrap ${
                            isSelected ? 'bg-emerald-500 text-slate-950' : 'bg-sky-500/20 text-sky-300'
                          }`}
                        >
                          {isSelected ? 'เลือกอยู่' : 'เลือกกลุ่มนี้'}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={isSaving}
              className="w-full min-h-[44px] bg-sky-500 hover:bg-sky-400 active:scale-[0.99] disabled:opacity-50 text-slate-950 font-black text-xs rounded-xl shadow-lg shadow-sky-500/20 flex items-center justify-center gap-2 transition-all whitespace-nowrap"
            >
              <RefreshCw className={`w-4 h-4 ${isSaving ? 'animate-spin' : ''}`} />
              <span>{isSaving ? 'กำลังบันทึกและเชื่อมต่อ...' : 'บันทึกการเชื่อมต่อ & ค้นหากลุ่ม'}</span>
            </button>

            {/* Automation Toggles */}
            <div className="pt-3 border-t border-slate-800 space-y-2.5">
              <span className="text-xs font-bold text-slate-300 block">ตั้งค่าระบบทำงานอัตโนมัติ (2-Way Automation)</span>

              <label className="flex items-center justify-between gap-3 p-2.5 rounded-xl bg-slate-950 border border-slate-800 cursor-pointer hover:border-slate-700">
                <div className="text-xs">
                  <span className="font-semibold text-white block">ส่งเลขชุดใหม่อัตโนมัติเมื่อกดผลในแอป</span>
                  <span className="text-[11px] text-slate-400">ทุกครั้งที่แตะบันทึกผลในแอป บอทจะส่งชุดเลขรอบถัดไปเข้ากลุ่ม</span>
                </div>
                <input
                  type="checkbox"
                  checked={telegramConfig.autoBroadcastOnAppSpin}
                  onChange={(e) => onSaveConfig({ autoBroadcastOnAppSpin: e.target.checked })}
                  className="w-5 h-5 accent-emerald-500 shrink-0"
                />
              </label>

              <label className="flex items-center justify-between gap-3 p-2.5 rounded-xl bg-slate-950 border border-slate-800 cursor-pointer hover:border-slate-700">
                <div className="text-xs">
                  <span className="font-semibold text-white block">รับเลขจาก Telegram → อัปเดต + ส่งชุดใหม่ทันที</span>
                  <span className="text-[11px] text-slate-400">เมื่อสมาชิกพิมพ์เลข 0-36 ในกลุ่ม แอปจะอัปเดตและส่งเลขชุดใหม่กลับกลุ่มทันที</span>
                </div>
                <input
                  type="checkbox"
                  checked={telegramConfig.autoBroadcastOnTelegramSpin}
                  onChange={(e) => onSaveConfig({ autoBroadcastOnTelegramSpin: e.target.checked })}
                  className="w-5 h-5 accent-emerald-500 shrink-0"
                />
              </label>

              <label className="flex items-center justify-between gap-3 p-2.5 rounded-xl bg-slate-950 border border-slate-800 cursor-pointer hover:border-slate-700">
                <div className="text-xs">
                  <span className="font-semibold text-white block">แนบสถิติ 8 ตาล่าสุด + ทุนคงเหลือ</span>
                  <span className="text-[11px] text-slate-400">แสดงไทม์ไลน์ผลล่าสุดและยอดเงินทุนในข้อความ Telegram</span>
                </div>
                <input
                  type="checkbox"
                  checked={telegramConfig.includeFullStatsInBroadcast}
                  onChange={(e) => onSaveConfig({ includeFullStatsInBroadcast: e.target.checked })}
                  className="w-5 h-5 accent-emerald-500 shrink-0"
                />
              </label>

              <label className="flex items-center justify-between gap-3 p-2.5 rounded-xl bg-slate-950 border border-slate-800 cursor-pointer hover:border-slate-700">
                <div className="text-xs">
                  <span className="font-semibold text-white block">เปิดรับเลขสดจาก Telegram ตลอดเวลา</span>
                  <span className="text-[11px] text-slate-400">รับคำสั่ง 0-36, /predict, /status จากแชท Telegram แบบต่อเนื่อง</span>
                </div>
                <input
                  type="checkbox"
                  checked={telegramConfig.pollingActive}
                  onChange={(e) => onSaveConfig({ pollingActive: e.target.checked })}
                  className="w-5 h-5 accent-sky-500 shrink-0"
                />
              </label>

              {/* Receiver Mode Selector: Webhook (Vercel/Production) vs Polling (Local/Node) */}
              <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-white">โหมดการรับข้อมูลจาก Telegram</span>
                  <span className="text-[10px] font-mono text-sky-300">
                    {telegramConfig.serverRuntime === 'vercel' || telegramConfig.webhookActive
                      ? 'Webhook Push'
                      : 'Long Polling'}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    onClick={() => onSaveConfig({ receiverMode: 'webhook', pollingActive: true })}
                    className={`min-h-[38px] px-2 py-1.5 rounded-lg text-[11px] font-bold border transition-all ${
                      telegramConfig.receiverMode === 'webhook' || telegramConfig.serverRuntime === 'vercel'
                        ? 'bg-emerald-600 text-slate-950 border-emerald-400'
                        : 'bg-slate-900 text-slate-300 border-slate-700 hover:bg-slate-800'
                    }`}
                  >
                    Webhook ({telegramConfig.serverRuntime === 'vercel' ? 'Vercel 24 ชม.' : 'เสถียรสุดบนคลาวด์'})
                  </button>
                  <button
                    type="button"
                    disabled={telegramConfig.serverRuntime === 'vercel'}
                    onClick={() => onSaveConfig({ receiverMode: 'polling', pollingActive: true })}
                    className={`min-h-[38px] px-2 py-1.5 rounded-lg text-[11px] font-bold border transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
                      telegramConfig.receiverMode !== 'webhook' && telegramConfig.serverRuntime !== 'vercel'
                        ? 'bg-sky-500 text-slate-950 border-sky-400'
                        : 'bg-slate-900 text-slate-300 border-slate-700 hover:bg-slate-800'
                    }`}
                  >
                    Polling ({telegramConfig.serverRuntime === 'vercel' ? 'เฉพาะเครื่อง Node' : 'ใช้ได้ทุกเครื่อง'})
                  </button>
                </div>
                {telegramConfig.serverRuntime === 'vercel' && (
                  <p className="text-[10px] text-emerald-300/90 leading-snug">
                    Webhook Endpoint: <code className="text-emerald-200 break-all">{telegramConfig.webhookUrl}</code>
                  </p>
                )}
                {telegramConfig.serverRuntime === 'vercel' && !telegramConfig.hasPersistentStore && (
                  <p className="text-[10px] text-amber-300/90 leading-snug">
                    แนะนำบน Vercel: เพิ่มฐานข้อมูลฟรี <strong>Upstash Redis</strong> ในเมนู Storage ของโปรเจกต์ Vercel เพื่อให้สถิติและเลขจาก Telegram ซิงค์ข้ามทุก Serverless Function ได้ 100%
                  </p>
                )}
                {!telegramConfig.hasEnvToken && telegramConfig.hasToken && (
                  <p className="text-[10px] text-amber-300/90 leading-snug">
                    แนะนำ: ใส่ <code className="text-amber-200">TELEGRAM_BOT_TOKEN</code> และ <code className="text-amber-200">TELEGRAM_CHAT_ID</code> ใน Environment Variables ของ Vercel ด้วย เพื่อไม่ให้ค่าหลุดเมื่อรีดีพลอย
                  </p>
                )}
              </div>
            </div>
          </form>
        </div>

        {/* Right Column: Broadcast Preview, Custom Message & Live 2-Way Sync Log */}
        <div className="lg:col-span-7 space-y-5">
          {/* Manual Broadcast Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 md:p-5 space-y-4 shadow-lg">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <span>ส่งชุดเลขแนะนำรอบปัจจุบันเข้ากลุ่ม Telegram</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  ตัวอย่างข้อความที่จะส่งไปยังกลุ่ม (ซิงค์ตามสูตร ไม้เดินเงิน และตัวเลขล่าสุดอัตโนมัติ)
                </p>
              </div>

              <button
                type="button"
                onClick={handleBroadcast}
                disabled={isBroadcasting}
                className="min-h-[44px] px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 active:scale-95 disabled:opacity-50 text-slate-950 font-black text-xs rounded-xl shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 transition-all whitespace-nowrap shrink-0"
              >
                <Send className="w-4 h-4" />
                <span>{isBroadcasting ? 'กำลังส่ง...' : 'ส่งชุดเลขเข้ากลุ่มเลย'}</span>
              </button>
            </div>

            <div>
              <input
                type="text"
                value={broadcastHeader}
                onChange={(e) => setBroadcastHeader(e.target.value)}
                placeholder="หัวข้อเสริมด้านบน (ไม่บังคับ) เช่น รอบทำกำไรช่วงค่ำ · โต๊ะ VIP"
                className="w-full min-h-[40px] bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl px-3 text-xs text-white placeholder:text-slate-500 outline-none"
              />
            </div>

            {/* Target Numbers Pill Summary */}
            <div className="flex items-center gap-1.5 overflow-x-auto py-1">
              <span className="text-[11px] text-slate-400 shrink-0 mr-1">เลขรอบนี้:</span>
              {prediction.coveredNumbers.slice(0, 12).map((num) => {
                const isZero = num === 0;
                const isRed = RED_NUMBERS.includes(num);
                return (
                  <span
                    key={`tg_num_${num}`}
                    className={`px-2 py-0.5 rounded font-mono font-bold text-xs border shrink-0 tabular-nums ${
                      isZero
                        ? 'bg-emerald-600 text-slate-950 border-emerald-400'
                        : isRed
                        ? 'bg-red-700 text-white border-red-500/60'
                        : 'bg-slate-800 text-slate-100 border-slate-600'
                    }`}
                  >
                    {num}
                  </span>
                );
              })}
              {prediction.coveredNumbers.length > 12 && (
                <span className="text-[11px] text-slate-400 shrink-0">
                  +{prediction.coveredNumbers.length - 12} ตัว
                </span>
              )}
            </div>

            {/* Formatted Message Preview */}
            <pre className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 text-xs text-slate-200 font-sans whitespace-pre-wrap leading-relaxed">
              {messagePreview}
            </pre>
          </div>

          {/* Custom Announcement Composer */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 md:p-5 space-y-3 shadow-lg">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-sky-400" />
              <span>ส่งข้อความประกาศถึงสมาชิกในกลุ่ม</span>
            </h3>

            <div className="flex flex-wrap gap-1.5">
              {quickTemplates.map((tpl) => (
                <button
                  key={tpl}
                  type="button"
                  onClick={() => setCustomMessage(tpl)}
                  className="text-[11px] px-2.5 py-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800 transition-colors"
                >
                  {tpl}
                </button>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <textarea
                rows={2}
                value={customMessage}
                onChange={(e) => setCustomMessage(e.target.value)}
                placeholder="พิมพ์ข้อความที่ต้องการส่งแจ้งเตือนสมาชิกในกลุ่ม Telegram..."
                className="flex-1 bg-slate-950 border border-slate-700 focus:border-sky-500 rounded-xl p-3 text-xs text-white placeholder:text-slate-500 outline-none resize-none"
              />
              <button
                type="button"
                onClick={handleSendCustom}
                disabled={isSendingCustom || !customMessage.trim()}
                className="min-h-[44px] sm:w-40 px-4 py-2 bg-sky-500 hover:bg-sky-400 disabled:opacity-40 text-slate-950 font-black text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all whitespace-nowrap shrink-0"
              >
                <Send className="w-4 h-4" />
                <span>{isSendingCustom ? 'กำลังส่ง...' : 'ส่งข้อความ'}</span>
              </button>
            </div>
          </div>

          {/* 2-Way Sync Simulator & Live Logs */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 md:p-5 space-y-4 shadow-lg">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Play className="w-4 h-4 text-emerald-400" />
                  <span>ทดสอบรับเลขจาก Telegram → อัปเดตแอป → ส่งชุดใหม่</span>
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  พิมพ์เลข <code className="text-amber-300">17</code> หรือ <code className="text-amber-300">ออก 22</code> เพื่อจำลองฝั่ง Telegram ส่งเลขเข้าแอป
                </p>
              </div>
            </div>

            <form onSubmit={handleTestIncoming} className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={simInput}
                onChange={(e) => setSimInput(e.target.value)}
                placeholder="พิมพ์เลข 0-36 หรือ ออก 17 หรือ /predict"
                className="flex-1 min-h-[44px] bg-slate-950 border border-slate-700 focus:border-emerald-500 rounded-xl px-3 text-xs font-mono text-white outline-none"
              />
              <button
                type="submit"
                disabled={isSimulating || !simInput.trim()}
                className="min-h-[44px] px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-emerald-500/40 text-emerald-300 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all whitespace-nowrap shrink-0"
              >
                <ArrowDownLeft className="w-4 h-4" />
                <span>{isSimulating ? 'กำลังประมวลผล...' : 'จำลองส่งจาก Telegram เข้าแอป'}</span>
              </button>
            </form>

            {simPreview && (
              <div className="bg-emerald-950/30 border border-emerald-500/30 rounded-xl p-3 space-y-1">
                <span className="text-[11px] font-bold text-emerald-300 block">
                  ผลลัพธ์ชุดใหม่ที่บอทคำนวณและเตรียมส่งกลับเข้ากลุ่ม:
                </span>
                <pre className="text-[11px] text-slate-200 whitespace-pre-wrap font-sans leading-relaxed">
                  {simPreview}
                </pre>
              </div>
            )}

            {/* Activity Log List */}
            <div className="space-y-2 pt-2 border-t border-slate-800">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-300">บันทึกการรับ-ส่งล่าสุด (Live 2-Way Log)</span>
                <span className="text-[11px] text-slate-500 font-mono">{telegramLogs.length} รายการ</span>
              </div>

              {telegramLogs.length === 0 ? (
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800/80 text-center text-xs text-slate-500">
                  ยังไม่มีประวัติรับ-ส่งกับ Telegram เมื่อเชื่อมต่อบอทหรือทดสอบรับเลข ประวัติจะปรากฏแบบ Real-Time ที่นี่
                </div>
              ) : (
                <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
                  {telegramLogs.map((log) => {
                    const isIncoming = log.direction === 'incoming';
                    const timeStr = new Date(log.timestamp).toLocaleTimeString('th-TH', {
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit'
                    });

                    return (
                      <div
                        key={log.id}
                        className={`p-2.5 rounded-xl border text-xs flex items-start gap-2.5 ${
                          !log.success
                            ? 'bg-rose-950/40 border-rose-500/30 text-rose-200'
                            : isIncoming
                            ? 'bg-sky-950/30 border-sky-500/30 text-slate-200'
                            : 'bg-slate-950 border-slate-800 text-slate-300'
                        }`}
                      >
                        <div
                          className={`p-1.5 rounded-lg shrink-0 mt-0.5 ${
                            !log.success
                              ? 'bg-rose-500/20 text-rose-400'
                              : isIncoming
                              ? 'bg-sky-500/20 text-sky-400'
                              : 'bg-emerald-500/20 text-emerald-400'
                          }`}
                        >
                          {isIncoming ? (
                            <ArrowDownLeft className="w-3.5 h-3.5" />
                          ) : (
                            <ArrowUpRight className="w-3.5 h-3.5" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-bold text-[11px] text-white truncate">
                              {isIncoming
                                ? `รับจาก Telegram${log.senderName ? ` (${log.senderName})` : ''}${
                                    typeof log.parsedNumber === 'number' ? ` → เลข #${log.parsedNumber}` : ''
                                  }`
                                : log.eventType === 'broadcast_prediction'
                                ? 'ส่งชุดเลขแนะนำเข้ากลุ่ม Telegram'
                                : log.eventType === 'error'
                                ? 'แจ้งเตือนการเชื่อมต่อ Telegram'
                                : 'ส่งข้อความเข้ากลุ่ม Telegram'}
                            </span>
                            <span className="text-[10px] font-mono text-slate-500 shrink-0">{timeStr}</span>
                          </div>
                          <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-2 whitespace-pre-wrap">
                            {log.text}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
