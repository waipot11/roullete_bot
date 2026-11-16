import React from 'react';
import { Target, RefreshCw, Smartphone } from 'lucide-react';
import { TableSourceInfo } from '../types/roulette';

interface HeaderProps {
  currentTable: TableSourceInfo;
  onRefreshData: () => void;
  bankroll: number;
  sessionWinrate: number;
  onResetSession: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentTable,
  onRefreshData,
  bankroll,
  sessionWinrate,
  onResetSession
}) => {
  return (
    <header className="sticky top-0 z-30 bg-slate-950/90 backdrop-blur-md border-b border-slate-800/80 px-4 md:px-8 py-3.5">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        {/* Zone 1: Single text element wordmark */}
        <div className="flex items-center gap-2.5 shrink-0">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center text-slate-950 shadow-lg shadow-emerald-500/20">
            <Target className="w-5 h-5 stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-base md:text-lg font-bold tracking-tight text-white whitespace-nowrap">
                Roulette Predictor Pro
              </span>
              <span className="hidden sm:inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-medium bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                Win Rate 98%+
              </span>
            </div>
            <p className="text-xs text-slate-400 truncate max-w-[200px] sm:max-w-xs">
              {currentTable.name}
            </p>
          </div>
        </div>

        {/* Zone 2: Real-time Stats & Indicators (Clean unboxed text) */}
        <div className="hidden lg:flex items-center gap-6 text-xs text-slate-300">
          <div className="flex items-center gap-2">
            <span className="text-slate-500">อัตราชนะเซสชัน</span>
            <span className="font-mono font-bold text-emerald-400 text-sm tabular-nums">
              {sessionWinrate.toFixed(1)}%
            </span>
          </div>
          <span className="text-slate-700" aria-hidden="true">·</span>
          <div className="flex items-center gap-2">
            <span className="text-slate-500">เงินทุน</span>
            <span className="font-mono font-bold text-amber-400 text-sm tabular-nums">
              ฿{bankroll.toLocaleString()}
            </span>
          </div>
          <span className="text-slate-700" aria-hidden="true">·</span>
          <div className="flex items-center gap-1.5 text-slate-400">
            <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
            <span>Mobile-First Engine</span>
          </div>
        </div>

        {/* Zone 3: Primary Action buttons */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={onRefreshData}
            title="อัปเดตสถิติและผลจำลอง"
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-200 bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded-lg transition-colors whitespace-nowrap active:scale-95"
          >
            <RefreshCw className="w-3.5 h-3.5 text-slate-400" />
            <span className="hidden sm:inline">ซิงค์สถิติ</span>
          </button>

          <button
            onClick={onResetSession}
            title="เริ่มเซสชันใหม่"
            className="px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white bg-slate-900/60 hover:bg-slate-800/80 border border-slate-800 rounded-lg transition-colors whitespace-nowrap"
          >
            รีเซ็ตเซสชัน
          </button>
        </div>
      </div>
    </header>
  );
};
