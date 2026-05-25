import { apiClient } from "./client";

export interface Company {
  slug: string;
  name: string;
  legalName?: string | null;
  document?: string | null;
  email: string;
  phone?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  zipCode?: string | null;
  status: string;
  trialEndsAt?: string | null;
}

export interface PlanInfo {
  code: string;
  name: string;
  priceCents: number;
  status: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  maxCampaigns: number;
  maxActiveCampaigns: number;
  maxUnits: number;
}

export interface AccountInfo {
  company: Company;
  plan?: PlanInfo | null;
}

export interface UpdateCompanyRequest {
  name: string;
  legalName?: string;
  document?: string;
  email: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
}

export async function getAccount(): Promise<AccountInfo> {
  const { data } = await apiClient.get<AccountInfo>("/account");
  return data;
}

export async function updateCompany(payload: UpdateCompanyRequest): Promise<AccountInfo> {
  const { data } = await apiClient.put<AccountInfo>("/account/company", payload);
  return data;
}
