import { useQuery } from '@tanstack/react-query';
import { getLabExplainer, type LabExplainer as LabExplainerData } from '../api/client';
import clsx from 'clsx';

const COLOR_CLASSES: Record<string, string> = {
  green: 'bg-green-50 border-green-200 text-green-800',
  yellow: 'bg-amber-50 border-amber-200 text-amber-800',
  red: 'bg-red-50 border-red-200 text-red-800',
};

const DOT_CLASSES: Record<string, string> = {
  green: 'bg-green-500',
  yellow: 'bg-amber-400',
  red: 'bg-red-500',
};

export default function LabExplainer({ testName }: { testName: string }) {
  const { data, isLoading } = useQuery<LabExplainerData | null>({
    queryKey: ['lab-explain', testName],
    queryFn: () => getLabExplainer(testName),
    enabled: !!testName,
    staleTime: Infinity,
  });

  if (isLoading) {
    return <p className="text-xs text-gray-400 animate-pulse mt-2">Loading explainer…</p>;
  }

  if (!data) {
    return (
      <p className="text-xs text-gray-400 mt-2 italic">
        No plain-language explainer available for "{testName}" yet.
      </p>
    );
  }

  return (
    <div className="mt-4 bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-blue-900">{data.name}</h3>
        <p className="text-xs text-blue-700 mt-1 leading-relaxed">{data.what_it_measures}</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white rounded-lg border border-blue-100 px-3 py-2">
          <div className="text-xs font-medium text-gray-500 mb-0.5">Normal Range</div>
          <div className="text-sm font-semibold text-gray-900">{data.normal_range}</div>
          {data.unit && <div className="text-xs text-gray-400">{data.unit}</div>}
        </div>
        <div className="bg-white rounded-lg border border-blue-100 px-3 py-2">
          <div className="text-xs font-medium text-gray-500 mb-0.5">Fasting Required?</div>
          <div className={clsx('text-sm font-semibold', data.fasting_required ? 'text-amber-700' : 'text-green-700')}>
            {data.fasting_required ? 'Yes — fast 8–12 hours' : 'No fasting needed'}
          </div>
        </div>
      </div>

      {data.categories.length > 0 && (
        <div>
          <div className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">What the values mean</div>
          <div className="space-y-1.5">
            {data.categories.map((cat, i) => (
              <div key={i} className={clsx('border rounded-lg px-3 py-2 flex gap-2 items-start', COLOR_CLASSES[cat.color] ?? 'bg-gray-50 border-gray-200 text-gray-800')}>
                <span className={clsx('mt-1.5 w-2 h-2 rounded-full shrink-0', DOT_CLASSES[cat.color] ?? 'bg-gray-400')} />
                <div>
                  <span className="text-xs font-semibold">{cat.label}</span>
                  <span className="text-xs opacity-75 ml-1">({cat.range})</span>
                  <p className="text-xs mt-0.5 leading-snug">{cat.meaning}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-2">
        <div>
          <div className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">Why it's ordered</div>
          <p className="text-xs text-gray-700 leading-relaxed">{data.why_ordered}</p>
        </div>
        <div className="bg-white border border-blue-100 rounded-lg px-3 py-2">
          <div className="text-xs font-semibold text-blue-700 mb-0.5">💡 Tip</div>
          <p className="text-xs text-gray-700 leading-relaxed">{data.tips}</p>
        </div>
      </div>
    </div>
  );
}
