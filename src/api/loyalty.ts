import { apiClient } from "./client";

export interface LoyaltyCustomerInfo {
  id: number;
  name: string;
  phone?: string | null;
  email?: string | null;
  cpfCnpj?: string | null;
}

export interface LoyaltyCard {
  campaignId: number;
  mechanicId: number;
  campaignName: string;
  stampsCurrent: number;
  stampsRequired: number;
  stampMode: "per_visit" | "min_value" | string;
  minValueCents?: number | null;
  rewardDescription?: string | null;
  stampImageUrl?: string | null;
  /** Se o cliente já completou e ainda não resgatou, vem o código short pendente. */
  pendingRewardCode?: string | null;
}

export interface LoyaltySearchResponse {
  customer: LoyaltyCustomerInfo;
  cards: LoyaltyCard[];
}

export interface StampResult {
  stampsCurrent: number;
  stampsRequired: number;
  completed: boolean;
  rewardCode?: string | null;
  rewardDescription?: string | null;
  emailSent: boolean;
}

export async function searchLoyaltyCustomer(q: string): Promise<LoyaltySearchResponse> {
  const { data } = await apiClient.get<LoyaltySearchResponse>("/loyalty/search", {
    params: { q },
  });
  return data;
}

export async function addStamp(campaignId: number, customerId: number): Promise<StampResult> {
  const { data } = await apiClient.post<StampResult>("/loyalty/stamp", {
    campaignId,
    customerId,
  });
  return data;
}
