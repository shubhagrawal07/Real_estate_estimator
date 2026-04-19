import { AppError } from '../../utils/AppError';
import { PropertyEstimateRepo } from '../property-estimate/property-estimate.repo';
import { UserRepo } from '../user/user.repo';
import { BuyerIntentRepo, type BuyerIntentFlags } from './buyer-intent.repo';
import { BuyerIntent, BuyerIntentType } from './buyer-intent.model';
import type { CreateBuyerIntentBody } from './buyer-intent.schemas';
import { BuyerIntentNotificationService } from './buyer-intent-notification.service';
import { ConsoleEmailSender } from '../seller-intent/console-email-sender';

export class BuyerIntentService {
  private propertyRepo: PropertyEstimateRepo;
  private userRepo: UserRepo;
  private intentRepo: BuyerIntentRepo;
  private notifyService: BuyerIntentNotificationService;

  constructor() {
    this.propertyRepo = new PropertyEstimateRepo();
    this.userRepo = new UserRepo();
    this.intentRepo = new BuyerIntentRepo();
    this.notifyService = new BuyerIntentNotificationService(new ConsoleEmailSender());
  }

  async createIntent(userId: string, body: CreateBuyerIntentBody): Promise<BuyerIntent> {
    const property = await this.propertyRepo.findOne(body.propertyId);
    if (!property) {
      throw new AppError('Estimate not found', 404);
    }

    const buyer = await this.userRepo.findById(userId);
    if (!buyer) {
      throw new AppError('User not found', 404);
    }

    let notifSent = false;
    const budget = body.budget ?? null;
    const message =
      body.intentType === BuyerIntentType.QUESTION ? (body.message ?? '').trim() : null;

    if (body.intentType === BuyerIntentType.HIGH_INTEREST) {
      await this.notifyService.notifyHighInterest(property, buyer);
      notifSent = true;
    } else if (body.intentType === BuyerIntentType.QUESTION) {
      await this.notifyService.notifyQuestion(property, buyer, message!);
      notifSent = true;
    }

    return this.intentRepo.upsertIntent({
      userId,
      propertyId: body.propertyId,
      intentType: body.intentType,
      notifSent,
      budget: budget ?? undefined,
      message: message ?? undefined,
    });
  }

  async getBatchFlags(userId: string, propertyIds: string[]): Promise<Record<string, BuyerIntentFlags>> {
    return this.intentRepo.findFlagsForProperties(userId, propertyIds);
  }
}
