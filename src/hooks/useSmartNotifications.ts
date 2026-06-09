import { useEffect, useRef, useCallback } from 'react';
import { useChronoFlowStore } from '../store/useChronoFlowStore';
import { getCurrentEnergy } from '../utils/algorithms';

interface UseSmartNotificationsOptions {
  checkIntervalMs?: number;
  peakThreshold?: number;
  valleyThreshold?: number;
}

export function useSmartNotifications(options: UseSmartNotificationsOptions = {}) {
  const { checkIntervalMs = 60_000, peakThreshold = 3.5 } = options;
  const tasks = useChronoFlowStore((s) => s.tasks);
  const getEnergyCurve = useChronoFlowStore((s) => s.getEnergyCurve);
  const lastNotifiedRef = useRef<number>(0);
  const workerRef = useRef<Worker | null>(null);

  const requestPermission = useCallback(async () => {
    if (!('Notification' in window)) return false;
    if (Notification.permission === 'granted') return true;
    if (Notification.permission === 'denied') return false;
    const result = await Notification.requestPermission();
    return result === 'granted';
  }, []);

  const checkAndNotify = useCallback(() => {
    if (Notification.permission !== 'granted') return;

    const curve = getEnergyCurve();
    const currentEnergy = getCurrentEnergy(curve);
    const now = Date.now();

    // 防止频繁通知：至少间隔5分钟
    if (now - lastNotifiedRef.current < 5 * 60 * 1000) return;

    if (currentEnergy >= peakThreshold) {
      const highLoadTasks = tasks.filter((t) => t.cognitiveLoad >= 4);
      if (highLoadTasks.length > 0) {
        lastNotifiedRef.current = now;
        new Notification('ChronoFlow: 精力波峰提醒', {
          body: `当前精力充沛(${currentEnergy.toFixed(1)})，有 ${highLoadTasks.length} 个高难度任务等待处理: ${highLoadTasks[0].title}`,
          icon: '/vite.svg',
          tag: 'chronoflow-peak',
        });
      }
    }
  }, [tasks, getEnergyCurve, peakThreshold]);

  useEffect(() => {
    requestPermission();

    // 使用 Web Worker 实现后台保活定时器
    // Worker 代码内联为 Blob，避免浏览器后台休眠导致 setInterval 不准
    const workerCode = `
      let intervalId = null;
      self.onmessage = function(e) {
        if (e.data.type === 'start') {
          const ms = e.data.interval || 60000;
          intervalId = setInterval(() => {
            self.postMessage({ type: 'tick' });
          }, ms);
        } else if (e.data.type === 'stop') {
          if (intervalId) clearInterval(intervalId);
          intervalId = null;
        }
      };
    `;

    try {
      const blob = new Blob([workerCode], { type: 'application/javascript' });
      const workerUrl = URL.createObjectURL(blob);
      const worker = new Worker(workerUrl);
      workerRef.current = worker;

      worker.onmessage = (e: MessageEvent) => {
        if (e.data.type === 'tick') {
          checkAndNotify();
        }
      };

      worker.postMessage({ type: 'start', interval: checkIntervalMs });
      URL.revokeObjectURL(workerUrl);
    } catch {
      // Worker 创建失败时回退到 requestAnimationFrame 方案
      let lastCheck = Date.now();
      const rafLoop = () => {
        const now = Date.now();
        if (now - lastCheck >= checkIntervalMs) {
          lastCheck = now;
          checkAndNotify();
        }
        rafId = requestAnimationFrame(rafLoop);
      };
      let rafId = requestAnimationFrame(rafLoop);

      return () => cancelAnimationFrame(rafId);
    }

    return () => {
      workerRef.current?.postMessage({ type: 'stop' });
      workerRef.current?.terminate();
      workerRef.current = null;
    };
  }, [checkIntervalMs, checkAndNotify, requestPermission]);
}
