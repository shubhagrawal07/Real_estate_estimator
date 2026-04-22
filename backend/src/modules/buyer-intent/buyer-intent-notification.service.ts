import { PropertyEstimate, PropertyType } from '../property-estimate/property-estimate.model';
import type { User } from '../user/user.model';
import type { EmailSender } from '../seller-intent/email-sender.interface';
import { getPriceRangeIn5000 } from '../property-estimate/utils/price-range.util';
import { BuyerIntentType } from './buyer-intent.model';
import { ZoneRepo } from '../zone/zone.repo';
import { resolveAgentNotificationEmail } from '../zone/resolve-agent-notification-email';

export class BuyerIntentNotificationService {
  constructor(
    private readonly emailSender: EmailSender,
    private readonly zoneRepo: ZoneRepo = new ZoneRepo()
  ) {}

  async notifyHighInterest(property: PropertyEstimate, buyer: User): Promise<void> {
    const toAgentEmail = await resolveAgentNotificationEmail(property.locationCode, this.zoneRepo);
    const { min, max } = getPriceRangeIn5000(property.estimatedPrice ?? 0);
    const typeStr = property.type === PropertyType.APARTMENT ? 'Apartment' : 'House';
    const subject = `❤️ Buyer very interested — ${property.address}`;
    const body = [
      `Intent: ${BuyerIntentType.HIGH_INTEREST}`,
      `Property: ${property.address} · ${typeStr} · ${property.area}m² · ${property.bedrooms} beds`,
      `Estimated range: €${min.toLocaleString('en-US')} – €${max.toLocaleString('en-US')}`,
      `Buyer: ${buyer.username} · ${buyer.emailId ?? '—'}`,
      `Timestamp: ${new Date().toISOString()}`,
    ].join('\n');

    await this.emailSender.sendBuyerIntentEmail({
      subject,
      body,
      toAgentEmail,
    });
  }

  async notifyQuestion(
    property: PropertyEstimate,
    buyer: User,
    message: string
  ): Promise<void> {
    const toAgentEmail = await resolveAgentNotificationEmail(property.locationCode, this.zoneRepo);
    const { min, max } = getPriceRangeIn5000(property.estimatedPrice ?? 0);
    const typeStr = property.type === PropertyType.APARTMENT ? 'Apartment' : 'House';
    const subject = `💬 Buyer question — ${property.address}`;
    const body = [
      `Intent: ${BuyerIntentType.QUESTION}`,
      `Property: ${property.address} · ${typeStr} · ${property.area}m²`,
      `Estimated range: €${min.toLocaleString('en-US')} – €${max.toLocaleString('en-US')}`,
      `Buyer: ${buyer.username} · ${buyer.emailId ?? '—'}`,
      `Question: ${message}`,
      `Timestamp: ${new Date().toISOString()}`,
    ].join('\n');

    await this.emailSender.sendBuyerIntentEmail({
      subject,
      body,
      toAgentEmail,
    });
  }
}
