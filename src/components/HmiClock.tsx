'use client';

import { useEffect, useState } from 'react';

/**
 * A live HMI-style clock: DD/MMM/YYYY HH:MM:SS in monospace.
 * Renders nothing until mounted so server and client markup agree.
 */
export function HmiClock() {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const stamp = now
    ? `${String(now.getDate()).padStart(2, '0')}/${now
        .toLocaleString('en', { month: 'short' })
        .toUpperCase()}/${now.getFullYear()} ${now.toLocaleTimeString('en-GB')}`
    : '--/---/---- --:--:--';

  return (
    <span className="mono bevel-in hidden bg-[#0b1c33] px-2 py-1 text-[11px] tracking-wider text-[#5fe08a] lg:inline-block" suppressHydrationWarning>
      {stamp}
    </span>
  );
}
