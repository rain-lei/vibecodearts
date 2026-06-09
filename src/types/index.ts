export interface EnergyLog {
  id: string;
  timestamp: number;
  hourOfDay: number;
  energyLevel: number;
}

export interface Task {
  id: string;
  title: string;
  cognitiveLoad: number;
  estimatedMinutes: number;
}

export interface EnergyCurvePoint {
  hour: number;
  predictedEnergy: number;
}

export interface ScheduledItem {
  task: Task;
  startHour: number;
  startMinute: number;
  endHour: number;
  endMinute: number;
  zone: 'peak' | 'valley' | 'neutral';
}
