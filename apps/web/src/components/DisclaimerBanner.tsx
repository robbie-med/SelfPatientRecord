import { useState } from 'react';
import { useTranslation } from 'react-i18next';

export default function DisclaimerBanner() {
  const { t } = useTranslation();
  const [dismissed, setDismissed] = useState(() => sessionStorage.getItem('disclaimer_dismissed') === 'true');
  const [showFull, setShowFull] = useState(false);

  if (dismissed) return null;

  return (
    <>
      <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 flex items-center gap-3 text-sm">
        <span className="text-amber-600 shrink-0">⚠️</span>
        <span className="text-amber-800 flex-1">{t('disclaimer.short')}</span>
        <button
          onClick={() => setShowFull(true)}
          className="text-amber-700 underline text-xs shrink-0 hover:text-amber-900"
        >
          {t('disclaimer.readMore')}
        </button>
        <button
          onClick={() => {
            sessionStorage.setItem('disclaimer_dismissed', 'true');
            setDismissed(true);
          }}
          className="text-amber-600 hover:text-amber-900 shrink-0"
          aria-label="Dismiss"
        >
          ✕
        </button>
      </div>

      {showFull && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 shadow-xl">
            <h2 className="font-semibold text-gray-900 mb-3">Disclaimer</h2>
            <p className="text-sm text-gray-700 mb-4">{t('disclaimer.full')}</p>
            <p className="text-sm font-medium text-red-700 bg-red-50 rounded-lg p-3 mb-4">
              {t('disclaimer.emergency')}
            </p>
            <button
              onClick={() => setShowFull(false)}
              className="w-full bg-slate-800 text-white rounded-lg py-2 text-sm hover:bg-slate-700"
            >
              {t('disclaimer.dismiss')}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
