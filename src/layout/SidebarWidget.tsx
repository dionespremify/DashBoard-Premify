import { Link } from "react-router";
import { useAuth } from "../context/AuthContext";

export default function SidebarWidget() {
  const { user } = useAuth();

  // Só mostra o CTA pra quem ainda NÃO tem assinatura paga ativa.
  // tenantStatus pode ser: trial | active | past_due | suspended | canceled
  const isActiveSubscription = user?.tenantStatus === "active";
  if (isActiveSubscription) return null;

  const isTrial = user?.tenantStatus === "trial";
  const trialEnds = user?.trialEndsAt ? new Date(user.trialEndsAt) : null;
  const daysLeft = trialEnds
    ? Math.max(0, Math.ceil((trialEnds.getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : null;

  return (
    <div className="mx-auto mb-10 w-full max-w-60 rounded-2xl bg-gradient-to-br from-brand-50 to-orange-50 px-4 py-5 text-center border border-brand-200 dark:from-brand-500/10 dark:to-orange-500/10 dark:border-brand-500/30">
      <h3 className="mb-2 font-semibold text-gray-900 dark:text-white">
        {isTrial ? "🎁 Você está no trial" : "⚠️ Assinatura inativa"}
      </h3>
      <p className="mb-4 text-gray-600 text-theme-sm dark:text-gray-400">
        {isTrial && daysLeft !== null
          ? `Restam ${daysLeft} ${daysLeft === 1 ? "dia" : "dias"} do seu período gratuito.`
          : "Reative seu acesso completo agora."}
      </p>
      <Link
        to="/personalizacao"
        className="flex items-center justify-center p-3 font-medium text-white rounded-lg bg-brand-500 text-theme-sm hover:bg-brand-600"
      >
        Contrate agora mesmo seu plano
      </Link>
    </div>
  );
}
