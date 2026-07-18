'use client';

import { useMemo, useState } from 'react';
import { Plus, Pencil, Trash2, ChevronDown } from 'lucide-react';
import useRestaurant from '@/hooks/useRestaurant';
import { useMenuItems } from '@/hooks/useMenuItems';
import MenuItemForm from '@/components/restaurant/dashboard/MenuItemForm';
import type { MenuItem } from '@/types/database';

const UNCATEGORIZED = 'uncategorized';
const NO_SUBCATEGORY = 'other';

function groupItems(items: MenuItem[]) {
  const tree: Record<string, Record<string, MenuItem[]>> = {};
  for (const item of items) {
    const cat = item.category || UNCATEGORIZED;
    const sub = (item as any).subcategory || NO_SUBCATEGORY;
    tree[cat] = tree[cat] ?? {};
    tree[cat][sub] = tree[cat][sub] ?? [];
    tree[cat][sub].push(item);
  }
  return tree;
}

export default function MenuBuilderPage() {
  const { restaurant, loading: restaurantLoading } = useRestaurant();
  const { menuItems, isLoading, addMenuItem, updateMenuItem, deleteMenuItem } = useMenuItems(restaurant?.id);

  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());

  const tree = useMemo(() => groupItems(menuItems), [menuItems]);
  const categories = Object.keys(tree).sort((a, b) =>
    a === UNCATEGORIZED ? 1 : b === UNCATEGORIZED ? -1 : a.localeCompare(b)
  );

  function toggleCategory(cat: string) {
    setCollapsedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  }

  async function handleDelete(item: MenuItem) {
    if (!confirm(`Remove "${item.name}" from your menu?`)) return;
    await deleteMenuItem(item.id);
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
        {!showAddForm && (
          <button
            type="button"
            onClick={() => setShowAddForm(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-[9px] text-[12.5px] font-semibold text-white"
            style={{ background: 'var(--orange)' }}
          >
            <Plus className="w-3.5 h-3.5" />
            Add item
          </button>
        )}
      </div>

      {showAddForm && (
        <div className="mb-5">
          <MenuItemForm
            restaurantId={restaurant.id}
            onSubmit={addMenuItem}
            onDone={() => setShowAddForm(false)}
            onCancel={() => setShowAddForm(false)}
          />
        </div>
      )}

      {isLoading && (
        <p className="text-[12.5px] py-4 text-center" style={{ color: 'var(--gray)' }}>
          Loading your menu…
        </p>
      )}

      {!isLoading && menuItems.length === 0 && !showAddForm && (
        <p className="text-[12.5px] py-6 text-center" style={{ color: 'var(--gray)' }}>
          No menu items yet. Add your first dish to get started.
        </p>
      )}

      <div className="space-y-4">
        {categories.map((cat) => {
          const subcats = tree[cat];
          const collapsed = collapsedCategories.has(cat);
          const itemCount = Object.values(subcats).reduce((sum, arr) => sum + arr.length, 0);

          return (
            <div key={cat} className="rounded-[12px] overflow-hidden" style={{ border: '1px solid var(--line)' }}>
              <button
                type="button"
                onClick={() => toggleCategory(cat)}
                className="w-full flex items-center justify-between px-4 py-3"
                style={{ background: 'var(--peach)' }}
              >
                <span className="text-[13.5px] font-semibold capitalize" style={{ color: 'var(--ink)' }}>
                  {cat === UNCATEGORIZED ? 'Uncategorized' : cat}
                  <span className="ml-2 text-[11.5px] font-normal" style={{ color: 'var(--gray)' }}>
                    {itemCount} {itemCount === 1 ? 'item' : 'items'}
                  </span>
                </span>
                <ChevronDown
                  className="w-4 h-4 transition-transform"
                  style={{ color: 'var(--gray)', transform: collapsed ? 'rotate(-90deg)' : 'none' }}
                />
              </button>

              {!collapsed && (
                <div className="px-4 py-3 space-y-4">
                  {Object.keys(subcats)
                    .sort((a, b) => (a === NO_SUBCATEGORY ? 1 : b === NO_SUBCATEGORY ? -1 : a.localeCompare(b)))
                    .map((sub) => (
                      <div key={sub}>
                        {sub !== NO_SUBCATEGORY && (
                          <p className="text-[11px] font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--gray)' }}>
                            {sub}
                          </p>
                        )}
                        <div className="space-y-2">
                          {subcats[sub].map((item) =>
                            editingId === item.id ? (
                              <MenuItemForm
                                key={item.id}
                                restaurantId={restaurant.id}
                                existingItem={item}
                                onSubmit={addMenuItem}
                                onUpdate={updateMenuItem}
                                onDone={() => setEditingId(null)}
                                onCancel={() => setEditingId(null)}
                              />
                            ) : (
                              <div
                                key={item.id}
                                className="flex items-center gap-3 p-2.5 rounded-[10px]"
                                style={{ border: '1px solid var(--line)' }}
                              >
                                {item.image_url && (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img
                                    src={item.image_url}
                                    alt={item.name}
                                    className="w-11 h-11 rounded-[8px] object-cover flex-shrink-0"
                                  />
                                )}
                                <div className="flex-1 min-w-0">
                                  <p className="text-[13px] font-semibold truncate" style={{ color: 'var(--ink)' }}>
                                    {item.name}
                                  </p>
                                  <p className="text-[11.5px]" style={{ color: 'var(--gray)' }}>
                                    ₦{Number(item.price).toLocaleString()}
                                  </p>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => setEditingId(item.id)}
                                  style={{ color: 'var(--gray)' }}
                                  aria-label={`Edit ${item.name}`}
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDelete(item)}
                                  style={{ color: 'var(--red)' }}
                                  aria-label={`Delete ${item.name}`}
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            )
                          )}
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}
