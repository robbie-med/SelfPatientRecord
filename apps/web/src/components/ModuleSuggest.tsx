import { useTranslation } from 'react-i18next';
import type { ModuleConfig } from '../api/client';

interface Props {
  module: ModuleConfig;
  onEnable: (id: string) => void;
  onDismiss: (id: string) => void;
}

export default function ModuleSuggest({ module, onEnable, onDismiss }: Props) {
  const { t } = useTranslation();

  return (
    <div className="border border-blue-200 bg-blue-50 rounded-lg p-4 flex items-start gap-3">
      <span className="text-2xl shrink-0">{module.icon}</span>
      <div className="flex-1 min-w-0">
        <div className="font-medium text-blue-900 text-sm">{module.name}</div>
        <div className="text-xs text-blue-700 mt-0.5">{module.trigger_reason ?? module.description}</div>
      </div>
      <div className="flex gap-2 shrink-0">
        <button
          onClick={() => onEnable(module.id)}
          className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded hover:bg-blue-700"
        >
          {t('modules.enable')}
        </button>
        <button
          onClick={() => onDismiss(module.id)}
          className="text-xs text-blue-600 px-2 py-1.5 hover:underline"
        >
          Not now
        </button>
      </div>
    </div>
  );
}
