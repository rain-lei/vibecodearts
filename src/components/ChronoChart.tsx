import { useMemo } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from 'recharts';
import { useChronoFlowStore } from '../store/useChronoFlowStore';

interface ChartDataPoint {
  hour: number;
  label: string;
  predictedEnergy: number;
  zone: 'peak' | 'valley' | 'neutral';
}

export function ChronoChart() {
  const logs = useChronoFlowStore((s) => s.logs);
  const curve = useChronoFlowStore((s) => s.getEnergyCurve)();

  const chartData: ChartDataPoint[] = useMemo(() => {
    return curve.map((point) => ({
      hour: point.hour,
      label: `${point.hour.toString().padStart(2, '0')}:00`,
      predictedEnergy: point.predictedEnergy,
      zone:
        point.predictedEnergy >= 3.5
          ? 'peak'
          : point.predictedEnergy < 2.5
            ? 'valley'
            : 'neutral',
    }));
  }, [curve]);

  const peakData = chartData.map((d) => ({
    ...d,
    value: d.zone === 'peak' ? d.predictedEnergy : 0,
  }));

  const valleyData = chartData.map((d) => ({
    ...d,
    value: d.zone === 'valley' ? d.predictedEnergy : 0,
  }));

  if (logs.length === 0) {
    return (
      <div className="glass-card p-6 transition-all duration-300">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-xl">📈</span>
          <h2 className="text-lg font-bold text-white">精力曲线</h2>
        </div>
        <div className="text-pink-200/40 text-sm py-12 text-center">
          暂无打卡数据，请先记录精力状态
        </div>
      </div>
    );
  }

  return (
    <div className="glass-card p-6 transition-all duration-300">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-xl">📈</span>
        <h2 className="text-lg font-bold text-white">精力曲线</h2>
      </div>
      <p className="text-xs text-pink-200/40 mb-4 ml-8">
        <span className="inline-block w-2 h-2 rounded-full bg-cyan-400 mr-1" />
        波峰（高精力）
        <span className="mx-2">·</span>
        <span className="inline-block w-2 h-2 rounded-full bg-rose-400 mr-1" />
        波谷（低精力）
        <span className="mx-2">·</span>
        <span className="inline-block w-2 h-2 rounded-full bg-violet-400 mr-1" />
        中性
      </p>
      <ResponsiveContainer width="100%" height={300}>
        <AreaChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
          <defs>
            <linearGradient id="peakGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.5} />
              <stop offset="95%" stopColor="#22d3ee" stopOpacity={0.02} />
            </linearGradient>
            <linearGradient id="valleyGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#fb7185" stopOpacity={0.5} />
              <stop offset="95%" stopColor="#fb7185" stopOpacity={0.02} />
            </linearGradient>
            <linearGradient id="neutralGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#a78bfa" stopOpacity={0.4} />
              <stop offset="95%" stopColor="#a78bfa" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
          <XAxis
            dataKey="label"
            tick={{ fill: 'rgba(255,200,230,0.4)', fontSize: 11 }}
            axisLine={{ stroke: 'rgba(255,255,255,0.08)' }}
          />
          <YAxis
            domain={[0, 5]}
            ticks={[1, 2, 3, 4, 5]}
            tick={{ fill: 'rgba(255,200,230,0.4)', fontSize: 11 }}
            axisLine={{ stroke: 'rgba(255,255,255,0.08)' }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'rgba(30,10,40,0.92)',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: '12px',
              color: '#f0e0f0',
              fontSize: '12px',
              boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
            }}
            formatter={(value: number) => [value.toFixed(2), '预测精力']}
            labelFormatter={(label: string) => `⏰ ${label}`}
          />
          <ReferenceLine y={3.5} stroke="#22d3ee" strokeDasharray="6 3" strokeOpacity={0.4} />
          <ReferenceLine y={2.5} stroke="#fb7185" strokeDasharray="6 3" strokeOpacity={0.4} />
          <Area
            type="monotone"
            dataKey="predictedEnergy"
            stroke="#a78bfa"
            strokeWidth={2.5}
            fill="url(#neutralGrad)"
          />
          <Area
            type="monotone"
            data={peakData}
            dataKey="value"
            stroke="#22d3ee"
            strokeWidth={0}
            fill="url(#peakGrad)"
          />
          <Area
            type="monotone"
            data={valleyData}
            dataKey="value"
            stroke="#fb7185"
            strokeWidth={0}
            fill="url(#valleyGrad)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
