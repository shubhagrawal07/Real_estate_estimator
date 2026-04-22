import { config } from '../../config/env';
import type { ZoneRepo } from './zone.repo';

/**
 * Uses `zones.zone_code` = property `location_code`. If a row exists with a linked user
 * and non-empty `email_id`, that email is used; otherwise the configured default.
 */
export async function resolveAgentNotificationEmail(
  locationCode: string | undefined,
  zoneRepo: ZoneRepo
): Promise<string> {
  const code = locationCode?.trim();
  if (!code) {
    return config.notifications.defaultAgentNotificationEmail;
  }
  const zone = await zoneRepo.findByZoneCodeWithAgent(code);
  const email = zone?.agent?.emailId?.trim();
  if (email) {
    return email;
  }
  return config.notifications.defaultAgentNotificationEmail;
}
