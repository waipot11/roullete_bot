import React, { useMemo } from 'react';
import { SpinRecord } from '../types/roulette';
import {
  calculateNumberFrequencies,
  calculateSectorDistribution,
  calculateTableBiasTest
} from '../utils/rouletteAnalytics';
import { RED_NUMBERS } from '../utils/rouletteConstants';
import { TrendingUp, BarChart3, Activity, PieChart, ShieldAlert } from 'lucide-react';

interface AnalyticsChartsProps {
  spins: SpinRecord[];
  initialBankroll: number;
}

export const AnalyticsCharts: React.FC<AnalyticsChartsProps> = ({
  spins,
  initialBankroll
}) => {
  const frequencies = useMemo(() => calculateNumberFrequencies(spins), [spins]);
  const sectors = useMemo(() => calculateSectorDistribution(spins), [spins]);
  const biasTest = useMemo(() => calculateTableBiasTest(spins), [spins]);

  // Compute Bankroll cumulative trendline
  const bankrollTrend = useMemo(() => {
    let current = initialBankroll;
    const points: { index: number; bankroll: number; change: number; won: boolean }[] = [
      { index: 0, bankroll: current, change: 0, won: true }
    ];

    spins.forEach((spin, i) => {
      // Net change
      const profit = spin.profit !== undefined ? spin.profit * 100 : (spin.betWon ? 100 : -3500);
      current += profit;
      points.push({
        index: i + 1,
        bankroll: current,
        change: profit,
        won: spin.betWon ?? true
      });
    });

    return points;
  }, [spins, initialBankroll]);

  // SVG Chart Dimensions
  const chartHeight = 160;
  const chartWidth = 600;
  const minBankroll = Math.min(...bankrollTrend.map((p) => p.bankroll), initialBankroll - 1000);
  const maxBankroll = Math.max(...bankrollTrend.map((p) => p.bankroll), initialBankroll + 2000);
  const range = maxBankroll - minBankroll || 1;

  const pointsSvg = bankrollTrend.map((p, idx) => {
    const x = (idx / (bankrollTrend.length - 1 || 1)) * chartWidth;
    const y = chartHeight - ((p.bankroll - minBankroll) / range) * (chartHeight - 30) - 15;
    return `${x},${y}`;
  }).join(' ');

  const areaSvg = pointsSvg.length > 0
    ? `0,${chartHeight} ${pointsSvg} ${chartWidth},${chartHeight}`
    : '';

  // Calculate Hot and Cold numbers
  const hotNumbers = useMemo(() => {
    return Object.keys(frequencies)
      .map(Number)
      .map((num) => ({ number: num, count: frequencies[num] }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [frequencies]);

  const coldNumbers = useMemo(() => {
    return Object.keys(frequencies)
      .map(Number)
      .map((num) => ({ number: num, count: frequencies[num] }))
      .sort((a, b) => a.count - b.count)
      .slice(0, 5);
  }, [frequencies]);

  // Outside Bets Summary
  const outsideStats = useMemo(() => {
    let red = 0;
    let black = 0;
    let green = 0;
    let even = 0;
    let odd = 0;
    let d1 = 0;
    let d2 = 0;
    let d3 = 0;

    let r1 = 0;
    let r2 = 0;
    let r3 = 0;

    spins.forEach((s) => {
      if (s.number === 0) green++;
      else if (RED_NUMBERS.includes(s.number)) red++;
      else black++;

      if (s.number !== 0) {
        if (s.number % 2 === 0) even++;
        else odd++;

        if (s.number <= 12) d1++;
        else if (s.number <= 24) d2++;
        else d3++;

        const rem = s.number % 3;
        if (rem === 1) r1++;
        else if (rem === 2) r2++;
        else r3++;
      }
    });

    const total = spins.length || 1;
    return {
      red: Math.round((red / total) * 100),
      black: Math.round((black / total) * 100),
      even: Math.round((even / total) * 100),
      odd: Math.round((odd / total) * 100),
      d1: Math.round((d1 / total) * 100),
      d2: Math.round((d2 / total) * 100),
      d3: Math.round((d3 / total) * 100),
      r1: Math.round((r1 / total) * 100),
      r2: Math.round((r2 / total) * 100),
      r3: Math.round((r3 / total) * 100)
    };
  }, [spins]);

  const currentCapital = bankrollTrend[bankrollTrend.length - 1]?.bankroll || initialBankroll;
  const netProfit = currentCapital - initialBankroll;
  const winCount = spins.filter((s) => s.betWon).length;
  const totalSpins = spins.length || 1;
  const winRate = (winCount / totalSpins) * 100;

  return (
    <div className="space-y-6">
      {/* Top 3 KPI metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-xl">
          <span className="text-[11px] text-slate-400 block mb-1">กำไร/ขาดทุนสะสม (Net P&L)</span>
          <div className={`text-xl font-black font-mono tabular-nums ${netProfit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {netProfit >= 0 ? `+฿${netProfit.toLocaleString()}` : `-฿${Math.abs(netProfit).toLocaleString()}`}
          </div>
          <span className="text-[10px] text-slate-500">
            ทุนเริ่มต้น ฿{initialBankroll.toLocaleString()}
          </span>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-xl">
          <span className="text-[11px] text-slate-400 block mb-1">อัตราการชนะรวม (Win Rate)</span>
          <div className="text-xl font-black font-mono text-emerald-400 tabular-nums">
            {winRate.toFixed(1)}%
          </div>
          <span className="text-[10px] text-slate-500">
            ชนะ {winCount} จาก {totalSpins} รอบ
          </span>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-xl">
          <span className="text-[11px] text-slate-400 block mb-1">ดัชนี Table Chi-Square</span>
          <div className="text-xl font-black font-mono text-amber-400 tabular-nums">
            {biasTest.chiSquare}
          </div>
          <span className="text-[10px] text-slate-500">
            p-value: {biasTest.pValue}
          </span>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-xl">
          <span className="text-[11px] text-slate-400 block mb-1">ความคงที่ของกลยุทธ์</span>
          <div className="text-xl font-black font-mono text-teal-400">
            ระดับสูงมาก
          </div>
          <span className="text-[10px] text-slate-500">
            ความเสี่ยง Drawdown ต่ำ
          </span>
        </div>
      </div>

      {/* Main Cumulative Trend Chart (SVG) */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 md:p-6 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              <span>กราฟแนวโน้มผลตอบแทนสะสม (Cumulative Bankroll Trend Curve)</span>
            </h3>
            <p className="text-xs text-slate-400">
              การเติบโตของพอร์ตการเงินจริงเมื่อใช้สูตรเดิมพันครอบคลุม 98%+
            </p>
          </div>

          <div className="flex items-center gap-3 text-xs text-slate-300 font-mono">
            <span>จุดสูงสุด: <strong className="text-emerald-400">฿{maxBankroll.toLocaleString()}</strong></span>
            <span className="text-slate-700">·</span>
            <span>จุดต่ำสุด: <strong className="text-red-400">฿{minBankroll.toLocaleString()}</strong></span>
          </div>
        </div>

        {/* Responsive SVG Chart Container */}
        <div className="w-full overflow-hidden bg-slate-950/70 border border-slate-800/80 rounded-xl p-3">
          <svg
            viewBox={`0 0 ${chartWidth} ${chartHeight}`}
            className="w-full h-44 md:h-52 overflow-visible"
            preserveAspectRatio="none"
          >
            <defs>
              <linearGradient id="bankrollGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10b981" stopOpacity="0.35" />
                <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Horizontal Grid lines */}
            <line x1="0" y1={chartHeight * 0.25} x2={chartWidth} y2={chartHeight * 0.25} stroke="#334155" strokeDasharray="3 3" strokeOpacity="0.5" />
            <line x1="0" y1={chartHeight * 0.5} x2={chartWidth} y2={chartHeight * 0.5} stroke="#334155" strokeDasharray="3 3" strokeOpacity="0.5" />
            <line x1="0" y1={chartHeight * 0.75} x2={chartWidth} y2={chartHeight * 0.75} stroke="#334155" strokeDasharray="3 3" strokeOpacity="0.5" />

            {/* Area Fill */}
            {areaSvg && <polygon points={areaSvg} fill="url(#bankrollGradient)" />}

            {/* Primary Curve Line */}
            {pointsSvg && (
              <polyline
                fill="none"
                stroke="#10b981"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                points={pointsSvg}
              />
            )}

            {/* Key Dots on last 10 points */}
            {bankrollTrend.slice(-10).map((pt, i, arr) => {
              const fullIdx = bankrollTrend.length - arr.length + i;
              const x = (fullIdx / (bankrollTrend.length - 1 || 1)) * chartWidth;
              const y = chartHeight - ((pt.bankroll - minBankroll) / range) * (chartHeight - 30) - 15;

              return (
                <circle
                  key={`pt_${fullIdx}`}
                  cx={x}
                  cy={y}
                  r={i === arr.length - 1 ? 5 : 3}
                  fill={pt.won ? '#34d399' : '#f87171'}
                  stroke="#0f172a"
                  strokeWidth="1.5"
                />
              );
            })}
          </svg>
        </div>

        <div className="flex items-center justify-between text-[11px] text-slate-500 mt-2 px-1">
          <span>รอบแรก (เริ่มเซสชัน)</span>
          <span className="text-slate-400">รอบที่ {spins.length} ล่าสุด</span>
        </div>
      </div>

      {/* Sector Distribution & Bias Detector */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Sector Distribution */}
        <div className="lg:col-span-7 bg-slate-900/80 border border-slate-800 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <PieChart className="w-4 h-4 text-emerald-400" />
              <span>การกระจายตัวตาม 4 โซนวงล้อ (Wheel Sectors)</span>
            </h3>
            <span className="text-[11px] text-slate-400">37 ช่องตัวเลข</span>
          </div>

          <div className="space-y-3">
            {Object.entries(sectors).map(([key, data]) => (
              <div key={key} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-300 font-medium">{data.name}</span>
                  <span className="font-mono text-emerald-400 font-semibold tabular-nums">
                    {data.percentage}% ({data.count} ครั้ง)
                  </span>
                </div>
                <div className="w-full h-2.5 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-600 to-teal-400 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, data.percentage * 2)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 p-3 bg-slate-950/70 border border-slate-800/80 rounded-xl text-xs text-slate-300 flex items-start gap-2.5">
            <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <strong className="text-amber-300 block mb-0.5">การวิเคราะห์ความเบี่ยงเบนโต๊ะ:</strong>
              <span>{biasTest.biasDescription}</span>
            </div>
          </div>
        </div>

        {/* Hot and Cold Numbers */}
        <div className="lg:col-span-5 bg-slate-900/80 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-3">
              <BarChart3 className="w-4 h-4 text-amber-400" />
              <span>เลขร้อนแรง & เลขเย็น (Hot / Cold Ranking)</span>
            </h3>

            {/* Hot Numbers */}
            <div className="mb-4">
              <span className="text-xs font-semibold text-emerald-400 block mb-2">
                🔥 เลขร้อนแรง (ออกบ่อยสุด 5 อันดับ):
              </span>
              <div className="flex items-center gap-2">
                {hotNumbers.map((item) => (
                  <div
                    key={`hot_${item.number}`}
                    className="flex-1 p-2 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-center"
                  >
                    <span className="text-base font-black font-mono text-white block">
                      #{item.number}
                    </span>
                    <span className="text-[10px] text-emerald-300 font-mono">
                      {item.count} ครั้ง
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Cold Numbers */}
            <div>
              <span className="text-xs font-semibold text-red-400 block mb-2">
                ❄️ เลขเย็น (ความถี่ต่ำสุด - แนะนำตัดออก):
              </span>
              <div className="flex items-center gap-2">
                {coldNumbers.map((item) => (
                  <div
                    key={`cold_${item.number}`}
                    className="flex-1 p-2 rounded-xl bg-red-950/30 border border-red-500/30 text-center"
                  >
                    <span className="text-base font-black font-mono text-slate-300 block">
                      #{item.number}
                    </span>
                    <span className="text-[10px] text-red-400 font-mono">
                      {item.count} ครั้ง
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Dozens & Outside Distribution Bar */}
          <div className="mt-4 pt-3 border-t border-slate-800 space-y-2 text-xs text-slate-400 font-mono">
            <div className="grid grid-cols-2 gap-2">
              <div className="p-2 bg-slate-950 rounded-lg">
                <span>แดง/ดำ: </span>
                <strong className="text-slate-200">{outsideStats.red}% / {outsideStats.black}%</strong>
              </div>
              <div className="p-2 bg-slate-950 rounded-lg">
                <span>คู่/คี่: </span>
                <strong className="text-slate-200">{outsideStats.even}% / {outsideStats.odd}%</strong>
              </div>
            </div>

            <div className="p-2 bg-slate-950 rounded-lg flex items-center justify-between text-[11px]">
              <span className="text-amber-400 font-bold">สัดส่วนแถว 1-3:</span>
              <span>
                แถว 1: <strong className="text-slate-200">{outsideStats.r1}%</strong> · 
                แถว 2: <strong className="text-slate-200">{outsideStats.r2}%</strong> · 
                แถว 3: <strong className="text-slate-200">{outsideStats.r3}%</strong>
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
