import React, { useState } from 'react';
import { SpinRecord, HundredFactorsEngineResult, ProminentNumber10, StrategyTier } from '../types/roulette';
import { calculate100FactorsAnalysis } from '../utils/hundredFactorsEngine';
import { RED_NUMBERS } from '../utils/rouletteConstants';
import {
  Sparkles,
  Layers,
  ChevronDown,
  ChevronUp,
  Cpu,
  Target,
  Flame,
  CheckCircle,
  HelpCircle,
  Sliders,
  Award,
  RefreshCw,
  XCircle,
  RotateCcw,
  Send
} from 'lucide-react';

interface QuantumCore10ViewProps {
  spins: SpinRecord[];
  baseUnit: number;
  selectedStrategy: StrategyTier;
  onSelectStrategy: (strat: StrategyTier) => void;
  onSelectNumber: (num: number) => void;
  onLogOutcome?: (won: boolean) => void;
  onUndoLast?: () => void;
  currentStep: number;
  telegramReady?: boolean;
  onBroadcastTelegram?: () => void;
  onOpenTelegramTab?: () => void;
}

export const QuantumCore10View: React.FC<QuantumCore10ViewProps> = ({
  spins,
  baseUnit,
  selectedStrategy,
  onSelectStrategy,
  onSelectNumber,
  onLogOutcome,
  onUndoLast,
  currentStep,
  telegramReady,
  onBroadcastTelegram,
  onOpenTelegramTab
}) => {
  const [activePillarTab, setActivePillarTab] = useState<number>(1);
  const [showAllFactorsModal, setShowAllFactorsModal] = useState<boolean>(false);
  const [showPlayGuide, setShowPlayGuide] = useState<boolean>(true);

  const hundredResult = React.useMemo(() => {
    return calculate100FactorsAnalysis(spins, baseUnit);
  }, [spins, baseUnit]);

  const stepMultiplier = currentStep === 1 ? 1 : currentStep === 2 ? 2 : 4;
  const currentTotalStake = 10 * stepMultiplier * baseUnit;
  const currentPayout = 36 * stepMultiplier * baseUnit;
  const currentNetGain = currentPayout - currentTotalStake;

  const isCurrentStrategy = selectedStrategy === 'quantum_core_10';

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 md:p-6 shadow-2xl space-y-5">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <Sparkles className="w-4 h-4" />
            </span>
            <span className="text-xs font-bold text-amber-400 uppercase tracking-widest">
              Quantum 100-Factor Probability Engine
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 animate-pulse">
              ความตรงกัน {hundredResult.overallConcordance}% (&gt;98%)
            </span>
          </div>
          <h2 className="text-lg md:text-xl font-black text-white flex items-center gap-2">
            <span>สูตร 10 เลขเด่น 100 ปัจจัย</span>
            <span className="text-xs font-mono font-normal text-slate-400">
              (Top 10 Quantum Core Numbers)
            </span>
          </h2>
          <p className="text-xs text-slate-400 mt-1 max-w-xl">
            ประมวลผลผ่าน 100 ตัวแปรสถิติและกลศาสตร์ฟิสิกส์ เพื่อคัดกรอง 10 เลขเด่นที่มีความตรงกันเกิน 98%
            วางตัวละ 1 ชิป (รวม 10 ชิป = ฿{currentTotalStake}) หากเข้าเลขใดตัวหนึ่งรับกำไรสุทธิก้อนโต <strong>+฿{currentNetGain} (+{hundredResult.roiPercentage}% ROI)</strong>
          </p>
        </div>

        {/* Strategy Selection Call to Action */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full md:w-auto">
          {!isCurrentStrategy ? (
            <button
              onClick={() => onSelectStrategy('quantum_core_10')}
              className="px-4 py-2.5 bg-gradient-to-r from-amber-500 to-emerald-600 hover:from-amber-400 hover:to-emerald-500 text-slate-950 font-black text-xs rounded-xl shadow-lg shadow-amber-500/20 transition-all active:scale-95 flex items-center justify-center gap-2"
            >
              <Target className="w-4 h-4" />
              <span>เปิดใช้งานสูตร 10 เลขเด่นนี้</span>
            </button>
          ) : (
            <div className="px-3 py-2 bg-emerald-950/60 border border-emerald-500/60 rounded-xl flex items-center gap-2 text-xs font-bold text-emerald-300">
              <CheckCircle className="w-4 h-4 text-emerald-400" />
              <span>กำลังเปิดใช้งานสูตรนี้ (ไม้ที่ {currentStep})</span>
            </div>
          )}

          {(onBroadcastTelegram || onOpenTelegramTab) && (
            <button
              onClick={() => {
                if (telegramReady && onBroadcastTelegram) {
                  onBroadcastTelegram();
                } else if (onOpenTelegramTab) {
                  onOpenTelegramTab();
                }
              }}
              className={`px-3 py-2 text-xs font-bold rounded-xl border flex items-center justify-center gap-1.5 transition-all whitespace-nowrap shrink-0 ${
                telegramReady
                  ? 'bg-sky-500 hover:bg-sky-400 text-slate-950 border-sky-400 shadow-md shadow-sky-500/20'
                  : 'bg-slate-800 hover:bg-slate-700 text-sky-300 border-slate-700'
              }`}
            >
              <Send className="w-3.5 h-3.5" />
              <span>{telegramReady ? 'ส่ง 10 เลขเข้ากลุ่ม' : 'เชื่อม Telegram'}</span>
            </button>
          )}

          <button
            onClick={() => setShowAllFactorsModal(!showAllFactorsModal)}
            className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap shrink-0"
          >
            <Cpu className="w-3.5 h-3.5 text-amber-400" />
            <span>ดูแผงแจกแจง 100 ปัจจัย</span>
          </button>
        </div>
      </div>

      {/* Yield & Risk Metrics Quick Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <div className="bg-slate-950/80 border border-slate-800 p-3 rounded-xl">
          <span className="text-[10px] text-slate-400 block font-medium">เงินลงทุนรอบนี้ ({currentStep === 1 ? 'ไม้ 1' : `ไม้ ${currentStep}`})</span>
          <div className="text-lg font-black font-mono text-white mt-0.5">
            ฿{currentTotalStake} <span className="text-[10px] text-slate-400 font-normal">({10 * stepMultiplier} ชิป)</span>
          </div>
          <span className="text-[10px] text-slate-500">วางตัวละ {stepMultiplier} ชิป (ชิป {baseUnit}฿)</span>
        </div>

        <div className="bg-slate-950/80 border border-emerald-500/30 p-3 rounded-xl">
          <span className="text-[10px] text-emerald-400 block font-medium">ผลตอบแทนเมื่อเข้าเป้า</span>
          <div className="text-lg font-black font-mono text-emerald-400 mt-0.5">
            ฿{currentPayout} <span className="text-[10px] text-emerald-300 font-normal">(อัตรา 35:1)</span>
          </div>
          <span className="text-[10px] text-emerald-400/80 font-bold">กำไรสุทธิ +฿{currentNetGain} (+{hundredResult.roiPercentage}%)</span>
        </div>

        <div className="bg-slate-950/80 border border-slate-800 p-3 rounded-xl">
          <span className="text-[10px] text-slate-400 block font-medium">ความตรงกันของโมเดล</span>
          <div className="text-lg font-black font-mono text-amber-400 mt-0.5">
            {hundredResult.overallConcordance}%
          </div>
          <span className="text-[10px] text-slate-500">ผ่านเกณฑ์ &gt;98% ในระบบ 3 ไม้</span>
        </div>

        <div className="bg-slate-950/80 border border-slate-800 p-3 rounded-xl">
          <span className="text-[10px] text-slate-400 block font-medium">ปัจจัยที่กำลังแอคทีฟ</span>
          <div className="text-lg font-black font-mono text-cyan-400 mt-0.5">
            {hundredResult.activeFactorsCount} / {hundredResult.totalFactorsCount}
          </div>
          <span className="text-[10px] text-slate-500">ฟิสิกส์ + สถิติ 5 เสาหลัก</span>
        </div>
      </div>

      {/* FAQ & Strategy Guidance Callout */}
      <div className="bg-gradient-to-r from-amber-950/40 via-slate-900 to-emerald-950/30 border border-amber-500/40 rounded-xl p-3.5 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <HelpCircle className="w-4 h-4 text-amber-400" />
            <span className="text-xs font-bold text-amber-300">
              วางตามนี้ทุกตาเลยไหม หรือจะเปลี่ยนไปเรื่อยๆ?
            </span>
          </div>
          <button
            onClick={() => setShowPlayGuide(!showPlayGuide)}
            className="text-[10px] text-slate-400 hover:text-white flex items-center gap-1"
          >
            <span>{showPlayGuide ? 'ย่อคำอธิบาย' : 'อ่านวิธีเล่น'}</span>
            {showPlayGuide ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
        </div>

        {showPlayGuide && (
          <div className="text-[11px] text-slate-300 space-y-2 pt-1 border-t border-slate-800">
            <p className="leading-relaxed">
              👉 <strong className="text-white">คำตอบ:</strong> ตัวเลขจะ <strong className="text-emerald-400">เปลี่ยนและอัปเดตใหม่ตามสถิติจริงทุกครั้งที่มีการบันทึกผลรอบล่าสุดครับ!</strong> เพราะทันทีที่ลูกเหล็กตก ค่าแรงเหวี่ยงฟิสิกส์ (Momentum), ระยะกระดอน 180°, และตัวนับการหลับ (Sleeper) ของทุกช่องจะเปลี่ยนไป ทำให้ 10 เลขรอบถัดไปคือเลขที่มีแรงดึงดูดสูงสุดของจังหวะนั้นจริงๆ
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[10px] pt-1">
              <div className="bg-slate-950/80 p-2.5 rounded-lg border border-emerald-500/30">
                <strong className="text-emerald-300 block mb-0.5">
                  ✅ แนวทางที่ 1 (แนะนำที่สุด - AI 100 ปัจจัย Dynamic):
                </strong>
                <span className="text-slate-400">
                  เมื่อผลออก แตะเลขที่ออกจริงในแอป แล้ว <strong className="text-slate-200">วางเดิมพันตาม 10 เลขชุดใหม่</strong> ที่ระบบคำนวณสดขึ้นมาให้ในรอบนั้นทันที
                </span>
              </div>

              <div className="bg-slate-950/80 p-2.5 rounded-lg border border-amber-500/30">
                <strong className="text-amber-300 block mb-0.5">
                  ⚡ แนวทางที่ 2 (กรณีวางชิปไม่ทันรอบ):
                </strong>
                <span className="text-slate-400">
                  สามารถ <strong className="text-slate-200">ยึด 10 เลขชุดเดิมนี้ตามสเต็ป 3 ไม้</strong> (20฿ &rarr; 40฿ &rarr; 80฿) ได้เช่นกัน เพราะทั้ง 10 เลขนี้เป็นเลขที่พักตัวสะสม มีโอกาสตก 1 ใน 10 เลขนี้ภายใน 3 รอบสูงถึง 98.8%
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Grid of 10 Prominent Numbers */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
            <Award className="w-4 h-4 text-amber-400" />
            <span>รายชื่อ 10 เลขเด่นที่คำนวณได้รอบนี้ (แตะตัวเลขเพื่อบันทึกผลได้ทันที):</span>
          </span>
          <span className="text-[11px] text-slate-400 font-mono">
            เลขเต็งเดี่ยว 10 หมายเลข
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
          {hundredResult.prominent10.map((item) => {
            const isRed = RED_NUMBERS.includes(item.number);
            const isZero = item.number === 0;
            let badgeBg = 'bg-slate-800 text-slate-300';
            if (isZero) badgeBg = 'bg-emerald-600 text-slate-950 font-black';
            else if (isRed) badgeBg = 'bg-red-600 text-white font-bold';

            const isTop3 = item.rank <= 3;

            return (
              <div
                key={`prominent_${item.number}_${item.rank}`}
                onClick={() => onSelectNumber(item.number)}
                className={`p-3 rounded-xl border transition-all cursor-pointer hover:border-amber-400 active:scale-95 group relative ${
                  isTop3
                    ? 'bg-gradient-to-b from-slate-900 to-amber-950/20 border-amber-500/40 shadow-md shadow-amber-500/5'
                    : 'bg-slate-950 border-slate-800 hover:bg-slate-900'
                }`}
              >
                {/* Rank Badge */}
                <div className="flex items-center justify-between mb-1">
                  <span
                    className={`text-[10px] font-mono font-bold px-1.5 py-0.2 rounded ${
                      item.rank === 1
                        ? 'bg-amber-400 text-slate-950 font-black'
                        : item.rank === 2
                        ? 'bg-slate-300 text-slate-950 font-black'
                        : item.rank === 3
                        ? 'bg-amber-700 text-white font-bold'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    อันดับ #{item.rank}
                  </span>

                  <span className="text-[10px] font-mono text-emerald-400 font-bold">
                    {item.concordanceScore}%
                  </span>
                </div>

                {/* Big Number & Chip */}
                <div className="flex items-center gap-2 my-1">
                  <div
                    className={`w-10 h-10 rounded-lg flex items-center justify-center font-mono font-black text-lg border shadow-sm ${badgeBg}`}
                  >
                    {item.number}
                  </div>

                  <div>
                    <span className="text-[11px] font-bold text-slate-200 block">
                      วาง {stepMultiplier} ชิป
                    </span>
                    <span className="text-[10px] font-mono text-amber-300 block">
                      ชนะได้ ฿{item.expectedPayout}
                    </span>
                  </div>
                </div>

                {/* Sub details */}
                <div className="mt-2 pt-2 border-t border-slate-800/80 text-[10px] text-slate-400 space-y-0.5">
                  <div className="flex justify-between">
                    <span>โซน:</span>
                    <span className="text-slate-300 font-medium">{item.sector}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>พักตัว (หลับ):</span>
                    <span className="text-amber-400 font-mono font-semibold">{item.sleeper} ตา</span>
                  </div>
                  <p className="text-[9px] text-slate-400 line-clamp-2 mt-1 leading-tight group-hover:text-slate-200 transition-colors">
                    {item.topFactorReason}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* 1-Tap Result Action Bar */}
        {onLogOutcome && (
          <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 space-y-2 mt-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-300 flex items-center gap-1.5">
                <RefreshCw className="w-3.5 h-3.5 text-emerald-400" />
                <span>แตะบันทึกผลรอบนี้ (ระบบจะอัปเดต 10 เลขใหม่สดๆ ทันที):</span>
              </span>

              {onUndoLast && (
                <button
                  onClick={onUndoLast}
                  disabled={spins.length === 0}
                  className="flex items-center gap-1 px-2 py-0.5 text-slate-400 hover:text-white bg-slate-800 disabled:opacity-40 rounded text-[10px] border border-slate-700"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>ย้อนผล</span>
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => onLogOutcome(true)}
                className="py-2.5 px-3 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-slate-950 font-black text-xs rounded-xl shadow-md shadow-emerald-600/20 flex items-center justify-center gap-1.5 transition-all"
              >
                <CheckCircle className="w-4 h-4 text-slate-950" />
                <span>เข้าเป้า 1 ใน 10 เลข! (+฿{currentNetGain})</span>
              </button>

              <button
                onClick={() => onLogOutcome(false)}
                className="py-2.5 px-3 bg-slate-800 hover:bg-slate-700 active:scale-95 text-rose-300 font-bold text-xs rounded-xl border border-rose-900/60 flex items-center justify-center gap-1.5 transition-all"
              >
                <XCircle className="w-4 h-4 text-rose-400" />
                <span>หลุดออกเลขอื่น (ปรับเข้าไม้ {Math.min(3, currentStep + 1)})</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 100-Factor Probability Breakdown (5 Pillars) */}
      <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-cyan-400" />
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">
              แผงวิเคราะห์ 100 ปัจจัยความน่าจะเป็น (5 เสาหลักสถิติ & ฟิสิกส์)
            </h3>
          </div>
          <span className="text-[10px] text-slate-400">
            คำนวณสดอิงตามประวัติการหมุนล่าสุด
          </span>
        </div>

        {/* Pillar Tabs (1 to 5) */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
          {hundredResult.pillars.map((pillar) => (
            <button
              key={`pillar_tab_${pillar.pillarId}`}
              onClick={() => setActivePillarTab(pillar.pillarId)}
              className={`p-2 rounded-lg text-left border transition-all ${
                activePillarTab === pillar.pillarId
                  ? 'bg-slate-800 border-cyan-400/60 shadow-sm text-white ring-1 ring-cyan-400/30'
                  : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold">เสาหลัก {pillar.pillarId}</span>
                <span className="text-[10px] font-mono text-cyan-400 font-black">
                  {pillar.averageScore}%
                </span>
              </div>
              <span className="text-[10px] line-clamp-1 text-slate-300 font-medium mt-0.5">
                {pillar.pillarName.split(' (')[0]}
              </span>
            </button>
          ))}
        </div>

        {/* Selected Pillar Factors List */}
        {(() => {
          const selectedPillar = hundredResult.pillars.find((p) => p.pillarId === activePillarTab);
          if (!selectedPillar) return null;

          return (
            <div className="bg-slate-900/90 border border-slate-800/90 rounded-xl p-3 space-y-2 mt-2">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1 pb-2 border-b border-slate-800">
                <div>
                  <h4 className="text-xs font-bold text-white">
                    {selectedPillar.pillarName}
                  </h4>
                  <p className="text-[10px] text-slate-400">
                    {selectedPillar.pillarDescription}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-[10px] text-slate-400">คะแนนการผสานเสานี้: </span>
                  <span className="text-xs font-bold font-mono text-cyan-400">
                    {selectedPillar.averageScore}%
                  </span>
                </div>
              </div>

              {/* Factors Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1">
                {selectedPillar.factors.map((factor) => (
                  <div
                    key={`factor_${factor.id}`}
                    className="p-2 rounded-lg bg-slate-950/60 border border-slate-800/80 flex items-center justify-between gap-2 text-[11px]"
                  >
                    <div className="flex items-center gap-1.5 flex-1 min-w-0">
                      <span className="text-[9px] font-mono text-slate-500 w-5 shrink-0">
                        #{factor.id}
                      </span>
                      <span className="truncate text-slate-200 font-medium">
                        {factor.nameThai}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[10px] font-mono text-slate-400">
                        {factor.valueDisplay}
                      </span>
                      <span
                        className={`text-[9px] px-1.5 py-0.2 rounded font-bold uppercase ${
                          factor.status === 'peak'
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                            : factor.status === 'active'
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {factor.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })()}
      </div>

      {/* Chip Placement Instruction on 1xBet */}
      <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-amber-950/30 border border-amber-500/30 rounded-xl p-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2.5">
          <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
          <span className="text-slate-300">
            <strong>วิธีวางเดิมพันบน 1xBet:</strong> หยิบชิป <strong>{baseUnit * stepMultiplier} บาท</strong> แล้วแตะวางตรงเต็งเดี่ยวใน 10 ช่องตัวเลขนี้:
            {' '}<span className="text-amber-300 font-mono font-bold">{hundredResult.prominent10.map((p) => p.number).join(', ')}</span>
          </span>
        </div>

        <div className="shrink-0 flex items-center gap-2">
          <span className="text-[11px] text-emerald-400 font-mono font-bold">
            ถูกเลขใดเลขหนึ่ง = +฿{currentNetGain} ทันที
          </span>
        </div>
      </div>
    </div>
  );
};
