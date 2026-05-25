import axios, { AxiosError, type AxiosInstance, type InternalAxiosRequestConfig } from "axios";

const baseURL = import.meta.env.VITE_API_URL ?? "http://localhost:5071/api";

export const TOKEN_STORAGE_KEY = "premify_token";

export const apiClient: AxiosInstance = axios.create({
  baseURL,
  headers: { "Content-Type": "application/json" },
});

apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = localStorage.getItem(TOKEN_STORAGE_KEY);
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Tipo padrão das respostas de erro da API
export interface ApiErrorBody {
  message?: string;
}

apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiErrorBody>) => {
    if (error.response?.status === 401) {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
      // Não force redirect aqui: o PrivateRoute trata isso na próxima navegação.
    }
    return Promise.reject(error);
  },
);

export function extractApiError(error: unknown, fallback = "Erro inesperado"): string {
  if (axios.isAxiosError<ApiErrorBody>(error)) {
    return error.response?.data?.message ?? error.message ?? fallback;
  }
  if (error instanceof Error) return error.message;
  return fallback;
}
