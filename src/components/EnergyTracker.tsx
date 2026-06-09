import { useState, useCallback } from 'react';
import { useChronoFlowStore } from '../store/useChronoFlowStore';

const LABELS: Record<number, string> = {
  1: '困死了',
  2: '有点累',
  3: '还行吧',
  4: '状态好',
  5: '元气满满',
};

const EMOJIS: Record<number, string> = {
  1: '😴',
  2: '😔',
  3: '😐',
  4: '😊',
  5: '🔥',
};

const COLORS: Record<number, string> = {
  1: 'from-red-500/80 to-red-600/80 shadow-red-500/30',
  2: 'from-orange-500/80 to-orange-600/80 shadow-orange-500/30',
  3: 'from-yellow-500/80 to-yellow-600/80 shadow-yellow-500/30',
  4: 'from-emerald-500/80 to-emerald-600/80 shadow-emerald-500/30',
  5: 'from-cyan-400/80 to-fuchsia-500/80 shadow-fuchsia-500/30',
};

export function EnergyTracker() {
  const addLog = useChronoFlowStore((s) => s.addLog);
  const [selected, setSelected] = useState<number | null>(null);
  const [justLogged, setJustLogged] = useState(false);

  const handleLog = useCallback(
    (level: number) => {
      addLog(level);
      setSelected(level);
      setJustLogged(true);
      setTimeout(() => setJustLogged(false), 1500);
    },
    [addLog]
  );

  return (
    <div className="glass-card p-6 transition-all duration-300">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-xl">🔋</span>
        <h2 className="text-lg font-bold text-white">精力打卡</h2>
      </div>
      <p className="text-sm text-pink-200/50 mb-5 ml-8">
        选择当前精力状态，记录你的生物钟节律
      </p>
      <div className="flex gap-3">
        {[1, 2, 3, 4, 5].map((level) => (
          <button
            key={level}
            onClick={() => handleLog(level)}
            className={`
              flex-1 py-4 px-2 rounded-2xl text-sm font-semibold transition-all duration-300
              ${
                justLogged && selected === level
                  ? `bg-gradient-to-br ${COLORS[level]} text-white scale-110 shadow-lg`
                  : 'bg-white/8 text-white/70 hover:bg-white/15 hover:text-white hover:scale-105'
              }
            `}
          >
            <div className="text-2xl mb-1.5">{EMOJIS[level]}</div>
            <div className="text-xs">{LABELS[level]}</div>
          </button>
        ))}
      </div>
      {justLogged && (
        <div className="mt-4 text-center text-cyan-300 text-sm font-medium animate-pulse">
          ✨ 已记录！精力等级: {selected} {EMOJIS[selected!]}
        </div>
      )}
    </div>
  );
}
