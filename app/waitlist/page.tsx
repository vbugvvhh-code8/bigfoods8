'use client';

import { FormEvent, useMemo, useState } from 'react';
import Link from 'next/link';
import getBrowserSupabase from '@/lib/supabase/client';
import { NIGERIA_LOCATIONS } from '@/lib/nigeriaLocations';

type Intent = 'customer' | 'restaurant' | 'rider';

export default function WaitlistPage() {
  const supabase = getBrowserSupabase();
  const states = useMemo(() => Object.keys(NIGERIA_LOCATIONS).sort(), []);
  const [state, setState] = useState('Anambra');
  const [area, setArea] = useState('');
  const [email, setEmail] = useState('');
  const [intent, setIntent] = useState<Intent>('customer');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const areas = NIGERIA_LOCATIONS[state] ?? [];

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setSuccess('');

    const normalizedEmail = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      setError('Enter a valid email address.');
      return;
    }
    if (!area || !areas.includes(area)) {
      setError('Choose a local government area.');
      return;
    }

    setSubmitting(true);
    try {
      const { data: location, error: locationError } = await supabase
        .from('locations')
        .select('is_active')
        .eq('state', state)
        .eq('lga', area)
        .maybeSingle();

      if (locationError) throw locationError;

      if (location?.is_active) {
        setSuccess('Good news — BigFoods currently serves this area. Head to Order food now to explore available kitchens.');
        setSubmitting(false);
        return;
      }

      const { error: insertError } = await supabase.from('waitlist_submissions').insert({
        email: normalizedEmail,
        intent,
        detected_state: state,
        detected_lga: area,
      });

      if (insertError) throw insertError;
      setSuccess('You’re on the list. We’ll use your area and interest to understand where BigFoods should launch next.');
      setEmail('');
    } catch {
      setError('We couldn’t submit your request right now. Please try again in a moment.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#FFFDF9] px-4 py-10 text-[#241C14] sm:px-6">
      <div className="mx-auto max-w-xl">
        <Link href="/" className="text-sm font-semibold text-[#B84E0A] hover:underline">← Back to BigFoods</Link>
        <section className="mt-6 rounded-2xl border border-[#F0E3D6] bg-white p-6 shadow-sm sm:p-8">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#B84E0A]">Coming to your area?</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight">Help us choose where to launch next.</h1>
          <p className="mt-3 text-sm leading-6 text-[#6E6256]">
            Tell us where you are and how you’d like to use BigFoods. We’ll count demand by area before expanding service.
          </p>

          {success ? (
            <div className="mt-6 rounded-xl border border-[#B9D9C3] bg-[#F0F8F2] p-4 text-sm leading-6 text-[#245A35]" role="status">
              <p>{success}</p>
              {success.startsWith('Good news') && (
                <Link href="/order" className="mt-2 inline-block font-semibold underline">Order food now</Link>
              )}
              <button type="button" onClick={() => { setSuccess(''); setArea(''); }} className="mt-3 block font-semibold underline">
                Submit another area
              </button>
            </div>
          ) : (
            <form onSubmit={submit} className="mt-6 space-y-4">
              <div>
                <label htmlFor="waitlist-intent" className="mb-1.5 block text-sm font-semibold">I’m interested as a</label>
                <select id="waitlist-intent" value={intent} onChange={(e) => setIntent(e.target.value as Intent)} className="w-full rounded-lg border border-[#E8DCCE] bg-white px-3 py-3 text-sm outline-none focus:border-[#FF7A2E]">
                  <option value="customer">Customer</option>
                  <option value="restaurant">Restaurant / home kitchen</option>
                  <option value="rider">Delivery rider</option>
                </select>
              </div>
              <div>
                <label htmlFor="waitlist-state" className="mb-1.5 block text-sm font-semibold">State or territory</label>
                <select id="waitlist-state" value={state} onChange={(e) => { setState(e.target.value); setArea(''); }} className="w-full rounded-lg border border-[#E8DCCE] bg-white px-3 py-3 text-sm outline-none focus:border-[#FF7A2E]">
                  {states.map((item) => <option key={item} value={item}>{item}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="waitlist-area" className="mb-1.5 block text-sm font-semibold">Local government area (LGA)</label>
                <select id="waitlist-area" value={area} onChange={(e) => setArea(e.target.value)} required className="w-full rounded-lg border border-[#E8DCCE] bg-white px-3 py-3 text-sm outline-none focus:border-[#FF7A2E]">
                  <option value="">Choose your LGA</option>
                  {areas.map((item) => <option key={item} value={item}>{item}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="waitlist-email" className="mb-1.5 block text-sm font-semibold">Email address</label>
                <input id="waitlist-email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required maxLength={254} placeholder="you@example.com" className="w-full rounded-lg border border-[#E8DCCE] bg-white px-3 py-3 text-sm outline-none focus:border-[#FF7A2E]" />
              </div>

              {error && <p className="text-sm text-red-700" role="alert">{error}</p>}
              <button type="submit" disabled={submitting} className="w-full rounded-full bg-[#FF7A2E] px-5 py-3.5 text-sm font-bold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60">
                {submitting ? 'Submitting…' : 'Join the waitlist'}
              </button>
              <p className="text-xs leading-5 text-[#7A6D60]">Please provide an email you’re comfortable sharing with BigFoods for launch-interest updates.</p>
            </form>
          )}
        </section>
      </div>
    </main>
  );
}
