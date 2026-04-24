import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ReferenceLine, ResponsiveContainer, Legend,
} from 'recharts';
import type { Lab } from '../api/client';
import { format, parseISO } from 'date-fns';

interface Props {
  data: Lab[];
  testName: string;
}

export default function LabChart({ data, testName }: Props) {
  if (!data.length) return <div className="text-sm text-gray-400 py-8 text-center">No data to chart.</div>;

  const sorted = [...data].sort((a, b) => a.collection_date.localeCompare(b.collection_date));

  const refLow = sorted.find(l => l.reference_range_low != null)?.reference_range_low;
  const refHigh = sorted.find(l => l.reference_range_high != null)?.reference_range_high;
  const unit = sorted[sorted.length - 1]?.unit ?? '';

  const chartData = sorted.map(l => ({
    date: l.collection_date,
    value: l.numeric_value ?? parseFloat(l.value),
    label: `${l.value}${unit ? ' ' + unit : ''}`,
    abnormal: l.interpretation && l.interpretation !== 'normal',
  }));

  const allValues = chartData.map(d => d.value).filter(v => !isNaN(v));
  const minVal = Math.min(...allValues, ...(refLow != null ? [refLow] : []));
  const maxVal = Math.max(...allValues, ...(refHigh != null ? [refHigh] : []));
  const padding = (maxVal - minVal) * 0.15 || 1;

  const dotFill = (entry: { abnormal?: boolean }) => entry.abnormal ? '#ef4444' : '#2563eb';

  return (
    <div>
      <div className="text-sm font-medium text-gray-700 mb-3">
        {testName}{unit ? ` (${unit})` : ''}
      </div>
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={chartData} margin={{ top: 4, right: 16, left: -8, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 11 }}
            tickFormatter={d => {
              try { return format(parseISO(d), 'MMM yy'); } catch { return d; }
            }}
          />
          <YAxis
            domain={[minVal - padding, maxVal + padding]}
            tick={{ fontSize: 11 }}
            width={48}
          />
          <Tooltip
            formatter={(val: number) => [`${val}${unit ? ' ' + unit : ''}`, testName]}
            labelFormatter={d => {
              try { return format(parseISO(String(d)), 'MMM d, yyyy'); } catch { return d; }
            }}
          />
          <Legend />
          {refLow != null && (
            <ReferenceLine y={refLow} stroke="#22c55e" strokeDasharray="4 4" label={{ value: 'Low', fontSize: 10, fill: '#22c55e' }} />
          )}
          {refHigh != null && (
            <ReferenceLine y={refHigh} stroke="#f59e0b" strokeDasharray="4 4" label={{ value: 'High', fontSize: 10, fill: '#f59e0b' }} />
          )}
          <Line
            type="monotone"
            dataKey="value"
            stroke="#2563eb"
            strokeWidth={2}
            dot={(props) => {
              const { cx, cy, payload } = props;
              return <circle key={`dot-${cx}-${cy}`} cx={cx} cy={cy} r={4} fill={dotFill(payload)} stroke="#fff" strokeWidth={1.5} />;
            }}
            activeDot={{ r: 6 }}
            name={testName}
          />
        </LineChart>
      </ResponsiveContainer>
      {(refLow != null || refHigh != null) && (
        <div className="flex gap-4 mt-2 text-xs text-gray-500">
          {refLow != null && <span className="text-green-600">▬ Lower limit: {refLow}</span>}
          {refHigh != null && <span className="text-amber-600">▬ Upper limit: {refHigh}</span>}
        </div>
      )}
    </div>
  );
}
