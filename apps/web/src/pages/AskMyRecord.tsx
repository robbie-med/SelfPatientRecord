import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { getHealth, getChatHistory, sendChat, clearChat, type ChatMessage } from '../api/client';
import clsx from 'clsx';

const SUGGESTIONS = ['ask.suggestions.q1', 'ask.suggestions.q2', 'ask.suggestions.q3', 'ask.suggestions.q4', 'ask.suggestions.q5', 'ask.suggestions.q6'] as const;

function MessageBubble({ msg }: { msg: ChatMessage }) {
  const [showCitations, setShowCitations] = useState(false);
  const isUser = msg.role === 'user';

  return (
    <div className={clsx('flex', isUser ? 'justify-end' : 'justify-start')}>
      <div className={clsx('max-w-[80%] rounded-2xl px-4 py-3 text-sm', isUser ? 'bg-blue-600 text-white rounded-br-sm' : 'bg-white border border-gray-200 text-gray-800 rounded-bl-sm')}>
        <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
        {!isUser && msg.citations && msg.citations.length > 0 && (
          <div className="mt-2 pt-2 border-t border-gray-100">
            <button onClick={() => setShowCitations(v => !v)} className="text-xs text-gray-400 hover:text-gray-600">
              📎 {msg.citations.length} source{msg.citations.length !== 1 ? 's' : ''} {showCitations ? '▲' : '▼'}
            </button>
            {showCitations && (
              <div className="mt-1.5 space-y-1">
                {msg.citations.map((c, i) => (
                  <div key={i} className="text-xs text-gray-500 bg-gray-50 rounded px-2 py-1">
                    <span className="font-medium">{c.fact_type}</span>: {c.label}
                    {c.source_quote && <span className="block italic text-gray-400 mt-0.5">"{c.source_quote}"</span>}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function AskMyRecord() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const bottomRef = useRef<HTMLDivElement>(null);

  const { data: health } = useQuery({ queryKey: ['health'], queryFn: getHealth });
  const { data: savedHistory = [] } = useQuery({ queryKey: ['chat'], queryFn: getChatHistory });

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isThinking, setIsThinking] = useState(false);

  // Seed from saved history on first load
  useEffect(() => {
    if (savedHistory.length && !messages.length) {
      setMessages(savedHistory.map(m => ({ ...m, citations: m.citations ?? [] })));
    }
  }, [savedHistory]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isThinking]);

  const clearMut = useMutation({
    mutationFn: clearChat,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['chat'] }); setMessages([]); },
  });

  const aiEnabled = health?.ai_enabled ?? false;

  const handleSend = async (text?: string) => {
    const msg = (text ?? input).trim();
    if (!msg || isThinking) return;
    setInput('');

    const userMsg: ChatMessage = { role: 'user', content: msg, created_at: new Date().toISOString() };
    setMessages(prev => [...prev, userMsg]);
    setIsThinking(true);

    try {
      const history = messages.slice(-10).map(m => ({ role: m.role, content: m.content }));
      const result = await sendChat(msg, history as ChatMessage[]);
      const assistantMsg: ChatMessage = {
        role: 'assistant',
        content: result.answer,
        citations: result.citations,
        created_at: new Date().toISOString(),
      };
      setMessages(prev => [...prev, assistantMsg]);
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, something went wrong. Please try again.', created_at: new Date().toISOString() }]);
    } finally {
      setIsThinking(false);
    }
  };

  if (!aiEnabled) {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <h1 className="text-xl font-semibold text-gray-900 mb-2">{t('ask.title')}</h1>
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 text-center">
          <div className="text-3xl mb-3">🤖</div>
          <p className="text-amber-800 text-sm">{t('ask.aiDisabled')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full max-w-2xl mx-auto">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200 bg-white flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">{t('ask.title')}</h1>
          <p className="text-xs text-gray-500">{t('ask.safetyNote')}</p>
        </div>
        {messages.length > 0 && (
          <button onClick={() => { if (confirm('Clear all chat history?')) clearMut.mutate(); }} className="text-xs text-gray-400 hover:text-red-500">
            {t('ask.clearHistory')}
          </button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        {!messages.length && (
          <div className="py-6">
            <p className="text-sm font-medium text-gray-500 mb-3">{t('ask.suggestions.title')}</p>
            <div className="grid grid-cols-1 gap-2">
              {SUGGESTIONS.map(key => (
                <button
                  key={key}
                  onClick={() => handleSend(t(key as Parameters<typeof t>[0]))}
                  className="text-left text-sm text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg px-4 py-2.5 transition-colors"
                >
                  {t(key as Parameters<typeof t>[0])}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => <MessageBubble key={i} msg={msg} />)}

        {isThinking && (
          <div className="flex justify-start">
            <div className="bg-white border border-gray-200 rounded-2xl rounded-bl-sm px-4 py-3 text-sm text-gray-400">
              <span className="animate-pulse">{t('ask.thinking')}</span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-6 py-4 border-t border-gray-200 bg-white">
        <div className="flex gap-2">
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
            placeholder={t('ask.inputPlaceholder')}
            rows={2}
            className="flex-1 border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />
          <button
            onClick={() => handleSend()}
            disabled={!input.trim() || isThinking}
            className="px-4 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 text-sm font-medium shrink-0"
          >
            {t('ask.send')}
          </button>
        </div>
      </div>
    </div>
  );
}
