'use client';

import {Check} from 'lucide-react';

const STEPS = [
  {key: 'placed', label: 'Placed'},
  {key: 'preparing', label: 'Preparing'},
  {key: 'picked_up', label: 'On the way'},
  {key: 'delivered', label: 'Delivered'},
];

interface OrderStatusStepperProps {
  status: string;
}

export function OrderStatusStepper({status}: OrderStatusStepperProps) {
  if (status === 'cancelled') {
    return (
      <div className="rounded-xl px-3.5 py-3 text-center" style={{background: '#FBEAE8', color: '#C1453A'}}>
        <span className="text-[12.5px] font-semibold">This order was cancelled</span>
      </div>
    );
  }

  const activeIndex = STEPS.findIndex((s) => s.key === status);

  return (
    <div className="flex items-center">
      {STEPS.map((step, i) => {
        const isDone = i <= activeIndex;
        return (
          <div key={step.key} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center gap-1.5">
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center"
                style={isDone ? {background: 'var(--orange)'} : {background: 'var(--peach)'}}
              >
                {isDone && <Check className="w-3.5 h-3.5 text-white" />}
              </div>
              <span
                className="text-[10px] font-medium text-center whitespace-nowrap"
                style={{color: isDone ? 'var(--ink)' : 'var(--gray)'}}
              >
                {step.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div className="flex-1 h-[2px] mx-1 mb-4" style={{background: i < activeIndex ? 'var(--orange)' : 'var(--line)'}} />
            )}
          </div>
        );
      })}
    </div>
  );
}
