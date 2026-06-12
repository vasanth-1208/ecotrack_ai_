'use client';

import {
  Cell,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

type TrendPoint = {
  name: string;
  emissions: number;
  type: string;
};

type PiePoint = {
  name: string;
  value: number;
  color: string;
};

type DashboardChartsProps = {
  trendData: TrendPoint[];
  lineData: TrendPoint[];
  forecastData: TrendPoint[];
  pieData: PiePoint[];
};

export default function DashboardCharts({ trendData, lineData, forecastData, pieData }: DashboardChartsProps) {
  return (
    <>
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm p-6">
        <h3 className="font-bold text-slate-900 dark:text-white mb-4">Carbon Emission Forecasts & Trends</h3>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trendData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.1} />
              <XAxis dataKey="name" stroke="#64748B" fontSize={11} />
              <YAxis stroke="#64748B" fontSize={11} label={{ value: 'kg CO₂', angle: -90, position: 'insideLeft' }} />
              <Tooltip
                contentStyle={{ backgroundColor: '#1E293B', border: 'none', borderRadius: '8px', color: '#FFF', fontSize: '12px' }}
                labelStyle={{ fontWeight: 'bold' }}
              />
              <Legend wrapperStyle={{ fontSize: '11px', fontWeight: 'semibold' }} />
              <Line name="Footprint History" type="monotone" dataKey="emissions" data={lineData} stroke="#10B981" strokeWidth={3} activeDot={{ r: 8 }} />
              <Line name="AI Prediction" type="monotone" dataKey="emissions" data={forecastData} stroke="#EF4444" strokeWidth={2} strokeDasharray="5 5" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm p-6">
        <h3 className="font-bold text-slate-900 dark:text-white mb-4">Emissions Category Breakdown</h3>
        <div className="h-64 flex items-center justify-center">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={5}
                dataKey="value"
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ fontSize: '12px' }} />
              <Legend layout="vertical" align="right" verticalAlign="middle" wrapperStyle={{ fontSize: '11px' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </>
  );
}
