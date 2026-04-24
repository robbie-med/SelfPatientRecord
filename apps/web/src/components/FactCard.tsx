import { useTranslation } from 'react-i18next';
import type { ExtractedFact } from '../api/client';
import clsx from 'clsx';

interface Props {
  fact: ExtractedFact;
  onConfirm: (id: string) => void;
  onReject: (id: string) => void;
}

const FACT_LABELS: Record<string, string> = {
  condition: 'Condition',
  medication: 'Medication',
  lab: 'Lab result',
  allergy: 'Allergy',
  vital: 'Vital sign',
  imaging: 'Imaging finding',
};

function renderData(data: Record<string, unknown>): string {
  const parts: string[] = [];
  if (data.name) parts.push(String(data.name));
  if (data.test_name) parts.push(String(data.test_name));
  if (data.value) parts.push(String(data.value) + (data.unit ? ` ${data.unit}` : ''));
  if (data.allergen) parts.push(String(data.allergen));
  if (data.vital_type) parts.push(String(data.vital_type));
  if (data.dose) parts.push(String(data.dose));
  if (data.frequency) parts.push(String(data.frequency));
  if (data.status && data.status !== 'active' && data.status !== 'current') parts.push(`(${data.status})`);
  if (data.study_type) parts.push(String(data.study_type));
  if (data.body_part) parts.push(`— ${data.body_part}`);
  return parts.join(' ') || JSON.stringify(data);
}

export default function FactCard({ fact, onConfirm, onReject }: Props) {
  const { t } = useTranslation();
  const conf = fact.confidence ?? 0;
  const confPct = Math.round(conf * 100);
  const confColor = conf >= 0.8 ? 'text-green-700 bg-green-50' : conf >= 0.5 ? 'text-amber-700 bg-amber-50' : 'text-red-700 bg-red-50';

  return (
    <div className={clsx(
      'border rounded-lg p-3 bg-white text-sm',
      fact.user_confirmed ? 'border-green-300 opacity-60' : 'border-gray-200'
    )}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">
              {FACT_LABELS[fact.fact_type] ?? fact.fact_type}
            </span>
            <span className={clsx('text-xs px-1.5 py-0.5 rounded font-medium', confColor)}>
              {confPct}% {t('common.confidence')}
            </span>
          </div>
          <div className="font-medium text-gray-900 truncate">
            {renderData(fact.raw_data)}
          </div>
          {fact.source_quote && (
            <div className="mt-1 text-xs text-gray-400 italic truncate">
              "{fact.source_quote}"
            </div>
          )}
        </div>

        {!fact.user_confirmed && (
          <div className="flex gap-1.5 shrink-0">
            <button
              onClick={() => onConfirm(fact.id)}
              className="text-xs bg-green-600 text-white px-2.5 py-1 rounded hover:bg-green-700"
            >
              {t('common.confirm')}
            </button>
            <button
              onClick={() => onReject(fact.id)}
              className="text-xs bg-gray-100 text-gray-600 px-2.5 py-1 rounded hover:bg-gray-200"
            >
              {t('common.reject')}
            </button>
          </div>
        )}
        {fact.user_confirmed && (
          <span className="text-green-600 text-xs shrink-0">✓ Confirmed</span>
        )}
      </div>
    </div>
  );
}
