'use client';

import {useEffect, useState} from 'react';
import {useRouter} from 'next/navigation';
import {LogOut} from 'lucide-react';
import {useMyProfile} from '@/hooks/useMyProfile';
import {useCart} from '@/hooks/useCart';
import {NIGERIA_STATES, lgaOptions, stateOfZone} from '@/lib/nigeriaLocations';
import {AuthGate} from '@/components/customer/shell/AuthGate';
import {SavedAddressesList} from '@/components/customer/orders/SavedAddressesList';

function ProfileContent() {
  const router = useRouter();
  const {profile, email, isLoading, isSaving, error, updateProfile, signOut} = useMyProfile();
  const {clearCart} = useCart();

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [lga, setLga] = useState('');
  const [stateName, setStateName] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name ?? '');
      setPhone(profile.phone ?? '');
      setLga(profile.lga ?? '');
      setStateName(profile.state ?? stateOfZone(profile.lga) ?? '');
    }
  }, [profile]);

  const handleSave = async () => {
    setSaved(false);
    const ok = await updateProfile({full_name: fullName || null, phone: phone || null, lga: lga || null, state: lga ? stateName || null : null});
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

  const fieldClass = "w-full rounded-xl border px-3.5 py-3 text-[13px] outline-none mb-4 transition-colors focus:border-orange-400 focus:ring-2 focus:ring-orange-100 disabled:opacity-60";
  const fieldStyle = {background: 'var(--peach)', color: 'var(--ink)', borderColor: 'var(--line)'};

  return (
    <div className="w-full max-w-[380px] lg:max-w-2xl mx-auto px-4 py-6">
      <div className="flex items-center gap-3 mb-6">
        <div
          className="w-16 h-16 rounded-full overflow-hidden flex-shrink-0"
          style={{border: '2px solid var(--line)', background: 'var(--peach)'}}
        >
          <img
            src="/images/customer-profile-avatar.svg"
            alt="3D profile avatar"
            className="w-full h-full object-cover"
          />
        </div>
        <div className="min-w-0">
          <h1 className="font-display text-[16px] font-semibold" style={{color: 'var(--ink)'}}>
            {profile?.full_name || 'Your profile'}
          </h1>
          <p className="text-[12px] break-all" style={{color: 'var(--gray)'}}>
            {email}
          </p>
        </div>
      </div>

      <label htmlFor="profile-full-name" className="block text-[11.5px] font-semibold mb-1.5" style={{color: 'var(--gray)'}}>
        Full name
      </label>
      <input
        id="profile-full-name"
        type="text"
        value={fullName}
        onChange={(e) => setFullName(e.target.value)}
        placeholder="Your name"
        className={fieldClass}
        style={fieldStyle}
      />

      <label htmlFor="profile-phone" className="block text-[11.5px] font-semibold mb-1.5" style={{color: 'var(--gray)'}}>
        Phone number
      </label>
      <input
        id="profile-phone"
        type="tel"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        placeholder="080..."
        className={fieldClass}
        style={fieldStyle}
      />

      <label htmlFor="profile-state" className="block text-[11.5px] font-semibold mb-1.5" style={{color: 'var(--gray)'}}>
        State
      </label>
      <select
        id="profile-state"
        value={stateName}
        onChange={(e) => {
          setStateName(e.target.value);
          setLga('');
        }}
        className={fieldClass}
        style={fieldStyle}
      >
        <option value="">Select your state</option>
        {NIGERIA_STATES.map((st) => (
          <option key={st} value={st}>
            {st}
          </option>
        ))}
      </select>

      <label htmlFor="profile-lga" className="block text-[11.5px] font-semibold mb-1.5" style={{color: 'var(--gray)'}}>
        Local government area
      </label>
      <select
        id="profile-lga"
        value={lga}
        onChange={(e) => setLga(e.target.value)}
        disabled={!stateName}
        className={fieldClass}
        style={fieldStyle}
      >
        <option value="">{stateName ? 'Select an area' : 'Choose a state first'}</option>
        {lgaOptions(stateName).map((l) => (
          <option key={l.value} value={l.value}>
            {l.label}
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
