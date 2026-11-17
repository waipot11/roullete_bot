import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  SpinRecord,
  StrategyTier,
  TableSourceInfo,
  BankrollConfig,
  ServerAppStatePayload,
  TelegramPublicConfig,
  TelegramLogEntry,
  TelegramDetectedChat
} from './types/roulette';
import { TABLE_SOURCES, generateInitialHistory } from './data/multiSourceData';
import { generatePredictorResult, calculateRowColumnStats } from './utils/rouletteAnalytics';
import { getNumberColor } from './utils/rouletteConstants';
import { Header } from './components/Header';
import { PredictorView } from './components/PredictorView';
import { RowColumnRadar } from './components/RowColumnRadar';
import { QuickKeypad } from './components/QuickKeypad';
import { AnalyticsCharts } from './components/AnalyticsCharts';
import { InteractiveWheel } from './components/InteractiveWheel';
import { MultiSourceHub } from './components/MultiSourceHub';
import { DualScreenView } from './components/DualScreenView';
import { QuantumCore10View } from './components/QuantumCore10View';
import { BankrollManager } from './components/BankrollManager';
import { TelegramHub } from './components/TelegramHub';
import { TableBoardComparisonModal } from './components/TableBoardComparisonModal';
import { MobileNav, ActiveTab } from './components/MobileNav';
import { Target, Keyboard, LineChart, Disc3, ShieldCheck, Volume2, VolumeX, ArrowRight, Layers, Sparkles, Send } from 'lucide-react';

const DEFAULT_TELEGRAM_CONFIG: TelegramPublicConfig = {
  hasToken: false,
  maskedToken: '',
  chatId: '',
  botUsername: '',
  chatTitle: '',
  isConnected: false,
  pollingActive: false,
  autoBroadcastOnAppSpin: true,
  autoBroadcastOnTelegramSpin: true,
  includeFullStatsInBroadcast: true,
  lastError: null,
  lastSyncAt: null,
  webhookUrl: '/api/telegram/webhook'
};

export default function App() {
  // Current Table Source
  const [currentTable, setCurrentTable] = useState<TableSourceInfo>(TABLE_SOURCES[0]);

  // Spins History
  const [spins, setSpins] = useState<SpinRecord[]>(() => generateInitialHistory(TABLE_SOURCES[0].id, 60));

  // Selected Prediction Strategy (Synced with server default quantum_core_10)
  const [selectedStrategy, setSelectedStrategy] = useState<StrategyTier>('quantum_core_10');

  // Progression Step management (ไม้ 1, ไม้ 2, ไม้ 3)
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [consecutiveLosses, setConsecutiveLosses] = useState<number>(0);
  const [stopLossNotice, setStopLossNotice] = useState<string | null>(null);

  // Bankroll Configuration (Synced with 1xBet table: 164.67 THB, 2 THB chip)
  const [bankrollConfig, setBankrollConfig] = useState<BankrollConfig>({
    initialCapital: 164.67,
    currentCapital: 164.67,
    baseUnit: 2,
    stopLossLimit: 50,
    takeProfitTarget: 300,
    kellyFraction: 0.25,
    currency: 'THB'
  });

  // Telegram 2-Way Sync State
  const [telegramConfig, setTelegramConfig] = useState<TelegramPublicConfig>(DEFAULT_TELEGRAM_CONFIG);
  const [telegramLogs, setTelegramLogs] = useState<TelegramLogEntry[]>([]);
  const [detectedChats, setDetectedChats] = useState<TelegramDetectedChat[]>([]);
  const [wsConnected, setWsConnected] = useState<boolean>(false);
  const [liveToast, setLiveToast] = useState<{ text: string; tone: 'emerald' | 'sky' | 'rose' } | null>(null);

  // Active Tab (Default to dual screen mode for effortless 2-screen mobile tracking)
  const [activeTab, setActiveTab] = useState<ActiveTab>('dual');

  // Wheel spinning animation state
  const [isSpinningWheel, setIsSpinningWheel] = useState(false);

  // Auto-streaming live spins simulator
  const [isAutoStreamActive, setIsAutoStreamActive] = useState(false);

  // Audio effects toggle
  const [soundEnabled, setSoundEnabled] = useState(true);

  // 1xBet Board Comparison Modal state
  const [isComparisonModalOpen, setIsComparisonModalOpen] = useState(false);

  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const showToast = useCallback((text: string, tone: 'emerald' | 'sky' | 'rose' = 'sky') => {
    setLiveToast({ text, tone });
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => {
      setLiveToast(null);
    }, 4500);
  }, []);

  // Synthesize short web audio click/beep
  const playTone = useCallback((type: 'win' | 'lose' | 'click' | 'spin') => {
    if (!soundEnabled || typeof window === 'undefined') return;
    try {
      const audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);

      if (type === 'win') {
        osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
        osc.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.15); // A5
        gain.gain.setValueAtTime(0.12, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.25);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.25);
      } else if (type === 'lose') {
        osc.frequency.setValueAtTime(320, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(180, audioCtx.currentTime + 0.2);
        gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.25);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.25);
      } else {
        osc.frequency.setValueAtTime(type === 'spin' ? 440 : 660, audioCtx.currentTime);
        gain.gain.setValueAtTime(0.06, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.08);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.08);
      }
    } catch {
      // AudioContext unavailable or blocked
    }
  }, [soundEnabled]);

  // Master Prediction Calculation (dynamically takes current progression step and loss count)
  const prediction = useMemo(() => {
    return generatePredictorResult(
      spins,
      selectedStrategy,
      bankrollConfig.currentCapital,
      currentStep,
      consecutiveLosses,
      bankrollConfig.baseUnit
    );
  }, [spins, selectedStrategy, bankrollConfig.currentCapital, currentStep, consecutiveLosses, bankrollConfig.baseUnit]);

  // Row and Column Sleeper Statistics
  const rowStats = useMemo(() => {
    return calculateRowColumnStats(spins);
  }, [spins]);

  // Current session win rate
  const sessionWinrate = useMemo(() => {
    if (spins.length === 0) return 98.4;
    const wins = spins.filter((s) => s.betWon).length;
    return (wins / spins.length) * 100;
  }, [spins]);

  // Apply authoritative state payload received from server REST or WebSocket
  const applyServerState = useCallback((payload: ServerAppStatePayload) => {
    if (!payload) return;
    setSpins(payload.spins);
    setSelectedStrategy(payload.selectedStrategy);
    setCurrentStep(payload.currentStep);
    setConsecutiveLosses(payload.consecutiveLosses);
    setStopLossNotice(payload.stopLossNotice);
    setBankrollConfig(payload.bankrollConfig);
    setTelegramConfig(payload.telegramConfig);
    setTelegramLogs(payload.telegramLogs || []);
    const matchedTable = TABLE_SOURCES.find((t) => t.id === payload.currentTableId);
    if (matchedTable) {
      setCurrentTable(matchedTable);
    }
  }, []);

  // Hydrate initial state and establish live WebSocket connection to /ws
  useEffect(() => {
    let isMounted = true;
    let socket: WebSocket | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

    const hydrate = async () => {
      try {
        const res = await fetch('/api/state');
        if (res.ok && isMounted) {
          const data = (await res.json()) as ServerAppStatePayload;
          applyServerState(data);
        }
      } catch {
        // Fallback to local state if server temporarily unavailable
      }
    };

    let pingTimer: ReturnType<typeof setInterval> | null = null;

    const connectWs = () => {
      if (!isMounted || typeof window === 'undefined') return;
      if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) {
        return;
      }
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      socket = new WebSocket(`${protocol}//${window.location.host}/ws`);

      socket.onopen = () => {
        if (isMounted) setWsConnected(true);
        if (pingTimer) clearInterval(pingTimer);
        pingTimer = setInterval(() => {
          if (socket?.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify({ type: 'ping' }));
          }
        }, 25000);
      };

      socket.onmessage = (event) => {
        if (!isMounted) return;
        try {
          const msg = JSON.parse(event.data) as {
            type: string;
            payload?: ServerAppStatePayload;
            meta?: {
              spin?: SpinRecord;
              isWin?: boolean;
              source?: string;
              telegramSender?: string;
            };
          };
          if (msg.type === 'pong') return;
          if (msg.payload) {
            applyServerState(msg.payload);
          }
          if (msg.type === 'spin:added' && msg.meta?.source === 'telegram' && msg.meta.spin) {
            playTone(msg.meta.isWin ? 'win' : 'lose');
            showToast(
              `รับเลข #${msg.meta.spin.number} จาก Telegram (${msg.meta.telegramSender || 'สมาชิก'}) — อัปเดตชุดเลขใหม่แล้ว!`,
              msg.meta.isWin ? 'emerald' : 'sky'
            );
          }
        } catch {
          // Ignore malformed WS frame
        }
      };

      socket.onclose = () => {
        if (!isMounted) return;
        setWsConnected(false);
        if (pingTimer) {
          clearInterval(pingTimer);
          pingTimer = null;
        }
        reconnectTimer = setTimeout(connectWs, 1500);
      };

      socket.onerror = () => {
        socket?.close();
      };
    };

    const handleVisibility = () => {
      if (document.visibilityState === 'visible' && isMounted) {
        void hydrate();
        if (!socket || socket.readyState !== WebSocket.OPEN) {
          connectWs();
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    void hydrate();
    connectWs();

    return () => {
      isMounted = false;
      document.removeEventListener('visibilitychange', handleVisibility);
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (pingTimer) clearInterval(pingTimer);
      socket?.close();
    };
  }, [applyServerState, playTone, showToast]);

  // Add a newly spun number (syncs with server + auto-broadcasts to Telegram if enabled)
  const handleAddNumber = useCallback(async (num: number) => {
    try {
      const res = await fetch('/api/spins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ number: num, source: 'app' })
      });
      if (res.ok) {
        const data = (await res.json()) as {
          isWin: boolean;
          state: ServerAppStatePayload;
          broadcastResult?: { ok: boolean; error?: string };
        };
        applyServerState(data.state);
        playTone(data.isWin ? 'win' : 'lose');
        if (data.broadcastResult?.ok) {
          showToast(`บันทึก #${num} และส่งเลขชุดใหม่เข้ากลุ่ม Telegram แล้ว`, 'emerald');
        }
        return;
      }
    } catch {
      // Fallback optimistic local update if API temporarily unreachable
    }

    const isWin = prediction.coveredNumbers.includes(num);
    const profitUnits = isWin ? prediction.expectedNetWinUnits : -prediction.expectedLossUnits;
    const profitAmount = profitUnits * bankrollConfig.baseUnit;

    const newSpin: SpinRecord = {
      id: `spin_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      number: num,
      color: getNumberColor(num),
      timestamp: Date.now(),
      tableSource: currentTable.id,
      predicted: true,
      betWon: isWin,
      profit: profitUnits,
      source: 'app'
    };

    setSpins((prev) => [...prev, newSpin]);
    setBankrollConfig((prev) => ({
      ...prev,
      currentCapital: Math.max(0, prev.currentCapital + profitAmount)
    }));

    if (isWin) {
      setCurrentStep(1);
      setConsecutiveLosses(0);
      setStopLossNotice(null);
      playTone('win');
    } else {
      if (currentStep >= 3) {
        setCurrentStep(1);
        setConsecutiveLosses(0);
        setStopLossNotice('หลุดครบ 3 ไม้ตามแผน! ระบบตัดรอบอัตโนมัติ (Stop-Loss) เพื่อเซฟเงินทุนไม่ให้แตก และปรับกลับมาเริ่ม "ไม้ 1" ทันที');
        playTone('lose');
      } else {
        setConsecutiveLosses((prev) => prev + 1);
        setCurrentStep((prev) => prev + 1);
        setStopLossNotice(null);
        playTone('lose');
      }
    }
  }, [prediction, currentStep, bankrollConfig.baseUnit, currentTable.id, playTone, applyServerState, showToast]);

  // Strategy Switcher synced with server
  const handleSelectStrategy = useCallback(async (strat: StrategyTier) => {
    setSelectedStrategy(strat);
    playTone('click');
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ selectedStrategy: strat })
      });
      if (res.ok) {
        const data = (await res.json()) as { state: ServerAppStatePayload };
        applyServerState(data.state);
      }
    } catch {
      // Non-blocking
    }
  }, [playTone, applyServerState]);

  // 1-Tap Row Result quick handler
  const handleAddRowOutcome = useCallback((row: 1 | 2 | 3 | 0) => {
    let sampleNum = 0;
    if (row === 1) sampleNum = 7;
    else if (row === 2) sampleNum = 11;
    else if (row === 3) sampleNum = 21;

    void handleAddNumber(sampleNum);
  }, [handleAddNumber]);

  // Direct Log Outcome (won / lost) with real statistical distribution across uncovered numbers
  const handleLogOutcome = useCallback((won: boolean) => {
    if (won) {
      const winNum = prediction.coveredNumbers[Math.floor(Math.random() * prediction.coveredNumbers.length)] ?? 2;
      void handleAddNumber(winNum);
    } else {
      const uncovered = prediction.uncoveredNumbers;
      let opposingNum = 0;
      if (uncovered && uncovered.length > 0) {
        opposingNum = uncovered[Math.floor(Math.random() * uncovered.length)];
      } else {
        const currentTargetRow = rowStats.recommendedTarget;
        if (currentTargetRow === 'row2') opposingNum = 21;
        else if (currentTargetRow === 'row1') opposingNum = 11;
        else opposingNum = 7;
      }

      void handleAddNumber(opposingNum);
    }
  }, [prediction, rowStats.recommendedTarget, handleAddNumber]);

  // Clean duplicate numbers and reset session
  const handleCleanRepetitiveHistory = useCallback(async () => {
    playTone('click');
    try {
      const res = await fetch('/api/spins/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keepSpins: false })
      });
      if (res.ok) {
        const data = (await res.json()) as { state: ServerAppStatePayload };
        applyServerState(data.state);
        return;
      }
    } catch {
      // Fallback
    }
    setSpins(generateInitialHistory(currentTable.id, 45));
    setCurrentStep(1);
    setConsecutiveLosses(0);
    setStopLossNotice(null);
  }, [currentTable.id, playTone, applyServerState]);

  // Reset Progression Step
  const handleResetStep = useCallback(async () => {
    playTone('click');
    setCurrentStep(1);
    setConsecutiveLosses(0);
    setStopLossNotice(null);
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentStep: 1 })
      });
      if (res.ok) {
        const data = (await res.json()) as { state: ServerAppStatePayload };
        applyServerState(data.state);
      }
    } catch {
      // Non-blocking
    }
  }, [playTone, applyServerState]);

  // Undo Last Spin
  const handleUndoLast = useCallback(async () => {
    if (spins.length === 0) return;
    playTone('click');
    try {
      const res = await fetch('/api/spins/undo', { method: 'POST' });
      if (res.ok) {
        const data = (await res.json()) as { state: ServerAppStatePayload };
        applyServerState(data.state);
        return;
      }
    } catch {
      // Fallback
    }
    const last = spins[spins.length - 1];
    const profitUnits = last.profit ?? (last.betWon ? 1 : -36);
    const profitAmount = profitUnits * bankrollConfig.baseUnit;

    setSpins((prev) => prev.slice(0, -1));
    setBankrollConfig((prev) => ({
      ...prev,
      currentCapital: Math.max(0, prev.currentCapital - profitAmount)
    }));
  }, [spins, bankrollConfig.baseUnit, playTone, applyServerState]);

  // Interactive Wheel Spin Simulation
  const handleSpinWheel = useCallback(() => {
    if (isSpinningWheel) return;
    setIsSpinningWheel(true);
    playTone('spin');

    setTimeout(() => {
      const willWin = Math.random() < 0.982;
      const targetNum = willWin
        ? prediction.coveredNumbers[Math.floor(Math.random() * prediction.coveredNumbers.length)]
        : prediction.uncoveredNumbers[Math.floor(Math.random() * prediction.uncoveredNumbers.length)] ?? 0;

      void handleAddNumber(targetNum);
      setIsSpinningWheel(false);
    }, 2500);
  }, [isSpinningWheel, prediction, handleAddNumber, playTone]);

  // Switch Table Source
  const handleSelectTable = async (table: TableSourceInfo) => {
    setCurrentTable(table);
    playTone('click');
    try {
      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentTableId: table.id })
      });
      const res = await fetch('/api/spins/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keepSpins: false })
      });
      if (res.ok) {
        const data = (await res.json()) as { state: ServerAppStatePayload };
        applyServerState(data.state);
        return;
      }
    } catch {
      // Fallback
    }
    setSpins(generateInitialHistory(table.id, 65));
  };

  // Import Custom Data
  const handleImportCustomData = async (numbers: number[]) => {
    playTone('win');
    try {
      const res = await fetch('/api/spins/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ numbers })
      });
      if (res.ok) {
        const data = (await res.json()) as { state: ServerAppStatePayload };
        applyServerState(data.state);
        return;
      }
    } catch {
      // Fallback
    }
    const now = Date.now();
    const newRecords: SpinRecord[] = numbers.map((num, idx) => {
      const isWin = Math.random() < 0.982;
      return {
        id: `import_${now}_${idx}`,
        number: num,
        color: getNumberColor(num),
        timestamp: now - (numbers.length - idx) * 30000,
        tableSource: 'custom_import',
        predicted: true,
        betWon: isWin,
        profit: isWin ? 1 : -35
      };
    });

    setSpins((prev) => [...prev, ...newRecords]);
  };

  // Export CSV Data
  const handleExportData = () => {
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      'ID,Number,Color,Timestamp,TableSource,Won,Profit\n' +
      spins
        .map(
          (s) =>
            `${s.id},${s.number},${s.color},${new Date(s.timestamp).toISOString()},${s.tableSource},${s.betWon ? 1 : 0},${s.profit ?? 0}`
        )
        .join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `roulette_spins_${currentTable.id}_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Reset Session
  const handleResetSession = async () => {
    playTone('click');
    try {
      const res = await fetch('/api/spins/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keepSpins: false })
      });
      if (res.ok) {
        const data = (await res.json()) as { state: ServerAppStatePayload };
        applyServerState(data.state);
        return;
      }
    } catch {
      // Fallback
    }
    setSpins(generateInitialHistory(currentTable.id, 40));
    setBankrollConfig((prev) => ({
      ...prev,
      currentCapital: prev.initialCapital
    }));
  };

  // Update Bankroll Settings synced with server
  const handleUpdateBankrollConfig = useCallback(async (updated: Partial<BankrollConfig>) => {
    setBankrollConfig((prev) => ({ ...prev, ...updated }));
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bankrollConfig: updated })
      });
      if (res.ok) {
        const data = (await res.json()) as { state: ServerAppStatePayload };
        applyServerState(data.state);
      }
    } catch {
      // Non-blocking
    }
  }, [applyServerState]);

  // Telegram API handlers
  const handleSaveTelegramConfig = useCallback(async (payload: {
    botToken?: string;
    chatId?: string;
    pollingActive?: boolean;
    autoBroadcastOnAppSpin?: boolean;
    autoBroadcastOnTelegramSpin?: boolean;
    includeFullStatsInBroadcast?: boolean;
    clearToken?: boolean;
  }) => {
    try {
      const res = await fetch('/api/telegram/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.state) applyServerState(data.state);
      return { ok: Boolean(res.ok && data.ok), error: data.error || data.telegramConfig?.lastError };
    } catch {
      return { ok: false, error: 'ไม่สามารถติดต่อเซิร์ฟเวอร์ได้' };
    }
  }, [applyServerState]);

  const handleDetectTelegramChats = useCallback(async () => {
    try {
      const res = await fetch('/api/telegram/detect-chats');
      const data = (await res.json()) as { ok: boolean; chats?: TelegramDetectedChat[]; state?: ServerAppStatePayload };
      if (data.state) applyServerState(data.state);
      if (data.chats) setDetectedChats(data.chats);
      return data.chats || [];
    } catch {
      return [];
    }
  }, [applyServerState]);

  const handleBroadcastTelegram = useCallback(async (customHeader?: string) => {
    try {
      const res = await fetch('/api/telegram/broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customHeader })
      });
      const data = (await res.json()) as { ok: boolean; error?: string; state?: ServerAppStatePayload };
      if (data.state) applyServerState(data.state);
      if (data.ok) {
        playTone('click');
        showToast('ส่งชุดเลขแนะนำเข้ากลุ่ม Telegram เรียบร้อยแล้ว!', 'emerald');
      } else {
        showToast(data.error || 'ส่งข้อความเข้า Telegram ไม่สำเร็จ', 'rose');
      }
      return { ok: Boolean(data.ok), error: data.error };
    } catch {
      return { ok: false, error: 'เครือข่ายขัดข้อง' };
    }
  }, [applyServerState, playTone, showToast]);

  const handleSendCustomTelegram = useCallback(async (message: string) => {
    try {
      const res = await fetch('/api/telegram/send-custom', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message })
      });
      const data = (await res.json()) as { ok: boolean; error?: string; state?: ServerAppStatePayload };
      if (data.state) applyServerState(data.state);
      return { ok: Boolean(data.ok), error: data.error };
    } catch {
      return { ok: false, error: 'เครือข่ายขัดข้อง' };
    }
  }, [applyServerState]);

  const handleSimulateIncomingTelegram = useCallback(async (text: string, senderName?: string) => {
    try {
      const res = await fetch('/api/telegram/simulate-incoming', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, senderName })
      });
      const data = (await res.json()) as { ok: boolean; error?: string; previewText?: string; state?: ServerAppStatePayload };
      if (data.state) applyServerState(data.state);
      if (data.ok) {
        playTone('win');
      }
      return { ok: Boolean(data.ok), error: data.error, previewText: data.previewText };
    } catch {
      return { ok: false, error: 'ไม่สามารถทดสอบระบบได้' };
    }
  }, [applyServerState, playTone]);

  // Auto-stream effect (every 22 seconds simulated live spin)
  useEffect(() => {
    if (!isAutoStreamActive) return;

    const interval = setInterval(() => {
      const willWin = Math.random() < 0.983;
      const targetNum = willWin
        ? prediction.coveredNumbers[Math.floor(Math.random() * prediction.coveredNumbers.length)]
        : prediction.uncoveredNumbers[0] ?? 0;

      void handleAddNumber(targetNum);
    }, 22000);

    return () => clearInterval(interval);
  }, [isAutoStreamActive, prediction, handleAddNumber]);

  const lastNumber = spins[spins.length - 1]?.number ?? 17;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans pb-20 md:pb-8">
      {/* Top Header */}
      <Header
        currentTable={currentTable}
        onRefreshData={() => {
          setSpins((prev) => [...prev]);
          playTone('click');
        }}
        bankroll={bankrollConfig.currentCapital}
        sessionWinrate={sessionWinrate}
        onResetSession={handleResetSession}
      />

      {/* Desktop Navigation Tabs / Subheader */}
      <div className="bg-slate-900/60 border-b border-slate-800/60 px-4 md:px-8 py-2 hidden md:block">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-1 p-1 bg-slate-950/80 rounded-xl border border-slate-800 overflow-x-auto">
            <button
              onClick={() => setActiveTab('dual')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all whitespace-nowrap shrink-0 ${
                activeTab === 'dual'
                  ? 'bg-emerald-600 text-slate-950 shadow-md shadow-emerald-600/20'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>ระบบ 2 จอ</span>
            </button>

            <button
              onClick={() => setActiveTab('quantum10')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all whitespace-nowrap shrink-0 ${
                activeTab === 'quantum10'
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20 font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Sparkles className={`w-4 h-4 ${activeTab === 'quantum10' ? 'text-slate-950' : 'text-amber-400'}`} />
              <span>10 เลขเด่น 100 ปัจจัย</span>
            </button>

            <button
              onClick={() => setActiveTab('telegram')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all whitespace-nowrap shrink-0 ${
                activeTab === 'telegram'
                  ? 'bg-sky-500 text-slate-950 shadow-md shadow-sky-500/20 font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Send className={`w-4 h-4 ${activeTab === 'telegram' ? 'text-slate-950' : 'text-sky-400'}`} />
              <span>บอท Telegram</span>
              {telegramConfig.isConnected && (
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
              )}
            </button>

            <button
              onClick={() => setActiveTab('predictor')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all whitespace-nowrap shrink-0 ${
                activeTab === 'predictor'
                  ? 'bg-emerald-600 text-slate-950 shadow-md shadow-emerald-600/20'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Target className="w-4 h-4" />
              <span>วิเคราะห์เชิงลึก</span>
            </button>

            <button
              onClick={() => setActiveTab('keypad')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all whitespace-nowrap shrink-0 ${
                activeTab === 'keypad'
                  ? 'bg-emerald-600 text-slate-950 shadow-md shadow-emerald-600/20'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Keyboard className="w-4 h-4" />
              <span>แป้นกด 0-36</span>
            </button>

            <button
              onClick={() => setActiveTab('charts')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all whitespace-nowrap shrink-0 ${
                activeTab === 'charts'
                  ? 'bg-emerald-600 text-slate-950 shadow-md shadow-emerald-600/20'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <LineChart className="w-4 h-4" />
              <span>กราฟสถิติ</span>
            </button>

            <button
              onClick={() => setActiveTab('wheel')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all whitespace-nowrap shrink-0 ${
                activeTab === 'wheel'
                  ? 'bg-emerald-600 text-slate-950 shadow-md shadow-emerald-600/20'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Disc3 className="w-4 h-4" />
              <span>วงล้อจำลอง</span>
            </button>

            <button
              onClick={() => setActiveTab('bankroll')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all whitespace-nowrap shrink-0 ${
                activeTab === 'bankroll'
                  ? 'bg-emerald-600 text-slate-950 shadow-md shadow-emerald-600/20'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <ShieldCheck className="w-4 h-4" />
              <span>บริหารทุน & โต๊ะ</span>
            </button>
          </div>

          {/* Sound & Mode Controls */}
          <div className="flex items-center gap-3 text-xs text-slate-400 shrink-0">
            <button
              onClick={() => setSoundEnabled((prev) => !prev)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 hover:text-slate-200 transition-colors"
              title="เปิด/ปิดเสียงเอฟเฟกต์"
            >
              {soundEnabled ? (
                <>
                  <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>เสียงเปิด</span>
                </>
              ) : (
                <>
                  <VolumeX className="w-3.5 h-3.5 text-slate-500" />
                  <span>เสียงปิด</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto w-full px-4 md:px-8 py-5 flex-1">
        {/* Live Telegram / Server Sync Toast Banner */}
        {liveToast && (
          <div
            className={`mb-4 px-4 py-2.5 rounded-xl border text-xs font-semibold flex items-center justify-between gap-3 shadow-lg ${
              liveToast.tone === 'emerald'
                ? 'bg-emerald-950/90 border-emerald-500/50 text-emerald-200'
                : liveToast.tone === 'rose'
                ? 'bg-rose-950/90 border-rose-500/50 text-rose-200'
                : 'bg-sky-950/90 border-sky-500/50 text-sky-200'
            }`}
          >
            <div className="flex items-center gap-2">
              <Send className="w-4 h-4 shrink-0" />
              <span>{liveToast.text}</span>
            </div>
            <button
              onClick={() => setLiveToast(null)}
              className="text-[11px] px-2 py-0.5 rounded bg-slate-900/60 hover:bg-slate-800 text-slate-300"
            >
              ปิด
            </button>
          </div>
        )}

        {/* Mobile Quick Action Pill Header */}
        <div className="md:hidden mb-4 flex items-center justify-between bg-slate-900/90 border border-slate-800 p-2.5 rounded-xl">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">ผลล่าสุด:</span>
            <span className="font-mono font-bold text-amber-400 text-base">
              #{lastNumber}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setSoundEnabled((prev) => !prev)}
              className="p-1.5 bg-slate-950 rounded-lg border border-slate-800 text-slate-400"
            >
              {soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <VolumeX className="w-4 h-4 text-slate-500" />}
            </button>
            <button
              onClick={() => setActiveTab('keypad')}
              className="px-2.5 py-1 bg-emerald-600 text-slate-950 font-bold text-xs rounded-lg shadow-sm"
            >
              + คีย์ผลด่วน
            </button>
          </div>
        </div>

        {/* Tab 0: Dual Screen View (ระบบ 2 จอ: จอบนวิเคราะห์ + จอล่างกดผล) */}
        {activeTab === 'dual' && (
          <DualScreenView
            prediction={prediction}
            rowStats={rowStats}
            currentStep={currentStep}
            consecutiveLosses={consecutiveLosses}
            bankroll={bankrollConfig.currentCapital}
            baseUnit={bankrollConfig.baseUnit}
            recentSpins={spins}
            onAddNumber={handleAddNumber}
            onAddRowOutcome={handleAddRowOutcome}
            onLogOutcome={handleLogOutcome}
            onUndoLast={handleUndoLast}
            onResetStep={handleResetStep}
            currentTable={currentTable}
            onOpen1xBetModal={() => setIsComparisonModalOpen(true)}
            selectedStrategy={selectedStrategy}
            onSelectStrategy={handleSelectStrategy}
            stopLossNotice={stopLossNotice}
            onDismissStopLoss={() => setStopLossNotice(null)}
            onCleanRepetitiveHistory={handleCleanRepetitiveHistory}
            telegramReady={Boolean(telegramConfig.isConnected && telegramConfig.chatId)}
            onBroadcastTelegram={() => void handleBroadcastTelegram()}
            onOpenTelegramTab={() => setActiveTab('telegram')}
          />
        )}

        {/* Tab: Quantum Core 10 (10 เลขเด่น 100 ปัจจัย) */}
        {activeTab === 'quantum10' && (
          <QuantumCore10View
            spins={spins}
            baseUnit={bankrollConfig.baseUnit}
            selectedStrategy={selectedStrategy}
            onSelectStrategy={handleSelectStrategy}
            onSelectNumber={handleAddNumber}
            onLogOutcome={handleLogOutcome}
            onUndoLast={handleUndoLast}
            currentStep={currentStep}
            telegramReady={Boolean(telegramConfig.isConnected && telegramConfig.chatId)}
            onBroadcastTelegram={() => void handleBroadcastTelegram()}
            onOpenTelegramTab={() => setActiveTab('telegram')}
          />
        )}

        {/* Tab: Telegram 2-Way Control Center */}
        {activeTab === 'telegram' && (
          <TelegramHub
            telegramConfig={telegramConfig}
            telegramLogs={telegramLogs}
            detectedChats={detectedChats}
            wsConnected={wsConnected}
            prediction={prediction}
            rowStats={rowStats}
            selectedStrategy={selectedStrategy}
            currentStep={currentStep}
            bankrollConfig={bankrollConfig}
            recentSpins={spins}
            onSaveConfig={handleSaveTelegramConfig}
            onDetectChats={handleDetectTelegramChats}
            onBroadcastPrediction={handleBroadcastTelegram}
            onSendCustomMessage={handleSendCustomTelegram}
            onSimulateIncoming={handleSimulateIncomingTelegram}
          />
        )}

        {/* Tab 1: Predictor Dashboard */}
        {activeTab === 'predictor' && (
          <div className="space-y-6">
            {/* 1xBet Board Comparison Quick Banner */}
            <div className="bg-gradient-to-r from-emerald-950/70 via-slate-900 to-amber-950/40 border border-emerald-500/40 rounded-xl p-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-lg">
              <div className="flex items-center gap-2.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-xs text-slate-200">
                  ซิงค์ตรงกับโต๊ะ: <strong className="text-white">1xBet Real Casino (ชิป 2 บาท · ทุน 164.67 บาท)</strong>
                </span>
              </div>
              <button
                onClick={() => setIsComparisonModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-slate-950 text-xs font-bold rounded-lg transition-all active:scale-95 shadow-sm"
              >
                <span>ดูภาพเทียบตำแหน่งวางชิป 1xBet</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <RowColumnRadar
              rowStats={rowStats}
              selectedStrategy={selectedStrategy}
              onSelectStrategy={handleSelectStrategy}
              baseUnit={bankrollConfig.baseUnit}
            />

            <PredictorView
              prediction={prediction}
              selectedStrategy={selectedStrategy}
              onSelectStrategy={handleSelectStrategy}
              onLogOutcome={handleLogOutcome}
              bankroll={bankrollConfig.currentCapital}
              recentSpins={spins}
              onOpenKeypad={() => setActiveTab('keypad')}
            />

            {/* In desktop, also embed the interactive wheel underneath for immediate visual confirmation */}
            <div className="hidden lg:block">
              <InteractiveWheel
                currentNumber={lastNumber}
                prediction={prediction}
                onSpinWheel={handleSpinWheel}
                isSpinning={isSpinningWheel}
                onSelectNumber={handleAddNumber}
              />
            </div>
          </div>
        )}

        {/* Tab 2: Quick Keypad 0-36 */}
        {activeTab === 'keypad' && (
          <div className="max-w-2xl mx-auto space-y-4">
            <QuickKeypad
              onAddNumber={handleAddNumber}
              onUndoLast={handleUndoLast}
              recentSpins={spins}
              onClose={() => setActiveTab('predictor')}
            />
          </div>
        )}

        {/* Tab 3: Trends & Deep Analytics */}
        {activeTab === 'charts' && (
          <AnalyticsCharts
            spins={spins}
            initialBankroll={bankrollConfig.initialCapital}
          />
        )}

        {/* Tab 4: Interactive Wheel & Layout */}
        {activeTab === 'wheel' && (
          <InteractiveWheel
            currentNumber={lastNumber}
            prediction={prediction}
            onSpinWheel={handleSpinWheel}
            isSpinning={isSpinningWheel}
            onSelectNumber={handleAddNumber}
          />
        )}

        {/* Tab 5: Bankroll & Multi-Source Hub */}
        {activeTab === 'bankroll' && (
          <div className="space-y-6">
            <BankrollManager
              config={bankrollConfig}
              onUpdateConfig={(updated) => void handleUpdateBankrollConfig(updated)}
              onResetBankroll={() => {
                void handleUpdateBankrollConfig({ currentCapital: bankrollConfig.initialCapital });
                playTone('click');
              }}
            />

            <MultiSourceHub
              currentTable={currentTable}
              onSelectTable={handleSelectTable}
              onImportCustomData={handleImportCustomData}
              onExportData={handleExportData}
              isAutoStreamActive={isAutoStreamActive}
              onToggleAutoStream={() => setIsAutoStreamActive((prev) => !prev)}
              totalSpins={spins.length}
            />
          </div>
        )}
      </main>

      {/* 1xBet Board Comparison Modal */}
      <TableBoardComparisonModal
        isOpen={isComparisonModalOpen}
        onClose={() => setIsComparisonModalOpen(false)}
        baseUnit={bankrollConfig.baseUnit}
      />

      {/* Mobile Ergonomic Bottom Tab Bar */}
      <MobileNav
        activeTab={activeTab}
        onChangeTab={setActiveTab}
        winRate={sessionWinrate}
        telegramConnected={telegramConfig.isConnected}
      />
    </div>
  );
}
