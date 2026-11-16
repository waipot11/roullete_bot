import React from 'react';
import { RED_NUMBERS } from '../utils/rouletteConstants';
import { SpinRecord } from '../types/roulette';
import { RotateCcw, Sparkles, X } from 'lucide-react';

interface QuickKeypadProps {
  onAddNumber: (num: number) => void;
  onUndoLast: () => void;
  recentSpins: SpinRecord[];
  onClose?: () => void;
}

export const QuickKeypad: React.FC<QuickKeypadProps> = ({
  onAddNumber,
  onUndoLast,
  recentSpins,
  onClose
}) => {
  const last5 = recentSpins.slice(-6).reverse();

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 md:p-6 shadow-2xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-sm md:text-base font-bold text-white flex items-center gap-2">
            <span>แป้นกดผลตัวเลขรูเล็ตต์ (Mobile Quick Keypad 0-36)</span>
          </h2>
          <p className="text-xs text-slate-400">
            แตะตัวเลข 1 ครั้งเพื่อบันทึกผลการออกรางวัลจริง อัลกอริทึมจะคำนวณรอบถัดไปอัตโนมัติ
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onUndoLast}
            disabled={recentSpins.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-xs font-medium text-slate-300 rounded-lg border border-slate-700 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>ย้อนกลับ (Undo)</span>
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 bg-slate-800 text-slate-400 hover:text-white rounded-lg"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Recent 6 Spins Trail */}
      <div className="mb-4 p-2.5 bg-slate-950/80 rounded-xl border border-slate-800/80">
        <span className="text-[11px] text-slate-400 block mb-1.5 font-medium">
          ผลออกล่าสุด 6 รอบ (Recent Results Trail):
        </span>
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {last5.length === 0 && (
            <span className="text-xs text-slate-500 italic">ยังไม่มีข้อมูลผลการหมุน</span>
          )}
          {last5.map((spin, i) => {
            const isRed = RED_NUMBERS.includes(spin.number);
            const isZero = spin.number === 0;

            let badgeClass = 'bg-slate-800 text-slate-200 border-slate-700';
            if (isZero) badgeClass = 'bg-emerald-600 text-slate-950 border-emerald-400';
            else if (isRed) badgeClass = 'bg-red-600 text-white border-red-500';

            return (
              <div
                key={`recent_${spin.id}_${i}`}
                className={`flex items-center justify-center min-w-[36px] h-9 px-2 rounded-lg font-mono font-bold text-xs border shadow-sm ${badgeClass}`}
              >
                {spin.number}
              </div>
            );
          })}
        </div>
      </div>

      {/* Keypad Grid (Mobile First, large touch targets >= 48px) */}
      <div className="space-y-1.5">
        {/* Zero Button */}
        <button
          onClick={() => onAddNumber(0)}
          className="w-full h-12 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-slate-950 font-black font-mono text-base shadow-md shadow-emerald-700/20 border border-emerald-400/50 flex items-center justify-center transition-all"
        >
          0 (Green Zero)
        </button>

        {/* Row Column Headers */}
        <div className="grid grid-cols-3 gap-1.5 text-center text-[11px] font-mono font-bold text-slate-400 pt-1">
          <div className="py-1 bg-slate-950/70 rounded-lg border border-slate-800/80">
            แถว 1 (Col 1)
          </div>
          <div className="py-1 bg-slate-950/70 rounded-lg border border-slate-800/80">
            แถว 2 (Col 2)
          </div>
          <div className="py-1 bg-slate-950/70 rounded-lg border border-slate-800/80">
            แถว 3 (Col 3)
          </div>
        </div>

        {/* 1-36 Numbers in 3 columns (European table arrangement) */}
        <div className="grid grid-cols-3 gap-1.5">
          {Array.from({ length: 36 }, (_, i) => i + 1).map((num) => {
            const isRed = RED_NUMBERS.includes(num);

            return (
              <button
                key={`keypad_${num}`}
                onClick={() => onAddNumber(num)}
                className={`min-h-[46px] rounded-xl font-mono font-bold text-sm md:text-base border transition-all active:scale-95 flex items-center justify-center ${
                  isRed
                    ? 'bg-red-700 hover:bg-red-600 active:bg-red-800 text-white border-red-500/50 shadow-sm'
                    : 'bg-slate-800 hover:bg-slate-700 active:bg-slate-900 text-slate-100 border-slate-600/50 shadow-sm'
                }`}
              >
                {num}
              </button>
            );
          })}
        </div>
      </div>

      {/* Quick Action Footer */}
      <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
        <span>รองรับระบบแตะสัมผัสแบบไร้ดีเลย์ (Zero-Latency Touch)</span>
        <button
          onClick={() => onAddNumber(Math.floor(Math.random() * 37))}
          className="flex items-center gap-1 text-emerald-400 hover:text-emerald-300 font-medium"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>สุ่ม 1 ผลลัพธ์</span>
        </button>
      </div>
    </div>
  );
};
