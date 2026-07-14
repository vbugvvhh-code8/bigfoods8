'use client';

import { useEffect, useState } from 'react';
import useAdminQuery from '@/hooks/useAdminQuery';
import getBrowserSupabase from '@/lib/supabase/client';

const DOC_TYPES = [
  { value: 'terms', label: 'Terms & Conditions' },
  { value: 'privacy', label: 'Privacy Policy' },
  { value: 'rider_agreement', label: 'Rider Agreement' },
  { value: 'restaurant_agreement', label: 'Restaurant Agreement' },
];

export default function LegalDocEditor() {
  const { data, loading, error, mutate } = useAdminQuery('legal_documents');
  const [docType, setDocType] = useState('terms');
  const [content, setContent] = useState('');
  const [saving, setSaving] = useState(false);
  const supabase = getBrowserSupabase();

  const current = (data || []).find((d: any) => d.doc_type === docType && d.is_current);

  useEffect(() => {
    setContent(current?.content ?? '');
  }, [docType, current?.content]);

  if (loading) return <div className="text-[13px]" style={{ color: 'var(--gray)' }}>Loading…</div>;
  if (error) return <div className="text-[13px]" style={{ color: '#C1453A' }}>Couldn't load legal documents</div>;

  async function handlePublish() {
    setSaving(true);
    const { error } = await supabase.rpc('publish_legal_document', { p_doc_type: docType, p_content: content });
    setSaving(false);
    if (error) {
      alert(error.message || 'Failed to publish');
      return;
    }
    await mutate();
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-3">
        {DOC_TYPES.map((t) => (
          <button
            key={t.value}
            onClick={() => setDocType(t.value)}
            className="px-3 py-1.5 rounded-full text-[12px] font-medium"
            style={{
              background: docType === t.value ? 'var(--peach)' : 'transparent',
              border: '1px solid var(--line)',
              color: docType === t.value ? 'var(--orange-dark)' : 'var(--gray)',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="text-[11px] mb-2" style={{ color: 'var(--gray)' }}>
        {current ? `Version ${current.version} — live` : 'No published version yet'}
      </div>

      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        rows={10}
        className="w-full rounded-md p-3 text-[13px]"
        style={{ border: '1px solid var(--line)', fontFamily: 'Inter, sans-serif' }}
      />

      <button
        onClick={handlePublish}
        disabled={saving || !content.trim()}
        className="mt-3 px-4 py-2 rounded-md text-[13px] font-medium text-white"
        style={{ background: 'var(--orange)', opacity: saving || !content.trim() ? 0.5 : 1 }}
      >
        {saving ? 'Publishing…' : 'Publish new version'}
      </button>
    </div>
  );
}
