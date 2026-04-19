import { logger } from '../../utils/logger';
import type { EmailSender, SellerIntentEmailPayload } from './email-sender.interface';

/** Development / stub: logs structured email content (stand-in until SMTP/SendGrid). */
export class ConsoleEmailSender implements EmailSender {
  async sendSellerIntentEmail(payload: SellerIntentEmailPayload): Promise<void> {
    logger.info('AgentEmailStub sendSellerIntentEmail', {
      to: payload.toAgentEmail ?? '(not configured)',
      subject: payload.subject,
      body: payload.body,
    });
  }

  async sendBuyerIntentEmail(payload: SellerIntentEmailPayload): Promise<void> {
    logger.info('AgentEmailStub sendBuyerIntentEmail', {
      to: payload.toAgentEmail ?? '(not configured)',
      subject: payload.subject,
      body: payload.body,
    });
  }
}
