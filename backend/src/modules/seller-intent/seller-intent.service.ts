import { config } from '../../config/env';
import { AppError } from '../../utils/AppError';
import { PropertyEstimateRepo } from '../property-estimate/property-estimate.repo';
import { PropertyType } from '../property-estimate/property-estimate.model';
import { getCodeInseeFromLocationCode } from '../property-estimate/utils/location-code.util';
import { CityBlockSalesDataRepo } from '../city-block-sales-data/city-block-sales-data.repo';
import { UserRepo } from '../user/user.repo';
import { SellerIntentRepo } from './seller-intent.repo';
import { ProfileType, SellerIntent } from './seller-intent.model';
import type { CreateSellerIntentBody } from './seller-intent.schemas';
import { AgentIntentNotificationService } from './agent-intent-notification.service';
import { ConsoleEmailSender } from './console-email-sender';

export interface DvfPreviewRow {
  typeLabel: string;
  locationLabel: string;
  price: number;
  monthsAgo: number;
}

export interface DvfPreviewResult {
  rows: DvfPreviewRow[];
}

function resolveAgentId(locationCode: string): string | null {
  const m = config.agentByLocationMap;
  const exact = m[locationCode];
  if (exact) return exact;
  const cinsee = locationCode.slice(0, 5);
  return m[cinsee] ?? null;
}

function mapPropertyTypeToDvf(type: PropertyType): 'APPARTEMENT' | 'MAISON' {
  return type === PropertyType.APARTMENT ? 'APPARTEMENT' : 'MAISON';
}

function monthsAgoApprox(saleDate: Date): number {
  const ms = Date.now() - new Date(saleDate).getTime();
  return Math.max(0, Math.round(ms / (1000 * 60 * 60 * 24 * 30.44)));
}

export class SellerIntentService {
  private propertyRepo: PropertyEstimateRepo;
  private salesRepo: CityBlockSalesDataRepo;
  private userRepo: UserRepo;
  private intentRepo: SellerIntentRepo;
  private notifyService: AgentIntentNotificationService;

  constructor() {
    this.propertyRepo = new PropertyEstimateRepo();
    this.salesRepo = new CityBlockSalesDataRepo();
    this.userRepo = new UserRepo();
    this.intentRepo = new SellerIntentRepo();
    this.notifyService = new AgentIntentNotificationService(new ConsoleEmailSender());
  }

  async getDvfPreview(propertyId: string): Promise<DvfPreviewResult> {
    const property = await this.propertyRepo.findOne(propertyId);
    if (!property) {
      throw new AppError('Estimate not found', 404);
    }
    const codeInsee = getCodeInseeFromLocationCode(property.locationCode);
    if (!codeInsee) {
      return { rows: [] };
    }
    const dvfType = mapPropertyTypeToDvf(property.type);
    const raw = await this.salesRepo.findLatestSalesForPreview(codeInsee, dvfType, 3);
    const locationLabel = codeInsee;
    const typeLabel = property.type === PropertyType.APARTMENT ? 'Apartment' : 'House';

    const rows: DvfPreviewRow[] = raw.map((r) => ({
      typeLabel,
      locationLabel,
      price: Math.round(Number(r.price)),
      monthsAgo: monthsAgoApprox(r.date),
    }));

    return { rows };
  }

  async createIntent(userId: string, body: CreateSellerIntentBody): Promise<SellerIntent> {
    const property = await this.propertyRepo.findOne(body.propertyId);
    if (!property) {
      throw new AppError('Estimate not found', 404);
    }
    if (property.userId !== userId) {
      throw new AppError('You do not have permission to save intent for this property', 403);
    }

    const agentId = resolveAgentId(property.locationCode);

    let notifSent = false;
    if (body.notifyAgent && (body.profileType === ProfileType.SELLER || body.profileType === ProfileType.SELLER_BUYER)) {
      const owner = await this.userRepo.findById(userId);
      if (!owner) {
        throw new AppError('User not found', 404);
      }
      const tp = body.targetPrice;
      const tl = body.timeline;
      const sp = body.sellPreference;
      if (
        tp == null ||
        tl == null ||
        sp == null
      ) {
        throw new AppError('Target price, timeline, and sell preference are required for seller notification', 400);
      }
      await this.notifyService.notifySellerIntent({
        profileType: body.profileType,
        property,
        targetPrice: tp,
        timeline: tl,
        sellPreference: sp,
        owner,
      });
      notifSent = true;
    }

    return this.intentRepo.create({
      userId,
      propertyId: body.propertyId,
      profileType: body.profileType,
      intentType: body.intentType ?? null,
      targetPrice: body.targetPrice ?? null,
      timeline: body.timeline ?? null,
      sellPreference: body.sellPreference ?? null,
      agentId,
      notifSent,
    });
  }
}
