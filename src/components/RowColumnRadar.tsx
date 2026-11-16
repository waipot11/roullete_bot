import React from 'react';
import { RowColumnStats, StrategyTier } from '../types/roulette';
import { Target, Zap, AlertCircle, ArrowUpRight, Flame } from 'lucide-react';

interface RowColumnRadarProps {
  rowStats: RowColumnStats;
  selectedStrategy: StrategyTier;
  onSelectStrategy: (strat: StrategyTier) => void;
  baseUnit: number;
}

export const RowColumnRadar: React.FC<RowColumnRadarProps> = ({
  rowStats,
  selectedStrategy,
  onSelectStrategy,
  baseUnit
}) => {
  const rows = [
    {
      id: 'row1',
      title: 'แถวที่ 1 (1st Col)',
      numbersText: '1, 4, 7, 10, 13, 16, 19, 22, 25, 28, 31, 34',
      sleeper: rowStats.row1Sleeper,
      percentage: rowStats.row1Percentage,
      count: rowStats.row1Count,
      isTarget: rowStats.recommendedTarget === 'row1'
    },
    {
      id: 'row2',
      title: 'แถวที่ 2 (2nd Col)',
      numbersText: '2, 5, 8, 11, 14, 17, 20, 23, 26, 29, 32, 35',
      sleeper: rowStats.row2Sleeper,
      percentage: rowStats.row2Percentage,
      count: rowStats.row2Count,
      isTarget: rowStats.recommendedTarget === 'row2'
    },
    {
      id: 'row3',
      title: 'แถวที่ 3 (3rd Col)',
      numbersText: '3, 6, 9, 12, 15, 18, 21, 24, 27, 30, 33, 36',
      sleeper: rowStats.row3Sleeper,
      percentage: rowStats.row3Percentage,
      count: rowStats.row3Count,
      isTarget: rowStats.recommendedTarget === 'row3'
    }
  ];

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 md:p-6 shadow-xl space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-400" />
              <span>เรดาร์ตรวจจับสถิติแถว (Row & Column Sleeper Tracker)</span>
            </h3>
            <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">
              จ่าย 2 เท่า (ROI +200%)
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            กลยุทธ์เงินทุนต่ำพิเศษ: เลือกลงทุนเพียง 1 ชิป (฿{baseUnit}) ในแถวที่พักตัวสะสม เพื่อรับกำไร 2 เท่า (฿{baseUnit * 2})
          </p>
        </div>

        {/* Quick activate low capital strategy button */}
        <button
          onClick={() => onSelectStrategy('low_cap_single_row')}
          className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl border transition-all active:scale-95 shrink-0 ${
            selectedStrategy === 'low_cap_single_row'
              ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md shadow-amber-500/20'
              : 'bg-slate-800 hover:bg-slate-700 text-amber-300 border-amber-500/40'
          }`}
        >
          <Target className="w-3.5 h-3.5" />
          <span>{selectedStrategy === 'low_cap_single_row' ? 'กำลังใช้สูตรเน้นแถว' : 'เลือกแทงสูตรเน้นแถวนี้'}</span>
        </button>
      </div>

      {/* Row Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {rows.map((row) => (
          <div
            key={row.id}
            onClick={() => onSelectStrategy('low_cap_single_row')}
            className={`p-4 rounded-xl border transition-all cursor-pointer relative overflow-hidden ${
              row.isTarget
                ? 'bg-gradient-to-br from-amber-950/40 via-slate-900 to-slate-950 border-amber-500/70 shadow-lg shadow-amber-950/30'
                : 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700'
            }`}
          >
            {row.isTarget && (
              <div className="absolute top-0 right-0 bg-amber-500 text-slate-950 font-black text-[10px] px-2.5 py-0.5 rounded-bl-lg flex items-center gap-1 shadow-sm">
                <Flame className="w-3 h-3 fill-current" />
                <span>AI แนะนำสไนป์แถวนี้</span>
              </div>
            )}

            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-sm text-slate-100">{row.title}</span>
              <span className="font-mono text-xs font-semibold text-slate-400">
                ออกแล้ว {row.count} ครั้ง ({row.percentage}%)
              </span>
            </div>

            <div className="space-y-2 mt-2">
              {/* Sleeper Counter */}
              <div className="flex items-center justify-between p-2 rounded-lg bg-slate-900/90 border border-slate-800">
                <span className="text-[11px] text-slate-400">พักตัวไม่ยอมออก (Sleeper):</span>
                <span className={`font-mono font-bold text-sm tabular-nums ${row.sleeper >= 3 ? 'text-amber-400' : 'text-slate-300'}`}>
                  {row.sleeper} รอบติดต่อกัน
                </span>
              </div>

              {/* Payout & Investment info */}
              <div className="flex items-center justify-between text-[11px] font-mono pt-1 text-slate-400">
                <span>ทุน: <strong>฿{baseUnit}</strong> (1 ชิป)</span>
                <span className="text-emerald-400 font-bold">กำไร: +฿{baseUnit * 2} (+200%)</span>
              </div>
            </div>

            <div className="text-[10px] text-slate-500 mt-2 truncate">
              {row.numbersText}
            </div>
          </div>
        ))}
      </div>

      {/* Low Capital Progression Matrix Explain */}
      <div className="p-3.5 bg-slate-950/80 border border-slate-800/80 rounded-xl text-xs space-y-1.5">
        <div className="flex items-center gap-2 text-slate-200 font-bold">
          <AlertCircle className="w-4 h-4 text-emerald-400" />
          <span>ทำไมสูตรเน้นแถวจึงใช้เงินน้อยแต่กำไรสูง (Low Capital, High ROI Logic):</span>
        </div>
        <p className="text-slate-400 leading-relaxed text-[11px]">
          1. <strong>ไม่ต้องใช้เงินหลักร้อย/พัน</strong>: วางเพียง 1 ชิป (10 บ.) หากลูกเหล็กลงใน 12 ตัวเลขของแถวนั้น รับทันที 30 บ. (กำไรสุทธิ 20 บ. คิดเป็น +200%)<br />
          2. <strong>เดินเงิน 3 สเต็ปปลอดภัยสูง</strong>: สเต็ป 1 (10 บ.) &rarr; สเต็ป 2 (15 บ.) &rarr; สเต็ป 3 (25 บ.) ทุนรวมตลอด 3 รอบเพียง 50 บาท หากเข้าสเต็ปใดสเต็ปหนึ่ง ได้กำไรทันทีโดยไม่ต้องแบกความเสี่ยง 360 บาท
        </p>
      </div>
    </div>
  );
};
