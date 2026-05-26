import { apiClient } from "./client";

export interface RewardDetail {
  id: number;
  code: string;
  description: string;
  status: string;
  participationId: number;
  campaignId: number;
  campaignName: string;
  customerName?: string | null;
  customerPhone?: string | null;
  createdAt: string;
  expiresAt?: string | null;
  redeemedAt?: string | null;
}

export async function getRewardByCode(code: string): Promise<RewardDetail | null> {
  try {
    const { data } = await apiClient.get<RewardDetail>(`/rewards/${encodeURIComponent(code.trim())}`);
    return data;
  } catch (err) {
    if ((err as { response?: { status: number } }).response?.status === 404) return null;
    throw err;
  }
}

export async function redeemReward(code: string): Promise<RewardDetail> {
  const { data } = await apiClient.post<RewardDetail>("/rewards/redeem", { code: code.trim() });
  return data;
}

export async function listPendingRewards(): Promise<RewardDetail[]> {
  const { data } = await apiClient.get<RewardDetail[]>("/rewards/pending");
  return data;
}

export async function listRedeemedToday(): Promise<RewardDetail[]> {
  const { data } = await apiClient.get<RewardDetail[]>("/rewards/redeemed-today");
  return data;
}
