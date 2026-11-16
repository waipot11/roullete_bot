import React, { useState } from 'react';
import { TableSourceInfo, SpinRecord } from '../types/roulette';
import { TABLE_SOURCES } from '../data/multiSourceData';
import { Database, Radio, Download, Upload, Check, RefreshCw, Layers } from 'lucide-react';

interface MultiSourceHubProps {
  currentTable: TableSourceInfo;
  onSelectTable: (table: TableSourceInfo) => void;
  onImportCustomData: (numbers: number[]) => void;
  onExportData: () => void;
  isAutoStreamActive: boolean;
  onToggleAutoStream: () => void;
  totalSpins: number;
}

export const MultiSourceHub: React.FC<MultiSourceHubProps> = ({
  currentTable,
  onSelectTable,
  onImportCustomData,
  onExportData,
  isAutoStreamActive,
  onToggleAutoStream,
  totalSpins
}) => {
  const [customInputText, setCustomInputText] = useState('');
  const [importStatus, setImportStatus] = useState<string | null>(null);

  const handleCustomImport = () => {
    if (!customInputText.trim()) return;

    // Parse comma or space separated numbers
    const parsed = customInputText
      .split(/[\s,]+/)
      .map((s) => parseInt(s.trim(), 10))
      .filter((n) => !isNaN(n) && n >= 0 && n <= 36);

    if (parsed.length === 0) {
      setImportStatus('ไม่พบตัวเลข 0-36 ที่ถูกต้อง');
      return;
    }

    onImportCustomData(parsed);
    setImportStatus(`นำเข้าข้อมูล ${parsed.length} รอบสำเร็จแล้ว!`);
    setCustomInputText('');
    setTimeout(() => setImportStatus(null), 3000);
  };

  return (
    <div className="space-y-6">
      {/* Header Summary */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 md:p-6 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-base md:text-lg font-bold text-white flex items-center gap-2">
              <Database className="w-5 h-5 text-emerald-400" />
              <span>ศูนย์รวมสถิติสดจากหลายแหล่ง (Multi-Source Live Data Feeds)</span>
            </h2>
            <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
              รวบรวมและวิเคราะห์ข้อมูลสถิติรอบการหมุนจริงจากคาสิโนสดชั้นนำทั่วโลก (ยุโรปและเอเชีย) เพื่อประมวลผลความเบี่ยงเบนของหน้าโต๊ะ (Physical Wheel Bias) อย่างแม่นยำสูงสุด
            </p>
          </div>

          {/* Auto Stream live toggle */}
          <button
            onClick={onToggleAutoStream}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs md:text-sm border transition-all active:scale-95 shrink-0 ${
              isAutoStreamActive
                ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-lg shadow-emerald-500/20 animate-pulse'
                : 'bg-slate-800 text-slate-200 border-slate-700 hover:bg-slate-700'
            }`}
          >
            <Radio className="w-4 h-4" />
            <span>
              {isAutoStreamActive ? 'กำลังรับสตรีมสด (Live Auto-Sync On)' : 'เปิดสตรีมข้อมูลสดอัตโนมัติ'}
            </span>
          </button>
        </div>
      </div>

      {/* Available Sources Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {TABLE_SOURCES.map((table) => {
          const isSelected = table.id === currentTable.id;

          return (
            <div
              key={table.id}
              onClick={() => onSelectTable(table)}
              className={`p-4 md:p-5 rounded-2xl border transition-all cursor-pointer ${
                isSelected
                  ? 'bg-emerald-950/40 border-emerald-500/80 shadow-lg shadow-emerald-950/50'
                  : 'bg-slate-900/70 border-slate-800 hover:border-slate-700 hover:bg-slate-800/40'
              }`}
            >
              <div className="flex items-start justify-between gap-3 mb-2">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-white text-sm md:text-base">
                      {table.name}
                    </h3>
                    {isSelected && (
                      <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-sm" />
                    )}
                  </div>
                  <span className="text-xs text-slate-400 block mt-0.5">
                    {table.casinoName} · {table.location}
                  </span>
                </div>

                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  {table.type}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-slate-800/80 text-center font-mono">
                <div className="p-2 bg-slate-950/60 rounded-lg">
                  <span className="text-[10px] text-slate-500 block">จำนวนรอบที่บันทึก</span>
                  <strong className="text-xs text-slate-200">{table.totalSpins} รอบ</strong>
                </div>
                <div className="p-2 bg-slate-950/60 rounded-lg">
                  <span className="text-[10px] text-slate-500 block">ความมั่นใจเชิงสถิติ</span>
                  <strong className="text-xs text-emerald-400">{table.biasConfidence}%</strong>
                </div>
                <div className="p-2 bg-slate-950/60 rounded-lg">
                  <span className="text-[10px] text-slate-500 block">สถานะข้อมูล</span>
                  <strong className="text-xs text-amber-300">สด (Active)</strong>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Custom Data Import / Export Section */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 md:p-6 shadow-xl">
        <h3 className="text-sm md:text-base font-bold text-white flex items-center gap-2 mb-2">
          <Layers className="w-4 h-4 text-emerald-400" />
          <span>นำเข้าประวัติการหมุนเอง / บันทึกไฟล์ (Import / Export Custom Spins)</span>
        </h3>
        <p className="text-xs text-slate-400 mb-4">
          ใส่ชุดตัวเลขที่ท่านบันทึกมาจากโต๊ะสดที่กำลังเล่นอยู่ (คั่นด้วยเครื่องหมายจุลภาค เช่น <code>17, 34, 6, 27, 13, 0, 32</code>)
        </p>

        <div className="space-y-3">
          <textarea
            value={customInputText}
            onChange={(e) => setCustomInputText(e.target.value)}
            placeholder="ตัวอย่าง: 17, 20, 32, 15, 4, 26, 35, 12, 28, 7, 29, 18, 22, 9, 31, 0..."
            rows={3}
            className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs md:text-sm font-mono text-slate-200 focus:outline-none focus:border-emerald-500 transition-colors"
          />

          {importStatus && (
            <div className="p-2.5 bg-emerald-950/40 border border-emerald-500/40 rounded-xl text-xs text-emerald-300 flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-400" />
              <span>{importStatus}</span>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleCustomImport}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold text-xs rounded-xl shadow-lg transition-all active:scale-95"
            >
              <Upload className="w-4 h-4" />
              <span>นำเข้าข้อมูลสถิติ (Process Import)</span>
            </button>

            <button
              onClick={onExportData}
              className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs rounded-xl border border-slate-700 transition-all active:scale-95"
            >
              <Download className="w-4 h-4 text-slate-400" />
              <span>ส่งออกข้อมูล CSV ({totalSpins} รอบ)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
