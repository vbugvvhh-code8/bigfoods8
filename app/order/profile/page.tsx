'use client';

import {useEffect, useState} from 'react';
import {useRouter} from 'next/navigation';
import {LogOut, User} from 'lucide-react';
import {useMyProfile} from '@/hooks/useMyProfile';
import {useCart} from '@/hooks/useCart';
import useActiveLocations from '@/hooks/useActiveLocations';
import {AuthGate} from '@/components/customer/shell/AuthGate';
import {SavedAddressesList} from '@/components/customer/orders/SavedAddressesList';

function ProfileContent() {
  const router = useRouter();
  const {profile, email, isLoading, isSaving, error, updateProfile, signOut} = useMyProfile();
  const {clearCart} = useCart();
  const {locations} = useActiveLocations();

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [lga, setLga] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name ?? '');
      setPhone(profile.phone ?? '');
      setLga(profile.lga ?? '');
    }
  }, [profile]);

  const handleSave = async () => {
    setSaved(false);
    const ok = await updateProfile({full_name: fullName || null, phone: phone || null, lga: lga || null, state: lga ? 'Anambra' : null});
    if (ok) {
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    clearCart();
    router.push('/order');
  };

  if (isLoading) {
    return (
      <div className="w-full max-w-[380px] mx-auto px-4 py-8 space-y-3" aria-busy="true">
        <div className="h-16 rounded-xl animate-pulse" style={{background: 'var(--peach)'}} />
        <div className="h-10 rounded-xl animate-pulse" style={{background: 'var(--peach)'}} />
        <div className="h-10 rounded-xl animate-pulse" style={{background: 'var(--peach)'}} />
      </div>
    );
  }

  return (
    <div className="w-full max-w-[380px] lg:max-w-2xl mx-auto px-4 py-6">
      <div className="flex items-center gap-3 mb-6">
        <div
          className="w-12 h-12 rounded-full flex items-center justify-center"
          style={{background: 'var(--peach)', color: 'var(--orange)'}}
        >
          <User className="w-5 h-5" />
        </div>
        <div>
          <h1 className="font-display text-[16px] font-semibold" style={{color: 'var(--ink)'}}>
            {profile?.full_name || 'Your profile'}
          </h1>
          <p className="text-[12px]" style={{color: 'var(--gray)'}}>
            {email}
          </p>
        </div>
      </div>

      <label className="block text-[11.5px] font-semibold mb-1.5" style={{color: 'var(--gray)'}}>
        Full name
      </label>
      <input
        type="text"
        value={fullName}
        onChange={(e) => setFullName(e.target.value)}
        placeholder="Your name"
        className="w-full rounded-xl px-3.5 py-2.5 text-[13px] outline-none mb-4"
        style={{background: 'var(--peach)', color: 'var(--ink)'}}
      />

      <label className="block text-[11.5px] font-semibold mb-1.5" style={{color: 'var(--gray)'}}>
        Phone number
      </label>
      <input
        type="tel"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        placeholder="080..."
        className="w-full rounded-xl px-3.5 py-2.5 text-[13px] outline-none mb-4"
        style={{background: 'var(--peach)', color: 'var(--ink)'}}
      />

      <label className="block text-[11.5px] font-semibold mb-1.5" style={{color: 'var(--gray)'}}>
        Local government area
      </label>
      <select
        value={lga}
        onChange={(e) => setLga(e.target.value)}
        className="w-full rounded-xl px-3.5 py-2.5 text-[13px] outline-none mb-4"
        style={{background: 'var(--peach)', color: 'var(--ink)'}}
      >
        <option value="">Select an area</option>
        {locations.map((l) => (
          <option key={l.lga} value={l.lga}>
            {l.lga}
          </option>
        ))}
      </select>

      <label className="block text-[11.5px] font-semibold mb-1.5" style={{color: 'var(--gray)'}}>
        Saved locations
      </label>
      <div className="mb-4">
        <SavedAddressesList />
      </div>

      {error && (
        <p className="text-[12px] mb-3" style={{color: 'var(--red, #C1453A)'}}>
          {error}
        </p>
      )}

      <button
        onClick={handleSave}
        disabled={isSaving}
        className="w-full py-3 rounded-xl text-[13px] font-semibold text-white disabled:opacity-60"
        style={{background: 'var(--orange)'}}
      >
        {isSaving ? 'Saving…' : saved ? 'Saved ✓' : 'Save changes'}
      </button>

      <button
        onClick={handleSignOut}
        className="w-full mt-3 py-3 rounded-xl text-[13px] font-semibold flex items-center justify-center gap-2"
        style={{color: 'var(--gray)', border: '1px solid var(--line)'}}
      >
        <LogOut className="w-4 h-4" />
        Log out
      </button>
    </div>
  );
}

export default function ProfilePage() {
  return (
    <AuthGate>
      <ProfileContent />
    </AuthGate>
  );
}
