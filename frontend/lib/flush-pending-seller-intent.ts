import type { PendingResume } from '@/components/intent/intentSession';
import { propertyEstimateService } from '@/services/property-estimate.service';
import { sellerIntentService } from '@/services/seller-intent.service';
import type { CreateSellerIntentPayload } from '@/types/seller-intent';

async function linkDraftIfNeeded(propertyId: string, token: string): Promise<void> {
  const drafts = JSON.parse(localStorage.getItem('draftEstimates') || '[]') as string[];
  if (!drafts.includes(propertyId)) return;
  await propertyEstimateService.linkDrafts([propertyId], token);
  localStorage.setItem(
    'draftEstimates',
    JSON.stringify(drafts.filter((id) => id !== propertyId))
  );
}

export async function flushPendingSellerIntent(resume: PendingResume, token: string): Promise<void> {
  await linkDraftIfNeeded(resume.propertyId, token);

  if (resume.kind === 'A_CONFIRM' || resume.kind === 'B_CONFIRM') {
    const payload: CreateSellerIntentPayload = {
      propertyId: resume.propertyId,
      profileType: resume.kind === 'A_CONFIRM' ? 'SELLER' : 'SELLER_BUYER',
      intentType: 'SELL_INTENT',
      targetPrice: resume.targetPrice,
      timeline: resume.timeline,
      sellPreference: resume.sellPreference,
      notifyAgent: resume.notifyAgent,
    };
    await sellerIntentService.create(payload, token);
    return;
  }

  if (resume.kind === 'C_BUYER') {
    await sellerIntentService.create(
      {
        propertyId: resume.propertyId,
        profileType: 'BUYER',
        intentType: 'HIGH_INTEREST',
        notifyAgent: false,
      },
      token
    );
    return;
  }

  if (resume.kind === 'D_WATCH') {
    await sellerIntentService.create(
      {
        propertyId: resume.propertyId,
        profileType: 'CURIOUS',
        intentType: 'AREA_WATCH',
        notifyAgent: false,
      },
      token
    );
  }
}

export function navigateAfterSellerIntent(
  resume: PendingResume,
  router: { push: (href: string) => void }
): void {
  if (resume.kind !== 'A_CONFIRM' && resume.kind !== 'B_CONFIRM') return;
  if (resume.afterSave === 'myEstimates') router.push('/myEstimates');
  else if (resume.afterSave === 'buyerSearch') router.push('/buyerSearch');
}
