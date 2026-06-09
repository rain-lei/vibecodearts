import { describe, it, expect } from 'vitest';
import { generateEnergyCurve, scheduleTasks, getCurrentEnergy } from '../utils/algorithms';
import type { EnergyLog, Task, EnergyCurvePoint } from '../types';

function makeLog(hoursAgo: number, hourOfDay: number, level: number): EnergyLog {
  const timestamp = Date.now() - hoursAgo * 60 * 60 * 1000;
  return { id: `${hourOfDay}-${hoursAgo}`, timestamp, hourOfDay, energyLevel: level };
}

describe('generateEnergyCurve', () => {
  it('无数据时返回24个默认值为3.0的点', () => {
    const curve = generateEnergyCurve([]);
    expect(curve).toHaveLength(24);
    curve.forEach((p) => {
      expect(p.predictedEnergy).toBe(3.0);
    });
  });

  it('单条记录时，对应小时桶值接近该记录的 energyLevel', () => {
    const logs = [makeLog(1, 14, 5)];
    const curve = generateEnergyCurve(logs);
    expect(curve[14].predictedEnergy).toBeGreaterThan(4.5);
    expect(curve[14].predictedEnergy).toBeLessThanOrEqual(5);
  });

  it('近期记录权重高于远期记录（指数衰减）', () => {
    const recent = makeLog(1, 9, 5);
    const old = makeLog(168, 9, 1);
    const curveRecent = generateEnergyCurve([recent]);
    const curveOld = generateEnergyCurve([old]);
    expect(curveRecent[9].predictedEnergy).toBeGreaterThan(curveOld[9].predictedEnergy);
  });

  it('同一小时多条记录取加权平均', () => {
    const logs = [makeLog(2, 10, 1), makeLog(1, 10, 5)];
    const curve = generateEnergyCurve(logs);
    expect(curve[10].predictedEnergy).toBeGreaterThan(1);
    expect(curve[10].predictedEnergy).toBeLessThan(5);
  });

  it('平滑处理后无突变折角（相邻小时差值 < 1.5）', () => {
    const logs = [
      makeLog(1, 8, 5),
      makeLog(1, 9, 1),
      makeLog(1, 10, 5),
      makeLog(1, 11, 1),
      makeLog(1, 12, 5),
    ];
    const curve = generateEnergyCurve(logs);
    for (let i = 1; i < 24; i++) {
      const diff = Math.abs(curve[i].predictedEnergy - curve[i - 1].predictedEnergy);
      expect(diff).toBeLessThan(1.5);
    }
  });

  it('超过7天的记录被过滤', () => {
    const oldLog = makeLog(200, 14, 1);
    const curve = generateEnergyCurve([oldLog]);
    expect(curve[14].predictedEnergy).toBe(3.0);
  });

  it('输出包含0-23所有小时', () => {
    const logs = [makeLog(1, 3, 4), makeLog(2, 15, 2)];
    const curve = generateEnergyCurve(logs);
    expect(curve.map((p) => p.hour)).toEqual(
      Array.from({ length: 24 }, (_, i) => i)
    );
  });
});

describe('scheduleTasks', () => {
  const curve: EnergyCurvePoint[] = Array.from({ length: 24 }, (_, i) => ({
    hour: i,
    predictedEnergy: i >= 9 && i <= 11 ? 4.0 : i >= 14 && i <= 16 ? 1.5 : 3.0,
  }));

  it('高认知负荷任务排入波峰时段', () => {
    const tasks: Task[] = [
      { id: 't1', title: '写架构', cognitiveLoad: 5, estimatedMinutes: 60 },
    ];
    const schedule = scheduleTasks(tasks, curve);
    expect(schedule).toHaveLength(1);
    expect(schedule[0].zone).toBe('peak');
    expect(schedule[0].startHour).toBeGreaterThanOrEqual(9);
    expect(schedule[0].startHour).toBeLessThanOrEqual(11);
  });

  it('低认知负荷任务排入波谷时段', () => {
    const tasks: Task[] = [
      { id: 't2', title: '回邮件', cognitiveLoad: 1, estimatedMinutes: 30 },
    ];
    const schedule = scheduleTasks(tasks, curve);
    expect(schedule).toHaveLength(1);
    expect(schedule[0].zone).toBe('valley');
    expect(schedule[0].startHour).toBeGreaterThanOrEqual(14);
    expect(schedule[0].startHour).toBeLessThanOrEqual(16);
  });

  it('中等认知负荷任务排入中性时段（无波峰波谷时）', () => {
    const neutralCurve: EnergyCurvePoint[] = Array.from({ length: 24 }, (_, i) => ({
      hour: i,
      predictedEnergy: 3.0,
    }));
    const tasks: Task[] = [
      { id: 't3', title: '常规开发', cognitiveLoad: 3, estimatedMinutes: 45 },
    ];
    const schedule = scheduleTasks(tasks, neutralCurve);
    expect(schedule).toHaveLength(1);
    expect(schedule[0].zone).toBe('neutral');
  });

  it('多个任务按认知负荷降序调度', () => {
    const tasks: Task[] = [
      { id: 'low', title: '回邮件', cognitiveLoad: 1, estimatedMinutes: 30 },
      { id: 'high', title: '写架构', cognitiveLoad: 5, estimatedMinutes: 60 },
    ];
    const schedule = scheduleTasks(tasks, curve);
    const highItem = schedule.find((s) => s.task.id === 'high');
    const lowItem = schedule.find((s) => s.task.id === 'low');
    expect(highItem?.zone).toBe('peak');
    expect(lowItem?.zone).toBe('valley');
  });

  it('波峰时段容量不足时回退到其他时段', () => {
    const tasks: Task[] = [
      { id: 't1', title: '架构1', cognitiveLoad: 5, estimatedMinutes: 60 },
      { id: 't2', title: '架构2', cognitiveLoad: 5, estimatedMinutes: 60 },
      { id: 't3', title: '架构3', cognitiveLoad: 5, estimatedMinutes: 60 },
      { id: 't4', title: '架构4', cognitiveLoad: 5, estimatedMinutes: 60 },
    ];
    const schedule = scheduleTasks(tasks, curve);
    expect(schedule).toHaveLength(4);
  });

  it('空任务列表返回空排程', () => {
    const schedule = scheduleTasks([], curve);
    expect(schedule).toHaveLength(0);
  });

  it('任务时间可跨小时放置', () => {
    const tasks: Task[] = [
      { id: 't1', title: '大型任务', cognitiveLoad: 5, estimatedMinutes: 120 },
    ];
    const schedule = scheduleTasks(tasks, curve);
    expect(schedule).toHaveLength(1);
    expect(schedule[0].task.estimatedMinutes).toBe(120);
  });
});

describe('getCurrentEnergy', () => {
  it('返回当前小时对应的预测精力值', () => {
    const curve: EnergyCurvePoint[] = Array.from({ length: 24 }, (_, i) => ({
      hour: i,
      predictedEnergy: i < 12 ? 4.0 : 2.0,
    }));
    const energy = getCurrentEnergy(curve);
    const currentHour = new Date().getHours();
    const expected = currentHour < 12 ? 4.0 : 2.0;
    expect(energy).toBe(expected);
  });

  it('空曲线返回默认值3.0', () => {
    const energy = getCurrentEnergy([]);
    expect(energy).toBe(3.0);
  });
});
