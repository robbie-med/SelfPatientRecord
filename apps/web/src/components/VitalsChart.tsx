import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import type { Vital } from '../api/client';
import { format, parseISO } from 'date-fns';

interface Props {
  data: Vital[];
  vitalType: string;
}

export default function VitalsChart({ data, vitalType }: Props) {
  if (!data.length) return <div className="text-sm text-gray-400 py-8 text-center">No data to chart.</div>;

  const sorted = [...data].sort((a, b) => a.recorded_at.localeCompare(b.recorded_at));
  const isBP = vitalType === 'blood_pressure';
  const unit = sorted[sorted.length - 1]?.unit ?? '';

  const chartData = sorted.map(v => {
    if (isBP) {
      const [sys, dia] = v.value.split('/').map(Number);
      return { date: v.recorded_at, systolic: sys || null, diastolic: dia || null };
    }
    return { date: v.recorded_at, value: parseFloat(v.value) || null };
  });

  const formatDate = (d: string) => { try { return format(parseISO(d), 'MMM d'); } catch { return d; } };
  const formatLabel = (d: string) => { try { return format(parseISO(d), 'MMM d, yyyy h:mm a'); } catch { return d; } };

  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={chartData} margin={{ top: 4, right: 16, left: -8, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={formatDate} />
        <YAxis tick={{ fontSize: 11 }} width={48} />
        <Tooltip
          labelFormatter={formatLabel}
          formatter={(val: number) => [`${val}${unit ? ' ' + unit : ''}`, '']}
        />
        <Legend />
        {isBP ? (
          <>
            <Line type="monotone" dataKey="systolic" stroke="#2563eb" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} name="Systolic (mmHg)" />
            <Line type="monotone" dataKey="diastolic" stroke="#16a34a" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} name="Diastolic (mmHg)" />
          </>
        ) : (
          <Line type="monotone" dataKey="value" stroke="#2563eb" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} name={unit || vitalType} />
        )}
      </LineChart>
    </ResponsiveContainer>
  );
}
