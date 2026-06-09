import type { EnergyLog, Task } from '../types';

function makeLog(daysAgo: number, hour: number, level: number): EnergyLog {
  const now = new Date();
  now.setDate(now.getDate() - daysAgo);
  now.setHours(hour, Math.floor(Math.random() * 60), 0, 0);
  return {
    id: `seed-${daysAgo}-${hour}-${level}`,
    timestamp: now.getTime(),
    hourOfDay: hour,
    energyLevel: level,
  };
}

export function generateSeedLogs(): EnergyLog[] {
  const logs: EnergyLog[] = [];

  // 模拟大学生的精力节律：早八困难 → 上午渐入 → 午后犯困 → 傍晚回血 → 深夜爆肝
  const dailyPattern: [number, number][] = [
    [0, 2], [1, 1], [2, 1], [3, 1], [4, 1], [5, 1],
    [6, 2], [7, 2], [8, 3], [9, 4], [10, 4],
    [11, 3], [12, 2], [13, 1], [14, 2], [15, 3],
    [16, 4], [17, 5], [18, 4], [19, 5], [20, 5],
    [21, 4], [22, 3], [23, 2],
  ];

  for (let day = 0; day < 7; day++) {
    for (const [hour, baseLevel] of dailyPattern) {
      const noise = Math.random() < 0.3 ? (Math.random() < 0.5 ? 1 : -1) : 0;
      const level = Math.max(1, Math.min(5, baseLevel + noise));
      if (Math.random() > 0.12) {
        logs.push(makeLog(day, hour, level));
      }
    }
  }

  return logs;
}

export function generateSeedTasks(): Task[] {
  return [
    { id: 'seed-task-1', title: '毕业论文开题报告', cognitiveLoad: 5, estimatedMinutes: 120 },
    { id: 'seed-task-2', title: '高数期末复习', cognitiveLoad: 5, estimatedMinutes: 90 },
    { id: 'seed-task-3', title: '数据结构大作业', cognitiveLoad: 4, estimatedMinutes: 90 },
    { id: 'seed-task-4', title: '英语演讲准备', cognitiveLoad: 4, estimatedMinutes: 60 },
    { id: 'seed-task-5', title: '实验报告撰写', cognitiveLoad: 3, estimatedMinutes: 45 },
    { id: 'seed-task-6', title: '小组讨论会议', cognitiveLoad: 3, estimatedMinutes: 30 },
    { id: 'seed-task-7', title: '整理课堂笔记', cognitiveLoad: 2, estimatedMinutes: 20 },
    { id: 'seed-task-8', title: '回复班级群消息', cognitiveLoad: 1, estimatedMinutes: 10 },
    { id: 'seed-task-9', title: '打印作业和资料', cognitiveLoad: 1, estimatedMinutes: 15 },
    { id: 'seed-task-10', title: '算法竞赛刷题', cognitiveLoad: 4, estimatedMinutes: 60 },
  ];
}
