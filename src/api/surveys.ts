import { apiClient } from "./client";

export type SurveyBonus = "none" | "extra_spin" | "extra_stamp";
export type SurveyQuestionType = "rating" | "multiple_choice" | "text";

export interface SurveyQuestion {
  id: string;
  type: SurveyQuestionType;
  label: string;
  required: boolean;
  options?: string[] | null;
  max?: number | null;
}

export interface SurveyConfig {
  enabled: boolean;
  bonus: SurveyBonus;
  title?: string | null;
  subtitle?: string | null;
  questions: SurveyQuestion[];
}

export const DEFAULT_SURVEY_CONFIG: SurveyConfig = {
  enabled: false,
  bonus: "none",
  title: "Sua opinião vale prêmios! 🎁",
  subtitle: "Responda em 30 segundos e ganhe um bônus.",
  questions: [
    {
      id: "nps",
      type: "rating",
      label: "De 0 a 10, quanto você recomendaria nosso lugar?",
      required: false,
      max: 10,
    },
    {
      id: "origin",
      type: "multiple_choice",
      label: "Como nos conheceu?",
      required: false,
      options: ["Indicação", "Instagram", "Passei aqui na frente", "Google", "Outro"],
    },
    {
      id: "suggestion",
      type: "text",
      label: "Tem alguma sugestão pra gente?",
      required: false,
    },
  ],
};

export interface SubmitSurveyRequest {
  tenantSlug: string;
  phone: string;
  campaignId: number;
  answers: Record<string, unknown>;
}

export interface SubmitSurveyResponse {
  saved: boolean;
  bonus: SurveyBonus;
  bonusMessage?: string | null;
}

export async function submitSurvey(payload: SubmitSurveyRequest): Promise<SubmitSurveyResponse> {
  const { data } = await apiClient.post<SubmitSurveyResponse>("/public/surveys", payload);
  return data;
}
