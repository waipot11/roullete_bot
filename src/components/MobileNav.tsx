import { Target, LineChart, ShieldCheck, Layers, Sparkles, Send } from 'lucide-react';

export type ActiveTab = 'dual' | 'quantum10' | 'predictor' | 'keypad' | 'charts' | 'wheel' | 'bankroll' | 'telegram';

interface MobileNavProps {
  activeTab: ActiveTab;
  onChangeTab: (tab: ActiveTab) => void;
  winRate: number;
  telegramConnected?: boolean;
}

export const MobileNav: React.FC<MobileNavProps> = ({
  activeTab,
  onChangeTab,
  telegramConnected
}) => {
  const tabs: { id: ActiveTab; label: string; icon: React.ReactNode }[] = [
    {
      id: 'dual',
      label: 'ระบบ 2 จอ',
      icon: <Layers className="w-4 h-4" />
    },
    {
      id: 'quantum10',
      label: '10 เลขเด่น',
      icon: <Sparkles className="w-4 h-4 text-amber-400" />
    },
    {
      id: 'telegram',
      label: 'Telegram',
      icon: (
        <div className="relative">
          <Send className="w-4 h-4 text-sky-400" />
          {telegramConnected && (
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-400 ring-1 ring-slate-950" />
          )}
        </div>
      )
    },
    {
      id: 'predictor',
      label: 'วิเคราะห์',
      icon: <Target className="w-4 h-4" />
    },
    {
      id: 'charts',
      label: 'กราฟ',
      icon: <LineChart className="w-4 h-4" />
    },
    {
      id: 'bankroll',
      label: 'ทุน/โต๊ะ',
      icon: <ShieldCheck className="w-4 h-4" />
    }
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-slate-950/95 backdrop-blur-md border-t border-slate-800/80 px-1.5 py-1.5 md:hidden">
      <div className="grid grid-cols-6 items-center">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => onChangeTab(tab.id)}
              className={`flex flex-col items-center justify-center min-h-[48px] py-1 px-0.5 rounded-xl transition-all ${
                isActive
                  ? 'text-emerald-400 font-bold'
                  : 'text-slate-400 hover:text-slate-200 font-medium'
              }`}
            >
              <div className={`p-1 rounded-lg ${isActive ? 'bg-emerald-500/15' : ''}`}>
                {tab.icon}
              </div>
              <span className="text-[10px] tracking-tight mt-0.5 truncate max-w-full">
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
