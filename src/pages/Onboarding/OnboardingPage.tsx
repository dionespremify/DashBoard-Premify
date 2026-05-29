import { useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router";
import PageMeta from "../../components/common/PageMeta";
import Button from "../../components/ui/button/Button";
import Label from "../../components/form/Label";
import Input from "../../components/form/input/InputField";
import {
  completeProfile,
  getOnboardingStatus,
  listSegments,
  type Segment,
} from "../../api/onboarding";
import { extractApiError } from "../../api/client";

const AGE_RANGES = [
  { value: "18-25", label: "18–25 anos" },
  { value: "26-40", label: "26–40 anos" },
  { value: "41+", label: "41 anos ou mais" },
  { value: "mixed", label: "Misto" },
];

const GENDER_OPTIONS = [
  { value: "mixed", label: "Misto" },
  { value: "female", label: "Predominantemente feminino" },
  { value: "male", label: "Predominantemente masculino" },
];

const ORIENTATION_OPTIONS = [
  { value: "mixed", label: "Público geral" },
  { value: "lgbtqia_friendly", label: "LGBTQIA+ friendly" },
];

const WEEKDAYS = [
  { value: "mon", label: "Seg" },
  { value: "tue", label: "Ter" },
  { value: "wed", label: "Qua" },
  { value: "thu", label: "Qui" },
  { value: "fri", label: "Sex" },
  { value: "sat", label: "Sáb" },
  { value: "sun", label: "Dom" },
];

export default function OnboardingPage() {
  const navigate = useNavigate();

  const [segments, setSegments] = useState<Segment[]>([]);
  const [loadingSegments, setLoadingSegments] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [segmentCode, setSegmentCode] = useState<string>("");
  const [isFranchise, setIsFranchise] = useState(false);
  const [unitsCountDeclared, setUnitsCountDeclared] = useState(1);
  const [audienceAgeRange, setAudienceAgeRange] = useState("mixed");
  const [audienceGenderFocus, setAudienceGenderFocus] = useState("mixed");
  const [audienceOrientation, setAudienceOrientation] = useState("mixed");
  const [averageTicket, setAverageTicket] = useState<string>("");
  const [peakDays, setPeakDays] = useState<string[]>([]);
  const [peakHours, setPeakHours] = useState("");

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [segs, status] = await Promise.all([listSegments(), getOnboardingStatus()]);
        if (!active) return;
        setSegments(segs);
        if (status.isCompleted) {
          navigate("/", { replace: true });
          return;
        }
        if (status.profile) {
          if (status.profile.segmentCode) setSegmentCode(status.profile.segmentCode);
          setIsFranchise(status.profile.isFranchise);
          setUnitsCountDeclared(status.profile.unitsCountDeclared || 1);
          setAudienceAgeRange(status.profile.audienceAgeRange ?? "mixed");
          setAudienceGenderFocus(status.profile.audienceGenderFocus ?? "mixed");
          setAudienceOrientation(status.profile.audienceOrientation ?? "mixed");
          if (status.profile.averageTicketCents)
            setAverageTicket((status.profile.averageTicketCents / 100).toFixed(2));
          if (status.profile.peakDays) setPeakDays(status.profile.peakDays);
          if (status.profile.peakHours) setPeakHours(status.profile.peakHours);
        }
      } catch (err) {
        if (active) setError(extractApiError(err, "Erro ao carregar dados do onboarding"));
      } finally {
        if (active) setLoadingSegments(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [navigate]);

  function togglePeakDay(value: string) {
    setPeakDays((prev) =>
      prev.includes(value) ? prev.filter((d) => d !== value) : [...prev, value],
    );
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (submitting) return;

    if (!segmentCode) {
      setError("Escolha um segmento do seu negócio");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await completeProfile({
        segmentCode,
        isFranchise,
        unitsCountDeclared,
        audienceAgeRange,
        audienceGenderFocus,
        audienceOrientation,
        averageTicketCents: averageTicket
          ? Math.round(parseFloat(averageTicket.replace(",", ".")) * 100)
          : undefined,
        peakDays: peakDays.length > 0 ? peakDays : undefined,
        peakHours: peakHours || undefined,
      });
      navigate("/", { replace: true });
    } catch (err) {
      setError(extractApiError(err, "Não foi possível salvar seu perfil"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <PageMeta title="Onboarding | Premify" description="Configure o perfil do seu negócio na Premify." />

      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-10 px-4">
        <div className="max-w-3xl mx-auto">
          <div className="mb-8 text-center">
            <h1 className="text-2xl font-semibold text-gray-800 dark:text-white/90 sm:text-3xl">
              Sobre o seu negócio
            </h1>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              Essas informações ajudam a Premify a recomendar as melhores campanhas pra você.
            </p>
          </div>

          {loadingSegments ? (
            <div className="text-center text-gray-500 dark:text-gray-400">Carregando…</div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-8">
              {/* Segmento */}
              <section className="p-4 sm:p-6 bg-white rounded-2xl shadow-sm dark:bg-gray-800/50 dark:border dark:border-gray-700">
                <h2 className="mb-4 text-lg font-medium text-gray-800 dark:text-white/90">
                  Qual o segmento do seu negócio? <span className="text-error-500">*</span>
                </h2>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                  {segments.map((s) => {
                    const selected = segmentCode === s.code;
                    return (
                      <button
                        type="button"
                        key={s.code}
                        onClick={() => setSegmentCode(s.code)}
                        className={`flex flex-col items-center justify-center p-4 transition border rounded-xl text-sm font-medium ${
                          selected
                            ? "bg-brand-50 border-brand-500 text-brand-600 dark:bg-brand-500/10 dark:border-brand-400 dark:text-brand-300"
                            : "bg-white border-gray-200 text-gray-700 hover:border-gray-300 dark:bg-gray-900 dark:border-gray-700 dark:text-gray-300 dark:hover:border-gray-600"
                        }`}
                      >
                        {s.icon && <span className="text-2xl mb-1">{s.icon}</span>}
                        <span>{s.label}</span>
                      </button>
                    );
                  })}
                </div>
              </section>

              {/* Franquia + unidades */}
              <section className="p-4 sm:p-6 bg-white rounded-2xl shadow-sm dark:bg-gray-800/50 dark:border dark:border-gray-700">
                <h2 className="mb-4 text-lg font-medium text-gray-800 dark:text-white/90">
                  Você tem mais de uma unidade?
                </h2>
                <div className="flex items-center gap-3 mb-4">
                  <label className="inline-flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isFranchise}
                      onChange={(e) => setIsFranchise(e.target.checked)}
                      className="w-4 h-4 rounded border-gray-300 text-brand-500 focus:ring-brand-500"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">É uma franquia ou rede com várias lojas</span>
                  </label>
                </div>

                <div>
                  <Label>Quantas unidades?</Label>
                  <Input
                    type="number"
                    min="1"
                    max="1000"
                    value={unitsCountDeclared}
                    onChange={(e) => setUnitsCountDeclared(Math.max(1, parseInt(e.target.value || "1", 10)))}
                  />
                </div>
              </section>

              {/* Público-alvo */}
              <section className="p-4 sm:p-6 bg-white rounded-2xl shadow-sm dark:bg-gray-800/50 dark:border dark:border-gray-700">
                <h2 className="mb-4 text-lg font-medium text-gray-800 dark:text-white/90">
                  Sobre o seu público
                </h2>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label>Faixa etária predominante</Label>
                    <select
                      value={audienceAgeRange}
                      onChange={(e) => setAudienceAgeRange(e.target.value)}
                      className="h-11 w-full rounded-lg border border-gray-300 px-4 text-sm bg-transparent text-gray-800 dark:border-gray-700 dark:text-white/90 dark:bg-gray-900"
                    >
                      {AGE_RANGES.map((r) => (
                        <option key={r.value} value={r.value}>
                          {r.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <Label>Gênero</Label>
                    <select
                      value={audienceGenderFocus}
                      onChange={(e) => setAudienceGenderFocus(e.target.value)}
                      className="h-11 w-full rounded-lg border border-gray-300 px-4 text-sm bg-transparent text-gray-800 dark:border-gray-700 dark:text-white/90 dark:bg-gray-900"
                    >
                      {GENDER_OPTIONS.map((g) => (
                        <option key={g.value} value={g.value}>
                          {g.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="sm:col-span-2">
                    <Label>Posicionamento do estabelecimento</Label>
                    <select
                      value={audienceOrientation}
                      onChange={(e) => setAudienceOrientation(e.target.value)}
                      className="h-11 w-full rounded-lg border border-gray-300 px-4 text-sm bg-transparent text-gray-800 dark:border-gray-700 dark:text-white/90 dark:bg-gray-900"
                    >
                      {ORIENTATION_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </section>

              {/* Operação */}
              <section className="p-4 sm:p-6 bg-white rounded-2xl shadow-sm dark:bg-gray-800/50 dark:border dark:border-gray-700">
                <h2 className="mb-4 text-lg font-medium text-gray-800 dark:text-white/90">
                  Sobre a sua operação
                </h2>

                <div className="grid gap-4 sm:grid-cols-2 mb-4">
                  <div>
                    <Label>Ticket médio (R$)</Label>
                    <Input
                      type="text"
                      placeholder="ex: 45,00"
                      value={averageTicket}
                      onChange={(e) => setAverageTicket(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Horário de pico</Label>
                    <Input
                      placeholder="ex: 18:00–23:00"
                      value={peakHours}
                      onChange={(e) => setPeakHours(e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <Label>Dias de maior movimento</Label>
                  <div className="flex flex-wrap gap-2">
                    {WEEKDAYS.map((d) => {
                      const selected = peakDays.includes(d.value);
                      return (
                        <button
                          type="button"
                          key={d.value}
                          onClick={() => togglePeakDay(d.value)}
                          className={`px-4 py-2 text-sm rounded-lg border transition ${
                            selected
                              ? "bg-brand-50 border-brand-500 text-brand-600 dark:bg-brand-500/10 dark:border-brand-400 dark:text-brand-300"
                              : "bg-white border-gray-200 text-gray-700 hover:border-gray-300 dark:bg-gray-900 dark:border-gray-700 dark:text-gray-300"
                          }`}
                        >
                          {d.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </section>

              {error && (
                <div className="p-3 text-sm rounded-lg bg-error-50 text-error-700 border border-error-200 dark:bg-error-500/10 dark:text-error-300 dark:border-error-500/30">
                  {error}
                </div>
              )}

              <div className="flex justify-end">
                <Button disabled={submitting}>
                  {submitting ? "Salvando…" : "Concluir e ir para o painel"}
                </Button>
              </div>
            </form>
          )}
        </div>
      </div>
    </>
  );
}
