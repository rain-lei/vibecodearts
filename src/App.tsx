import { useEffect, useState } from 'react';
import { useChronoFlowStore } from './store/useChronoFlowStore';
import { EnergyTracker } from './components/EnergyTracker';
import { ChronoChart } from './components/ChronoChart';
import { TaskManager } from './components/TaskManager';
import { useSmartNotifications } from './hooks/useSmartNotifications';
import { generateSeedLogs, generateSeedTasks } from './utils/seedData';

const SEED_KEY = 'chronoflow-seeded';

function App() {
  useSmartNotifications();
  const logs = useChronoFlowStore((s) => s.logs);
  const tasks = useChronoFlowStore((s) => s.tasks);
  const setStore = useChronoFlowStore.setState;
  const [seeded, setSeeded] = useState(false);

  useEffect(() => {
    const alreadySeeded = localStorage.getItem(SEED_KEY);
    if (!alreadySeeded) {
      setStore({
        logs: generateSeedLogs(),
        tasks: generateSeedTasks(),
      });
      localStorage.setItem(SEED_KEY, '1');
      setSeeded(true);
    }
  }, [setStore]);

  const handleReset = () => {
    setStore({
      logs: generateSeedLogs(),
      tasks: generateSeedTasks(),
    });
    setSeeded(true);
  };

  const handleClear = () => {
    setStore({ logs: [], tasks: [] });
    localStorage.removeItem(SEED_KEY);
    setSeeded(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-950 via-fuchsia-900/80 to-sky-900 text-white relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-pink-500/20 rounded-full blur-3xl" />
        <div className="absolute top-1/3 -left-32 w-80 h-80 bg-cyan-500/15 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-72 h-72 bg-violet-500/20 rounded-full blur-3xl" />
      </div>

      <div className="relative max-w-4xl mx-auto px-4 py-8">
        <header className="mb-10 flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3">
              <span className="text-4xl animate-float">⚡</span>
              <h1 className="text-4xl font-extrabold bg-gradient-to-r from-pink-400 via-fuchsia-300 to-cyan-400 bg-clip-text text-transparent">
                ChronoFlow
              </h1>
            </div>
            <p className="text-pink-200/70 text-sm mt-2 ml-14">
              个人时区调度器 — 顺应生物钟，智能分配任务
            </p>
            <div className="flex gap-3 mt-3 ml-14 text-xs text-pink-300/50">
              <span className="bg-white/10 px-2 py-0.5 rounded-full">{logs.length} 次打卡</span>
              <span className="bg-white/10 px-2 py-0.5 rounded-full">{tasks.length} 个任务</span>
              {seeded && (
                <span className="bg-cyan-500/20 text-cyan-300 px-2 py-0.5 rounded-full">
                  演示数据已加载
                </span>
              )}
            </div>
          </div>
          <div className="flex gap-2 pt-2">
            <button
              onClick={handleReset}
              className="px-3 py-1.5 text-xs rounded-xl bg-white/10 text-pink-200 hover:bg-white/20 transition-all duration-200 hover:scale-105"
            >
              重置演示
            </button>
            <button
              onClick={handleClear}
              className="px-3 py-1.5 text-xs rounded-xl bg-white/10 text-red-300 hover:bg-red-500/20 transition-all duration-200 hover:scale-105"
            >
              清空数据
            </button>
          </div>
        </header>

        <div className="space-y-6">
          <EnergyTracker />
          <ChronoChart />
          <TaskManager />
        </div>

        <footer className="mt-14 text-center text-xs text-pink-300/30">
          数据仅存储在本地浏览器 · ChronoFlow v1.0
        </footer>
      </div>
    </div>
  );
}

export default App;
