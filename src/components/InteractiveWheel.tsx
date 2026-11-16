import React, { useState } from 'react';
import { EUROPEAN_WHEEL_NUMBERS, NUMBER_METADATA, RED_NUMBERS } from '../utils/rouletteConstants';
import { PredictionResult } from '../types/roulette';
import { Play, Sparkles } from 'lucide-react';

interface InteractiveWheelProps {
  currentNumber: number;
  prediction: PredictionResult;
  onSpinWheel: () => void;
  isSpinning: boolean;
  onSelectNumber?: (num: number) => void;
}

export const InteractiveWheel: React.FC<InteractiveWheelProps> = ({
  currentNumber,
  prediction,
  onSpinWheel,
  isSpinning,
  onSelectNumber
}) => {
  const [wheelRotation, setWheelRotation] = useState<number>(0);

  // Trigger spin animation rotation
  const handleSpinClick = () => {
    if (isSpinning) return;
    const extraRotations = 1440 + Math.floor(Math.random() * 360);
    setWheelRotation((prev) => prev + extraRotations);
    onSpinWheel();
  };

  const centerRadius = 140;
  const innerTrackRadius = 95;
  const totalNumbers = 37;
  const anglePerPocket = 360 / totalNumbers;

  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 md:p-6 shadow-xl">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
        <div>
          <h2 className="text-base md:text-lg font-bold text-white flex items-center gap-2">
            <span>วงล้อและผังเดิมพันยุโรป (European Wheel Simulation)</span>
          </h2>
          <p className="text-xs text-slate-400">
            แสดงตำแหน่งลูกเหล็ก ช่องเดิมพันที่คลุม 98%+ และโซนความน่าจะเป็น
          </p>
        </div>

        <button
          onClick={handleSpinClick}
          disabled={isSpinning}
          className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 text-slate-950 font-bold rounded-xl text-xs md:text-sm shadow-lg shadow-emerald-600/20 active:scale-95 transition-all"
        >
          <Play className={`w-4 h-4 fill-current ${isSpinning ? 'animate-spin' : ''}`} />
          <span>{isSpinning ? 'กำลังหมุนลูกเหล็ก...' : 'จำลองการหมุน (Spin Wheel)'}</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
        {/* Wheel SVG Viewport */}
        <div className="lg:col-span-5 flex flex-col items-center justify-center">
          <div className="relative w-64 h-64 md:w-72 md:h-72">
            {/* Outer Decorative Ring */}
            <div className="absolute inset-0 rounded-full border-4 border-amber-600/40 bg-gradient-to-br from-slate-900 to-slate-950 shadow-2xl flex items-center justify-center pointer-events-none" />

            {/* Rotating Wheel Group */}
            <svg
              viewBox="0 0 320 320"
              className="w-full h-full transition-transform duration-[3000ms] ease-out drop-shadow-2xl"
              style={{ transform: `rotate(${wheelRotation}deg)` }}
            >
              {/* Outer Wood Rim */}
              <circle cx="160" cy="160" r="156" fill="#1c1917" stroke="#b45309" strokeWidth="4" />
              <circle cx="160" cy="160" r="148" fill="#0f172a" />

              {/* Pocket Wedges */}
              {EUROPEAN_WHEEL_NUMBERS.map((num, i) => {
                const startAngle = (i * anglePerPocket - anglePerPocket / 2 - 90) * (Math.PI / 180);
                const endAngle = (i * anglePerPocket + anglePerPocket / 2 - 90) * (Math.PI / 180);
                const textAngle = i * anglePerPocket - 90;

                const x1 = 160 + centerRadius * Math.cos(startAngle);
                const y1 = 160 + centerRadius * Math.sin(startAngle);
                const x2 = 160 + centerRadius * Math.cos(endAngle);
                const y2 = 160 + centerRadius * Math.sin(endAngle);

                const x3 = 160 + innerTrackRadius * Math.cos(endAngle);
                const y3 = 160 + innerTrackRadius * Math.sin(endAngle);
                const x4 = 160 + innerTrackRadius * Math.cos(startAngle);
                const y4 = 160 + innerTrackRadius * Math.sin(startAngle);

                const pathData = `M ${x1} ${y1} A ${centerRadius} ${centerRadius} 0 0 1 ${x2} ${y2} L ${x3} ${y3} A ${innerTrackRadius} ${innerTrackRadius} 0 0 0 ${x4} ${y4} Z`;

                const isCurrent = num === currentNumber;
                const isUncovered = prediction.uncoveredNumbers.includes(num);
                const isColdPick = isUncovered;

                let fillColor = '#0f172a';
                if (num === 0) fillColor = '#059669'; // Emerald green
                else if (RED_NUMBERS.includes(num)) fillColor = '#dc2626'; // Red
                else fillColor = '#1e293b'; // Black pocket

                if (isColdPick) {
                  fillColor = '#334155'; // Cold faded pocket
                }

                // Text Position
                const textRadius = (centerRadius + innerTrackRadius) / 2;
                const textX = 160 + textRadius * Math.cos(textAngle * (Math.PI / 180));
                const textY = 160 + textRadius * Math.sin(textAngle * (Math.PI / 180));

                return (
                  <g key={`pocket_${num}_${i}`}>
                    <path
                      d={pathData}
                      fill={fillColor}
                      stroke={isCurrent ? '#fbbf24' : '#475569'}
                      strokeWidth={isCurrent ? 2 : 0.5}
                      className="cursor-pointer hover:opacity-80 transition-opacity"
                      onClick={() => onSelectNumber && onSelectNumber(num)}
                    />
                    <text
                      x={textX}
                      y={textY}
                      fill={isCurrent ? '#fbbf24' : '#ffffff'}
                      fontSize="9"
                      fontWeight={isCurrent ? 'bold' : '600'}
                      textAnchor="middle"
                      dominantBaseline="central"
                      transform={`rotate(${textAngle + 90}, ${textX}, ${textY})`}
                      className="pointer-events-none select-none font-mono"
                    >
                      {num}
                    </text>
                  </g>
                );
              })}

              {/* Inner Brass Center */}
              <circle cx="160" cy="160" r="70" fill="#0f172a" stroke="#d97706" strokeWidth="3" />
              <circle cx="160" cy="160" r="50" fill="#1e293b" />
              <circle cx="160" cy="160" r="24" fill="#d97706" />
              <circle cx="160" cy="160" r="10" fill="#fef3c7" />
            </svg>

            {/* Ball Marker Indicator at Center */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="text-center">
                <span className="text-[10px] text-slate-400 uppercase tracking-widest block font-medium">
                  ผลล่าสุด
                </span>
                <span
                  className={`text-2xl font-black font-mono tabular-nums ${
                    currentNumber === 0
                      ? 'text-emerald-400'
                      : RED_NUMBERS.includes(currentNumber)
                      ? 'text-red-400'
                      : 'text-slate-100'
                  }`}
                >
                  {currentNumber}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-3 text-center text-xs text-slate-400">
            <span>แตะที่ช่องบนวงล้อเพื่อจำลองผลออกรางวัลทันที</span>
          </div>
        </div>

        {/* Layout Betting Table with Chip Markers */}
        <div className="lg:col-span-7 flex flex-col justify-center">
          <div className="bg-slate-950/90 border border-slate-800 rounded-xl p-3 md:p-4 overflow-x-auto">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-300">
                ผังชิปเดิมพันสูตรครอบคลุม 98%+ (Live Bet Placement Table)
              </span>
              <span className="text-[11px] text-emerald-400 font-mono">
                ครอบคลุม {prediction.coveredNumbers.length}/37 ช่อง
              </span>
            </div>

            {/* Betting Grid representation */}
            <div className="min-w-[340px]">
              {/* Zero */}
              <div className="grid grid-cols-12 gap-1 mb-1">
                <button
                  onClick={() => onSelectNumber && onSelectNumber(0)}
                  className={`col-span-12 py-2 text-center text-xs font-bold rounded-lg border transition-all ${
                    currentNumber === 0
                      ? 'bg-emerald-500 text-slate-950 border-amber-400 ring-2 ring-amber-400'
                      : prediction.coveredNumbers.includes(0)
                      ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-300'
                      : 'bg-slate-900 border-dashed border-red-500/40 text-slate-500'
                  }`}
                >
                  0 (Green) {!prediction.coveredNumbers.includes(0) && '• [หลบความเสี่ยง]'}
                </button>
              </div>

              {/* 12 Rows of 3 columns */}
              <div className="grid grid-cols-3 gap-1">
                {Array.from({ length: 12 }, (_, rowIdx) => {
                  const numCol1 = rowIdx * 3 + 1;
                  const numCol2 = rowIdx * 3 + 2;
                  const numCol3 = rowIdx * 3 + 3;

                  return [numCol1, numCol2, numCol3].map((num) => {
                    const isRed = RED_NUMBERS.includes(num);
                    const isCovered = prediction.coveredNumbers.includes(num);
                    const isCurrent = currentNumber === num;

                    return (
                      <button
                        key={`board_num_${num}`}
                        onClick={() => onSelectNumber && onSelectNumber(num)}
                        className={`relative py-2.5 px-2 text-center font-mono text-xs md:text-sm font-bold rounded-lg border transition-all active:scale-95 ${
                          isCurrent
                            ? 'ring-2 ring-amber-400 border-amber-400 text-white z-10 ' +
                              (isRed ? 'bg-red-600' : 'bg-slate-800')
                            : isRed
                            ? 'bg-red-950/40 border-red-900/60 text-red-300 hover:bg-red-900/50'
                            : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800'
                        } ${!isCovered ? 'opacity-40 border-dashed border-red-500' : ''}`}
                      >
                        <span>{num}</span>
                        {/* Chip indicator */}
                        {isCovered && (
                          <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400/50" />
                        )}
                        {!isCovered && (
                          <span className="absolute top-1 right-1 text-[9px] text-red-400 font-sans font-bold">
                            ✕
                          </span>
                        )}
                      </button>
                    );
                  });
                })}
              </div>

              {/* 2:1 Column / Row Boxes (Bottom of each column) */}
              <div className="grid grid-cols-3 gap-1 mt-1.5">
                {[1, 2, 3].map((colIdx) => {
                  const isColCovered = colIdx === 1
                    ? prediction.coveredNumbers.includes(1) && prediction.coveredNumbers.includes(34)
                    : colIdx === 2
                    ? prediction.coveredNumbers.includes(2) && prediction.coveredNumbers.includes(35)
                    : prediction.coveredNumbers.includes(3) && prediction.coveredNumbers.includes(36);

                  const isSingleRowTarget = prediction.strategyId === 'low_cap_single_row' && isColCovered;

                  return (
                    <div
                      key={`col_box_${colIdx}`}
                      className={`p-2 text-center rounded-lg border font-mono text-xs transition-all relative ${
                        isSingleRowTarget
                          ? 'bg-amber-500/20 border-amber-400 text-amber-300 ring-2 ring-amber-400 font-bold'
                          : isColCovered
                          ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-300 font-bold'
                          : 'bg-slate-900 border-slate-800 text-slate-400'
                      }`}
                    >
                      <span className="block text-xs font-bold">2:1 (แถว {colIdx})</span>
                      <span className="text-[10px] text-slate-400">จ่าย 2 เท่า</span>
                      {isSingleRowTarget && (
                        <span className="absolute -top-1 -right-1 px-1.5 py-0.2 bg-amber-500 text-slate-950 text-[9px] font-black rounded-full shadow-sm">
                          ชิป 1
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Dozens bar */}
              <div className="grid grid-cols-3 gap-1 mt-2">
                <div className="p-2 text-center bg-slate-900/80 border border-slate-800 rounded-lg text-xs font-medium text-slate-300">
                  <span className="block font-bold text-emerald-400">1st Dozen</span>
                  <span className="text-[10px] text-slate-400">1 - 12 (12 เลข)</span>
                </div>
                <div className="p-2 text-center bg-slate-900/80 border border-slate-800 rounded-lg text-xs font-medium text-slate-300">
                  <span className="block font-bold text-emerald-400">2nd Dozen</span>
                  <span className="text-[10px] text-slate-400">13 - 24 (12 เลข)</span>
                </div>
                <div className="p-2 text-center bg-slate-900/80 border border-slate-800 rounded-lg text-xs font-medium text-slate-300">
                  <span className="block font-bold text-emerald-400">3rd Dozen</span>
                  <span className="text-[10px] text-slate-400">25 - 36 (12 เลข)</span>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Chip Legend */}
          <div className="flex flex-wrap items-center gap-3 mt-3 text-xs text-slate-400">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-sm" />
              <span>ช่องที่สูตรวางเงินดัก (ครอบคลุม 98%+)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-red-400 font-bold">✕</span>
              <span>ช่องตัดความเสี่ยง (เลขเย็น/ตัดออก)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-amber-300">ผลออกรอบล่าสุด</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
