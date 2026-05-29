import { apiClient } from "./client";

export type WizardAnswers = Record<string, string | null>;

export interface WizardOption {
  key: string;
  label: string;
  description?: string | null;
  icon?: string | null;
}

export interface WizardQuestion {
  nodeCode: string;
  dimension: string;
  questionText: string;
  subtitle?: string | null;
  options: WizardOption[];
}

export interface WizardMechanicPreview {
  type: string;
  isPrimary: boolean;
  config_template?: unknown;
}

export interface WizardDimensionQuestion {
  key: string;
  label: string;
  type: string; // "int" | "percent" | "money" | "text" | "date" | "boolean" | "prize_pool" | "select"
  default?: unknown;
  min?: unknown;
  max?: unknown;
  placeholder?: string;
  options?: { value: string; label: string; icon?: string; description?: string }[];
}

export interface WizardRecommendation {
  blueprintCode: string;
  label: string;
  description?: string | null;
  icon?: string | null;
  mechanics: WizardMechanicPreview[];
  dimensionQuestions: WizardDimensionQuestion[];
  winnerPool?: string | null;
  rewardTiming?: string | null;
  returnMotivator?: string | null;
}

export interface WizardStepResponse {
  type: "question" | "recommendation" | "no_match";
  question?: WizardQuestion | null;
  recommendation?: WizardRecommendation | null;
  message?: string | null;
  state: WizardAnswers;
}

export interface WizardStepRequest {
  answers: WizardAnswers;
}

export async function startWizard(): Promise<WizardStepResponse> {
  const { data } = await apiClient.get<WizardStepResponse>("/wizard/start");
  return data;
}

export async function nextWizardStep(answers: WizardAnswers): Promise<WizardStepResponse> {
  const { data } = await apiClient.post<WizardStepResponse>("/wizard/step", { answers });
  return data;
}
