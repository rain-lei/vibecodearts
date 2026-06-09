import { useState, useMemo } from 'react';
import { useChronoFlowStore } from '../store/useChronoFlowStore';
import type { Task, ScheduledItem } from '../types';

const LOAD_LABELS: Record<number, string> = {
  1: '机械任务',
  2: '常规任务',
  3: '中等难度',
  4: '高难度',
  5: '深度思考',
};

const LOAD_EMOJI: Record<number, string> = {
  1: '🧹',
  2: '📝',
  3: '🔧',
  4: '🧠',
  5: '💡',
};

const ZONE_STYLE: Record<string, { bg: string; border: string; label: string; emoji: string }> = {
  peak: { bg: 'bg-cyan-500/10', border: 'border-cyan-400', label: '波峰时段', emoji: '⚡' },
  valley: { bg: 'bg-rose-500/10', border: 'border-rose-400', label: '波谷时段', emoji: '🌙' },
  neutral: { bg: 'bg-violet-500/10', border: 'border-violet-400', label: '中性时段', emoji: '🌤' },
};

export function TaskManager() {
  const tasks = useChronoFlowStore((s) => s.tasks);
  const addTask = useChronoFlowStore((s) => s.addTask);
  const removeTask = useChronoFlowStore((s) => s.removeTask);
  const schedule = useChronoFlowStore((s) => s.getSchedule)();

  const sortedSchedule = useMemo(
    () =>
      [...schedule].sort((a, b) => {
        if (a.startHour !== b.startHour) return a.startHour - b.startHour;
        return a.startMinute - b.startMinute;
      }),
    [schedule]
  );

  const [title, setTitle] = useState('');
  const [cognitiveLoad, setCognitiveLoad] = useState(3);
  const [estimatedMinutes, setEstimatedMinutes] = useState(30);

  const handleAdd = () => {
    if (!title.trim()) return;
    addTask({ title: title.trim(), cognitiveLoad, estimatedMinutes });
    setTitle('');
    setCognitiveLoad(3);
    setEstimatedMinutes(30);
  };

  return (
    <div className="glass-card p-6 transition-all duration-300">
      <div className="flex items-center gap-2 mb-5">
        <span className="text-xl">📋</span>
        <h2 className="text-lg font-bold text-white">任务管理</h2>
      </div>

      <div className="space-y-3 mb-6">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
          placeholder="输入任务名称..."
          className="w-full bg-white/8 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-pink-200/30 text-sm focus:outline-none focus:border-fuchsia-400/50 focus:ring-1 focus:ring-fuchsia-400/20 transition-all"
        />
        <div className="flex gap-3">
          <div className="flex-1">
            <label className="text-xs text-pink-200/50 mb-1.5 flex items-center gap-1">
              {LOAD_EMOJI[cognitiveLoad]} 认知负荷: {cognitiveLoad} ({LOAD_LABELS[cognitiveLoad]})
            </label>
            <input
              type="range"
              min={1}
              max={5}
              value={cognitiveLoad}
              onChange={(e) => setCognitiveLoad(Number(e.target.value))}
              className="w-full accent-fuchsia-500"
            />
          </div>
          <div className="w-28">
            <label className="text-xs text-pink-200/50 mb-1.5 block">
              ⏱ 预计: {estimatedMinutes}分钟
            </label>
            <input
              type="number"
              min={5}
              max={480}
              step={5}
              value={estimatedMinutes}
              onChange={(e) => setEstimatedMinutes(Number(e.target.value))}
              className="w-full bg-white/8 border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-fuchsia-400/50 transition-all"
            />
          </div>
        </div>
        <button
          onClick={handleAdd}
          className="w-full bg-gradient-to-r from-fuchsia-600 to-pink-600 hover:from-fuchsia-500 hover:to-pink-500 text-white rounded-xl py-2.5 text-sm font-semibold transition-all duration-200 hover:shadow-lg hover:shadow-fuchsia-500/25"
        >
          ✨ 添加任务
        </button>
      </div>

      {tasks.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-pink-200/60 flex items-center gap-1.5">
            📦 任务列表
          </h3>
          {tasks.map((task: Task) => (
            <div
              key={task.id}
              className="flex items-center justify-between bg-white/5 rounded-xl px-3 py-2.5 hover:bg-white/8 transition-all group"
            >
              <div className="flex-1">
                <div className="text-sm text-white font-medium">{task.title}</div>
                <div className="text-xs text-pink-200/40 mt-0.5">
                  {LOAD_EMOJI[task.cognitiveLoad]} 负荷 {task.cognitiveLoad}/5 · {task.estimatedMinutes}分钟
                </div>
              </div>
              <button
                onClick={() => removeTask(task.id)}
                className="text-red-400/60 hover:text-red-300 text-xs ml-2 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                删除
              </button>
            </div>
          ))}
        </div>
      )}

      {sortedSchedule.length > 0 && (
        <div className="space-y-2 mt-6">
          <h3 className="text-sm font-semibold text-pink-200/60 flex items-center gap-1.5">
            🗓 智能排程（按时间排序）
          </h3>
          {sortedSchedule.map((item: ScheduledItem, idx: number) => {
            const style = ZONE_STYLE[item.zone];
            return (
              <div
                key={idx}
                className={`rounded-xl px-4 py-2.5 border-l-4 ${style.bg} ${style.border} transition-all hover:scale-[1.01]`}
              >
                <div className="text-sm text-white font-medium">{item.task.title}</div>
                <div className="text-xs text-pink-200/50 mt-0.5">
                  {item.startHour.toString().padStart(2, '0')}:
                  {item.startMinute.toString().padStart(2, '0')} —{' '}
                  {item.endHour.toString().padStart(2, '0')}:
                  {item.endMinute.toString().padStart(2, '0')}
                  {' · '}
                  {style.emoji} {style.label}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
