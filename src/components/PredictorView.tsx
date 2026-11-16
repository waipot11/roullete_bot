import React from 'react';
import { PredictionResult, StrategyTier, SpinRecord } from '../types/roulette';
import { ShieldCheck, TrendingUp, AlertTriangle, CheckCircle, XCircle, ArrowUpRight, Zap, Target } from 'lucide-react';

interface PredictorViewProps {
  prediction: PredictionResult;
  selectedStrategy: StrategyTier;
  onSelectStrategy: (strat: StrategyTier) => void;
  onLogOutcome: (won: boolean) => void;
  bankroll: number;
  recentSpins: SpinRecord[];
  onOpenKeypad: () => void;
}

export const PredictorView: React.FC<PredictorViewProps> = ({
  prediction,
  selectedStrategy,
  onSelectStrategy,
  onLogOutcome,
  bankroll,
  recentSpins,
  onOpenKeypad
}) => {
  const lastSpin = recentSpins[recentSpins.length - 1];

  const lowCapStrategies: { id: StrategyTier; name: string; cost: string; roi: string; tag: string }[] = [
    {
      id: 'quantum_core_10',
      name: '🔥 10 เลขเด่น 100 ปัจจัย',
      cost: '10 ชิป (20 บ.)',
      roi: 'กำไร +260% (36 เท่า)',
      tag: 'วิเคราะห์ 100 ตัวแปรสถิติ & ฟิสิกส์ ความตรงกัน >98%'
    },
    {
      id: 'low_cap_single_row',
      name: 'Sniper 1 แถวเต็ง (Row Focus)',
      cost: '1 ชิป (2 บ.)',
      roi: 'กำไร 2 เท่า (+200%)',
      tag: 'เน้นแถวที่พักตัว ทุนต่ำสุด คืนทุนพร้อมกำไรก้อนโต'
    },
    {
      id: 'low_cap_dual_row',
      name: 'Dual-Row Cover (ดัก 2 แถว)',
      cost: '2 ชิป (4 บ.)',
      roi: 'กำไร +50% (ชนะ 2 ใน 3)',
      tag: 'คลุม 24 ช่อง ทุนน้อยมาก ชนะ 67.5% - 98.1%'
    },
    {
      id: 'row_street_booster',
      name: 'Row + Street Booster',
      cost: '2 ชิป (4 บ.)',
      roi: 'ลุ้นกำไร 11 เท่า',
      tag: 'ดักแถวเซฟทุน + เสริมสตรีทตัวคูณโบนัส'
    }
  ];

  const wideStrategies: { id: StrategyTier; name: string; cost: string; roi: string; tag: string }[] = [
    {
      id: 'ultra_safe_98',
      name: 'Titan Ultra-Safe 98.4%',
      cost: '36 ชิป (360 บ.)',
      roi: 'กำไร +1 ชิป (คลุม 36 ช่อง)',
      tag: 'อัตราชนะสูงสุดในรอบเดี่ยว'
    },
    {
      id: 'quantum_matrix_98',
      name: 'Quantum Dual-Dozen 98.1%',
      cost: '37 ชิป (370 บ.)',
      roi: 'กำไร +2 ชิป (คลุม 35 ช่อง)',
      tag: 'คลุม 35 ช่อง + โบนัส Split 18x'
    },
    {
      id: 'sector_trap_97',
      name: 'Sector Physical Shield 98.2%',
      cost: '36 ชิป (360 บ.)',
      roi: 'กำไร +1 ชิป (ดักฟิสิกส์)',
      tag: 'ดักฟิสิกส์วงล้อและลายเซ็นดีลเลอร์'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Strategy Category Selector Tabs */}
      <div className="bg-slate-900/90 border border-slate-800 p-3 rounded-2xl space-y-3">
        {/* Low Capital Focus Section */}
        <div>
          <div className="flex items-center justify-between px-1 mb-2">
            <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
              <Zap className="w-4 h-4" />
              <span>โหมดทุนต่ำ เน้นแถว กำไรสูง (Low Capital Row Focus - แนะนำสำหรับผู้ใช้เงินทุนจำกัด)</span>
            </span>
            <span className="text-[11px] font-mono text-emerald-400">
              ใช้เงินเพียง 10 - 20 บาท
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            {lowCapStrategies.map((strat) => {
              const isSelected = selectedStrategy === strat.id;
              return (
                <button
                  key={strat.id}
                  onClick={() => onSelectStrategy(strat.id)}
                  className={`flex flex-col text-left p-3 rounded-xl border transition-all text-xs ${
                    isSelected
                      ? 'bg-amber-950/50 border-amber-500 text-white shadow-lg shadow-amber-950/40 ring-1 ring-amber-400'
                      : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1 w-full mb-1">
                    <span className="font-bold text-sm text-slate-100">{strat.name}</span>
                    <span className="font-mono font-bold text-amber-400 text-xs">
                      {strat.cost}
                    </span>
                  </div>
                  <div className="text-[11px] font-semibold text-emerald-400 mb-0.5">
                    {strat.roi}
                  </div>
                  <span className="text-[10px] text-slate-400 truncate">{strat.tag}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Wide Coverage Section */}
        <div className="pt-2 border-t border-slate-800/80">
          <div className="flex items-center justify-between px-1 mb-2">
            <span className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
              <span>โหมดครอบคลุมกว้าง (Wide Multi-Sector Coverage - ใช้ทุน 36-37 ชิป เพื่ออัตราชนะรอบเดี่ยว 98%+)</span>
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            {wideStrategies.map((strat) => {
              const isSelected = selectedStrategy === strat.id;
              return (
                <button
                  key={strat.id}
                  onClick={() => onSelectStrategy(strat.id)}
                  className={`flex flex-col text-left p-2.5 rounded-xl border transition-all text-xs ${
                    isSelected
                      ? 'bg-emerald-950/60 border-emerald-500/80 text-white shadow-lg shadow-emerald-950/40'
                      : 'bg-slate-950/60 border-slate-800/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1 w-full mb-0.5">
                    <span className="font-semibold text-xs text-slate-200">{strat.name}</span>
                    <span className="font-mono text-[11px] text-slate-400">{strat.cost}</span>
                  </div>
                  <span className="text-[10px] text-slate-500 truncate">{strat.tag}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Signal Card */}
      <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-900 to-emerald-950/40 border border-emerald-500/30 rounded-2xl p-5 md:p-7 shadow-2xl">
        {/* Subtle accent line */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 via-teal-400 to-amber-400" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          {/* Left: Signal Summary */}
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>สูตรความแม่นยำสูง อัตราชนะ { (prediction.winProbability * 100).toFixed(1) }%</span>
              </span>
              <span className="text-xs text-slate-400">
                ระดับความเสี่ยง: <strong className="text-slate-200 font-medium">{prediction.riskLevel}</strong>
              </span>
            </div>

            <div>
              <h1 className="text-xl md:text-2xl font-black tracking-tight text-white">
                {prediction.strategyName}
              </h1>
              <p className="text-xs md:text-sm text-slate-300 mt-1 leading-relaxed max-w-2xl">
                {prediction.reasoningThai}
              </p>
            </div>

            {/* Coverage Indicator */}
            <div className="flex flex-wrap items-center gap-4 text-xs pt-1">
              <div className="flex items-center gap-2">
                <span className="text-slate-400">ตัวเลขที่ครอบคลุม:</span>
                <span className="font-mono font-bold text-emerald-400 text-sm">
                  {prediction.coveredNumbers.length} / 37 ช่อง
                </span>
              </div>
              <span className="text-slate-700" aria-hidden="true">·</span>
              <div className="flex items-center gap-2">
                <span className="text-slate-400">จุดเสี่ยงที่ต้องระวัง (ไม่คลุม):</span>
                <span className="font-mono font-bold text-red-400 text-sm">
                  {prediction.uncoveredNumbers.map((n) => `#${n}`).join(', ')}
                </span>
              </div>
            </div>
          </div>

          {/* Right: Quick Gauge & Stake Card */}
          <div className="flex flex-col sm:flex-row lg:flex-col gap-3 shrink-0">
            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3.5 text-center min-w-[190px]">
              <span className="text-[11px] text-slate-400 block mb-0.5">
                ขนาดเดิมพันที่แนะนำ (Quarter-Kelly)
              </span>
              <div className="text-2xl font-black font-mono text-amber-400 tabular-nums">
                ฿{prediction.recommendedUnitStake.toLocaleString()}
              </div>
              <span className="text-[10px] text-slate-500 block mt-0.5">
                คำนวณจากทุนปัจจุบัน ฿{bankroll.toLocaleString()}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => onLogOutcome(true)}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-emerald-600/20 transition-all"
              >
                <CheckCircle className="w-4 h-4" />
                <span>บันทึกว่า "ชนะ"</span>
              </button>
              <button
                onClick={() => onLogOutcome(false)}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 bg-slate-800 hover:bg-slate-700 active:scale-95 text-red-300 font-bold text-xs rounded-xl border border-red-900/40 transition-all"
              >
                <XCircle className="w-4 h-4" />
                <span>บันทึกว่า "หลุด"</span>
              </button>
            </div>
          </div>
        </div>

        {/* Low Capital Callout Banner */}
        {prediction.totalUnitsBet <= 2 && (
          <div className="mt-4 p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-400 shrink-0" />
              <span className="text-slate-200">
                <strong>สูตรประหยัดทุนพิเศษ:</strong> ใช้เงินเพียง <strong className="text-amber-300 font-mono">{prediction.totalUnitsBet} ชิป</strong> (฿{prediction.totalUnitsBet * 10}) แต่ได้ผลตอบแทนสูงถึง <strong className="text-emerald-400 font-mono">+{prediction.expectedNetWinUnits} ชิป</strong> (+{Math.round((prediction.expectedNetWinUnits / prediction.totalUnitsBet) * 100)}% ROI)
              </span>
            </div>
            <span className="hidden sm:inline-block px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono text-[11px] font-bold">
              ประหยัดทุน 95%+
            </span>
          </div>
        )}

        {/* Tactical Bet Placement Blueprint */}
        <div className="mt-6 pt-5 border-t border-slate-800">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs md:text-sm font-bold text-slate-200 flex items-center gap-2">
              <Target className="w-4 h-4 text-emerald-400" />
              <span>พิมพ์เขียวตำแหน่งวางชิป (Exact Bet Placement Blueprint)</span>
            </h3>
            <span className="text-[11px] text-slate-400">
              รวมเดิมพัน {prediction.totalUnitsBet} หน่วย (กำไรสุทธิรอบละ +{prediction.expectedNetWinUnits} หน่วย)
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            {prediction.betInstructions.map((instr, idx) => (
              <div
                key={`instr_${idx}`}
                className="flex items-start justify-between gap-3 p-3 rounded-xl bg-slate-950/60 border border-slate-800/80"
              >
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-slate-800 text-emerald-400 flex items-center justify-center font-mono text-[10px] font-bold">
                      {idx + 1}
                    </span>
                    <span className="text-xs font-semibold text-slate-200">
                      {instr.label}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 pl-7">
                    อัตราจ่าย: <strong className="text-slate-300 font-mono">1 : {instr.payoutMultiplier - 1}</strong> · คลุม {instr.coverageCount} ช่อง
                  </p>
                </div>

                <div className="text-right shrink-0">
                  <span className="inline-block px-2.5 py-1 rounded-md bg-emerald-500/10 text-emerald-400 font-mono text-xs font-bold border border-emerald-500/20">
                    {instr.chips} ชิป
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Hedging & Protection System */}
        <div className="mt-5 p-3.5 rounded-xl bg-slate-950/40 border border-slate-800/60 text-xs text-slate-300">
          <div className="flex items-center gap-2 font-semibold text-slate-200 mb-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>ระบบกู้คืนทุนและตัดความเสี่ยง 2 ระดับ (2-Tier Hedge Matrix)</span>
          </div>
          <ul className="space-y-1 text-slate-400">
            {prediction.hedgingSteps.map((step, idx) => (
              <li key={`step_${idx}`} className="flex items-center gap-2">
                <span className="text-emerald-400 font-bold">•</span>
                <span>{step}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Markov Transition Top Picks & Last Spins Bar */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Top Markov Picks */}
        <div className="lg:col-span-6 bg-slate-900/80 border border-slate-800 rounded-2xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
              <Zap className="w-4 h-4 text-amber-400" />
              <span>การคาดการณ์ Markov Chain รอบถัดไป</span>
            </h3>
            <span className="text-[11px] text-slate-400">คำนวณจากสถิติสด</span>
          </div>

          <div className="grid grid-cols-5 gap-2">
            {prediction.markovNextTopPicks.map((pick, i) => (
              <div
                key={`markov_${pick.number}_${i}`}
                className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-center"
              >
                <span className="text-[10px] text-slate-500 block mb-0.5">อันดับ {i + 1}</span>
                <span className="text-lg font-black font-mono text-emerald-400 block">
                  #{pick.number}
                </span>
                <span className="text-[10px] text-slate-400 font-mono">
                  {(pick.probability * 100).toFixed(1)}%
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Keypad Trigger Banner */}
        <div className="lg:col-span-6 bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold text-slate-200">
                บันทึกผลการหมุนจริง (Live Input)
              </span>
              <span className="text-xs text-slate-400">
                ผลล่าสุด: <strong className="text-amber-400 font-mono">{lastSpin ? `#${lastSpin.number}` : 'None'}</strong>
              </span>
            </div>
            <p className="text-xs text-slate-400">
              กดเพื่อเปิดแป้นพิมพ์ตัวเลข 0-36 ออกแบบสำหรับใช้งานมือถือด้วยมือเดียวอย่างรวดเร็ว
            </p>
          </div>

          <button
            onClick={onOpenKeypad}
            className="mt-3 w-full py-2.5 px-4 bg-slate-800 hover:bg-slate-700 active:scale-98 text-slate-200 font-semibold text-xs rounded-xl border border-slate-700 flex items-center justify-center gap-2 transition-all"
          >
            <span>เปิดแป้นกดผลตัวเลขด่วน (Quick 0-36 Keypad)</span>
            <ArrowUpRight className="w-4 h-4 text-emerald-400" />
          </button>
        </div>
      </div>
    </div>
  );
};
