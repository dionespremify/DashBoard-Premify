import { apiClient } from "./client";

export interface CampaignStats {
  total: number;
  active: number;
  paused: number;
  draft: number;
  ended: number;
}

export interface CustomerStats {
  total: number;
  last7Days: number;
}

export interface RewardStats {
  total: number;
  pending: number;
  redeemed: number;
  expired: number;
}

export interface TopCampaign {
  id: number;
  name: string;
  status: string;
  participants: number;
  rewardsTotal: number;
  rewardsRedeemed: number;
}

export interface DailyActivity {
  date: string;          // yyyy-MM-dd
  participations: number;
  rewards: number;
}

export interface RecentReward {
  id: number;
  code: string;
  description: string;
  status: string;
  campaignName: string;
  createdAt: string;
  redeemedAt?: string | null;
}

export interface DashboardStats {
  campaigns: CampaignStats;
  customers: CustomerStats;
  rewards: RewardStats;
  topCampaigns: TopCampaign[];
  weeklyActivity: DailyActivity[];
  recentRewards: RecentReward[];
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const { data } = await apiClient.get<DashboardStats>("/dashboard/stats");
  return data;
}
