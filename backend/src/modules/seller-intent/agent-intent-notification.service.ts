import type { User } from '../user/user.model';
import { PropertyEstimate, PropertyType } from '../property-estimate/property-estimate.model';
import { ProfileType, Timeline, SellPreference } from './seller-intent.model';
import type { EmailSender } from './email-sender.interface';
import { getPriceRangeIn5000 } from '../property-estimate/utils/price-range.util';
import { ZoneRepo } from '../zone/zone.repo';
import { resolveAgentNotificationEmail } from '../zone/resolve-agent-notification-email';

export interface SellerIntentNotificationInput {
  profileType: ProfileType.SELLER | ProfileType.SELLER_BUYER;
  property: PropertyEstimate;
  targetPrice: number;
  timeline: Timeline;
  sellPreference: SellPreference;
  owner: User;
}

/** Builds subject/body per product template; sends via EmailSender (stub or future SMTP). */
export class AgentIntentNotificationService {
  constructor(
    private readonly emailSender: EmailSender,
    private readonly zoneRepo: ZoneRepo = new ZoneRepo()
  ) {}

  async notifySellerIntent(input: SellerIntentNotificationInput): Promise<void> {
    const toAgentEmail = await resolveAgentNotificationEmail(
      input.property.locationCode,
      this.zoneRepo
    );
    const { min, max } = getPriceRangeIn5000(input.property.estimatedPrice ?? 0);
    const typeStr = input.property.type === PropertyType.APARTMENT ? 'Apartment' : 'House';
    const profileLabel =
      input.profileType === ProfileType.SELLER ? 'SELLER' : 'SELLER+BUYER';
    const subject = `🏠 New seller intent — ${input.property.address}`;
    const body = [
      `Profile: ${profileLabel}`,
      `Property: ${input.property.address} · ${typeStr} · ${input.property.area}m² · ${input.property.bedrooms} beds`,
      `Estimated range: €${min.toLocaleString('en-US')} – €${max.toLocaleString('en-US')}`,
      `Target price: €${input.targetPrice.toLocaleString('en-US')}`,
      `Timeline: ${input.timeline}`,
      `Preference: ${input.sellPreference}`,
      `User: ${input.owner.username} · ${input.owner.emailId ?? '—'}`,
      `Timestamp: ${new Date().toISOString()}`,
    ].join('\n');

    await this.emailSender.sendSellerIntentEmail({
      subject,
      body,
      toAgentEmail,
    });
  }
}
