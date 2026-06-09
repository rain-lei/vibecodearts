import { describe, it, expect, beforeEach } from 'vitest';
import { useChronoFlowStore } from '../store/useChronoFlowStore';

beforeEach(() => {
  useChronoFlowStore.setState({ logs: [], tasks: [] });
});

describe('useChronoFlowStore', () => {
  it('初始状态为空', () => {
    const state = useChronoFlowStore.getState();
    expect(state.logs).toHaveLength(0);
    expect(state.tasks).toHaveLength(0);
  });

  it('addLog 添加精力记录', () => {
    useChronoFlowStore.getState().addLog(4);
    const state = useChronoFlowStore.getState();
    expect(state.logs).toHaveLength(1);
    expect(state.logs[0].energyLevel).toBe(4);
    expect(state.logs[0].hourOfDay).toBe(new Date().getHours());
  });

  it('addLog 多次打卡累加', () => {
    useChronoFlowStore.getState().addLog(3);
    useChronoFlowStore.getState().addLog(5);
    expect(useChronoFlowStore.getState().logs).toHaveLength(2);
  });

  it('removeLog 删除指定记录', () => {
    useChronoFlowStore.getState().addLog(2);
    const { id } = useChronoFlowStore.getState().logs[0];
    useChronoFlowStore.getState().removeLog(id);
    expect(useChronoFlowStore.getState().logs).toHaveLength(0);
  });

  it('addTask 添加任务', () => {
    useChronoFlowStore.getState().addTask({
      title: '写架构设计',
      cognitiveLoad: 5,
      estimatedMinutes: 120,
    });
    const state = useChronoFlowStore.getState();
    expect(state.tasks).toHaveLength(1);
    expect(state.tasks[0].title).toBe('写架构设计');
    expect(state.tasks[0].cognitiveLoad).toBe(5);
    expect(state.tasks[0].estimatedMinutes).toBe(120);
  });

  it('removeTask 删除指定任务', () => {
    useChronoFlowStore.getState().addTask({
      title: '回邮件',
      cognitiveLoad: 1,
      estimatedMinutes: 15,
    });
    const { id } = useChronoFlowStore.getState().tasks[0];
    useChronoFlowStore.getState().removeTask(id);
    expect(useChronoFlowStore.getState().tasks).toHaveLength(0);
  });

  it('getEnergyCurve 无数据时返回24个默认点', () => {
    const curve = useChronoFlowStore.getState().getEnergyCurve();
    expect(curve).toHaveLength(24);
    curve.forEach((p) => expect(p.predictedEnergy).toBe(3.0));
  });

  it('getEnergyCurve 有数据时返回拟合曲线', () => {
    useChronoFlowStore.getState().addLog(5);
    const curve = useChronoFlowStore.getState().getEnergyCurve();
    expect(curve).toHaveLength(24);
    const currentHour = new Date().getHours();
    expect(curve[currentHour].predictedEnergy).toBeGreaterThan(3.0);
  });

  it('getSchedule 返回排程结果', () => {
    useChronoFlowStore.getState().addLog(5);
    useChronoFlowStore.getState().addTask({
      title: '写架构',
      cognitiveLoad: 5,
      estimatedMinutes: 60,
    });
    const schedule = useChronoFlowStore.getState().getSchedule();
    expect(schedule).toHaveLength(1);
    expect(schedule[0].task.title).toBe('写架构');
  });
});
