'use client';

import { useEffect, useState } from 'react';

/**
 * True when the device is likely to use hover (mouse / fine pointer).
 * Used to skip custom tooltips on touch-first devices.
 */
export function useSupportsHoverTooltips(): boolean {
  const [ok, setOk] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(hover: hover) and (pointer: fine)');
    const apply = () => setOk(mq.matches);
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, []);

  return ok;
}
