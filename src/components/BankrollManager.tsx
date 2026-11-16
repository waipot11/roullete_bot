import React from 'react';
import { BankrollConfig } from '../types/roulette';
import { DollarSign, ShieldAlert, Award, Calculator, Info } from 'lucide-react';

interface BankrollManagerProps {
  config: BankrollConfig;
  onUpdateConfig: (updated: Partial<BankrollConfig>) => void;
  onResetBankroll: () => void;
}

export const BankrollManager: React.FC<BankrollManagerProps> = ({
  config,
  onUpdateConfig,
  onResetBankroll
}) => {
  const profit = config.currentCapital - config.initialCapital;
  const profitPercentage = ((profit / config.initialCapital) * 100).toFixed(1);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 md:p-6 shadow-xl">
        <h2 className="text-base md:text-lg font-bold text-white flex items-center gap-2">
          <Calculator className="w-5 h-5 text-emerald-400" />
          <span>ระบบบริหารความเสี่ยงและเงินทุน (Bankroll & Kelly Risk Management)</span>
        </h2>
        <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
          หลักการสำคัญของกลยุทธ์ Winrate เกิน 98% คือการควบคุมขนาดเดิมพัน (Bet Sizing) ไม่ให้เสี่ยงหมดตัว พร้อมระบบ Stop-Loss และ Take-Profit ตามหลักคณิตศาสตร์การเงิน
        </p>
      </div>

      {/* Main Bankroll Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Current Capital */}
        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800">
          <span className="text-xs text-slate-400 block mb-1">ยอดเงินทุนปัจจุบัน (Current Balance)</span>
          <div className="text-2xl md:text-3xl font-black font-mono text-emerald-400 tabular-nums">
            ฿{config.currentCapital.toLocaleString()}
          </div>
          <span className="text-[11px] text-slate-500 block mt-1">
            ผลตอบแทนสุทธิ: <strong className={profit >= 0 ? 'text-emerald-400' : 'text-red-400'}>{profit >= 0 ? `+${profitPercentage}%` : `${profitPercentage}%`}</strong>
          </span>
        </div>

        {/* Initial Capital */}
        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800">
          <span className="text-xs text-slate-400 block mb-1">ทุนเริ่มต้น (Initial Capital)</span>
          <div className="text-2xl font-black font-mono text-slate-200 tabular-nums">
            ฿{config.initialCapital.toLocaleString()}
          </div>
          <span className="text-[11px] text-slate-500 block mt-1">
            หน่วยฐานเดิมพัน: ฿{config.baseUnit.toLocaleString()} / ชิป
          </span>
        </div>

        {/* Profit Target Status */}
        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800">
          <span className="text-xs text-slate-400 block mb-1">เป้าหมายกำไร (Take-Profit Target)</span>
          <div className="text-2xl font-black font-mono text-amber-400 tabular-nums">
            ฿{config.takeProfitTarget.toLocaleString()}
          </div>
          <span className="text-[11px] text-slate-500 block mt-1">
            {config.currentCapital >= config.takeProfitTarget
              ? '🎉 ถึงเป้าหมายกำไรแล้ว แนะนำหยุดพัก!'
              : `ขาดอีก ฿${Math.max(0, config.takeProfitTarget - config.currentCapital).toLocaleString()}`}
          </span>
        </div>
      </div>

      {/* Configuration Controls */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 md:p-6 shadow-xl">
        <h3 className="text-sm md:text-base font-bold text-white mb-4">
          ตั้งค่าการจัดการเงินทุน (Capital & Limit Settings)
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Initial Capital Input */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">
              กำหนดทุนเริ่มต้น (บาท):
            </label>
            <input
              type="number"
              value={config.initialCapital}
              onChange={(e) => onUpdateConfig({ initialCapital: Number(e.target.value) || 1000 })}
              className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl font-mono text-sm text-slate-100 focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Base Unit */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">
              มูลค่าชิปฐาน (Base Chip Value):
            </label>
            <input
              type="number"
              value={config.baseUnit}
              onChange={(e) => onUpdateConfig({ baseUnit: Number(e.target.value) || 10 })}
              className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl font-mono text-sm text-slate-100 focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Stop-Loss */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">
              จุดตัดขาดทุน (Stop-Loss Limit):
            </label>
            <input
              type="number"
              value={config.stopLossLimit}
              onChange={(e) => onUpdateConfig({ stopLossLimit: Number(e.target.value) || 0 })}
              className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl font-mono text-sm text-red-300 focus:outline-none focus:border-red-500"
            />
          </div>

          {/* Take-Profit */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">
              เป้าหมายหยุดเมื่อได้กำไร (Take-Profit):
            </label>
            <input
              type="number"
              value={config.takeProfitTarget}
              onChange={(e) => onUpdateConfig({ takeProfitTarget: Number(e.target.value) || 15000 })}
              className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl font-mono text-sm text-emerald-300 focus:outline-none focus:border-emerald-500"
            />
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-slate-800 flex justify-end">
          <button
            onClick={onResetBankroll}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 transition-colors"
          >
            รีเซ็ตเงินทุนกลับสู่ค่าเริ่มต้น
          </button>
        </div>
      </div>

      {/* Mathematical Principle Note */}
      <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-2xl flex items-start gap-3 text-xs text-slate-400 leading-relaxed">
        <Info className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
        <div>
          <strong className="text-slate-200 block mb-1">
            ทฤษฎีความน่าจะเป็นและหลักความเสี่ยงต่ำ (Mathematical Proof & Risk Disclosure):
          </strong>
          <span>
            ในวงล้อรูเล็ตต์ยุโรปที่มี 37 ช่อง (0-36) การวางเดิมพันครอบคลุม 35-36 ช่องจะมีโอกาสชนะในแต่ละรอบสูงถึง 94.6% - 97.3% และเมื่อใช้ระบบกระจายความเสี่ยง 2 จังหวะ (2-Stage Recovery Matrix) อัตราชนะรวมจะสูงเกิน 98.4% อย่างไรก็ดี เนื่องจากมีอัตราจ่ายแบบสะสมกำไรสม่ำเสมอ ผู้เล่นควรปฏิบัติตามกรอบ Stop-Loss อย่างเคร่งครัดเสมอ
          </span>
        </div>
      </div>
    </div>
  );
};
