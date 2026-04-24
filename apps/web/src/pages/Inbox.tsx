import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  getDocuments, createDocument, deleteDocument,
  extractDocument, getDocumentFacts, confirmFacts,
  getHealth, type Document, type ExtractedFact,
} from '../api/client';
import FactCard from '../components/FactCard';
import clsx from 'clsx';

const DOC_TYPES = ['discharge_summary', 'office_note', 'lab_report', 'imaging_report', 'prescription', 'other'];

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    pending: 'bg-gray-100 text-gray-600',
    processing: 'bg-blue-100 text-blue-700',
    completed: 'bg-green-100 text-green-700',
    failed: 'bg-red-100 text-red-700',
  };
  return <span className={clsx('text-xs px-2 py-0.5 rounded-full font-medium', colors[status] ?? colors.pending)}>{status}</span>;
}

function FactReviewPanel({ doc, onDone }: { doc: Document; onDone: () => void }) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const { data: facts = [], isLoading } = useQuery({
    queryKey: ['facts', doc.id],
    queryFn: () => getDocumentFacts(doc.id),
  });

  const [pending, setPending] = useState<Record<string, boolean>>({});

  const confirmMut = useMutation({
    mutationFn: (confs: Parameters<typeof confirmFacts>[1]) => confirmFacts(doc.id, confs),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['facts', doc.id] }); qc.invalidateQueries({ queryKey: ['conditions'] }); qc.invalidateQueries({ queryKey: ['medications'] }); qc.invalidateQueries({ queryKey: ['labs'] }); },
  });

  const handleConfirm = (factId: string, fact_type: string) => {
    setPending(p => ({ ...p, [factId]: true }));
    confirmMut.mutate([{ fact_id: factId, fact_type, confirmed: true }]);
  };

  const handleReject = (factId: string, fact_type: string) => {
    setPending(p => ({ ...p, [factId]: true }));
    confirmMut.mutate([{ fact_id: factId, fact_type, confirmed: false }]);
  };

  const unconfirmed = facts.filter(f => !f.user_confirmed && !pending[f.id]);
  const byType = facts.reduce<Record<string, ExtractedFact[]>>((acc, f) => {
    if (!acc[f.fact_type]) acc[f.fact_type] = [];
    acc[f.fact_type].push(f);
    return acc;
  }, {});

  if (isLoading) return <div className="text-sm text-gray-400 py-4">{t('common.loading')}</div>;
  if (!facts.length) return <div className="text-sm text-gray-400 py-4">{t('inbox.noFacts')}</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-600">{unconfirmed.length} items need review</span>
        <button onClick={onDone} className="text-sm text-blue-600 hover:underline">{t('common.close')}</button>
      </div>
      {Object.entries(byType).map(([type, items]) => (
        <div key={type}>
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
            {t(`inbox.factTypes.${type}` as Parameters<typeof t>[0]) || type}
          </div>
          <div className="space-y-2">
            {items.map(fact => (
              <FactCard
                key={fact.id}
                fact={fact}
                onConfirm={(id) => handleConfirm(id, fact.fact_type)}
                onReject={(id) => handleReject(id, fact.fact_type)}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function Inbox() {
  const { t } = useTranslation();
  const qc = useQueryClient();

  const { data: health } = useQuery({ queryKey: ['health'], queryFn: getHealth });
  const { data: documents = [], isLoading } = useQuery({ queryKey: ['documents'], queryFn: getDocuments });

  const [text, setText] = useState('');
  const [title, setTitle] = useState('');
  const [docType, setDocType] = useState('other');
  const [encounterDate, setEncounterDate] = useState('');
  const [facility, setFacility] = useState('');
  const [provider, setProvider] = useState('');
  const [reviewingDoc, setReviewingDoc] = useState<Document | null>(null);
  const [extracting, setExtracting] = useState<string | null>(null);

  const createMut = useMutation({
    mutationFn: createDocument,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['documents'] }); setText(''); setTitle(''); setEncounterDate(''); setFacility(''); setProvider(''); },
  });

  const deleteMut = useMutation({
    mutationFn: deleteDocument,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['documents'] }),
  });

  const handleSave = () => {
    if (!text.trim()) return;
    createMut.mutate({ title: title || 'Untitled Document', raw_text: text, document_type: docType, source_type: 'paste', encounter_date: encounterDate || undefined, facility: facility || undefined, provider: provider || undefined });
  };

  const handleSaveAndExtract = async () => {
    if (!text.trim()) return;
    const doc = await createMut.mutateAsync({ title: title || 'Untitled Document', raw_text: text, document_type: docType, source_type: 'paste', encounter_date: encounterDate || undefined, facility: facility || undefined, provider: provider || undefined });
    setExtracting(doc.id);
    try {
      await extractDocument(doc.id);
      qc.invalidateQueries({ queryKey: ['documents'] });
      setReviewingDoc(doc);
    } finally {
      setExtracting(null);
    }
  };

  const aiEnabled = health?.ai_enabled ?? false;

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-8">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">{t('inbox.title')}</h1>
        <p className="text-sm text-gray-500 mt-1">{t('inbox.description')}</p>
      </div>

      {/* Paste form */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{t('inbox.docTitle')}</label>
          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder={t('inbox.docTitlePlaceholder')}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('inbox.docType')}</label>
            <select
              value={docType}
              onChange={e => setDocType(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {DOC_TYPES.map(dt => (
                <option key={dt} value={dt}>{t(`inbox.docTypes.${dt}` as Parameters<typeof t>[0])}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('inbox.encounterDate')}</label>
            <input
              type="date"
              value={encounterDate}
              onChange={e => setEncounterDate(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('inbox.facility')} <span className="text-gray-400 font-normal">({t('common.optional')})</span></label>
            <input type="text" value={facility} onChange={e => setFacility(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('inbox.provider')} <span className="text-gray-400 font-normal">({t('common.optional')})</span></label>
            <input type="text" value={provider} onChange={e => setProvider(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{t('inbox.pasteLabel')}</label>
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            rows={8}
            placeholder={t('inbox.pastePlaceholder')}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono resize-y"
          />
        </div>

        {!aiEnabled && (
          <p className="text-xs text-amber-700 bg-amber-50 rounded-lg px-3 py-2">{t('inbox.aiDisabled')}</p>
        )}

        <div className="flex gap-3">
          <button
            onClick={handleSave}
            disabled={!text.trim() || createMut.isPending}
            className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50"
          >
            {t('inbox.saveOnly')}
          </button>
          {aiEnabled && (
            <button
              onClick={handleSaveAndExtract}
              disabled={!text.trim() || createMut.isPending || !!extracting}
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {extracting ? t('inbox.extracting') : t('inbox.saveAndExtract')}
            </button>
          )}
        </div>
      </div>

      {/* Fact review */}
      {reviewingDoc && (
        <div className="bg-white border border-blue-200 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-gray-800 mb-4">{t('inbox.pendingReview')}: {reviewingDoc.title}</h2>
          <FactReviewPanel doc={reviewingDoc} onDone={() => setReviewingDoc(null)} />
        </div>
      )}

      {/* Documents list */}
      <div>
        <h2 className="text-sm font-semibold text-gray-700 mb-3">{t('inbox.documents')}</h2>
        {isLoading && <p className="text-sm text-gray-400">{t('common.loading')}</p>}
        {!isLoading && !documents.length && <p className="text-sm text-gray-400">{t('inbox.noDocuments')}</p>}
        <div className="space-y-2">
          {documents.map(doc => (
            <div key={doc.id} className="bg-white border border-gray-200 rounded-lg px-4 py-3 flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-gray-900 truncate">{doc.title}</div>
                <div className="text-xs text-gray-400 mt-0.5">
                  {doc.document_type} · {doc.created_at.split('T')[0]}
                  {doc.facility && ` · ${doc.facility}`}
                </div>
              </div>
              <StatusBadge status={doc.extraction_status} />
              <div className="flex gap-2 shrink-0">
                {doc.extraction_status === 'completed' && (
                  <button
                    onClick={() => setReviewingDoc(doc)}
                    className="text-xs text-blue-600 hover:underline"
                  >
                    Review
                  </button>
                )}
                {aiEnabled && doc.extraction_status === 'pending' && (
                  <button
                    onClick={async () => { setExtracting(doc.id); await extractDocument(doc.id); qc.invalidateQueries({ queryKey: ['documents'] }); setReviewingDoc(doc); setExtracting(null); }}
                    disabled={!!extracting}
                    className="text-xs text-blue-600 hover:underline disabled:opacity-50"
                  >
                    Extract
                  </button>
                )}
                <button
                  onClick={() => { if (confirm('Delete this document?')) deleteMut.mutate(doc.id); }}
                  className="text-xs text-red-500 hover:underline"
                >
                  {t('common.delete')}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
