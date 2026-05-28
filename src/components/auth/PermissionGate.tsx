import type { ReactNode } from "react";
import { useAuth } from "../../context/AuthContext";
import { hasPermission } from "../../auth/permissions";

interface Props {
  permission: string;
  children: ReactNode;
  /** O que renderizar quando o user não tem a permissão. Default: nada. */
  fallback?: ReactNode;
}

/**
 * Esconde children quando o user logado não tem a permissão.
 * Não substitui a checagem do backend — é só pra UX (não mostrar botões/menus inúteis).
 */
export default function PermissionGate({ permission, children, fallback = null }: Props) {
  const { user } = useAuth();
  if (!hasPermission(user?.role, permission)) return <>{fallback}</>;
  return <>{children}</>;
}
