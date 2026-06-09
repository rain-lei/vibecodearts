import type { EnergyLog, EnergyCurvePoint, Task, ScheduledItem } from '../types';

/**
 * 算法1: 精力曲线拟合
 *
 * 1. 收集过去7天的 EnergyLog
 * 2. 将24小时划分为24个桶
 * 3. 每个桶内计算加权平均值（指数衰减权重，越近权重越高）
 * 4. 移动平均平滑处理，消除突变折角
 */
export function generateEnergyCurve(logs: EnergyLog[]): EnergyCurvePoint[] {
  const now = Date.now();
  const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
  const HALF_LIFE_MS = 2 * 24 * 60 * 60 * 1000;

  const recentLogs = logs.filter((log) => now - log.timestamp <= SEVEN_DAYS_MS);

  // 24个桶：每个桶收集 { weightedSum, weightSum }
  const buckets: { weightedSum: number; weightSum: number }[] = Array.from(
    { length: 24 },
    () => ({ weightedSum: 0, weightSum: 0 })
  );

  for (const log of recentLogs) {
    const ageMs = now - log.timestamp;
    // 指数衰减权重: w = 2^(-age / halfLife)
    const weight = Math.pow(2, -ageMs / HALF_LIFE_MS);
    buckets[log.hourOfDay].weightedSum += log.energyLevel * weight;
    buckets[log.hourOfDay].weightSum += weight;
  }

  // 计算每个桶的加权平均值，无数据桶用相邻桶插值或默认3.0
  const raw: number[] = buckets.map((b) =>
    b.weightSum > 0 ? b.weightedSum / b.weightSum : -1
  );

  // 对无数据桶进行线性插值填充
  const filled = interpolateMissing(raw);

  // 移动平均平滑（窗口大小5，循环边界）
  const smoothed = movingAverageSmooth(filled, 5);

  return smoothed.map((predictedEnergy, hour) => ({
    hour,
    predictedEnergy: Math.round(predictedEnergy * 100) / 100,
  }));
}

/**
 * 对缺失值（-1）进行线性插值
 * 找到左右最近的已知值，线性插值；若一侧无已知值，用另一侧的值；两侧都无则默认3.0
 */
function interpolateMissing(raw: number[]): number[] {
  const result = [...raw];
  const knownIndices = result
    .map((v, i) => (v >= 0 ? i : -1))
    .filter((i) => i >= 0);

  if (knownIndices.length === 0) {
    return Array.from({ length: 24 }, () => 3.0);
  }

  for (let i = 0; i < 24; i++) {
    if (result[i] >= 0) continue;

    // 找左侧最近已知值（循环）
    let leftIdx = -1;
    for (let d = 1; d < 24; d++) {
      const idx = ((i - d) % 24 + 24) % 24;
      if (result[idx] >= 0) {
        leftIdx = idx;
        break;
      }
    }

    // 找右侧最近已知值（循环）
    let rightIdx = -1;
    for (let d = 1; d < 24; d++) {
      const idx = (i + d) % 24;
      if (result[idx] >= 0) {
        rightIdx = idx;
        break;
      }
    }

    if (leftIdx >= 0 && rightIdx >= 0) {
      const dist = ((rightIdx - leftIdx) % 24 + 24) % 24;
      const pos = ((i - leftIdx) % 24 + 24) % 24;
      const t = dist === 0 ? 0 : pos / dist;
      result[i] = result[leftIdx] + t * (result[rightIdx] - result[leftIdx]);
    } else if (leftIdx >= 0) {
      result[i] = result[leftIdx];
    } else if (rightIdx >= 0) {
      result[i] = result[rightIdx];
    } else {
      result[i] = 3.0;
    }
  }

  return result;
}

/**
 * 移动平均平滑（循环边界）
 * 窗口大小为 windowSize（奇数），每个点取前后 (windowSize-1)/2 个邻居的平均
 */
function movingAverageSmooth(data: number[], windowSize: number): number[] {
  const half = Math.floor(windowSize / 2);
  return data.map((_, i) => {
    let sum = 0;
    let count = 0;
    for (let d = -half; d <= half; d++) {
      const idx = ((i + d) % 24 + 24) % 24;
      sum += data[idx];
      count++;
    }
    return sum / count;
  });
}

/**
 * 算法2: 智能任务调度
 *
 * 1. 识别波峰（predictedEnergy >= 3.5）和波谷（predictedEnergy < 2.5）时间段
 * 2. 高认知负荷任务(cognitiveLoad >= 4)优先排入波峰
 * 3. 低认知负荷任务(cognitiveLoad <= 2)排入波谷
 * 4. 中等任务排入剩余可用时段
 * 5. 考虑 estimatedMinutes 不超出时段容量
 */
export function scheduleTasks(
  tasks: Task[],
  curve: EnergyCurvePoint[]
): ScheduledItem[] {
  const schedule: ScheduledItem[] = [];

  // 识别波峰和波谷时段
  const peakHours = curve
    .filter((p) => p.predictedEnergy >= 3.5)
    .map((p) => p.hour);
  const valleyHours = curve
    .filter((p) => p.predictedEnergy < 2.5)
    .map((p) => p.hour);

  // 每小时的剩余可用分钟数（初始60分钟）
  const hourCapacity: number[] = Array.from({ length: 24 }, () => 60);

  // 按认知负荷降序排列任务（高难度优先调度）
  const sortedTasks = [...tasks].sort(
    (a, b) => b.cognitiveLoad - a.cognitiveLoad
  );

  for (const task of sortedTasks) {
    const preferredHours =
      task.cognitiveLoad >= 4
        ? peakHours
        : task.cognitiveLoad <= 2
          ? valleyHours
          : Array.from({ length: 24 }, (_, i) => i);

    const placed = tryPlaceTask(task, preferredHours, hourCapacity, curve);
    if (placed) {
      schedule.push(placed);
    } else {
      // 回退：尝试任意时段
      const fallbackHours = Array.from({ length: 24 }, (_, i) => i);
      const fallbackPlaced = tryPlaceTask(
        task,
        fallbackHours,
        hourCapacity,
        curve
      );
      if (fallbackPlaced) {
        schedule.push(fallbackPlaced);
      }
    }
  }

  return schedule;
}

function tryPlaceTask(
  task: Task,
  preferredHours: number[],
  hourCapacity: number[],
  curve: EnergyCurvePoint[]
): ScheduledItem | null {
  // 按该时段的精力值降序排列优先时段（高精力优先）
  const sortedHours = [...preferredHours].sort((a, b) => {
    const ea = curve[a]?.predictedEnergy ?? 0;
    const eb = curve[b]?.predictedEnergy ?? 0;
    return eb - ea;
  });

  for (const hour of sortedHours) {
    if (hourCapacity[hour] >= task.estimatedMinutes) {
      const startMinute = 60 - hourCapacity[hour];
      const totalMinutes = startMinute + task.estimatedMinutes;
      const endHour = hour + Math.floor(totalMinutes / 60);
      const endMinute = totalMinutes % 60;

      hourCapacity[hour] -= task.estimatedMinutes;

      const energy = curve[hour]?.predictedEnergy ?? 3;
      const zone: ScheduledItem['zone'] =
        energy >= 3.5 ? 'peak' : energy < 2.5 ? 'valley' : 'neutral';

      return {
        task,
        startHour: hour,
        startMinute,
        endHour: endHour % 24,
        endMinute,
        zone,
      };
    }
  }

  // 跨小时放置：尝试连续多个时段
  for (let startHour of sortedHours) {
    let remaining = task.estimatedMinutes;
    let currentHour = startHour;
    let canFit = true;
    const hoursNeeded: number[] = [];

    while (remaining > 0 && canFit) {
      if (currentHour >= 24 || hourCapacity[currentHour % 24] <= 0) {
        canFit = false;
        break;
      }
      const take = Math.min(remaining, hourCapacity[currentHour % 24]);
      hoursNeeded.push(currentHour % 24);
      remaining -= take;
      currentHour++;
      if (currentHour - startHour > 4) {
        canFit = false;
      }
    }

    if (canFit && remaining <= 0) {
      const startMinute = 60 - hourCapacity[startHour];
      hourCapacity[startHour] -= Math.min(
        task.estimatedMinutes,
        hourCapacity[startHour]
      );

      let left = task.estimatedMinutes - hourCapacity[startHour];
      for (let h = startHour + 1; left > 0; h++) {
        const take = Math.min(left, hourCapacity[h % 24]);
        hourCapacity[h % 24] -= take;
        left -= take;
      }

      const energy = curve[startHour]?.predictedEnergy ?? 3;
      const zone: ScheduledItem['zone'] =
        energy >= 3.5 ? 'peak' : energy < 2.5 ? 'valley' : 'neutral';

      const totalEnd = startMinute + task.estimatedMinutes;
      return {
        task,
        startHour: startHour,
        startMinute,
        endHour: (startHour + Math.floor(totalEnd / 60)) % 24,
        endMinute: totalEnd % 60,
        zone,
      };
    }
  }

  return null;
}

/**
 * 获取当前小时对应的预测精力值
 */
export function getCurrentEnergy(curve: EnergyCurvePoint[]): number {
  const currentHour = new Date().getHours();
  return curve[currentHour]?.predictedEnergy ?? 3.0;
}
