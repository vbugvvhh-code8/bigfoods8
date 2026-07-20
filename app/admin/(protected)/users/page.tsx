'use client';

import { useEffect, useMemo, useState } from 'react';
import { Star, Ban, CheckCircle2, Search } from 'lucide-react';
import PageHeader from '@/components/admin/layout/PageHeader';
import getBrowserSupabase from '@/lib/supabase/client';

interface AdminUser {
  id: string;
  email: string;
  role: string;
  full_name: string | null;
  phone: string | null;
  status: string | null;
  state: string | null;
  lga: string | null;
  blocked: boolean;
  block_reason: string | null;
  starred: boolean;
  profile_created_at: string;
  last_sign_in_at: string | null;
}

const ROLE_FILTERS = ['all', 'restaurant', 'rider', 'customer', 'admin'];

export default function AdminUsersPage() {
  const supabase = getBrowserSupabase();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [roleFilter, setRoleFilter] = useState('all');
  const [joinedTodayOnly, setJoinedTodayOnly] = useState(false);
  const [starredOnly, setStarredOnly] = useState(false);
  const [search, setSearch] = useState('');

  const [blockingId, setBlockingId] = useState<string | null>(null);
  const [blockReason, setBlockReason] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);

  async function fetchUsers() {
    setLoading(true);
    setError(null);
    const { data, error: rpcError } = await supabase.rpc('admin_list_users');
    if (rpcError) setError(rpcError.message);
    setUsers((data as AdminUser[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    fetchUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function toggleStar(user: AdminUser) {
    setBusyId(user.id);
    const { error: updateError } = await supabase.from('profiles').update({ starred: !user.starred }).eq('id', user.id);
    setBusyId(null);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    setUsers((prev) => prev.map((u) => (u.id === user.id ? { ...u, starred: !u.starred } : u)));
  }

  async function handleBlock(user: AdminUser) {
    if (!blockReason) return;
    setBusyId(user.id);
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ blocked: true, block_reason: blockReason })
      .eq('id', user.id);
    setBusyId(null);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    setUsers((prev) => prev.map((u) => (u.id === user.id ? { ...u, blocked: true, block_reason: blockReason } : u)));
    setBlockingId(null);
    setBlockReason('');
  }

  async function handleUnblock(user: AdminUser) {
    setBusyId(user.id);
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ blocked: false, block_reason: null })
      .eq('id', user.id);
    setBusyId(null);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    setUsers((prev) => prev.map((u) => (u.id === user.id ? { ...u, blocked: false, block_reason: null } : u)));
  }

  const todayStart = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const filtered = users.filter((u) => {
    if (roleFilter !== 'all' && u.role !== roleFilter) return false;
    if (joinedTodayOnly && new Date(u.profile_created_at) < todayStart) return false;
    if (starredOnly && !u.starred) return false;
    if (search) {
      const q = search.toLowerCase();
      const matches =
        u.full_name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q) || u.phone?.toLowerCase().includes(q);
      if (!matches) return false;
    }
    return true;
  });

  return (
    <div>
      <PageHeader title="Users" subtitle="All accounts across the platform" />

      {error && (
        <p className="text-[11.5px] mb-3 p-3 rounded-[9px]" style={{ background: '#FEF2F2', color: 'var(--red)' }}>
          {error}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--gray)' }} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, email, phone"
            className="pl-8 pr-3 py-2 rounded-[8px] text-[12px] outline-none"
            style={{ border: '1px solid var(--line)', minWidth: 220 }}
          />
        </div>

        <div className="flex gap-1 p-0.5 rounded-[8px]" style={{ background: 'var(--peach)' }}>
          {ROLE_FILTERS.map((r) => (
            <button
              key={r}
              onClick={() => setRoleFilter(r)}
              className="px-2.5 py-1.5 rounded-[6px] text-[11px] font-semibold capitalize"
              style={roleFilter === r ? { background: 'white', color: 'var(--ink)' } : { color: 'var(--gray)' }}
            >
              {r}
            </button>
          ))}
        </div>

        <button
          onClick={() => setJoinedTodayOnly((v) => !v)}
          className="px-2.5 py-1.5 rounded-[8px] text-[11px] font-semibold"
          style={
            joinedTodayOnly
              ? { background: 'var(--ink)', color: 'white' }
              : { border: '1px solid var(--line)', color: 'var(--gray)' }
          }
        >
          Joined today
        </button>
        <button
          onClick={() => setStarredOnly((v) => !v)}
          className="px-2.5 py-1.5 rounded-[8px] text-[11px] font-semibold flex items-center gap-1"
          style={
            starredOnly
              ? { background: 'var(--ink)', color: 'white' }
              : { border: '1px solid var(--line)', color: 'var(--gray)' }
          }
        >
          <Star className="w-3 h-3" /> Starred
        </button>
      </div>

      {loading ? (
        <p className="text-[12px] py-6 text-center" style={{ color: 'var(--gray)' }}>Loading…</p>
      ) : filtered.length === 0 ? (
        <p className="text-[12px] py-6 text-center" style={{ color: 'var(--gray)' }}>No users match these filters.</p>
      ) : (
        <div className="space-y-2">
          {filtered.map((u) => (
            <div key={u.id} className="p-3.5 rounded-[10px]" style={{ border: '1px solid var(--line)', background: 'white' }}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="text-[13px] font-semibold truncate" style={{ color: 'var(--ink)' }}>
                      {u.full_name ?? 'No name'}
                    </p>
                    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full capitalize" style={{ background: 'var(--peach)', color: 'var(--orange)' }}>
                      {u.role}
                    </span>
                    {u.blocked && (
                      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full" style={{ background: '#FEF2F2', color: 'var(--red)' }}>
                        Blocked
                      </span>
                    )}
                  </div>
                  <p className="text-[11.5px] truncate" style={{ color: 'var(--gray)' }}>
                    {u.email} {u.phone ? `· ${u.phone}` : ''}
                  </p>
                  <p className="text-[10.5px] mt-0.5" style={{ color: 'var(--gray)' }}>
                    Joined {new Date(u.profile_created_at).toLocaleDateString()}
                    {u.lga ? ` · ${u.lga}` : ''}
                    {u.last_sign_in_at ? ` · last active ${new Date(u.last_sign_in_at).toLocaleDateString()}` : ''}
                  </p>
                  {u.blocked && u.block_reason && (
                    <p className="text-[11px] mt-1" style={{ color: 'var(--red)' }}>
                      Reason: {u.block_reason}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => toggleStar(u)}
                    disabled={busyId === u.id}
                    aria-label={u.starred ? 'Unstar' : 'Star'}
                  >
                    <Star
                      className="w-4 h-4"
                      style={{ color: u.starred ? 'var(--orange)' : 'var(--gray)' }}
                      fill={u.starred ? 'var(--orange)' : 'none'}
                    />
                  </button>
                  {u.blocked ? (
                    <button
                      onClick={() => handleUnblock(u)}
                      disabled={busyId === u.id}
                      className="text-[11px] font-semibold flex items-center gap-1"
                      style={{ color: 'var(--green)' }}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" /> Unblock
                    </button>
                  ) : (
                    <button
                      onClick={() => setBlockingId(blockingId === u.id ? null : u.id)}
                      disabled={busyId === u.id}
                      className="text-[11px] font-semibold flex items-center gap-1"
                      style={{ color: 'var(--red)' }}
                    >
                      <Ban className="w-3.5 h-3.5" /> Block
                    </button>
                  )}
                </div>
              </div>

              {blockingId === u.id && (
                <div className="mt-2.5 flex gap-2">
                  <input
                    value={blockReason}
                    onChange={(e) => setBlockReason(e.target.value)}
                    placeholder="Reason for blocking"
                    className="flex-1 px-3 py-2 rounded-[8px] text-[12px] outline-none"
                    style={{ border: '1px solid var(--line)' }}
                  />
                  <button
                    onClick={() => handleBlock(u)}
                    disabled={!blockReason || busyId === u.id}
                    className="px-3 py-2 rounded-[8px] text-[11.5px] font-semibold text-white disabled:opacity-40"
                    style={{ background: 'var(--red)' }}
                  >
                    Confirm
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
