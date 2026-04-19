const MODAL_SESSION_PREFIX = 'estimateIntent:modalV1:';
const PENDING = 'estimateIntent:pendingV1';
const BUYER_TOAST = 'estimateIntent:buyerToastV1';

const PENDING_TTL_MS = 30 * 60 * 1000;

function modalStorageKey(propertyId: string): string {
  return `${MODAL_SESSION_PREFIX}${propertyId}`;
}

export interface ModalSessionState {
  /** Auto 3s modal has been shown once for this estimate in this browser session */
  shownOnce: boolean;
  /** User completed a flow (saved intent) */
  completed: boolean;
  /** Closed with X without finishing (enables Flow G) */
  dismissedIncomplete: boolean;
}

export function readModalSession(propertyId: string): ModalSessionState | null {
  if (!propertyId || typeof sessionStorage === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(modalStorageKey(propertyId));
    if (!raw) return null;
    return JSON.parse(raw) as ModalSessionState;
  } catch {
    return null;
  }
}

export function writeModalSession(propertyId: string, p: Partial<ModalSessionState>): void {
  if (!propertyId || typeof sessionStorage === 'undefined') return;
  const prev = readModalSession(propertyId) ?? {
    shownOnce: false,
    completed: false,
    dismissedIncomplete: false,
  };
  sessionStorage.setItem(modalStorageKey(propertyId), JSON.stringify({ ...prev, ...p }));
}

export type PendingResume =
  | {
      kind: 'A_CONFIRM' | 'B_CONFIRM';
      propertyId: string;
      targetPrice: number;
      timeline: import('@/types/seller-intent').Timeline;
      sellPreference: import('@/types/seller-intent').SellPreference;
      notifyAgent: boolean;
      afterSave: 'close' | 'myEstimates' | 'buyerSearch';
    }
  | {
      kind: 'C_BUYER';
      propertyId: string;
    }
  | {
      kind: 'D_WATCH';
      propertyId: string;
    };

export interface PendingIntent {
  expiresAt: number;
  resume: PendingResume;
}

export function readPendingIntent(): PendingIntent | null {
  if (typeof sessionStorage === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(PENDING);
    if (!raw) return null;
    const p = JSON.parse(raw) as PendingIntent;
    if (p.expiresAt < Date.now()) {
      sessionStorage.removeItem(PENDING);
      return null;
    }
    return p;
  } catch {
    return null;
  }
}

export function writePendingIntent(resume: PendingResume): void {
  const payload: PendingIntent = {
    expiresAt: Date.now() + PENDING_TTL_MS,
    resume,
  };
  sessionStorage.setItem(PENDING, JSON.stringify(payload));
}

export function touchPendingIntent(): void {
  const p = readPendingIntent();
  if (!p) return;
  p.expiresAt = Date.now() + PENDING_TTL_MS;
  sessionStorage.setItem(PENDING, JSON.stringify(p));
}

export function clearPendingIntent(): void {
  sessionStorage.removeItem(PENDING);
}

export function setBuyerToastFlag(): void {
  sessionStorage.setItem(BUYER_TOAST, '1');
}

export function consumeBuyerToastFlag(): boolean {
  if (typeof sessionStorage === 'undefined') return false;
  const v = sessionStorage.getItem(BUYER_TOAST);
  if (v === '1') {
    sessionStorage.removeItem(BUYER_TOAST);
    return true;
  }
  return false;
}
