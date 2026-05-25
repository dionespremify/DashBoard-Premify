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
  };
}

export interface PublicRegisterRequest {
  tenantSlug: string;
  phone: string;
  name?: string;
  email?: string;
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

export async function joinPublicCampaign(payload: PublicJoinRequest) {
  const { data } = await apiClient.post("/public/participations/join", payload);
  return data;
}

export async function getCustomerRewards(tenantSlug: string, phone: string): Promise<PublicReward[]> {
  const { data } = await apiClient.get<PublicReward[]>(`/public/${tenantSlug}/customers/${phone}/rewards`);
  return data;
}

/** Extrai o prizeId do código da reward, formato "P:{prizeId}:{random}" */
export function extractPrizeIdFromCode(code: string): string | null {
  const m = code.match(/^P:([^:]+):/);
  return m ? m[1] : null;
}
