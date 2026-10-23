'use client';

import SafeImage from '@/components/ui/SafeImage';
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Pencil, Trash2, Search, X, CheckSquare, Square, Eye, EyeOff, ArrowUp, ArrowDown } from 'lucide-react';
import useRestaurant from '@/hooks/useRestaurant';
import { useMenuItems } from '@/hooks/useMenuItems';
import { ChipPicker } from '@/components/restaurant/dashboard/MenuItemForm';
import { MENU_CATEGORY_PRESETS, MENU_CATEGORY_NAMES } from '@/lib/menuCategoryPresets';
import type { MenuItem } from '@/types/database';
import MenuCatalogTransfer from '@/components/restaurant/dashboard/MenuCatalogTransfer';

const UNCATEGORIZED = 'uncategorized';
const NO_SUBCATEGORY = 'other';

export default function MenuBuilderPage() {
  const router = useRouter();
  const { restaurant, loading: restaurantLoading } = useRestaurant();
  const { menuItems, isLoading, addMenuItem, updateMenuItem, deleteMenuItem } = useMenuItems(restaurant?.id);
  const [availabilityBusyId, setAvailabilityBusyId] = useState<string | null>(null);
  const [pageError, setPageError] = useState<string | null>(null);
  const [pageMessage, setPageMessage] = useState<string | null>(null);
  const [menuSearch, setMenuSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [subcategoryFilter, setSubcategoryFilter] = useState('all');
  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(new Set());
  const [bulkCategory, setBulkCategory] = useState('');
  const [bulkSubcategory, setBulkSubcategory] = useState('');
  const [bulkSaving, setBulkSaving] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
  const [bulkError, setBulkError] = useState('');

  const categoryOptions = useMemo(() => {
    const values = new Set(menuItems.map((item) => item.category?.trim() || UNCATEGORIZED));
    return Array.from(values).sort((a, b) =>
      a === UNCATEGORIZED ? 1 : b === UNCATEGORIZED ? -1 : a.localeCompare(b)
    );
  }, [menuItems]);

  const subcategoryOptions = useMemo(() => {
    const relevantItems = categoryFilter === 'all'
      ? menuItems
      : menuItems.filter((item) => (item.category?.trim() || UNCATEGORIZED) === categoryFilter);
    const values = new Set(relevantItems.map((item) => (item as any).subcategory?.trim() || NO_SUBCATEGORY));
    return Array.from(values).sort((a, b) =>
      a === NO_SUBCATEGORY ? 1 : b === NO_SUBCATEGORY ? -1 : a.localeCompare(b)
    );
  }, [menuItems, categoryFilter]);

  const filteredItems = useMemo(() => {
    const query = menuSearch.trim().toLocaleLowerCase();
    return menuItems.filter((item) => {
      const category = item.category?.trim() || UNCATEGORIZED;
      const subcategory = (item as any).subcategory?.trim() || NO_SUBCATEGORY;
      const matchesSearch = !query || [item.name, item.category, (item as any).subcategory]
        .some((value) => typeof value === 'string' && value.toLocaleLowerCase().includes(query));
      return matchesSearch
        && (categoryFilter === 'all' || category === categoryFilter)
        && (subcategoryFilter === 'all' || subcategory === subcategoryFilter);
    });
  }, [menuItems, menuSearch, categoryFilter, subcategoryFilter]);


  function toggleItemSelection(id: string) {
    setSelectedItemIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleVisibleSelection() {
    setSelectedItemIds((prev) => {
      const next = new Set(prev);
      const allVisibleSelected = filteredItems.length > 0 && filteredItems.every((item) => next.has(item.id));
      filteredItems.forEach((item) => allVisibleSelected ? next.delete(item.id) : next.add(item.id));
      return next;
    });
  }

  async function handleBulkUpdate() {
    const patch: { category?: string; subcategory?: string } = {};
    if (bulkCategory.trim()) patch.category = bulkCategory.trim();
    if (bulkSubcategory.trim()) patch.subcategory = bulkSubcategory.trim();
    if (!selectedItemIds.size || Object.keys(patch).length === 0) {
      setBulkError('Select items and enter a category or subcategory to update.');
      return;
    }
    setBulkSaving(true);
    setBulkError('');
    try {
      for (const id of Array.from(selectedItemIds)) await updateMenuItem(id, patch);
      setSelectedItemIds(new Set());
      setBulkCategory('');
      setBulkSubcategory('');
    } catch (error) {
      setBulkError(error instanceof Error ? error.message : 'Some items could not be updated. Refresh and check the menu before retrying.');
    } finally {
      setBulkSaving(false);
    }
  }

  function handleBulkDelete() {
    if (menuItems.some((item) => selectedItemIds.has(item.id))) {
      setBulkError('');
      setShowBulkDeleteConfirm(true);
    }
  }

  async function confirmBulkDelete() {
    const selectedItems = menuItems.filter((item) => selectedItemIds.has(item.id));
    if (!selectedItems.length) {
      setShowBulkDeleteConfirm(false);
      return;
    }
    setBulkDeleting(true);
    setBulkError('');
    try {
      for (const item of selectedItems) await deleteMenuItem(item.id);
      setSelectedItemIds(new Set());
      setShowBulkDeleteConfirm(false);
    } catch (error) {
      setShowBulkDeleteConfirm(false);
      setBulkError(error instanceof Error ? error.message : 'Some items could not be deleted. Refresh the menu and check which items remain.');
    } finally {
      setBulkDeleting(false);
    }
  }

  async function moveItem(item: MenuItem, direction: -1 | 1) {
    const ordered = [...menuItems].sort((a, b) => Number((a as any).display_order ?? 0) - Number((b as any).display_order ?? 0) || (a.category ?? '').localeCompare(b.category ?? '') || a.name.localeCompare(b.name));
    const index = ordered.findIndex((entry) => entry.id === item.id);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= ordered.length) return;
    [ordered[index], ordered[target]] = [ordered[target], ordered[index]];
    setPageError(null);
    setPageMessage(null);
    try {
      for (let position = 0; position < ordered.length; position++) {
        if (Number((ordered[position] as any).display_order ?? 0) !== position) {
          await updateMenuItem(ordered[position].id, { display_order: position });
        }
      }
      setPageMessage('Menu display order saved.');
    } catch (error) {
      setPageError(error instanceof Error ? error.message : 'Could not save menu order. Please refresh and try again.');
    }
  }

  async function handleDelete(item: MenuItem) {
    if (!confirm(`Remove "${item.name}" from your menu?`)) return;
    await deleteMenuItem(item.id);
  }
  async function toggleAvailability(item: MenuItem) {
    setAvailabilityBusyId(item.id);
    setPageError(null);
    setPageMessage(null);
    try {
      await updateMenuItem(item.id, { is_available: !item.is_available });
      setPageMessage(item.name + ' is now ' + (item.is_available ? 'unavailable' : 'available') + '.');
    } catch (error: any) {
      setPageError(error?.message ?? 'Could not update availability. Please try again.');
    } finally {
      setAvailabilityBusyId(null);
    }
  }

  if (restaurantLoading || !restaurant) {
    return (
      <p className="text-[12.5px] py-6 text-center" style={{ color: 'var(--gray)' }}>
        Loading…
      </p>
    );
  }

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-[18px] font-semibold" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
          Menu
        </h1>
        {(
          <button
            type="button"
            onClick={() => router.push('/restaurant-portal/dashboard/menu/item')}
            className="flex min-h-12 items-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:brightness-95 active:scale-[0.98] sm:px-5"
            style={{ background: 'var(--orange)' }}
          >
            <Plus className="w-3.5 h-3.5" />
            Add item
          </button>
        )}
      </div>

      {pageError && <p role="alert" className="mb-3 rounded-lg p-3 text-[12px]" style={{ background: '#FCE8E6', color: 'var(--red)' }}>{pageError}</p>}
      {pageMessage && <p role="status" className="mb-3 rounded-lg p-3 text-[12px]" style={{ background: 'var(--peach)', color: 'var(--ink)' }}>{pageMessage}</p>}

      <div className="mb-5"><MenuCatalogTransfer menuItems={menuItems} onImport={addMenuItem} /></div>

      {isLoading && (
        <p className="text-[12.5px] py-4 text-center" style={{ color: 'var(--gray)' }}>
          Loading your menu…
        </p>
      )}

      {!isLoading && menuItems.length > 0 && (
        <div className="mb-5 space-y-3 rounded-2xl border p-4 sm:p-5" style={{ borderColor: "var(--line)", background: "var(--white)" }}>
          <label htmlFor="menu-item-search" className="mb-1.5 block text-xs font-semibold" style={{color:'var(--ink)'}}>
            Search your menu
          </label>
          <div className="flex min-h-11 items-center gap-2 rounded-xl border px-3" style={{borderColor:'var(--line)',background:'var(--white)'}}>
            <Search className="h-4 w-4 shrink-0" style={{color:'var(--gray)'}} />
            <input
              id="menu-item-search"
              type="search"
              value={menuSearch}
              onChange={(event) => setMenuSearch(event.target.value)}
              placeholder="Search dishes or categories"
              className="min-w-0 flex-1 bg-transparent py-2 text-sm outline-none"
              style={{color:'var(--ink)'}}
            />
            {menuSearch && (
              <button type="button" onClick={() => setMenuSearch('')} aria-label="Clear menu search" className="flex h-8 w-8 items-center justify-center rounded-lg" style={{color:'var(--gray)'}}>
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <div className="grid grid-cols-2 gap-2 sm:gap-3">
            <div>
              <label htmlFor="menu-category-filter" className="mb-1.5 block text-xs font-semibold" style={{color:'var(--ink)'}}>
                Filter by category
              </label>
              <select
                id="menu-category-filter"
                value={categoryFilter}
                onChange={(event) => {
                  setCategoryFilter(event.target.value);
                  setSubcategoryFilter('all');
                }}
                className="min-h-11 w-full rounded-xl border px-3 text-sm"
                style={{borderColor:'var(--line)',background:'var(--white)',color:'var(--ink)'}}
              >
                <option value="all">All categories</option>
                {categoryOptions.map((category) => (
                  <option key={category} value={category}>
                    {category === UNCATEGORIZED ? 'Uncategorized' : category}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="menu-subcategory-filter" className="mb-1.5 block text-xs font-semibold" style={{color:'var(--ink)'}}>
                Filter by subcategory
              </label>
              <select
                id="menu-subcategory-filter"
                value={subcategoryFilter}
                onChange={(event) => setSubcategoryFilter(event.target.value)}
                className="min-h-11 w-full rounded-xl border px-3 text-sm"
                style={{borderColor:'var(--line)',background:'var(--white)',color:'var(--ink)'}}
              >
                <option value="all">All subcategories</option>
                {subcategoryOptions.map((subcategory) => (
                  <option key={subcategory} value={subcategory}>
                    {subcategory === NO_SUBCATEGORY ? 'No subcategory' : subcategory}
                  </option>
                ))}
              </select>
            </div>
          </div>
          {(menuSearch.trim() || categoryFilter !== 'all' || subcategoryFilter !== 'all') && (
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs" style={{color:'var(--gray)'}}>
                {filteredItems.length} matching {filteredItems.length === 1 ? 'item' : 'items'}
              </p>
              <button
                type="button"
                onClick={() => {
                  setMenuSearch('');
                  setCategoryFilter('all');
                  setSubcategoryFilter('all');
                }}
                className="min-h-11 rounded-lg px-3 text-sm font-semibold"
                style={{color:'var(--orange)'}}
              >
                Clear filters
              </button>
            </div>
          )}
        </div>
      )}

      {!isLoading && menuItems.length > 0 && filteredItems.length === 0 && (
        <p className="rounded-xl border px-4 py-6 text-center text-sm" style={{borderColor:'var(--line)',color:'var(--gray)'}}>
          No menu items match the current search and filters. Try changing or clearing them.
        </p>
      )}
      {!isLoading && filteredItems.length > 0 && (
        <section className="mb-4 rounded-xl border p-3 space-y-3" style={{borderColor:'var(--line)',background:'var(--white)'}}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <button type="button" onClick={toggleVisibleSelection} className="inline-flex min-h-11 items-center gap-2 rounded-lg px-2 text-sm font-semibold" style={{color:'var(--ink)'}}>
              {filteredItems.every((item) => selectedItemIds.has(item.id)) ? <CheckSquare className="h-4 w-4" /> : <Square className="h-4 w-4" />}
              {filteredItems.every((item) => selectedItemIds.has(item.id)) ? 'Deselect visible items' : 'Select visible items'}
            </button>
            <span className="text-xs" style={{color:'var(--gray)'}}>{selectedItemIds.size} selected</span>
          </div>
          {selectedItemIds.size > 0 && (
            <div className="space-y-3 border-t pt-3" style={{borderColor:'var(--line)'}}>
              <p className="text-sm font-semibold" style={{color:'var(--ink)'}}>Bulk edit selected items</p>
              <p className="text-xs" style={{color:'var(--gray)'}}>Only fields you fill in will change. Leave a field blank to keep each item's current value.</p>
              <div className="space-y-4">
                <div className="rounded-xl border p-3" style={{borderColor:'var(--line)',background:'var(--white)'}}>
                  <ChipPicker label="Set category" options={MENU_CATEGORY_NAMES} value={bulkCategory} onChange={(value) => { setBulkCategory(value); setBulkSubcategory(''); }} />
                  <p className="mt-2 text-[11px]" style={{color:'var(--gray)'}}>Choose a category or Custom. Leave unselected to keep each item's category.</p>
                </div>
                <div className="rounded-xl border p-3" style={{borderColor:'var(--line)',background:'var(--white)'}}>
                  <ChipPicker label="Set subcategory" options={bulkCategory ? (MENU_CATEGORY_PRESETS[bulkCategory.toLowerCase()] ?? []) : Array.from(new Set(menuItems.filter((item) => selectedItemIds.has(item.id)).map((item) => (item as any).subcategory).filter((value): value is string => typeof value === 'string' && value.length > 0)))} value={bulkSubcategory} onChange={setBulkSubcategory} />
                  <p className="mt-2 text-[11px]" style={{color:'var(--gray)'}}>Leave unselected to keep each item's subcategory.</p>
                </div>
              </div>
              {bulkError && <p role="alert" className="text-sm" style={{color:'var(--red)'}}>{bulkError}</p>}
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <button type="button" disabled={bulkSaving || bulkDeleting} onClick={handleBulkUpdate} className="min-h-14 rounded-xl px-6 py-3 text-sm font-bold text-white disabled:opacity-50" style={{background:'var(--orange)'}}>{bulkSaving ? 'Saving changes…' : 'Apply changes to selected'}</button>
                <button type="button" disabled={bulkSaving || bulkDeleting} onClick={() => { setSelectedItemIds(new Set()); setBulkCategory(''); setBulkSubcategory(''); setBulkError(''); }} className="min-h-14 rounded-xl border px-6 py-3 text-sm font-semibold disabled:opacity-50" style={{borderColor:'var(--line)',color:'var(--ink)',background:'var(--white)'}}>Cancel selection</button>
                <button type="button" disabled={bulkSaving || bulkDeleting} onClick={handleBulkDelete} className="sm:col-span-2 min-h-14 rounded-xl border-2 px-6 py-3 text-sm font-bold disabled:opacity-50" style={{borderColor:'var(--red)',color:'var(--red)',background:'var(--white)'}}>{bulkDeleting ? 'Deleting selected items…' : 'Delete selected items'}</button>
              </div>
            </div>
          )}
        </section>
      )}

      {!isLoading && menuItems.length === 0 && (
        <p className="text-[12.5px] py-6 text-center" style={{ color: 'var(--gray)' }}>
          No menu items yet. Add your first dish to get started.
        </p>
      )}

              {!isLoading && filteredItems.length > 0 && (
        <div className="grid grid-cols-1 gap-3 md:hidden">
          {filteredItems.map((item) => (
            <article key={item.id} className="overflow-hidden rounded-2xl border p-3 shadow-sm" style={{ borderColor: 'var(--line)', background: 'var(--white)' }}>
              <div className="flex items-start gap-3">
                <input type="checkbox" checked={selectedItemIds.has(item.id)} onChange={() => toggleItemSelection(item.id)} aria-label={`Select ${item.name} for bulk editing`} className="mt-1 h-5 w-5 shrink-0 accent-orange-500" />
                {(Array.isArray((item as any).image_urls) && (item as any).image_urls[0]) || item.image_url ? (
                  <SafeImage src={(Array.isArray((item as any).image_urls) && (item as any).image_urls[0]) || item.image_url!} alt={item.name} className="h-16 w-16 shrink-0 rounded-xl object-cover" />
                ) : (
                  <div className="h-16 w-16 shrink-0 rounded-xl" style={{ background: 'var(--peach)' }} aria-hidden="true" />
                )}
                <div className="min-w-0 flex-1">
                  <h2 className="break-words text-sm font-bold leading-5" style={{ color: 'var(--ink)' }}>{item.name}</h2>
                  <p className="mt-1 break-all text-[11px]" style={{ color: 'var(--gray)' }}>SKU: {item.sku}</p>
                  <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                    <p className="text-base font-bold tabular-nums" style={{ color: 'var(--ink)' }}>₦{Number(item.price).toLocaleString()}</p>
                    <span className="inline-flex rounded-full px-3 py-1.5 text-[11px] font-semibold" style={item.is_available ? { background: '#E7F6EC', color: '#207245' } : { background: '#FCE8E6', color: '#B42318' }}>
                      {item.is_available ? 'Available' : 'Unavailable'}
                    </span>
                  </div>
                </div>
              </div>
              <div className="mb-3 flex items-center gap-2">
                <span className="text-[11px] font-semibold" style={{color:'var(--gray)'}}>Display order</span>
                <button type="button" onClick={() => void moveItem(item, -1)} className="flex h-9 w-9 items-center justify-center rounded-lg border" style={{borderColor:'var(--line)',color:'var(--ink)'}} aria-label={`Move ${item.name} earlier`} title="Move earlier"><ArrowUp className="h-4 w-4"/></button>
                <button type="button" onClick={() => void moveItem(item, 1)} className="flex h-9 w-9 items-center justify-center rounded-lg border" style={{borderColor:'var(--line)',color:'var(--ink)'}} aria-label={`Move ${item.name} later`} title="Move later"><ArrowDown className="h-4 w-4"/></button>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-3 border-t pt-4" style={{ borderColor: 'var(--line)' }}>
                <button type="button" disabled={availabilityBusyId === item.id} onClick={() => toggleAvailability(item)} className="flex min-h-12 items-center justify-center gap-2 rounded-xl border px-3 py-3 text-xs font-semibold leading-tight transition hover:brightness-95 active:scale-[0.98] disabled:opacity-50" style={{ borderColor: 'var(--line)', color: item.is_available ? 'var(--gray)' : '#207245' }}>
                  {item.is_available ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  {item.is_available ? 'Hide' : 'Show'}
                </button>
                <button type="button" onClick={() => router.push('/restaurant-portal/dashboard/menu/item?edit=' + encodeURIComponent(item.id))} className="flex min-h-12 items-center justify-center gap-2 rounded-xl border px-3 py-3 text-xs font-semibold leading-tight transition hover:brightness-95 active:scale-[0.98]" style={{ borderColor: 'var(--line)', color: 'var(--ink)', background: 'var(--peach)' }}>
                  <Pencil className="h-4 w-4" /> Edit
                </button>
                <button type="button" onClick={() => handleDelete(item)} className="flex min-h-11 items-center justify-center gap-1 rounded-lg border px-2 text-xs font-semibold" style={{ borderColor: 'var(--line)', color: 'var(--red)' }}>
                  <Trash2 className="h-4 w-4" /> Delete
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      {!isLoading && filteredItems.length > 0 && (
        <div className="hidden max-w-full overflow-x-auto rounded-xl border md:block" style={{ borderColor: 'var(--line)' }}>
          <table className="w-full min-w-[560px] table-fixed border-collapse text-left">
            <colgroup>
              <col style={{ width: '40px' }} />
              <col style={{ width: '220px' }} />
              <col style={{ width: '88px' }} />
              <col style={{ width: '100px' }} />
              <col style={{ width: '108px' }} />
            </colgroup>
            <thead>
              <tr style={{ background: 'var(--peach)' }}>
                <th className="px-2 py-3 text-center text-[11px] font-semibold" style={{ color: 'var(--ink)' }}><span className="sr-only">Select</span></th>
                <th className="px-3 py-3 text-[11px] font-semibold" style={{ color: 'var(--ink)' }}>Menu item</th>
                <th className="px-2 py-3 text-right text-[11px] font-semibold" style={{ color: 'var(--ink)' }}>Price</th>
                <th className="px-2 py-3 text-center text-[11px] font-semibold" style={{ color: 'var(--ink)' }}>Availability</th>
                <th className="px-2 py-3 text-center text-[11px] font-semibold" style={{ color: 'var(--ink)' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.map((item) => (
                <tr key={item.id} className="border-t align-middle" style={{ borderColor: 'var(--line)' }}>
                  <td className="px-2 py-3 text-center">
                    <input type="checkbox" checked={selectedItemIds.has(item.id)} onChange={() => toggleItemSelection(item.id)} aria-label={`Select ${item.name} for bulk editing`} className="h-4 w-4 accent-orange-500" />
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex min-w-0 items-center gap-2">
                      {(Array.isArray((item as any).image_urls) && (item as any).image_urls[0]) || item.image_url ? (
                        <SafeImage
                          src={(Array.isArray((item as any).image_urls) && (item as any).image_urls[0]) || item.image_url!}
                          alt={item.name}
                          className="h-9 w-9 shrink-0 rounded-md object-cover"
                        />
                      ) : (
                        <div className="h-9 w-9 shrink-0 rounded-md" style={{ background: 'var(--peach)' }} aria-hidden="true" />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate whitespace-nowrap text-[12px] font-semibold" style={{ color: 'var(--ink)' }} title={item.name}>{item.name}</p>
                        <p className="mt-0.5 truncate text-[10px]" style={{ color: 'var(--gray)' }} title={`SKU: ${item.sku}`}>SKU: {item.sku}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-2 py-3 text-right text-[12px] tabular-nums" style={{ color: 'var(--ink)' }}>₦{Number(item.price).toLocaleString()}</td>
                  <td className="px-2 py-3 text-center">
                    <span className="inline-block max-w-full rounded-full px-2 py-1 text-[10px] font-semibold" style={item.is_available ? { background: '#E7F6EC', color: '#207245' } : { background: '#FCE8E6', color: '#B42318' }}>
                      {item.is_available ? 'Available' : 'Unavailable'}
                    </span>
                  </td>
                  <td className="px-2 py-3">
                    <div className="flex items-center justify-center gap-1">
                      <button type="button" onClick={() => void moveItem(item, -1)} className="flex h-9 w-8 shrink-0 items-center justify-center rounded-md border" style={{borderColor:'var(--line)',color:'var(--ink)'}} aria-label={`Move ${item.name} earlier`} title="Move earlier"><ArrowUp className="h-4 w-4"/></button>
                      <button type="button" onClick={() => void moveItem(item, 1)} className="flex h-9 w-8 shrink-0 items-center justify-center rounded-md border" style={{borderColor:'var(--line)',color:'var(--ink)'}} aria-label={`Move ${item.name} later`} title="Move later"><ArrowDown className="h-4 w-4"/></button>
                      <button type="button" disabled={availabilityBusyId === item.id} onClick={() => toggleAvailability(item)} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md disabled:opacity-50" style={{ color: item.is_available ? 'var(--gray)' : '#207245' }} aria-label={item.is_available ? 'Mark ' + item.name + ' unavailable' : 'Mark ' + item.name + ' available'} title={item.is_available ? 'Mark unavailable' : 'Mark available'}>
                        {item.is_available ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                      <button type="button" onClick={() => router.push('/restaurant-portal/dashboard/menu/item?edit=' + encodeURIComponent(item.id))} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border" style={{ color: 'var(--ink)', borderColor: 'var(--line)', background: 'var(--peach)' }} aria-label={`Edit ${item.name}`} title="Edit item">
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button type="button" onClick={() => handleDelete(item)} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border" style={{ color: 'var(--red)', borderColor: 'var(--line)', background: 'var(--white)' }} aria-label={`Delete ${item.name}`} title="Delete item">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showBulkDeleteConfirm && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !bulkDeleting) setShowBulkDeleteConfirm(false);
          }}
        >
          <section
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="bulk-delete-title"
            aria-describedby="bulk-delete-description"
            className="w-full max-w-md rounded-2xl border p-5 shadow-2xl sm:p-6"
            style={{ background: 'var(--white)', borderColor: 'var(--line)' }}
          >
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full" style={{ background: '#FDE8E7', color: 'var(--red)' }}>
              <Trash2 className="h-6 w-6" />
            </div>
            <h2 id="bulk-delete-title" className="text-lg font-bold" style={{ color: 'var(--ink)' }}>
              Delete {menuItems.filter((item) => selectedItemIds.has(item.id)).length} selected menu item{menuItems.filter((item) => selectedItemIds.has(item.id)).length === 1 ? '' : 's'}?
            </h2>
            <p id="bulk-delete-description" className="mt-2 text-sm leading-6" style={{ color: 'var(--gray)' }}>
              This will permanently remove the selected items from your restaurant menu. This action cannot be undone.
            </p>
            {bulkError && <p role="alert" className="mt-3 text-sm" style={{ color: 'var(--red)' }}>{bulkError}</p>}
            <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <button
                type="button"
                disabled={bulkDeleting}
                onClick={() => setShowBulkDeleteConfirm(false)}
                className="order-2 min-h-12 rounded-xl border px-4 py-3 text-sm font-semibold transition hover:bg-gray-50 disabled:opacity-50 sm:order-1"
                style={{ borderColor: 'var(--line)', color: 'var(--ink)', background: 'var(--white)' }}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={bulkDeleting}
                onClick={confirmBulkDelete}
                className="order-1 flex min-h-12 items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold text-white transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-60 sm:order-2"
                style={{ background: 'var(--red)' }}
              >
                <Trash2 className="h-4 w-4" />
                {bulkDeleting ? 'Deleting items…' : 'Yes, delete selected'}
              </button>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
