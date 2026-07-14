'use client';

import { useState } from 'react';
import PricingConfigForm from './PricingConfigForm';
import LegalDocEditor from './LegalDocEditor';
import PlatformSettingsForm from './PlatformSettingsForm';
import AuditLogView from './AuditLogView';

type Tab = 'pricing' | 'legal' | 'platform' | 'audit';

const TABS: { id: Tab; label: string }[] = [
  { id: 'pricing', label: 'Pricing' },
  { id: 'legal', label: 'Legal documents' },
  { id: 'platform', label: 'Platform' },
  { id: 'audit', label: 'Audit log' },
];

export default function SettingsView() {
  const [tab, setTab] = useState<Tab>('pricing');

  return (
    <div>
      <div className="mb-4">
        <h1 className="text-[20px] font-semibold" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Settings</h1>
        <p className="text-[11.5px] mt-0.5" style={{ color: 'var(--gray)' }}>Platform-wide configuration</p>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className="px-3.5 py-2 rounded-lg text-[12.5px] font-medium"
            style={{
              background: tab === t.id ? 'var(--peach)' : 'white',
              border: '1px solid var(--line)',
              color: tab === t.id ? 'var(--orange-dark)' : 'var(--gray)',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="rounded-xl p-4" style={{ background: 'white', border: '1px solid var(--line)' }}>
        {tab === 'pricing' && <PricingConfigForm />}
        {tab === 'legal' && <LegalDocEditor />}
        {tab === 'platform' && <PlatformSettingsForm />}
        {tab === 'audit' && <AuditLogView />}
      </div>
    </div>
  );
}
