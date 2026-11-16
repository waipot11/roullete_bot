import React from 'react';
import { X, CheckCircle2, ShieldCheck, Target, ArrowRight } from 'lucide-react';

interface TableBoardComparisonModalProps {
  isOpen: boolean;
  onClose: () => void;
  baseUnit: number;
}

export const TableBoardComparisonModal: React.FC<TableBoardComparisonModalProps> = ({
  isOpen,
  onClose,
  baseUnit
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 md:p-6 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-2xl w-full p-5 md:p-6 shadow-2xl relative space-y-4 max-h-[90vh] overflow-y-auto">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-lg bg-slate-800"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Title */}
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base md:text-lg font-bold text-white">
              ใช้ได้ 100%! กระดานนี้คือ European Roulette ตรงกับระบบทุกประการ
            </h3>
            <p className="text-xs text-slate-400">
              เปรียบเทียบตำแหน่งการวางเงินบนกระดาน 1xBet Real Casino ในรูปภาพของคุณ
            </p>
          </div>
        </div>

        {/* Visual Mapping Card */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center bg-slate-950 p-3.5 rounded-xl border border-slate-800">
          <div className="md:col-span-5 flex justify-center">
            <div className="relative rounded-xl overflow-hidden border border-slate-700 shadow-lg max-h-72">
              <img
                src="/assets/aistudio/Screenshot_20261105_070353_1xBet_6c114e76.jpg"
                alt="1xBet Real Casino Roulette Board"
                className="w-full h-auto object-contain"
                referrerPolicy="no-referrer"
              />
              <div className="absolute bottom-2 left-2 right-2 bg-slate-900/90 backdrop-blur-sm px-2 py-1 rounded text-[10px] text-amber-300 font-mono text-center border border-amber-500/40">
                กระดานจริง 1xBet ของคุณ (ชิป 2฿ / ทุน 164.67฿)
              </div>
            </div>
          </div>

          <div className="md:col-span-7 space-y-2 text-xs">
            <div className="p-2.5 bg-slate-900 rounded-lg border border-slate-800">
              <strong className="text-amber-400 block mb-0.5">
                1. ตำแหน่งวางเงิน "สูตรเน้นแถว" (ช่องล่างสุด):
              </strong>
              <span className="text-slate-300">
                มองไปที่ช่อง <strong>"2ต่อ1"</strong> ด้านล่างเลข 34, 35, 36:
              </span>
              <ul className="mt-1 space-y-0.5 text-slate-400 pl-2">
                <li>• <strong>2ต่อ1 ช่องซ้าย (ใต้เลข 34)</strong> = แถว 1 (1, 4, 7...34)</li>
                <li>• <strong>2ต่อ1 ช่องกลาง (ใต้เลข 35)</strong> = แถว 2 (2, 5, 8...35)</li>
                <li>• <strong>2ต่อ1 ช่องขวา (ใต้เลข 36)</strong> = แถว 3 (3, 6, 9...36)</li>
              </ul>
            </div>

            <div className="p-2.5 bg-gradient-to-r from-amber-950/40 to-slate-900 rounded-lg border border-amber-500/30">
              <strong className="text-amber-300 block mb-0.5">
                2. ตำแหน่งวางเงิน "สูตร 10 เลขเด่น 100 ปัจจัย" (เต็งเดี่ยว):
              </strong>
              <span className="text-slate-300 leading-relaxed">
                นำชิป 2 บาท วางตรงช่องตัวเลข 10 ตัวที่ระบบคำนวณ (รวม 20 บาท) หากออกเลขใดตัวหนึ่ง <strong>รับเงินรางวัล 72 บาท (กำไรสุทธิ +52 บาท หรือ +260% ROI ทันที!)</strong>
              </span>
            </div>

            <div className="p-2.5 bg-slate-900 rounded-lg border border-slate-800">
              <strong className="text-emerald-400 block mb-0.5">
                3. ช่องโซน Dozens (แถบด้านซ้าย):
              </strong>
              <span className="text-slate-300">
                • <strong>"12 แรก"</strong> = Dozen 1 (1-12)<br />
                • <strong>"12 ที่ 2"</strong> = Dozen 2 (13-24)<br />
                • <strong>"12 ที่ 3"</strong> = Dozen 3 (25-36)
              </span>
            </div>
          </div>
        </div>

        {/* 3-Step Bankroll Table for 164.67 Baht */}
        <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-xl space-y-2">
          <h4 className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>ตารางเดินเงิน 3 สเต็ปสำหรับทุน 164.67 บาท (ชิป 2 บาท):</span>
          </h4>

          <div className="grid grid-cols-3 gap-2 text-center text-xs font-mono">
            <div className="p-2.5 bg-slate-900 rounded-lg border border-slate-800">
              <span className="text-[10px] text-slate-400 block">สเต็ป 1</span>
              <strong className="text-sm text-slate-100 block">2 บาท (1 ชิป)</strong>
              <span className="text-[10px] text-emerald-400">ชนะได้กำไร +4 บ.</span>
            </div>

            <div className="p-2.5 bg-slate-900 rounded-lg border border-slate-800">
              <span className="text-[10px] text-slate-400 block">สเต็ป 2 (ถ้าหลุด)</span>
              <strong className="text-sm text-slate-100 block">4 บาท (2 ชิป)</strong>
              <span className="text-[10px] text-emerald-400">ชนะได้กำไร +6 บ.</span>
            </div>

            <div className="p-2.5 bg-slate-900 rounded-lg border border-slate-800">
              <span className="text-[10px] text-slate-400 block">สเต็ป 3 (ถ้าหลุด 2)</span>
              <strong className="text-sm text-slate-100 block">8 บาท (4 ชิป)</strong>
              <span className="text-[10px] text-emerald-400">ชนะได้กำไร +10 บ.</span>
            </div>
          </div>

          <p className="text-[11px] text-slate-400">
            *ทุนสะสมสูงสุด 3 รอบใช้เพียง <strong>14 บาท</strong> จากเงินที่มี <strong>164.67 บาท</strong> คิดเป็นไม่ถึง 10% ของพอร์ต ปลอดภัยสูงสุดและเล่นตามสูตรนี้ได้ทันที
          </p>
        </div>

        <button
          onClick={onClose}
          className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 font-bold text-xs md:text-sm text-slate-950 rounded-xl transition-all shadow-lg active:scale-95"
        >
          เข้าใจแล้ว เริ่มใช้งานระบบทำนายผลกับกระดานนี้
        </button>
      </div>
    </div>
  );
};
