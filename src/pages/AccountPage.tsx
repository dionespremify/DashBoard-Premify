import { useEffect, useState, type FormEvent } from "react";
import PageMeta from "../components/common/PageMeta";
import PageBreadcrumb from "../components/common/PageBreadCrumb";
import Button from "../components/ui/button/Button";
import Label from "../components/form/Label";
import Input from "../components/form/input/InputField";
import { getAccount, updateCompany, type AccountInfo } from "../api/account";
import { useAuth } from "../context/AuthContext";
import TenantQRCodeCard from "../components/branding/TenantQRCodeCard";
import { extractApiError } from "../api/client";

const STATUS_LABEL: Record<string, { label: string; className: string }> = {
  trial: { label: "Trial gratuito", className: "bg-warning-50 text-warning-700 dark:bg-warning-500/10 dark:text-warning-300" },
  trialing: { label: "Trial gratuito", className: "bg-warning-50 text-warning-700 dark:bg-warning-500/10 dark:text-warning-300" },
  active: { label: "Ativo", className: "bg-success-50 text-success-700 dark:bg-success-500/10 dark:text-success-300" },
  past_due: { label: "Pagamento pendente", className: "bg-error-50 text-error-700 dark:bg-error-500/10 dark:text-error-300" },
  suspended: { label: "Suspenso", className: "bg-error-50 text-error-700 dark:bg-error-500/10 dark:text-error-300" },
  canceled: { label: "Cancelado", className: "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300" },
};

export default function AccountPage() {
  const { user } = useAuth();
  const [account, setAccount] = useState<AccountInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form da empresa
  const [name, setName] = useState("");
  const [legalName, setLegalName] = useState("");
  const [document, setDocument] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [zipCode, setZipCode] = useState("");

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const a = await getAccount();
        if (!active) return;
        setAccount(a);
        setName(a.company.name);
        setLegalName(a.company.legalName ?? "");
        setDocument(a.company.document ?? "");
        setEmail(a.company.email);
        setPhone(a.company.phone ?? "");
        setAddress(a.company.address ?? "");
        setCity(a.company.city ?? "");
        setState(a.company.state ?? "");
        setZipCode(a.company.zipCode ?? "");
      } catch (err) {
        if (active) setError(extractApiError(err, "Erro ao carregar conta"));
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, []);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (saving) return;
    if (!name.trim() || !email.trim()) {
      setError("Nome fantasia e email são obrigatórios");
      return;
    }
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const updated = await updateCompany({
        name: name.trim(),
        legalName: legalName.trim() || undefined,
        document: document.trim() || undefined,
        email: email.trim(),
        phone: phone.trim() || undefined,
        address: address.trim() || undefined,
        city: city.trim() || undefined,
        state: state.trim().toUpperCase() || undefined,
        zipCode: zipCode.trim() || undefined,
      });
      setAccount(updated);
      setSuccess("Dados da empresa atualizados!");
    } catch (err) {
      setError(extractApiError(err, "Erro ao salvar"));
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <>
        <PageBreadcrumb pageTitle="Configurações de conta" />
        <div className="p-8 text-center text-gray-500 dark:text-gray-400">Carregando…</div>
      </>
    );
  }

  return (
    <>
      <PageMeta title="Configurações de conta | Premify" description="Gerencie seu plano e dados da empresa." />
      <PageBreadcrumb pageTitle="Configurações de conta" />

      <div className="max-w-3xl space-y-5">
        {/* Plano atual */}
        {account?.plan && <PlanCard plan={account.plan} trialEndsAt={account.company.trialEndsAt} />}

        {/* QR Code único do estabelecimento */}
        {user?.tenantSlug && (
          <TenantQRCodeCard
            slug={user.tenantSlug}
            tenantName={user.tenantName ?? name ?? "Estabelecimento"}
          />
        )}

        {/* Form da empresa */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="p-6 bg-white rounded-2xl shadow-sm dark:bg-gray-800/50 dark:border dark:border-gray-700">
            <h2 className="mb-1 text-lg font-medium text-gray-800 dark:text-white/90">Dados da empresa</h2>
            <p className="mb-5 text-sm text-gray-500 dark:text-gray-400">
              Essas informações aparecem em recibos, emails e na sua página pública.
            </p>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Label>
                  Nome fantasia <span className="text-error-500">*</span>
                </Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Bar do Zé" />
              </div>
              <div className="sm:col-span-2">
                <Label>Razão social</Label>
                <Input
                  value={legalName}
                  onChange={(e) => setLegalName(e.target.value)}
                  placeholder="Ex: Zé Comércio de Bebidas LTDA"
                />
              </div>
              <div>
                <Label>CNPJ / CPF</Label>
                <Input value={document} onChange={(e) => setDocument(e.target.value)} placeholder="00.000.000/0000-00" />
              </div>
              <div>
                <Label>Telefone</Label>
                <Input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="(11) 99999-9999"
                />
              </div>
              <div className="sm:col-span-2">
                <Label>
                  Email <span className="text-error-500">*</span>
                </Label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="contato@suaempresa.com"
                />
              </div>
            </div>
          </div>

          <div className="p-6 bg-white rounded-2xl shadow-sm dark:bg-gray-800/50 dark:border dark:border-gray-700">
            <h2 className="mb-4 text-lg font-medium text-gray-800 dark:text-white/90">Endereço</h2>
            <div className="grid gap-4 sm:grid-cols-6">
              <div className="sm:col-span-4">
                <Label>Endereço (rua, número, bairro)</Label>
                <Input
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Rua das Flores, 123 — Centro"
                />
              </div>
              <div className="sm:col-span-2">
                <Label>CEP</Label>
                <Input value={zipCode} onChange={(e) => setZipCode(e.target.value)} placeholder="00000-000" />
              </div>
              <div className="sm:col-span-4">
                <Label>Cidade</Label>
                <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="São Paulo" />
              </div>
              <div className="sm:col-span-2">
                <Label>UF</Label>
                <Input value={state} onChange={(e) => setState(e.target.value.toUpperCase().slice(0, 2))} placeholder="SP" />
              </div>
            </div>
          </div>

          {error && (
            <div className="p-3 text-sm rounded-lg bg-error-50 text-error-700 border border-error-200 dark:bg-error-500/10 dark:text-error-300 dark:border-error-500/30">
              {error}
            </div>
          )}
          {success && (
            <div className="p-3 text-sm rounded-lg bg-success-50 text-success-700 border border-success-200 dark:bg-success-500/10 dark:text-success-300 dark:border-success-500/30">
              {success}
            </div>
          )}

          <div className="flex justify-end">
            <Button disabled={saving}>{saving ? "Salvando…" : "Salvar dados da empresa"}</Button>
          </div>
        </form>
      </div>
    </>
  );
}

// ─────────────────────────────────────────────────
function PlanCard({
  plan,
  trialEndsAt,
}: {
  plan: NonNullable<AccountInfo["plan"]>;
  trialEndsAt?: string | null;
}) {
  const status = STATUS_LABEL[plan.status] ?? { label: plan.status, className: "bg-gray-100 text-gray-700" };
  const priceFormatted = (plan.priceCents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  const isTrial = plan.status === "trial" || plan.status === "trialing";

  const trialEnds = trialEndsAt ? new Date(trialEndsAt) : null;
  const daysLeft = trialEnds
    ? Math.max(0, Math.ceil((trialEnds.getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : null;

  return (
    <div className="p-6 bg-gradient-to-br from-brand-50 to-orange-50 rounded-2xl border border-brand-200 dark:from-brand-500/10 dark:to-orange-500/10 dark:border-brand-500/30">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs uppercase font-semibold tracking-wide text-brand-600 dark:text-brand-300">
              Plano atual
            </span>
            <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${status.className}`}>
              {status.label}
            </span>
          </div>
          <div className="text-2xl font-bold text-gray-800 dark:text-white/90">{plan.name}</div>
          <div className="text-sm text-gray-600 dark:text-gray-300 mt-1">
            {priceFormatted}<span className="text-gray-500">/mês</span>
          </div>
          {isTrial && daysLeft !== null && (
            <div className="mt-3 text-sm">
              <span className="text-gray-600 dark:text-gray-300">
                🎁 Restam <strong>{daysLeft} {daysLeft === 1 ? "dia" : "dias"}</strong> do seu trial
              </span>
            </div>
          )}
          {!isTrial && plan.status === "active" && (
            <div className="mt-3 text-sm text-gray-600 dark:text-gray-300">
              Próxima renovação: <strong>{new Date(plan.currentPeriodEnd).toLocaleDateString("pt-BR")}</strong>
            </div>
          )}
        </div>

        <div>
          <button
            type="button"
            onClick={() => alert("Integração de pagamento será adicionada em breve!")}
            className="px-5 h-11 text-sm font-semibold text-white bg-brand-500 hover:bg-brand-600 rounded-lg shadow"
          >
            {isTrial ? "🚀 Fazer upgrade" : "Trocar plano"}
          </button>
        </div>
      </div>

      <div className="mt-5 pt-5 border-t border-brand-200 dark:border-brand-500/30 grid grid-cols-3 gap-4 text-center">
        <div>
          <div className="text-xs text-gray-500 dark:text-gray-400">Campanhas</div>
          <div className="text-lg font-semibold text-gray-800 dark:text-white/90">{plan.maxCampaigns}</div>
        </div>
        <div>
          <div className="text-xs text-gray-500 dark:text-gray-400">Ativas simultâneas</div>
          <div className="text-lg font-semibold text-gray-800 dark:text-white/90">{plan.maxActiveCampaigns}</div>
        </div>
        <div>
          <div className="text-xs text-gray-500 dark:text-gray-400">Unidades</div>
          <div className="text-lg font-semibold text-gray-800 dark:text-white/90">{plan.maxUnits}</div>
        </div>
      </div>
    </div>
  );
}
