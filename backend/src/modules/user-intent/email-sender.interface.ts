/**
 * Pluggable email delivery for agent notifications. Replace with SMTP/SendGrid in production.
 */
export interface SellerIntentEmailPayload {
  subject: string;
  body: string;
  /** For future SMTP envelope */
  toAgentEmail?: string;
}

export interface EmailSender {
  sendSellerIntentEmail(payload: SellerIntentEmailPayload): Promise<void>;
}
