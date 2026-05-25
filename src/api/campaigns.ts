import { apiClient } from "./client";
import type { WizardAnswers } from "./wizard";

export interface MechanicResponse {
  id: number;
  type: string;
  isPrimary: boolean;
  config?: unknown;
}

export interface Campaign {
  id: number;
  blueprintCode?: string | null;
  objectiveCode?: string | null;
  name: string;
  description?: string | null;
  status: string;
  startsAt: string;
  endsAt?: string | null;
  mechanics: MechanicResponse[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateCampaignRequest {
  blueprintCode: string;
  name: string;
  description?: string;
  startsAt: string;
  endsAt?: string;
  wizardAnswers: WizardAnswers;
  dimensioning: Record<string, unknown>;
  activateImmediately: boolean;
}

export async function listCampaigns(): Promise<Campaign[]> {
  const { data } = await apiClient.get<Campaign[]>("/campaigns");
  return data;
}

export async function getCampaign(id: number): Promise<Campaign> {
  const { data } = await apiClient.get<Campaign>(`/campaigns/${id}`);
  return data;
}

export async function createCampaign(payload: CreateCampaignRequest): Promise<Campaign> {
  const { data } = await apiClient.post<Campaign>("/campaigns", payload);
  return data;
}

export async function updateCampaignStatus(id: number, status: string): Promise<Campaign> {
  const { data } = await apiClient.patch<Campaign>(`/campaigns/${id}/status`, { status });
  return data;
}
