import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';
import type { EnergyLog, Task, EnergyCurvePoint, ScheduledItem } from '../types';
import { generateEnergyCurve, scheduleTasks } from '../utils/algorithms';

interface ChronoFlowState {
  logs: EnergyLog[];
  tasks: Task[];

  addLog: (level: number) => void;
  removeLog: (id: string) => void;

  addTask: (task: Omit<Task, 'id'>) => void;
  removeTask: (id: string) => void;

  getEnergyCurve: () => EnergyCurvePoint[];
  getSchedule: () => ScheduledItem[];
}

export const useChronoFlowStore = create<ChronoFlowState>()(
  persist(
    (set, get) => ({
      logs: [],
      tasks: [],

      addLog: (level: number) => {
        const now = Date.now();
        const hourOfDay = new Date(now).getHours();
        const newLog: EnergyLog = {
          id: uuidv4(),
          timestamp: now,
          hourOfDay,
          energyLevel: level,
        };
        set((state) => ({ logs: [...state.logs, newLog] }));
      },

      removeLog: (id: string) => {
        set((state) => ({ logs: state.logs.filter((l) => l.id !== id) }));
      },

      addTask: (task: Omit<Task, 'id'>) => {
        const newTask: Task = { id: uuidv4(), ...task };
        set((state) => ({ tasks: [...state.tasks, newTask] }));
      },

      removeTask: (id: string) => {
        set((state) => ({ tasks: state.tasks.filter((t) => t.id !== id) }));
      },

      getEnergyCurve: () => {
        return generateEnergyCurve(get().logs);
      },

      getSchedule: () => {
        const curve = generateEnergyCurve(get().logs);
        return scheduleTasks(get().tasks, curve);
      },
    }),
    {
      name: 'chronoflow-storage',
    }
  )
);
