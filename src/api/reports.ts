import { apiClient } from "./client";

// ─── Pesquisas ───
export interface SurveyCampaignSummary {
  campaignId: number;
  campaignName: string;
  status: string;
  totalResponses: number;
  lastResponseAt?: string | null;
}

export interface OptionCount {
  option: string;
  count: number;
}

export interface QuestionStats {
  id: string;
  label: string;
  type: string;
  totalAnswered: number;
  averageRating?: number | null;
  ratingMax?: number | null;
  ratingDistribution?: Record<string, number> | null;
  optionCounts?: OptionCount[] | null;
  textResponsesCount?: number | null;
}

export interface TextResponse {
  questionId: string;
  questionLabel: string;
  answer: string;
  customerName?: string | null;
  customerPhone: string;
  createdAt: string;
}

export interface SurveyReport {
  campaignId: number;
  campaignName: string;
  totalResponses: number;
  questions: QuestionStats[];
  textSamples: TextResponse[];
}

export async function listSurveyCampaigns(): Promise<SurveyCampaignSummary[]> {
  const { data } = await apiClient.get<SurveyCampaignSummary[]>("/reports/surveys");
  return data;
}

export async function getSurveyReport(campaignId: number): Promise<SurveyReport> {
  const { data } = await apiClient.get<SurveyReport>(`/reports/surveys/${campaignId}`);
  return data;
}

// ─── Prêmios ───
export interface RewardSummary {
  totalGenerated: number;
  pending: number;
  redeemed: number;
  expired: number;
  canceled: number;
  redemptionRate: number;
}

export interface RewardReportItem {
  id: number;
  code: string;
  description: string;
  status: string;
  campaignId: number;
  campaignName: string;
  customerId: number;
  customerPhone: string;
  customerName?: string | null;
  customerEmail?: string | null;
  createdAt: string;
  redeemedAt?: string | null;
  expiresAt?: string | null;
}

export interface RewardsReport {
  summary: RewardSummary;
  total: number;
  page: number;
  pageSize: number;
  items: RewardReportItem[];
}

export async function listRewards(params: {
  campaignId?: number;
  status?: string;
  page?: number;
  pageSize?: number;
} = {}): Promise<RewardsReport> {
  const search = new URLSearchParams();
  if (params.campaignId) search.set("campaignId", String(params.campaignId));
  if (params.status) search.set("status", params.status);
  if (params.page) search.set("page", String(params.page));
  if (params.pageSize) search.set("pageSize", String(params.pageSize));
  const { data } = await apiClient.get<RewardsReport>(`/reports/rewards?${search.toString()}`);
  return data;
}
