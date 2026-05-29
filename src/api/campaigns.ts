import { apiClient } from "./client";
import type { WizardAnswers } from "./wizard";
import type { SurveyConfig } from "./surveys";

export interface MechanicResponse {
  id: number;
  type: string;
  isPrimary: boolean;
  config?: unknown;
}

export interface BlueprintDimensionOption {
  value: string;
  label: string;
  icon?: string | null;
  description?: string | null;
}

export interface BlueprintDimensionQuestion {
  key: string;
  label: string;
  type: string;
  default?: unknown;
  min?: unknown;
  max?: unknown;
  placeholder?: string | null;
  options?: BlueprintDimensionOption[] | null;
  showIfKey?: string | null;
  showIfValue?: string | null;
}

export interface BlueprintEditContext {
  code: string;
  label: string;
  description?: string | null;
  icon?: string | null;
  dimensionQuestions: BlueprintDimensionQuestion[];
  winnerPool?: string | null;
  rewardTiming?: string | null;
  returnMotivator?: string | null;
}

export type CustomerFormFieldKey =
  | "phone"
  | "name"
  | "email"
  | "birthdate"
  | "gender"
  | "cpf_cnpj"
  | "address";

export interface CustomerFormField {
  key: CustomerFormFieldKey | string;
  enabled: boolean;
  required: boolean;
}

export const DEFAULT_CUSTOMER_FORM: CustomerFormField[] = [
  { key: "phone", enabled: true, required: true },
  { key: "name", enabled: true, required: true },
  { key: "email", enabled: false, required: false },
  { key: "birthdate", enabled: false, required: false },
  { key: "gender", enabled: false, required: false },
  { key: "cpf_cnpj", enabled: false, required: false },
  { key: "address", enabled: false, required: false },
];

export const CUSTOMER_FIELD_META: Record<string, { label: string; icon: string; type: string }> = {
  phone: { label: "Telefone", icon: "📱", type: "tel" },
  name: { label: "Nome", icon: "👤", type: "text" },
  email: { label: "Email", icon: "📧", type: "email" },
  birthdate: { label: "Data de nascimento", icon: "🎂", type: "date" },
  gender: { label: "Gênero", icon: "⚧", type: "select" },
  cpf_cnpj: { label: "CPF/CNPJ", icon: "🪪", type: "text" },
  address: { label: "Endereço", icon: "🏠", type: "textarea" },
};

export type ParticipationLimitPeriod = "total" | "day" | "week" | "month";

export interface ParticipationLimitConfig {
  enabled: boolean;
  period?: ParticipationLimitPeriod | null;
  count?: number | null;
}

export type GamificationType = "wheel" | "scratch" | "plinko" | "penalty" | "flip";

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
  blueprint?: BlueprintEditContext | null;
  customerFormConfig?: CustomerFormField[];
  surveyConfig?: SurveyConfig | null;
  participationLimit?: ParticipationLimitConfig | null;
  gamificationType?: GamificationType | null;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateCampaignRequest {
  name: string;
  description?: string;
  startsAt: string;
  endsAt?: string;
  dimensioning: Record<string, unknown>;
  customerFormConfig?: CustomerFormField[];
  surveyConfig?: SurveyConfig;
  participationLimit?: ParticipationLimitConfig;
  gamificationType?: GamificationType;
}

export interface CreateCampaignRequest {
  blueprintCode: string;
  name: string;
  description?: string;
  startsAt: string;
  endsAt?: string;
  wizardAnswers: WizardAnswers;
  dimensioning: Record<string, unknown>;
  customerFormConfig?: CustomerFormField[];
  surveyConfig?: SurveyConfig;
  participationLimit?: ParticipationLimitConfig;
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

export async function updateCampaign(id: number, payload: UpdateCampaignRequest): Promise<Campaign> {
  const { data } = await apiClient.put<Campaign>(`/campaigns/${id}`, payload);
  return data;
}

export async function deleteCampaign(id: number): Promise<void> {
  await apiClient.delete(`/campaigns/${id}`);
}
