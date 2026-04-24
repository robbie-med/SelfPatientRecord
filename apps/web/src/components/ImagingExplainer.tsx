import { useQuery } from '@tanstack/react-query';
import { getImagingExplainer, type ImagingExplainer as ImagingExplainerData } from '../api/client';
import clsx from 'clsx';

const SEVERITY_BADGE: Record<string, string> = {
  low: 'bg-green-100 text-green-800',
  moderate: 'bg-amber-100 text-amber-800',
  high: 'bg-red-100 text-red-800',
  varies: 'bg-gray-100 text-gray-700',
};

const SEVERITY_LABEL: Record<string, string> = {
  low: 'Usually benign',
  moderate: 'Needs follow-up',
  high: 'Seek evaluation',
  varies: 'Context-dependent',
};

export default function ImagingExplainer({ term }: { term: string }) {
  const { data, isLoading } = useQuery<ImagingExplainerData | null>({
    queryKey: ['imaging-explain', term],
    queryFn: () => getImagingExplainer(term),
    enabled: !!term,
    staleTime: Infinity,
  });

  if (isLoading) return <p className="text-xs text-gray-400 animate-pulse mt-2">Looking up term…</p>;

  if (!data) {
    return (
      <p className="text-xs text-gray-400 mt-2 italic">
        No explainer found for "{term}". Try a different term from the report.
      </p>
    );
  }

  return (
    <div className="mt-3 bg-indigo-50 border border-indigo-200 rounded-xl p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-sm font-semibold text-indigo-900">{data.name}</h3>
        <span className={clsx('text-xs px-2 py-0.5 rounded-full shrink-0', SEVERITY_BADGE[data.severity] ?? 'bg-gray-100 text-gray-700')}>
          {SEVERITY_LABEL[data.severity] ?? data.severity}
        </span>
      </div>

      <p className="text-xs text-indigo-800 leading-relaxed">{data.plain_english}</p>

      {data.common_in.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {data.common_in.map(s => (
            <span key={s} className="text-xs bg-white border border-indigo-200 text-indigo-700 px-2 py-0.5 rounded-full">{s}</span>
          ))}
        </div>
      )}

      <div className="space-y-2">
        <div className="bg-green-50 border border-green-200 rounded-lg px-3 py-2">
          <div className="text-xs font-semibold text-green-700 mb-0.5">Reassurance</div>
          <p className="text-xs text-green-800 leading-relaxed">{data.reassurance}</p>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          <div className="text-xs font-semibold text-amber-700 mb-0.5">When to follow up</div>
          <p className="text-xs text-amber-800 leading-relaxed">{data.when_to_worry}</p>
        </div>

        <div className="bg-white border border-indigo-100 rounded-lg px-3 py-2">
          <div className="text-xs font-semibold text-indigo-700 mb-0.5">💬 Questions to ask your doctor</div>
          <p className="text-xs text-gray-700 leading-relaxed">{data.what_to_ask}</p>
        </div>
      </div>
    </div>
  );
}
