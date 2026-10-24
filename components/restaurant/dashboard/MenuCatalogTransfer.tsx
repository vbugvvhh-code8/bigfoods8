'use client';

import { useRef, useState } from 'react';
import { Download, Upload, FileSpreadsheet, Loader2, X } from 'lucide-react';
import type { MenuItem } from '@/types/database';
import type { NewMenuItem } from '@/hooks/useMenuItems';

type Props = {
  menuItems: MenuItem[];
  onImport: (item: NewMenuItem) => Promise<unknown>;
};

const HEADERS = [
  'name', 'price', 'category', 'subcategory', 'description', 'ingredients',
  'serving_size', 'preparation_time_minutes', 'is_available', 'stock_quantity',
  'allergens', 'dietary_tags', 'image_urls', 'sku',
];

function csvCell(value: unknown): string {
  const text = value == null ? '' : String(value);
  return /[",\r\n]/.test(text) ? '"' + text.replace(/"/g, '""') + '"' : text;
}

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"' && cell.length === 0) quoted = true;
    else if (ch === ',') { row.push(cell); cell = ''; }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      row.push(cell); cell = '';
      if (row.some((v) => v.trim())) rows.push(row);
      row = [];
    } else cell += ch;
  }
  row.push(cell);
  if (row.some((v) => v.trim())) rows.push(row);
  if (quoted) throw new Error('The CSV has an unclosed quotation mark.');
  return rows;
}

function splitList(value: string): string[] {
  return value.split('|').map((part) => part.trim()).filter(Boolean);
}

function csvExportValue(item: MenuItem, key: string): string {
  const value = (item as unknown as Record<string, unknown>)[key];
  if (key === 'image_urls') {
    const urls = Array.isArray(value) && value.length ? value : item.image_url ? [item.image_url] : [];
    return JSON.stringify(urls);
  }
  if (key === 'allergens' || key === 'dietary_tags') return Array.isArray(value) ? value.join('|') : '';
  return value == null ? '' : String(value);
}

export default function MenuCatalogTransfer({ menuItems, onImport }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [status, setStatus] = useState('');
  const [errors, setErrors] = useState<string[]>([]);

  function exportCsv() {
    const csv = [
      HEADERS.join(','),
      ...menuItems.map((item) => HEADERS.map((key) => csvCell(csvExportValue(item, key))).join(',')),
    ].join('\r\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'big-foods-menu-catalog.csv';
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
    setStatus(`Exported ${menuItems.length} menu item(s) to CSV.`);
    setErrors([]);
  }

  async function importFile(file?: File) {
    if (!file) return;
    setBusy(true);
    setStatus('');
    setErrors([]);
    try {
      const rows = parseCsv(await file.text());
      if (rows.length < 2) throw new Error('The CSV must include a header row and at least one menu item.');
      const headers = rows[0].map((header, index) => (index === 0 ? header.replace(/^\uFEFF/, '') : header).trim().toLowerCase());
      for (const required of ['name', 'price', 'image_urls']) {
        if (!headers.includes(required)) throw new Error(`Missing required column: ${required}. Export a template first or use the Big Foods CSV format.`);
      }
      const idx = (key: string) => headers.indexOf(key);
      const value = (row: string[], key: string) => idx(key) < 0 ? '' : (row[idx(key)] ?? '').trim();
      let imported = 0;
      const rowErrors: string[] = [];
      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        const rowNumber = i + 1;
        try {
          const name = value(row, 'name');
          const price = Number(value(row, 'price'));
          if (!name) throw new Error('name is required');
          if (!Number.isSafeInteger(price) || price <= 0) throw new Error('price must be a whole number greater than zero');
          let imageUrls: string[];
          try {
            const rawImages = value(row, 'image_urls');
            const parsed = rawImages.startsWith('[') ? JSON.parse(rawImages) : [rawImages];
            imageUrls = (Array.isArray(parsed) ? parsed : []).map((url) => String(url).trim()).filter(Boolean);
          } catch { throw new Error('image_urls must be a JSON array of URLs, e.g. ["https://..."]'); }
          if (imageUrls.length < 1 || imageUrls.length > 3 || imageUrls.some((url) => !/^https?:\/\//i.test(url))) {
            throw new Error('provide 1–3 valid http(s) image URLs in image_urls');
          }
          const parseOptionalInteger = (key: string) => {
            const raw = value(row, key);
            if (!raw) return null;
            const number = Number(raw);
            if (!Number.isSafeInteger(number) || number < (key === 'preparation_time_minutes' ? 1 : 0)) {
              throw new Error(`${key} must be a valid whole number`);
            }
            return number;
          };
          const availableText = value(row, 'is_available').toLowerCase();
          if (availableText && !['true', 'false', '1', '0', 'yes', 'no'].includes(availableText)) {
            throw new Error('is_available must be true/false');
          }
          await onImport({
            name,
            price,
            category: value(row, 'category') || undefined,
            subcategory: value(row, 'subcategory') || undefined,
            description: value(row, 'description') || null,
            ingredients: value(row, 'ingredients') || null,
            serving_size: value(row, 'serving_size') || null,
            preparation_time_minutes: parseOptionalInteger('preparation_time_minutes'),
            stock_quantity: parseOptionalInteger('stock_quantity'),
            is_available: !availableText ? true : ['true', '1', 'yes'].includes(availableText),
            allergens: splitList(value(row, 'allergens')),
            dietary_tags: splitList(value(row, 'dietary_tags')),
            image_urls: imageUrls,
          });
          imported++;
        } catch (error) {
          rowErrors.push(`Row ${rowNumber}: ${error instanceof Error ? error.message : 'Import failed'}`);
        }
      }
      setStatus(`Import finished: ${imported} imported, ${rowErrors.length} failed. Existing items are not overwritten; duplicate names are rejected.`);
      setErrors(rowErrors.slice(0, 8));
    } catch (error) {
      setErrors([error instanceof Error ? error.message : 'Could not read this CSV file.']);
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  return (
    <>
      <div className="mb-4">
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="flex min-h-14 w-full items-center justify-center gap-3 rounded-2xl border px-5 py-4 text-sm font-semibold leading-5 shadow-sm transition hover:brightness-95 active:scale-[0.99] sm:px-6"
          style={{ borderColor: 'var(--line)', background: 'var(--white)', color: 'var(--ink)' }}
        >
          <FileSpreadsheet className="h-4 w-4" />
          Bulk catalog import & export
        </button>
      </div>

      {isOpen && (
        <div
          className="fixed inset-0 z-[120] flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !busy) setIsOpen(false);
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="catalog-transfer-title"
            className="max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-t-2xl border p-5 shadow-2xl sm:rounded-2xl"
            style={{ borderColor: 'var(--line)', background: 'var(--white)' }}
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl" style={{ background: 'var(--peach)', color: 'var(--ink)' }}>
                  <FileSpreadsheet className="h-5 w-5" />
                </div>
                <div>
                  <h2 id="catalog-transfer-title" className="text-base font-bold" style={{ color: 'var(--ink)' }}>Bulk catalog import & export</h2>
                  <p className="mt-1 text-xs" style={{ color: 'var(--gray)' }}>Manage your menu spreadsheet</p>
                </div>
              </div>
              <button type="button" disabled={busy} onClick={() => setIsOpen(false)} aria-label="Close catalog import and export" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg disabled:opacity-50" style={{ color: 'var(--gray)', background: 'var(--peach)' }}>
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="text-sm leading-6" style={{ color: 'var(--gray)' }}>
              Export the full menu to CSV, or import new items from a CSV. Imports add items only—existing items are never overwritten. New SKUs are generated automatically; the exported SKU column is for reference. Each row needs a name, whole-number price, and 1–3 image URLs as a JSON array.
            </p>
            <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <button type="button" onClick={exportCsv} disabled={busy} className="flex min-h-14 items-center justify-center gap-3 rounded-xl border px-5 py-4 text-sm font-semibold leading-5 transition hover:brightness-95 active:scale-[0.99] disabled:opacity-50" style={{ borderColor: 'var(--line)', color: 'var(--ink)' }}>
                <Download className="h-4 w-4" /> Export CSV ({menuItems.length})
              </button>
              <button type="button" onClick={() => fileRef.current?.click()} disabled={busy} className="flex min-h-14 items-center justify-center gap-3 rounded-xl px-5 py-4 text-sm font-semibold leading-5 text-white shadow-sm transition hover:brightness-95 active:scale-[0.99] disabled:opacity-50" style={{ background: 'var(--orange)' }}>
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                {busy ? 'Importing rows…' : 'Import CSV'}
              </button>
            </div>
            <input ref={fileRef} type="file" accept=".csv,text/csv" className="hidden" onChange={(event) => void importFile(event.target.files?.[0])} />
            <button type="button" onClick={() => {
              const template = HEADERS.join(',') + '\r\n' + [
                'Example Jollof Rice', '2500', 'Main dishes', 'Rice', 'Smoky party jollof', 'Rice|tomato|pepper',
                '1 plate', '20', 'true', '10', 'dairy|soy', 'popular|spicy',
                '["https://example.com/jollof.jpg"]', '',
              ].map(csvCell).join(',');
              const url = URL.createObjectURL(new Blob(['\uFEFF' + template], { type: 'text/csv;charset=utf-8;' }));
              const anchor = document.createElement('a'); anchor.href = url; anchor.download = 'big-foods-menu-import-template.csv'; anchor.click(); URL.revokeObjectURL(url);
            }} className="mt-4 inline-flex min-h-11 items-center rounded-lg px-2 py-3 text-sm font-semibold underline underline-offset-2" style={{ color: 'var(--orange)' }}>
              Download import template
            </button>
            {status && <p role="status" className="mt-3 rounded-lg p-3 text-sm leading-5" style={{ background: '#E7F6EC', color: '#207245' }}>{status}</p>}
            {errors.length > 0 && <div role="alert" className="mt-3 rounded-lg p-3 text-sm leading-5" style={{ background: '#FCE8E6', color: 'var(--red)' }}><p className="font-semibold">Import issues</p><ul className="mt-1 list-disc pl-4">{errors.map((error, index) => <li key={index}>{error}</li>)}</ul></div>}
          </section>
        </div>
      )}
    </>
  );
}
