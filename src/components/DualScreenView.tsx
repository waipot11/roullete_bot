import React from 'react';
import { PredictionResult, RowColumnStats, SpinRecord, TableSourceInfo, StrategyTier } from '../types/roulette';
import { RED_NUMBERS } from '../utils/rouletteConstants';
import { Target, RotateCcw, CheckCircle, XCircle, ArrowRight, ShieldAlert, Sparkles, Layers, Send } from 'lucide-react';

interface DualScreenViewProps {
  prediction: PredictionResult;
  rowStats: RowColumnStats;
  currentStep: number;
  consecutiveLosses: number;
  bankroll: number;
  baseUnit: number;
  recentSpins: SpinRecord[];
  onAddNumber: (num: number) => void;
  onAddRowOutcome: (row: 1 | 2 | 3 | 0) => void;
  onLogOutcome: (won: boolean) => void;
  onUndoLast: () => void;
  onResetStep: () => void;
  currentTable: TableSourceInfo;
  onOpen1xBetModal: () => void;
  selectedStrategy: StrategyTier;
  onSelectStrategy: (strat: StrategyTier) => void;
  stopLossNotice?: string | null;
  onDismissStopLoss?: () => void;
  onCleanRepetitiveHistory?: () => void;
  telegramReady?: boolean;
  onBroadcastTelegram?: () => void;
  onOpenTelegramTab?: () => void;
}

export const DualScreenView: React.FC<DualScreenViewProps> = ({
  prediction,
  rowStats,
  currentStep,
  consecutiveLosses,
  bankroll,
  baseUnit,
  recentSpins,
  onAddNumber,
  onAddRowOutcome,
  onLogOutcome,
  onUndoLast,
  onResetStep,
  currentTable,
  onOpen1xBetModal,
  selectedStrategy,
  onSelectStrategy,
  stopLossNotice,
  onDismissStopLoss,
  onCleanRepetitiveHistory,
  telegramReady,
  onBroadcastTelegram,
  onOpenTelegramTab
}) => {
  const [inputMode, setInputMode] = React.useState<'row_quick' | 'board_36' | 'fast_result'>('row_quick');
  const [isCompactSplit, setIsCompactSplit] = React.useState<boolean>(true);

  const isRepetitive = React.useMemo(() => {
    if (recentSpins.length < 3) return false;
    const last3 = recentSpins.slice(-3);
    return last3[0].number === last3[1].number && last3[1].number === last3[2].number;
  }, [recentSpins]);

  const lastSpins = recentSpins.slice(-8).reverse();
  const is10NumbersMode = selectedStrategy === 'quantum_core_10';

  // Progression values matching user's 2 THB chip & 164.67 THB bankroll
  const stepChips = currentStep === 1 ? 1 : currentStep === 2 ? 2 : 4;
  const stakeAmount = is10NumbersMode
    ? (prediction.progression?.stepStakeAmount ?? 10 * stepChips * baseUnit)
    : stepChips * baseUnit;
  const netGain = is10NumbersMode
    ? (prediction.progression?.expectedNetGain ?? (36 - 10) * stepChips * baseUnit)
    : (currentStep === 1 ? 2 : currentStep === 2 ? 3 : 5) * baseUnit;

  return (
    <div className={`flex flex-col gap-2 max-w-2xl mx-auto ${isCompactSplit ? 'pb-2' : 'pb-6'}`}>
      {/* Split Screen Control Bar */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs font-bold text-white tracking-wide">
            ระบบ 2 จอ (Split-Screen HUD)
          </span>
        </div>

        {/* Quick Strategy Switcher Pill inside Dual Screen */}
        <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 p-0.5 rounded-lg text-[10px]">
          <button
            onClick={() => onSelectStrategy('quantum_core_10')}
            className={`px-2 py-0.5 rounded transition-all font-bold flex items-center gap-1 ${
              is10NumbersMode
                ? 'bg-amber-500 text-slate-950 shadow-xs'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Sparkles className="w-3 h-3" />
            <span>10 เลขเด่น 100 ปัจจัย</span>
          </button>

          <button
            onClick={() => onSelectStrategy('low_cap_single_row')}
            className={`px-2 py-0.5 rounded transition-all font-bold flex items-center gap-1 ${
              !is10NumbersMode
                ? 'bg-emerald-600 text-slate-950 shadow-xs'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Target className="w-3 h-3" />
            <span>เน้นแถว 2ต่อ1</span>
          </button>
        </div>

        <div className="flex items-center gap-1.5">
          {(onBroadcastTelegram || onOpenTelegramTab) && (
            <button
              onClick={() => {
                if (telegramReady && onBroadcastTelegram) {
                  onBroadcastTelegram();
                } else if (onOpenTelegramTab) {
                  onOpenTelegramTab();
                }
              }}
              className={`text-[10px] px-2 py-0.5 rounded-md border flex items-center gap-1 transition-all whitespace-nowrap shrink-0 ${
                telegramReady
                  ? 'bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 border-sky-500/40 font-bold'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
              }`}
              title={telegramReady ? 'ส่งชุดเลขรอบนี้เข้ากลุ่ม Telegram' : 'ตั้งค่าบอทกลุ่ม Telegram'}
            >
              <Send className="w-3 h-3" />
              <span>{telegramReady ? 'ส่งเข้ากลุ่ม' : 'Telegram'}</span>
            </button>
          )}

          <button
            onClick={() => setIsCompactSplit(!isCompactSplit)}
            className={`text-[10px] px-2 py-0.5 rounded-md border transition-all whitespace-nowrap shrink-0 ${
              isCompactSplit
                ? 'bg-emerald-600/20 text-emerald-300 border-emerald-500/40 font-bold'
                : 'bg-slate-800 text-slate-400 border-slate-700'
            }`}
          >
            {isCompactSplit ? 'จอย่อ' : 'จอเต็ม'}
          </button>

          <button
            onClick={onOpen1xBetModal}
            className="text-[10px] text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 px-2 py-0.5 rounded-md flex items-center gap-1 transition-colors whitespace-nowrap shrink-0"
          >
            <span>ผัง 1xBet</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Stop Loss Protection Alert Banner */}
      {stopLossNotice && (
        <div className="bg-rose-950/90 border-2 border-rose-500 rounded-xl p-2.5 shadow-lg flex items-start justify-between gap-2.5">
          <div className="flex items-start gap-2">
            <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <div>
              <strong className="text-xs text-rose-200 block">
                🛡️ ตัดรอบขาดทุนอัตโนมัติ (Stop-Loss Protection)
              </strong>
              <p className="text-[10px] text-rose-300 mt-0.5 leading-snug">
                {stopLossNotice}
              </p>
              <div className="flex items-center gap-2 mt-1.5">
                <button
                  onClick={() => onSelectStrategy('low_cap_single_row')}
                  className="px-2 py-0.5 rounded bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold text-[10px] shadow-xs transition-colors"
                >
                  สลับไปสูตรเน้นแถว 2ต่อ1 (ปลอดภัยสูง)
                </button>
                {onCleanRepetitiveHistory && (
                  <button
                    onClick={onCleanRepetitiveHistory}
                    className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-[10px] transition-colors"
                  >
                    รีเซ็ตสถิติโต๊ะ
                  </button>
                )}
              </div>
            </div>
          </div>
          {onDismissStopLoss && (
            <button
              onClick={onDismissStopLoss}
              className="text-[10px] text-rose-300 hover:text-white px-2 py-0.5 rounded bg-rose-900/60 border border-rose-700 shrink-0"
            >
              ปิด
            </button>
          )}
        </div>
      )}

      {/* ========================================================
          SCREEN 1 (จอบน / TOP SCREEN): LIVE PREDICTION & STEP STATUS
         ======================================================== */}
      <div className={`bg-slate-900 border-2 ${is10NumbersMode ? 'border-amber-500/70' : 'border-emerald-500/60'} rounded-xl shadow-xl relative overflow-hidden ${isCompactSplit ? 'p-2.5' : 'p-4'}`}>
        {/* Step Indicator Bar */}
        <div className="grid grid-cols-3 gap-1.5 mb-2">
          <div
            className={`p-1.5 rounded-lg text-center border transition-all ${
              currentStep === 1
                ? 'bg-emerald-950/80 border-emerald-400 text-white shadow-md shadow-emerald-900/40 ring-1 ring-emerald-400'
                : 'bg-slate-950/40 border-slate-800 text-slate-500'
            }`}
          >
            <div className="flex items-center justify-center gap-1">
              {currentStep === 1 && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />}
              <span className="text-[10px] font-bold">ไม้ 1 (เริ่ม)</span>
            </div>
            <span className="block text-xs font-mono font-black text-emerald-400">
              {is10NumbersMode ? `10 ชิป (${baseUnit * 10}฿)` : `1 ชิป (${baseUnit}฿)`}
            </span>
          </div>

          <div
            className={`p-1.5 rounded-lg text-center border transition-all ${
              currentStep === 2
                ? 'bg-amber-950/80 border-amber-400 text-white shadow-md shadow-amber-900/40 ring-1 ring-amber-400 animate-pulse'
                : 'bg-slate-950/40 border-slate-800 text-slate-500'
            }`}
          >
            <div className="flex items-center justify-center gap-1">
              {currentStep === 2 && <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />}
              <span className="text-[10px] font-bold">ไม้ 2 (กู้ทุน)</span>
            </div>
            <span className="block text-xs font-mono font-black text-amber-400">
              {is10NumbersMode ? `20 ชิป (${baseUnit * 20}฿)` : `2 ชิป (${baseUnit * 2}฿)`}
            </span>
          </div>

          <div
            className={`p-1.5 rounded-lg text-center border transition-all ${
              currentStep === 3
                ? 'bg-red-950/80 border-red-400 text-white shadow-md shadow-red-900/40 ring-1 ring-red-400 animate-pulse'
                : 'bg-slate-950/40 border-slate-800 text-slate-500'
            }`}
          >
            <div className="flex items-center justify-center gap-1">
              {currentStep === 3 && <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-ping" />}
              <span className="text-[10px] font-bold">ไม้ 3 (สุดท้าย)</span>
            </div>
            <span className="block text-xs font-mono font-black text-red-400">
              {is10NumbersMode ? `40 ชิป (${baseUnit * 40}฿)` : `4 ชิป (${baseUnit * 4}฿)`}
            </span>
          </div>
        </div>

        {/* Primary Bet Blueprint Box */}
        <div className="bg-slate-950/95 border border-slate-800 rounded-xl p-2.5 mb-2 shadow-inner">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className="text-[10px] text-slate-400 font-medium">
                  🎯 เป้าหมายที่ต้องวางบนโต๊ะ 1xBet:
                </span>
                {is10NumbersMode && (
                  <span className="px-1.5 py-0.2 rounded text-[9px] font-black bg-amber-500/20 text-amber-300 border border-amber-500/40">
                    ตรงกัน {prediction.confidenceScore}%
                  </span>
                )}
              </div>

              {is10NumbersMode ? (
                <div>
                  <div className="text-sm sm:text-base font-black text-amber-300 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>วางเต็งเดี่ยว 10 เลขเด่น (100 ปัจจัย):</span>
                  </div>

                  {/* 10 Number Badges Strip */}
                  <div className="flex items-center gap-1 overflow-x-auto py-1 mt-0.5">
                    {prediction.coveredNumbers.map((num) => {
                      const isRed = RED_NUMBERS.includes(num);
                      const isZero = num === 0;
                      return (
                        <span
                          key={`target_pill_${num}`}
                          className={`px-1.5 py-0.5 rounded font-mono font-black text-xs border shrink-0 ${
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
                  </div>
                </div>
              ) : (
                <div>
                  <div className="text-base sm:text-lg font-black text-amber-300 flex items-center gap-1.5 mt-0.5">
                    <Target className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>ช่อง 2ต่อ1 ({rowStats.targetLabel.split(':')[0]})</span>
                  </div>
                  <p className="text-[10px] text-slate-300 line-clamp-1 mt-0.5">
                    {rowStats.targetReason}
                  </p>
                </div>
              )}
            </div>

            <div className="text-right shrink-0 bg-slate-900/80 border border-slate-800/80 px-2.5 py-1.5 rounded-lg">
              <span className="text-[9px] text-slate-400 block font-semibold">วางรอบนี้</span>
              <span className="text-lg font-black font-mono text-emerald-400 tabular-nums">
                ฿{stakeAmount}
              </span>
              <span className="text-[9px] font-bold text-amber-400 block">
                ชนะได้กำไร +฿{netGain}
              </span>
            </div>
          </div>

          {/* Dynamic re-analysis notice if in recovery step */}
          {consecutiveLosses > 0 && (
            <div className="mt-1.5 pt-1.5 border-t border-slate-800 flex items-center justify-between text-[10px] text-amber-300">
              <div className="flex items-center gap-1">
                <ShieldAlert className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span className="font-semibold">
                  ระบบปรับสูตรกู้ทุนเข้าไม้ {currentStep} อัตโนมัติ (กำไรสุทธิคงที่)
                </span>
              </div>
              <button
                onClick={onResetStep}
                className="text-[9px] px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700"
              >
                รีเซ็ตเป็นไม้ 1
              </button>
            </div>
          )}
        </div>

        {/* Recent Spins Trail */}
        <div className="flex items-center justify-between gap-1 text-xs">
          <div className="flex items-center gap-1 shrink-0">
            <span className="text-[9px] text-slate-400">ออกล่าสุด:</span>
            {isRepetitive && onCleanRepetitiveHistory && (
              <button
                onClick={onCleanRepetitiveHistory}
                className="text-[9px] text-amber-300 hover:text-white bg-amber-500/20 hover:bg-amber-500/30 px-1.5 py-0.2 rounded border border-amber-500/40 transition-colors"
                title="ล้างเลขซ้ำที่เกิดจากการกดบันทึกหลุดรัวๆ"
              >
                ล้างเลขซ้ำ
              </button>
            )}
          </div>
          <div className="flex items-center gap-1 overflow-x-auto pb-0.5">
            {lastSpins.map((spin, idx) => {
              const isZero = spin.number === 0;
              const isRed = RED_NUMBERS.includes(spin.number);
              let colorClass = 'bg-slate-800 text-slate-200 border-slate-700';
              if (isZero) colorClass = 'bg-emerald-600 text-slate-950 font-black border-emerald-400';
              else if (isRed) colorClass = 'bg-red-600 text-white font-bold border-red-500';

              return (
                <div
                  key={`trail_${spin.id}_${idx}`}
                  className={`min-w-[24px] h-6 px-1 rounded text-[10px] font-mono flex items-center justify-center border shadow-xs ${colorClass}`}
                >
                  {spin.number}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ========================================================
          SCREEN 2 (จอล่าง / BOTTOM SCREEN): INPUT CONTROL CENTER
         ======================================================== */}
      <div className={`bg-slate-900 border border-slate-800 rounded-xl shadow-xl space-y-2 ${isCompactSplit ? 'p-2.5' : 'p-3.5'}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            <Layers className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-[11px] font-bold text-white">
              จอที่ 2: แป้นบันทึกผลทันที
            </span>
          </div>

          {/* Submode Selector for Screen 2 */}
          <div className="flex items-center gap-1 bg-slate-950 p-0.5 rounded-lg border border-slate-800 text-[10px]">
            <button
              onClick={() => setInputMode('row_quick')}
              className={`px-2 py-0.5 rounded font-semibold transition-all ${
                inputMode === 'row_quick'
                  ? 'bg-emerald-600 text-slate-950 font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {is10NumbersMode ? 'กด 10 เลขเด่น' : 'ตามแถว 1-2-3'}
            </button>
            <button
              onClick={() => setInputMode('fast_result')}
              className={`px-2 py-0.5 rounded font-semibold transition-all ${
                inputMode === 'fast_result'
                  ? 'bg-emerald-600 text-slate-950 font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              ชนะ/หลุด
            </button>
            <button
              onClick={() => setInputMode('board_36')}
              className={`px-2 py-0.5 rounded font-semibold transition-all ${
                inputMode === 'board_36'
                  ? 'bg-emerald-600 text-slate-950 font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              กระดาน 0-36
            </button>
          </div>

          <button
            onClick={onUndoLast}
            disabled={recentSpins.length === 0}
            className="flex items-center gap-1 px-1.5 py-0.5 text-slate-400 hover:text-white bg-slate-800 disabled:opacity-40 rounded text-[10px] border border-slate-700"
            title="ลบผลตาล่าสุด"
          >
            <RotateCcw className="w-3 h-3" />
            <span>ย้อน</span>
          </button>
        </div>

        {/* Mode 1: 1-Tap Quick Action (if 10 numbers mode: 10 buttons; if row mode: 3 row buttons + 0) */}
        {inputMode === 'row_quick' && is10NumbersMode && (
          <div>
            <span className="text-[10px] text-slate-400 block mb-1">
              แตะตัวเลขที่ออกจริง (หากออก 1 ใน 10 เลขเด่นนี้ = ชนะทันที):
            </span>
            <div className="grid grid-cols-5 gap-1.5">
              {prediction.coveredNumbers.map((num, idx) => {
                const isRed = RED_NUMBERS.includes(num);
                const isZero = num === 0;
                return (
                  <button
                    key={`prom_tap_${num}`}
                    onClick={() => onAddNumber(num)}
                    className={`py-2 px-1 rounded-xl text-center border-2 transition-all active:scale-95 shadow-sm ${
                      isZero
                        ? 'bg-emerald-950/80 border-emerald-400 text-emerald-300'
                        : isRed
                        ? 'bg-red-950/80 border-red-500 hover:bg-red-900 text-white'
                        : 'bg-slate-950 border-slate-700 hover:bg-slate-800 text-slate-100'
                    }`}
                  >
                    <span className="block text-sm font-black font-mono">#{num}</span>
                    <span className="block text-[8px] text-amber-400 font-bold">
                      เด่น #{idx + 1}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Quick Button for other numbers outside 10 */}
            <div className="grid grid-cols-2 gap-1.5 mt-1.5">
              <button
                onClick={() => onAddNumber(0)}
                className="py-1.5 px-2 bg-emerald-950/60 border border-emerald-500/50 hover:bg-emerald-900 rounded-lg text-emerald-300 text-xs font-bold transition-all"
              >
                0 ออก (Green Zero)
              </button>
              <button
                onClick={() => onLogOutcome(false)}
                className="py-1.5 px-2 bg-slate-950 border border-rose-800/60 hover:bg-rose-950 text-rose-300 text-xs font-bold rounded-lg transition-all"
              >
                ออกเลขอื่น (หลุด 10 เลขเด่น)
              </button>
            </div>
          </div>
        )}

        {inputMode === 'row_quick' && !is10NumbersMode && (
          <div>
            <div className="grid grid-cols-4 gap-1.5">
              <button
                onClick={() => onAddRowOutcome(1)}
                className="py-2.5 px-1 bg-slate-950 hover:bg-slate-800 active:scale-95 border-2 border-slate-700 hover:border-emerald-500 rounded-xl text-center transition-all shadow-sm"
              >
                <span className="block text-xs font-black text-slate-100">แถว 1 ออก</span>
                <span className="block text-[8px] text-slate-400 font-mono">1,4,7..34</span>
                <span className="block text-[8px] text-amber-400 mt-0.5 font-semibold">
                  (หลับ {rowStats.row1Sleeper} ตา)
                </span>
              </button>

              <button
                onClick={() => onAddRowOutcome(2)}
                className="py-2.5 px-1 bg-slate-950 hover:bg-slate-800 active:scale-95 border-2 border-slate-700 hover:border-emerald-500 rounded-xl text-center transition-all shadow-sm"
              >
                <span className="block text-xs font-black text-slate-100">แถว 2 ออก</span>
                <span className="block text-[8px] text-slate-400 font-mono">2,5,8..35</span>
                <span className="block text-[8px] text-amber-400 mt-0.5 font-semibold">
                  (หลับ {rowStats.row2Sleeper} ตา)
                </span>
              </button>

              <button
                onClick={() => onAddRowOutcome(3)}
                className="py-2.5 px-1 bg-slate-950 hover:bg-slate-800 active:scale-95 border-2 border-slate-700 hover:border-emerald-500 rounded-xl text-center transition-all shadow-sm"
              >
                <span className="block text-xs font-black text-slate-100">แถว 3 ออก</span>
                <span className="block text-[8px] text-slate-400 font-mono">3,6,9..36</span>
                <span className="block text-[8px] text-amber-400 mt-0.5 font-semibold">
                  (หลับ {rowStats.row3Sleeper} ตา)
                </span>
              </button>

              <button
                onClick={() => onAddRowOutcome(0)}
                className="py-2.5 px-1 bg-emerald-950/80 hover:bg-emerald-900 active:scale-95 border-2 border-emerald-500/60 rounded-xl text-center transition-all shadow-sm"
              >
                <span className="block text-xs font-black text-emerald-300">0 ออก</span>
                <span className="block text-[8px] text-emerald-400 font-mono">Green</span>
                <span className="block text-[8px] text-emerald-400 mt-0.5 font-semibold">Zero</span>
              </button>
            </div>
            <p className="text-[9px] text-slate-400 text-center mt-1.5">
              💡 แตะปุ่มแถวที่ลูกเหล็กตก ระบบจะวิเคราะห์คำนวณเป้าหมายแถวใหม่ + สลับไม้กู้ทุนทันที 100%
            </p>
          </div>
        )}


        {/* Mode 2: 1-Tap Win / Loss Quick Result */}
        {inputMode === 'fast_result' && (
          <div className="space-y-1.5">
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => onLogOutcome(true)}
                className="flex flex-col items-center justify-center py-3 px-3 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-slate-950 font-black rounded-xl shadow-lg shadow-emerald-600/30 transition-all border border-emerald-400"
              >
                <div className="flex items-center gap-1.5 text-sm">
                  <CheckCircle className="w-5 h-5 text-slate-950 fill-emerald-200" />
                  <span>เข้าวินตามเป้า!</span>
                </div>
                <span className="text-[10px] opacity-90 mt-0.5 font-mono">
                  +฿{netGain} · รีเซ็ตกลับไม้ 1
                </span>
              </button>

              <button
                onClick={() => onLogOutcome(false)}
                className="flex flex-col items-center justify-center py-3 px-3 bg-rose-950 hover:bg-rose-900 active:scale-95 text-rose-200 font-bold rounded-xl border-2 border-rose-600 transition-all"
              >
                <div className="flex items-center gap-1.5 text-sm">
                  <XCircle className="w-5 h-5 text-rose-400" />
                  <span>หลุดเป้าหมาย</span>
                </div>
                <span className="text-[10px] text-rose-300 mt-0.5 font-mono">
                  วิเคราะห์ใหม่เข้าไม้ {Math.min(3, currentStep + 1)} ทันที
                </span>
              </button>
            </div>
            <p className="text-[9px] text-slate-400 text-center">
              กด "หลุด" ระบบจะกระจายสถิติไปยังแถวที่ออกจริง และคำนวณไม้ถัดไปพร้อมเปลี่ยนเป้าหมายให้อัตโนมัติ
            </p>
          </div>
        )}

        {/* Mode 3: Exact 0-36 Table Matching 1xBet Board */}
        {inputMode === 'board_36' && (
          <div className="pt-1">
            <button
              onClick={() => onAddNumber(0)}
              className="w-full h-8 mb-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-slate-950 font-black font-mono text-xs border border-emerald-400 flex items-center justify-center transition-all shadow-xs"
            >
              0 (Green Zero)
            </button>

            {/* 3 Columns matching 1xBet */}
            <div className="grid grid-cols-3 gap-1">
              {Array.from({ length: 36 }, (_, i) => i + 1).map((num) => {
                const isRed = RED_NUMBERS.includes(num);

                return (
                  <button
                    key={`dual_pad_${num}`}
                    onClick={() => onAddNumber(num)}
                    className={`h-8 rounded-md font-mono font-bold text-xs border transition-all active:scale-95 flex items-center justify-center shadow-xs ${
                      isRed
                        ? 'bg-red-700 hover:bg-red-600 active:bg-red-800 text-white border-red-500/50'
                        : 'bg-slate-800 hover:bg-slate-700 active:bg-slate-900 text-slate-100 border-slate-600/50'
                    }`}
                  >
                    {num}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
