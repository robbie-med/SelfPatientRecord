import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  getAttachments, uploadAttachment, deleteAttachment, getAttachmentUrl,
  type Attachment,
} from '../api/client';

export default function Attachments() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const { data = [] } = useQuery({ queryKey: ['attachments'], queryFn: getAttachments });
  const [caption, setCaption] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const uploadMut = useMutation({
    mutationFn: (args: { file: File; caption?: string }) => uploadAttachment(args.file, args.caption ? { caption: args.caption } : {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['attachments'] });
      setCaption('');
      if (fileRef.current) fileRef.current.value = '';
    },
  });
  const deleteMut = useMutation({
    mutationFn: deleteAttachment,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['attachments'] }),
  });

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">{t('pages.attachments.title')}</h1>
        <p className="text-sm text-gray-500 mt-1">{t('pages.attachments.description')}</p>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">{t('pages.attachments.file')}</label>
          <input ref={fileRef} type="file" className="block text-sm" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">{t('pages.attachments.caption')}</label>
          <input value={caption} onChange={e => setCaption(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm" />
        </div>
        <button
          onClick={() => {
            const file = fileRef.current?.files?.[0];
            if (file) uploadMut.mutate({ file, caption });
          }}
          disabled={uploadMut.isPending}
          className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {t('pages.attachments.upload')}
        </button>
      </div>

      {!data.length && <p className="text-sm text-gray-400">{t('common.empty')}</p>}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {data.map((a: Attachment) => {
          const isImage = a.mime_type.startsWith('image/');
          return (
            <div key={a.id} className="bg-white border border-gray-200 rounded-lg overflow-hidden">
              <a href={getAttachmentUrl(a.id)} target="_blank" rel="noreferrer" className="block">
                {isImage ? (
                  <img src={getAttachmentUrl(a.id)} alt={a.caption ?? a.filename} className="w-full h-32 object-cover" />
                ) : (
                  <div className="w-full h-32 flex items-center justify-center bg-gray-50 text-3xl">📎</div>
                )}
              </a>
              <div className="p-2 text-xs">
                <div className="truncate text-gray-700" title={a.filename}>{a.filename}</div>
                {a.caption && <div className="text-gray-500 truncate">{a.caption}</div>}
                <div className="text-gray-400 mt-1">{a.size_bytes ? `${Math.round(a.size_bytes / 1024)} KB` : ''}</div>
                <button onClick={() => { if (confirm(t('common.confirm') + '?')) deleteMut.mutate(a.id); }} className="text-red-500 hover:underline mt-1">{t('common.delete')}</button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
