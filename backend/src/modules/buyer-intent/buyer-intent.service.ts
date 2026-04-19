import { AppError } from '../../utils/AppError';
import { PropertyEstimateRepo } from '../property-estimate/property-estimate.repo';
import { UserRepo } from '../user/user.repo';
import { BuyerIntentRepo, type BuyerIntentFlags } from './buyer-intent.repo';
import { BuyerIntent, BuyerIntentType } from './buyer-intent.model';
import type { CreateBuyerIntentBody } from './buyer-intent.schemas';
import { BuyerIntentNotificationService } from './buyer-intent-notification.service';
import { ConsoleEmailSender } from '../seller-intent/console-email-sender';
import { SellerIntentRepo } from '../seller-intent/seller-intent.repo';
import { SellerAlertService } from '../seller-alert/seller-alert.service';
import type { PropertyEstimate } from '../property-estimate/property-estimate.model';
import { logger } from '../../utils/logger';

export class BuyerIntentService {
  private propertyRepo: PropertyEstimateRepo;
  private userRepo: UserRepo;
  private intentRepo: BuyerIntentRepo;
  private notifyService: BuyerIntentNotificationService;
  private sellerIntentRepo: SellerIntentRepo;
  private sellerAlertService: SellerAlertService;

  constructor() {
    this.propertyRepo = new PropertyEstimateRepo();
    this.userRepo = new UserRepo();
    this.intentRepo = new BuyerIntentRepo();
    this.notifyService = new BuyerIntentNotificationService(new ConsoleEmailSender());
    this.sellerIntentRepo = new SellerIntentRepo();
    this.sellerAlertService = new SellerAlertService();
  }

  async createIntent(userId: string, body: CreateBuyerIntentBody): Promise<BuyerIntent> {
    const property = await this.propertyRepo.findOne(body.propertyId);
    if (!property) {
      throw new AppError('Estimate not found', 404);
    }
    if (property.userId && property.userId === userId) {
      throw new AppError('You cannot record buyer intent on your own listing', 400);
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

    const intent = await this.intentRepo.upsertIntent({
      userId,
      propertyId: body.propertyId,
      intentType: body.intentType,
      notifSent,
      budget: budget ?? undefined,
      message: message ?? undefined,
    });

    await this.maybeCreateSellerBudgetAlert(property, budget);

    return intent;
  }

  /**
   * If the listing has an owner with seller intent (target price set) and the buyer's budget
   * meets or exceeds that target, create an in-app seller alert (at most one per property per day).
   */
  private async maybeCreateSellerBudgetAlert(
    property: PropertyEstimate,
    budget: number | null
  ): Promise<void> {
    const ownerId = property.userId;
    if (!ownerId || budget == null) return;

    try {
      const sellerIntent = await this.sellerIntentRepo.findLatestWithTargetPriceForOwner(
        property.propertyId,
        ownerId
      );
      const target = sellerIntent?.targetPrice;
      if (target == null || budget < target) return;

      await this.sellerAlertService.createBuyerAboveTriggerAlertIfNew(
        property.propertyId,
        ownerId,
        budget
      );
    } catch (err) {
      logger.error('BuyerIntent: seller budget alert failed', {
        propertyId: property.propertyId,
        err,
      });
    }
  }

  async getBatchFlags(userId: string, propertyIds: string[]): Promise<Record<string, BuyerIntentFlags>> {
    return this.intentRepo.findFlagsForProperties(userId, propertyIds);
  }
}
