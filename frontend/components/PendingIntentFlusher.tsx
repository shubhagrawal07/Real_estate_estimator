'use client';

import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useEffect, useRef } from 'react';
import {
  clearPendingIntent,
  readPendingIntent,
  writeModalSession,
} from '@/components/intent/intentSession';
import {
  flushPendingSellerIntent,
  navigateAfterSellerIntent,
} from '@/lib/flush-pending-seller-intent';

/**
 * Completes pending seller_intent saves after login when the estimate modal is no longer mounted (e.g. Flow C → /buyerSearch).
 */
export default function PendingIntentFlusher() {
  const { data: session } = useSession();
  const token = session?.backendToken;
  const router = useRouter();
  const ran = useRef(false);

  useEffect(() => {
    if (!token) {
      ran.current = false;
      return;
    }
    const pending = readPendingIntent();
    if (!pending || ran.current) return;
    ran.current = true;
    void (async () => {
      try {
        await flushPendingSellerIntent(pending.resume, token);
        navigateAfterSellerIntent(pending.resume, router);
        if (pending.resume.kind === 'D_WATCH') {
          window.dispatchEvent(new CustomEvent('intent:areaWatchToast'));
        }
        clearPendingIntent();
        writeModalSession(pending.resume.propertyId, {
          completed: true,
          dismissedIncomplete: false,
        });
      } catch {
        ran.current = false;
      }
    })();
  }, [token, router]);

  return null;
}
