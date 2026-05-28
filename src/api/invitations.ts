import { apiClient } from "./client";
import type { Role } from "./users";

export interface InvitationDetails {
  name: string;
  email: string;
  role: Role;
  tenantName: string;
  expiresAt: string;
}

export async function getInvitation(token: string): Promise<InvitationDetails> {
  const { data } = await apiClient.get<InvitationDetails>(`/invitations/${token}`);
  return data;
}

export async function acceptInvitation(token: string, password: string): Promise<void> {
  await apiClient.post(`/invitations/${token}/accept`, { password });
}
