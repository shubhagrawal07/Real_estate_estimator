'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { signIn, useSession } from 'next-auth/react';
import { getPriceRangeIn5000 } from '@/lib/price-range';
import { propertyEstimateService } from '@/services/property-estimate.service';
import { userIntentService } from '@/services/user-intent.service';
import type { PropertyEstimateResponse } from '@/types/estimate';
import type {
  CreateUserIntentPayload,
  DvfPreviewRow,
  SellPreference,
  Timeline,
} from '@/types/user-intent';
import {
  flushPendingUserIntent,
  navigateAfterSellerIntent,
} from '@/lib/flush-pending-user-intent';
import { IntentFlowBanner } from './IntentFlowBanner';
import {
  clearPendingIntent,
  readModalSession,
  readPendingIntent,
  setBuyerToastFlag,
  touchPendingIntent,
  writeModalSession,
  writePendingIntent,
  type PendingResume,
} from './intentSession';
import styles from './EstimateIntentModal.module.css';

type Phase =
  | 'entry'
  | 'A1'
  | 'A2'
  | 'A3'
  | 'confirmA'
  | 'B1'
  | 'B2'
  | 'confirmB'
  | 'D'
  | 'loginGate';

const INACTIVITY_MS = 30_000;

interface EstimateIntentModalProps {
  estimate: PropertyEstimateResponse;
  onEstimateRefresh?: (e: PropertyEstimateResponse) => void;
}

export function EstimateIntentModal({ estimate, onEstimateRefresh }: EstimateIntentModalProps) {
  const router = useRouter();
  const { data: session } = useSession();
  const token = session?.backendToken;

  const [open, setOpen] = useState(false);
  const [phase, setPhase] = useState<Phase>('entry');
  const [showLoginGate, setShowLoginGate] = useState(false);
  const [dvfRows, setDvfRows] = useState<DvfPreviewRow[]>([]);
  const [dvfLoading, setDvfLoading] = useState(false);
  const [showFlowGBanner, setShowFlowGBanner] = useState(false);
  const [flowGBannerDismissed, setFlowGBannerDismissed] = useState(false);
  const [bannerEligible, setBannerEligible] = useState(false);

  const lastActivityRef = useRef(Date.now());

  const centerPrice = useMemo(() => {
    const ep = estimate.estimatedPrice;
    if (ep == null || ep <= 0) return 0;
    const { min, max } = getPriceRangeIn5000(ep);
    return Math.round((min + max) / 2);
  }, [estimate.estimatedPrice]);

  const sliderMin = useMemo(() => Math.round(centerPrice * 0.8), [centerPrice]);
  const sliderMax = useMemo(() => Math.round(centerPrice * 1.3), [centerPrice]);

  const [targetPrice, setTargetPrice] = useState(centerPrice);
  const [timeline, setTimeline] = useState<Timeline>('UNDEFINED');
  const [sellPreference, setSellPreference] = useState<SellPreference>('UNDEFINED');

  useEffect(() => {
    setTargetPrice(centerPrice);
  }, [centerPrice, estimate.propertyId]);

  useEffect(() => {
    if (!estimate.propertyId) return;
    setOpen(false);
    setPhase('entry');
    setShowLoginGate(false);
    setDvfRows([]);
    setShowFlowGBanner(false);
    setFlowGBannerDismissed(false);
    setBannerEligible(false);
  }, [estimate.propertyId]);

  const markActivity = useCallback(() => {
    lastActivityRef.current = Date.now();
    setShowFlowGBanner(false);
  }, []);

  useEffect(() => {
    const pid = estimate.propertyId;
    if (!pid) return;

    const sess = readModalSession(pid);
    if (sess?.shownOnce || sess?.completed) return;

    const t = setTimeout(() => {
      const s2 = readModalSession(pid);
      if (s2?.shownOnce || s2?.completed) return;
      writeModalSession(pid, { shownOnce: true });
      setOpen(true);
    }, 3000);

    return () => clearTimeout(t);
  }, [estimate.propertyId]);

  const handleCloseModal = useCallback(() => {
    const pid = estimate.propertyId;
    if (!pid) return;

    const sess = readModalSession(pid);
    if (!sess?.completed) {
      writeModalSession(pid, { dismissedIncomplete: true });
      lastActivityRef.current = Date.now();
      setBannerEligible(true);
    }
    setOpen(false);
    setPhase('entry');
    setShowLoginGate(false);
  }, [estimate.propertyId]);

  useEffect(() => {
    if (!bannerEligible || flowGBannerDismissed) return;

    const pid = estimate.propertyId;
    if (!pid) return;

    const tick = () => {
      const s = readModalSession(pid);
      if (s?.completed || !s?.dismissedIncomplete) {
        setShowFlowGBanner(false);
        return;
      }
      if (Date.now() - lastActivityRef.current >= INACTIVITY_MS) {
        setShowFlowGBanner(true);
      }
    };

    const id = window.setInterval(tick, 1500);
    const onAct = () => {
      lastActivityRef.current = Date.now();
      setShowFlowGBanner(false);
    };
    window.addEventListener('pointerdown', onAct);
    window.addEventListener('keydown', onAct);
    window.addEventListener('scroll', onAct, true);

    return () => {
      window.clearInterval(id);
      window.removeEventListener('pointerdown', onAct);
      window.removeEventListener('keydown', onAct);
      window.removeEventListener('scroll', onAct, true);
    };
  }, [bannerEligible, flowGBannerDismissed, estimate.propertyId]);

  const linkDraftIfNeeded = useCallback(async (): Promise<void> => {
    if (!token || !estimate.propertyId) return;
    const drafts = JSON.parse(localStorage.getItem('draftEstimates') || '[]') as string[];
    if (!drafts.includes(estimate.propertyId)) return;
    await propertyEstimateService.linkDrafts([estimate.propertyId], token);
    localStorage.setItem(
      'draftEstimates',
      JSON.stringify(drafts.filter((id) => id !== estimate.propertyId))
    );
    const fresh = await propertyEstimateService.getById(estimate.propertyId);
    onEstimateRefresh?.(fresh);
  }, [estimate.propertyId, token, onEstimateRefresh]);

  const submitIntent = useCallback(
    async (payload: CreateUserIntentPayload): Promise<void> => {
      if (!token) throw new Error('Not authenticated');
      await linkDraftIfNeeded();
      await userIntentService.create(payload, token);
    },
    [linkDraftIfNeeded, token]
  );

  useEffect(() => {
    if (!token || !showLoginGate) return;
    const id = window.setInterval(() => {
      if (readPendingIntent()) return;
      setShowLoginGate(false);
      setOpen(false);
    }, 400);
    return () => window.clearInterval(id);
  }, [token, showLoginGate]);

  const requireAuthOrSavePending = useCallback(
    (resume: PendingResume, then: () => void) => {
      touchPendingIntent();
      if (token) {
        void (async () => {
          try {
            await flushPendingUserIntent(resume, token);
            clearPendingIntent();
            navigateAfterSellerIntent(resume, router);
            writeModalSession(resume.propertyId, { completed: true });
            then();
          } catch {
            /* handled */
          }
        })();
        return;
      }
      writePendingIntent(resume);
      setShowLoginGate(true);
      setPhase('loginGate');
    },
    [router, token]
  );

  const loadDvf = useCallback(async () => {
    if (!estimate.propertyId) return;
    setDvfLoading(true);
    try {
      const res = await userIntentService.getDvfPreview(estimate.propertyId);
      setDvfRows(res.data?.rows ?? []);
    } catch {
      setDvfRows([]);
    } finally {
      setDvfLoading(false);
    }
  }, [estimate.propertyId]);

  useEffect(() => {
    if (open && phase === 'D') void loadDvf();
  }, [open, phase, loadDvf]);

  const formatMoney = (n: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);

  const renderBody = () => {
    if (showLoginGate || phase === 'loginGate') {
      return (
        <>
          <h2 className={styles.title}>Save your details</h2>
          <p className={styles.loginHint}>
            To save your answers and allow an agent to contact you, please sign in with Google.
          </p>
          <button
            type="button"
            className={styles.primaryBtn}
            onClick={() => signIn('google')}
          >
            Sign in with Google
          </button>
        </>
      );
    }

    switch (phase) {
      case 'entry':
        return (
          <>
            <h2 className={styles.title}>What&apos;s your project?</h2>
            <div className={styles.optionGrid}>
              <button type="button" className={styles.optionBtn} onClick={() => setPhase('A1')}>
                I want to sell this property
              </button>
              <button type="button" className={styles.optionBtn} onClick={() => setPhase('B1')}>
                I&apos;m selling AND looking to buy
              </button>
              <button
                type="button"
                className={styles.optionBtn}
                onClick={() => {
                  void (async () => {
                    writeModalSession(estimate.propertyId, { completed: true });
                    setOpen(false);
                    setBuyerToastFlag();
                    if (token) {
                      try {
                        await submitIntent({
                          propertyId: estimate.propertyId,
                          profileType: 'BUYER',
                          intentType: 'HIGH_INTEREST',
                          notifyAgent: false,
                        });
                      } catch {
                        /* optional */
                      }
                    } else {
                      writePendingIntent({ kind: 'C_BUYER', propertyId: estimate.propertyId });
                    }
                    router.push('/buyerSearch');
                  })();
                }}
              >
                I&apos;m looking to buy a property
              </button>
              <button
                type="button"
                className={styles.optionBtn}
                onClick={() => {
                  setPhase('D');
                  void loadDvf();
                }}
              >
                I&apos;m exploring the market
              </button>
            </div>
          </>
        );
      case 'A1':
        return (
          <>
            <h2 className={styles.title}>At what price would you consider selling?</h2>
            <div className={styles.sliderRow}>
              <input
                type="range"
                className={styles.slider}
                min={sliderMin}
                max={sliderMax}
                step={1000}
                value={Math.min(Math.max(targetPrice, sliderMin), sliderMax)}
                onChange={(e) => setTargetPrice(Number(e.target.value))}
              />
              <div className={styles.sliderValue}>{formatMoney(targetPrice)}</div>
            </div>
            <p className={styles.subtle}>
              This price stays confidential. It helps us identify serious buyers only.
            </p>
            <button type="button" className={styles.primaryBtn} onClick={() => setPhase('A2')}>
              Next →
            </button>
          </>
        );
      case 'A2':
        return (
          <>
            <h2 className={styles.title}>What&apos;s your selling timeline?</h2>
            <div className={styles.optionGrid}>
              {(
                [
                  ['NOW', 'Right now'],
                  ['THREE_MONTHS', 'Within 3 months'],
                  ['SIX_MONTHS', 'Within 6 months'],
                  ['UNDEFINED', 'Not decided yet'],
                ] as const
              ).map(([v, label]) => (
                <button
                  key={v}
                  type="button"
                  className={styles.optionBtn}
                  onClick={() => {
                    setTimeline(v);
                    setPhase('A3');
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          </>
        );
      case 'A3':
        return (
          <>
            <h2 className={styles.title}>How would you prefer to sell?</h2>
            <div className={styles.optionGrid}>
              {(
                [
                  ['DISCREET', 'Discreetly — no public listing'],
                  ['CLASSIC', 'Through traditional channels if needed'],
                  ['UNDEFINED', 'Not sure yet'],
                ] as const
              ).map(([v, label]) => (
                <button
                  key={v}
                  type="button"
                  className={styles.optionBtn}
                  onClick={() => {
                    setSellPreference(v);
                    setPhase('confirmA');
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          </>
        );
      case 'confirmA':
        return (
          <>
            <div className={styles.confirmIcon} aria-hidden>
              ✓
            </div>
            <h2 className={styles.title}>Your seller profile is saved.</h2>
            <p className={styles.subtle} style={{ fontStyle: 'normal' }}>
              A dedicated agent will reach out within 24h with matching buyer profiles.
            </p>
            <div className={styles.stack}>
              <button
                type="button"
                className={styles.primaryBtn}
                onClick={() => {
                  const resume: PendingResume = {
                    kind: 'A_CONFIRM',
                    propertyId: estimate.propertyId,
                    targetPrice,
                    timeline,
                    sellPreference,
                    notifyAgent: true,
                    afterSave: 'close',
                  };
                  requireAuthOrSavePending(resume, () => {
                    setOpen(false);
                  });
                }}
              >
                Confirm my request
              </button>
              <button
                type="button"
                className={styles.secondaryBtn}
                onClick={() => {
                  const resume: PendingResume = {
                    kind: 'A_CONFIRM',
                    propertyId: estimate.propertyId,
                    targetPrice,
                    timeline,
                    sellPreference,
                    notifyAgent: true,
                    afterSave: 'myEstimates',
                  };
                  requireAuthOrSavePending(resume, () => {
                    setOpen(false);
                  });
                }}
              >
                See potential buyers →
              </button>
            </div>
          </>
        );
      case 'B1':
        return (
          <>
            <h2 className={styles.title}>At what price would you consider selling?</h2>
            <div className={styles.sliderRow}>
              <input
                type="range"
                className={styles.slider}
                min={sliderMin}
                max={sliderMax}
                step={1000}
                value={Math.min(Math.max(targetPrice, sliderMin), sliderMax)}
                onChange={(e) => setTargetPrice(Number(e.target.value))}
              />
              <div className={styles.sliderValue}>{formatMoney(targetPrice)}</div>
            </div>
            <p className={styles.subtle}>
              This price stays confidential. It helps us identify serious buyers only.
            </p>
            <button type="button" className={styles.primaryBtn} onClick={() => setPhase('B2')}>
              Next →
            </button>
          </>
        );
      case 'B2':
        return (
          <>
            <h2 className={styles.title}>What&apos;s your selling timeline?</h2>
            <div className={styles.optionGrid}>
              {(
                [
                  ['NOW', 'Right now'],
                  ['THREE_MONTHS', 'Within 3 months'],
                  ['SIX_MONTHS', 'Within 6 months'],
                  ['UNDEFINED', 'Not decided yet'],
                ] as const
              ).map(([v, label]) => (
                <button
                  key={v}
                  type="button"
                  className={styles.optionBtn}
                  onClick={() => {
                    setTimeline(v);
                    setPhase('confirmB');
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          </>
        );
      case 'confirmB':
        return (
          <>
            <div className={styles.confirmIcon} aria-hidden>
              ✓
            </div>
            <h2 className={styles.title}>Your seller profile is saved.</h2>
            <p className={styles.subtle} style={{ fontStyle: 'normal' }}>
              Now let&apos;s find your next property.
            </p>
            <button
              type="button"
              className={styles.primaryBtn}
              onClick={() => {
                const resume: PendingResume = {
                  kind: 'B_CONFIRM',
                  propertyId: estimate.propertyId,
                  targetPrice,
                  timeline,
                  sellPreference: 'UNDEFINED',
                  notifyAgent: true,
                  afterSave: 'buyerSearch',
                };
                requireAuthOrSavePending(resume, () => {
                  setOpen(false);
                });
              }}
            >
              Activate my property search →
            </button>
          </>
        );
      case 'D':
        return (
          <>
            <h2 className={styles.title}>Recent sales near this property</h2>
            {dvfLoading ? (
              <p className={styles.subtle}>Loading…</p>
            ) : dvfRows.length === 0 ? (
              <p className={styles.subtle}>No recent public sales found for this area yet.</p>
            ) : (
              dvfRows.map((row, i) => (
                <div key={i} className={styles.dvfRow}>
                  <span className={styles.dvfDot} aria-hidden>
                    ●
                  </span>
                  <span>
                    {row.typeLabel} · {row.locationLabel} · {formatMoney(row.price)} · {row.monthsAgo}{' '}
                    months ago
                  </span>
                </div>
              ))
            )}
            <div className={styles.stack}>
              <button
                type="button"
                className={styles.primaryBtn}
                onClick={() => {
                  requireAuthOrSavePending({ kind: 'D_WATCH', propertyId: estimate.propertyId }, () => {
                    writeModalSession(estimate.propertyId, { completed: true });
                    setOpen(false);
                    if (typeof window !== 'undefined') {
                      window.dispatchEvent(new CustomEvent('intent:areaWatchToast'));
                    }
                  });
                }}
              >
                Save this area to my watchlist
              </button>
              <button type="button" className={styles.secondaryBtn} onClick={handleCloseModal}>
                Maybe later
              </button>
            </div>
          </>
        );
      default:
        return null;
    }
  };

  if (!estimate.propertyId) return null;

  return (
    <>
      {open && (
        <div
          className={styles.overlay}
          role="presentation"
          onPointerDown={markActivity}
        >
          <div
            className={styles.dialog}
            role="dialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className={styles.closeX}
              aria-label="Close"
              onClick={handleCloseModal}
            >
              ×
            </button>
            <div className={styles.body}>{renderBody()}</div>
          </div>
        </div>
      )}

      {showFlowGBanner && (
        <IntentFlowBanner
          onReopen={() => {
            setShowFlowGBanner(false);
            setFlowGBannerDismissed(false);
            setPhase('entry');
            setShowLoginGate(false);
            setOpen(true);
          }}
          onDismiss={() => {
            setShowFlowGBanner(false);
            setFlowGBannerDismissed(true);
          }}
        />
      )}
    </>
  );
}
