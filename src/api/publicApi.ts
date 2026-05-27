import { apiClient } from "./client";

export interface PublicCampaign {
  id: number;
  name: string;
  description?: string | null;
  status: string;
  startsAt: string;
  endsAt?: string | null;
  mechanics: {
    type: string;
    isPrimary: boolean;
    config?: unknown;
  }[];
  tenant: {
    slug: string;
    name: string;
    logoUrl?: string | null;
    backgroundColor?: string | null;
    backgroundImageUrl?: string | null;
    buttonColor?: string | null;
    wheelTheme?: "classic" | "vegas" | "neon" | null;
    gamificationType?: "wheel" | "scratch" | "box" | "plinko" | null;
  };
  customerFormConfig?: { key: string; enabled: boolean; required: boolean }[];
  surveyConfig?: {
    enabled: boolean;
    bonus: "none" | "extra_spin" | "extra_stamp";
    title?: string | null;
    subtitle?: string | null;
    questions: {
      id: string;
      type: "rating" | "multiple_choice" | "text";
      label: string;
      required: boolean;
      options?: string[] | null;
      max?: number | null;
    }[];
  } | null;
}

export interface PublicRegisterRequest {
  tenantSlug: string;
  phone: string;
  name?: string;
  email?: string;
  birthdate?: string;
  gender?: string;
  cpfCnpj?: string;
  address?: string;
  optInMarketing?: boolean;
}

export interface PublicCustomer {
  id: number;
  phone: string;
  name?: string | null;
  email?: string | null;
}

export interface PublicJoinRequest {
  tenantSlug: string;
  phone: string;
  campaignId: number;
}

export interface PublicReward {
  id: number;
  code: string;
  description: string;
  status: string;
  campaignName: string;
  participationId: number;
  createdAt: string;
  expiresAt?: string | null;
  redeemedAt?: string | null;
}

export async function getPublicCampaign(tenantSlug: string, campaignId: number): Promise<PublicCampaign> {
  const { data } = await apiClient.get<PublicCampaign>(`/public/${tenantSlug}/campaigns/${campaignId}`);
  return data;
}

export async function registerPublicCustomer(payload: PublicRegisterRequest): Promise<PublicCustomer> {
  const { data } = await apiClient.post<PublicCustomer>("/public/customers/register", payload);
  return data;
}

export interface ActiveCampaignSummary {
  id: number;
  name: string;
  description?: string | null;
  endsAt?: string | null;
}

export interface TenantCampaignsListResponse {
  tenant: {
    slug: string;
    name: string;
    logoUrl?: string | null;
    backgroundColor?: string | null;
    backgroundImageUrl?: string | null;
    buttonColor?: string | null;
    wheelTheme?: "classic" | "vegas" | "neon" | null;
    gamificationType?: "wheel" | "scratch" | "box" | "plinko" | null;
  };
  campaigns: ActiveCampaignSummary[];
}

export async function getTenantActiveCampaigns(tenantSlug: string): Promise<TenantCampaignsListResponse> {
  const { data } = await apiClient.get<TenantCampaignsListResponse>(`/public/${tenantSlug}/campaigns`);
  return data;
}

export async function joinPublicCampaign(payload: PublicJoinRequest) {
  const { data } = await apiClient.post("/public/participations/join", payload);
  return data;
}

export async function getCustomerRewards(tenantSlug: string, phone: string): Promise<PublicReward[]> {
  const { data } = await apiClient.get<PublicReward[]>(`/public/${tenantSlug}/customers/${phone}/rewards`);
  return data;
}

export interface PublicParticipation {
  id: number;
  campaignId: number;
  campaignName: string;
  customerId: number;
  customerPhone: string;
  status: string;
  joinedAt: string;
  progress: {
    mechanicId: number;
    mechanicType: string;
    progress?: unknown;
    completedAt?: string | null;
  }[];
  gamificationLimitReached?: boolean;
  gamificationLimitMessage?: string | null;
}

export async function getCustomerParticipations(tenantSlug: string, phone: string): Promise<PublicParticipation[]> {
  const { data } = await apiClient.get<PublicParticipation[]>(`/public/${tenantSlug}/customers/${phone}/participations`);
  return data;
}

export async function requestLoginCode(tenantSlug: string, email: string): Promise<void> {
  await apiClient.post(`/public/auth/request-code`, { tenantSlug, email });
}

export interface VerifyCodeResponse {
  id: number;
  phone: string;
  name?: string | null;
  email?: string | null;
}

export async function verifyLoginCode(tenantSlug: string, email: string, code: string): Promise<VerifyCodeResponse> {
  const { data } = await apiClient.post<VerifyCodeResponse>(`/public/auth/verify-code`, { tenantSlug, email, code });
  return data;
}

/** Extrai o prizeId do código da reward, formato "P:{prizeId}:{random}" */
export function extractPrizeIdFromCode(code: string): string | null {
  const m = code.match(/^P:([^:]+):/);
  return m ? m[1] : null;
}
