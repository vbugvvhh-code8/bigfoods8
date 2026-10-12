'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import useOnboardingSession, { stepPath } from '@/hooks/useOnboardingSession';
import { PUBLIC_LAUNCH_DATE } from '@/lib/launchDate';

const SEATS_PER_STATE = 1000;

const launchLabel = PUBLIC_LAUNCH_DATE.toLocaleDateString('en-NG', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
});

const SECTIONS: { title: string; body: string[] }[] = [
  {
    title: '1. Only 1,000 sellers per state',
    body: [
      `BigFoods accepts a maximum of ${SEATS_PER_STATE.toLocaleString()} restaurants and home cooks in each state. Your paid onboarding fee secures one of those places in your state.`,
      'Once a state is full, nobody else can register there. The only way in after that is to take over an existing account from a seller who is willing to sell it, and BigFoods must approve every transfer. This makes your place on BigFoods a valuable asset, so protect it.',
      'The fee is also how we keep out people who are not serious. We want sellers who will cook properly, deliver on time and stay.',
    ],
  },
  {
    title: '2. Cleanliness is not optional',
    body: [
      'You must prepare every order in a clean place, using clean hands, clean utensils, clean surfaces and safe water.',
      'Wash your hands before cooking and after handling raw food, money, phones or waste. Keep raw and cooked food apart. Cover food, keep it at a safe temperature, and never reuse oil, leftovers or ingredients that have gone bad.',
      'Keep your kitchen free of pests, dirt and anything that can contaminate food. Do not cook when you are sick or have open wounds. Use clean, sealed packaging for every delivery.',
    ],
  },
  {
    title: '3. Your food must be exactly what you say it is',
    body: [
      'The food, ingredients, portions and prices on your menu must match what the customer receives.',
      'You must not add anything that is not listed. That includes spices, seasoning cubes, colourings, flavour enhancers, preservatives, alcohol, drugs, or any other substance the customer did not agree to. If an ingredient can cause an allergic reaction, or a customer could reasonably object to it, you must declare it on the menu.',
      'You must never tamper with, swap or substitute an order, and you must never hand over food you know or suspect is unsafe, stale or contaminated.',
    ],
  },
  {
    title: '4. What happens if you break these rules',
    body: [
      'If an order is defective, unsafe or contains anything that was not disclosed, BigFoods may suspend or permanently remove your account, hold or cancel your payouts for the affected orders, and refund the customer from your earnings.',
      'You are responsible for any harm your food causes. Where food is proven to be defective, contaminated or tampered with, BigFoods will report it to the relevant food safety and health authorities and the police, and will support the affected customer. We will also pursue legal action against you, including claims for damages, to the fullest extent allowed by Nigerian law.',
      'Fake orders, fake reviews, abusing riders or customers, and lying about who you are or what your business is will also lead to removal and may be reported.',
    ],
  },
  {
    title: '5. Orders, riders and honesty',
    body: [
      'Accept only orders you can make. Prepare them on time. Hand them to the rider properly packed. If you cannot fulfil an order, tell us straight away.',
      'You must be 18 or older. Every detail you give us, including your name, date of birth, address and bank account, must be true and must be yours.',
    ],
  },
  {
    title: '6. Money and registration',
    body: [
      'You pay a one-time onboarding fee for the plan you choose. It includes free ads for the plan period, starting on the launch date below, so paying early costs you nothing.',
      'If your business is not registered with the CAC, your withdrawals will pause once your sales reach ₦10,000,000, until you register and we confirm your CAC number. We will email you well before that. Registered businesses have no limit once we confirm their number.',
      'A 5% fee applies to each withdrawal. Withdrawals go only to a bank account in your own name.',
    ],
  },
  {
    title: '7. Launch date',
    body: [
      `BigFoods opens to customers on ${launchLabel}. Your free ads begin on that day, so you lose none of the time you paid for. Until then you can finish setting up, add your menu and get ready.`,
    ],
  },
];

export default function AgreementPage() {
  const router = useRouter();
  const { draft, updateDraft, hydrated } = useOnboardingSession();
  const endRef = useRef<HTMLDivElement>(null);
  const [reachedEnd, setReachedEnd] = useState(false);
  const [serious, setSerious] = useState(false);
  const [consequences, setConsequences] = useState(false);
  const [terms, setTerms] = useState(false);

  // Unlock the tick boxes only after the reader has scrolled to the end.
  useEffect(() => {
    const el = endRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') {
      setReachedEnd(true);
      return;
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setReachedEnd(true);
      },
      { threshold: 0.6 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [hydrated]);

  // Someone who already accepted doesn't have to scroll again.
  useEffect(() => {
    if (hydrated && draft.agreementReadAt) {
      setReachedEnd(true);
      setSerious(!!draft.seriousBusinessAck);
      setConsequences(!!draft.warningsAck);
      setTerms(!!draft.termsAccepted);
    }
  }, [hydrated, draft.agreementReadAt, draft.seriousBusinessAck, draft.warningsAck, draft.termsAccepted]);

  if (!hydrated) {
    return (
      <p className="text-[12.5px] py-6 text-center" style={{ color: 'var(--gray)' }}>
        Loading…
      </p>
    );
  }

  const canContinue = reachedEnd && serious && consequences && terms;

  function handleContinue() {
    updateDraft({
      agreementReadAt: new Date().toISOString(),
      seriousBusinessAck: true,
      warningsAck: true,
      termsAccepted: true,
    });
    router.push(stepPath('seller-info'));
  }

  return (
    <>
      <h2 className="text-[22px] font-semibold mb-1.5" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
        Read this before you join BigFoods
      </h2>
      <p className="text-[12.5px] mb-5" style={{ color: 'var(--gray)' }}>
        This is a serious agreement. Please read all of it. It takes about three minutes.
      </p>

      <div
        className="p-4 rounded-[12px] mb-6"
        style={{ background: 'var(--peach)', border: '1px solid var(--line)' }}
        role="note"
      >
        <p className="text-[13px] font-semibold mb-1" style={{ color: 'var(--ink)' }}>
          Only {SEATS_PER_STATE.toLocaleString()} sellers per state
        </p>
        <p className="text-[12.5px]" style={{ color: 'var(--ink)' }}>
          When your state reaches {SEATS_PER_STATE.toLocaleString()} restaurants and cooks, registration closes. After
          that, the only way in is to buy an existing account from a seller.
        </p>
      </div>

      <div className="space-y-6">
        {SECTIONS.map((section) => (
          <section key={section.title}>
            <h3 className="text-[15px] font-semibold mb-2" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              {section.title}
            </h3>
            <div className="space-y-2.5">
              {section.body.map((paragraph) => (
                <p key={paragraph} className="text-[13px] leading-relaxed" style={{ color: 'var(--ink)' }}>
                  {paragraph}
                </p>
              ))}
            </div>
          </section>
        ))}
      </div>

      <div ref={endRef} className="h-px mt-6" aria-hidden="true" />

      <fieldset className="mt-4 mb-5 space-y-3" disabled={!reachedEnd}>
        <legend className="text-[12px] font-semibold mb-2" style={{ color: 'var(--ink)' }}>
          {reachedEnd ? 'Confirm each statement' : 'Scroll to the end to continue'}
        </legend>
        {[
          [serious, setSerious, 'a', 'I am starting a serious food business. I am not testing or playing around.'],
          [
            consequences,
            setConsequences,
            'b',
            'I have read and understood the rules on cleanliness, honest ingredients and the legal action BigFoods can take if my food is defective or tampered with.',
          ],
          [terms, setTerms, 'c', 'I accept the BigFoods terms for sellers, including the 1,000-per-state limit.'],
        ].map(([value, setter, id, text]) => (
          <label
            key={id as string}
            htmlFor={`agree-${id}`}
            className="flex items-start gap-2.5 text-[12.5px] cursor-pointer"
            style={{ color: 'var(--ink)', opacity: reachedEnd ? 1 : 0.5 }}
          >
            <input
              id={`agree-${id}`}
              type="checkbox"
              checked={value as boolean}
              onChange={(e) => (setter as (v: boolean) => void)(e.target.checked)}
              className="mt-0.5 w-4 h-4 flex-shrink-0 accent-[var(--orange)]"
            />
            <span>{text as string}</span>
          </label>
        ))}
      </fieldset>

      <button
        onClick={handleContinue}
        disabled={!canContinue}
        className="w-full py-3.5 rounded-[10px] text-[13.5px] font-semibold text-white disabled:opacity-40"
        style={{ background: 'var(--orange)' }}
      >
        I agree, continue
      </button>
    </>
  );
}
