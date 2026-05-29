import { useEffect, useState } from "react";
import { getCampaignFlow, updateCampaignFlow } from "../../api/flow";
import { extractApiError } from "../../api/client";
import Button from "../ui/button/Button";

interface Props {
  campaignId: number;
}

/**
 * Editor do flow_config (JSON) da campanha.
 *
 * Permite:
 *  - Ver o JSON atual (formatado)
 *  - Copiar pra editar externamente (Node-RED, VS Code, etc)
 *  - Colar de volta um JSON modificado
 *  - Salvar — backend valida sintaxe e estrutura mínima
 */
export default function FlowConfigEditor({ campaignId }: Props) {
  const [json, setJson] = useState<string>("");
  const [original, setOriginal] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    (async () => {
      try {
        const raw = await getCampaignFlow(campaignId);
        const formatted = prettyPrint(raw);
        if (!active) return;
        setJson(formatted);
        setOriginal(formatted);
      } catch (err) {
        if (active) setError(extractApiError(err, "Erro ao carregar fluxo"));
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [campaignId]);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(json);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // fallback simples
      const ta = document.createElement("textarea");
      ta.value = json;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  }

  function handleDownload() {
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `campanha-${campaignId}-fluxo.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  async function handlePasteFromClipboard() {
    try {
      const txt = await navigator.clipboard.readText();
      try {
        const parsed = JSON.parse(txt);
        setJson(JSON.stringify(parsed, null, 2));
        setEditing(true);
        setSuccess(null);
        setError(null);
      } catch {
        setError("O que está na área de transferência não é um JSON válido.");
      }
    } catch {
      setError("Não consegui acessar a área de transferência. Cole manualmente no editor.");
    }
  }

  function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const txt = String(reader.result ?? "");
      try {
        const parsed = JSON.parse(txt);
        setJson(JSON.stringify(parsed, null, 2));
        setEditing(true);
        setSuccess(null);
        setError(null);
      } catch {
        setError("Arquivo não contém JSON válido.");
      }
    };
    reader.readAsText(file);
    // reset input pra permitir mesmo arquivo de novo
    e.target.value = "";
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      // Valida JSON localmente antes de mandar
      JSON.parse(json);
      await updateCampaignFlow(campaignId, json);
      setOriginal(json);
      setSuccess("Fluxo atualizado com sucesso.");
      setEditing(false);
    } catch (err) {
      if (err instanceof SyntaxError) {
        setError("JSON inválido: " + err.message);
      } else {
        setError(extractApiError(err, "Erro ao salvar fluxo"));
      }
    } finally {
      setSaving(false);
    }
  }

  function handleReset() {
    setJson(original);
    setEditing(false);
    setError(null);
    setSuccess(null);
  }

  const hasChanges = json !== original;

  if (loading) {
    return <div className="p-6 text-center text-sm text-gray-500 dark:text-gray-400">Carregando fluxo…</div>;
  }

  return (
    <div className="space-y-4">
      <div className="p-4 sm:p-5 bg-brand-50 border border-brand-200 dark:bg-brand-500/10 dark:border-brand-500/30 rounded-2xl">
        <h3 className="text-sm font-semibold text-brand-700 dark:text-brand-300 mb-1">
          ⚙️ Fluxo da campanha (avançado)
        </h3>
        <p className="text-xs text-brand-700/80 dark:text-brand-300/80 leading-relaxed">
          Esse JSON define <strong>como o sistema reage a eventos</strong> da campanha (ex: novo carimbo, compra registrada, cliente cadastrado).
          Você pode <strong>copiar</strong> esse JSON, editar em outro lugar (VS Code, Node-RED, etc) e <strong>colar de volta</strong>{" "}
          pra customizar a regra <em>sem precisar de deploy do código</em>.
        </p>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" onClick={handleCopy}>
          {copied ? "✓ Copiado!" : "📋 Copiar JSON"}
        </Button>
        <Button variant="outline" onClick={handleDownload}>
          ⬇ Baixar .json
        </Button>
        <Button variant="outline" onClick={handlePasteFromClipboard}>
          📥 Colar da área de transferência
        </Button>
        <label className="inline-flex items-center gap-2 px-4 h-10 text-sm font-medium text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-700 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700">
          📁 Importar arquivo
          <input type="file" accept="application/json,.json" onChange={handleImportFile} className="hidden" />
        </label>
        {!editing && (
          <Button onClick={() => setEditing(true)}>✏️ Editar</Button>
        )}
      </div>

      {error && (
        <div className="p-3 text-sm rounded-lg bg-error-50 text-error-700 border border-error-200 dark:bg-error-500/10 dark:text-error-300 dark:border-error-500/30">
          ⚠️ {error}
        </div>
      )}
      {success && (
        <div className="p-3 text-sm rounded-lg bg-success-50 text-success-700 border border-success-200 dark:bg-success-500/10 dark:text-success-300 dark:border-success-500/30">
          ✅ {success}
        </div>
      )}

      {/* Editor */}
      <div className="rounded-xl border border-gray-300 dark:border-gray-700 overflow-hidden">
        <textarea
          value={json}
          readOnly={!editing}
          onChange={(e) => setJson(e.target.value)}
          spellCheck={false}
          className="w-full h-[480px] p-4 font-mono text-xs leading-relaxed bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-gray-100 focus:outline-none resize-y"
        />
      </div>

      {/* Bottom actions */}
      {editing && (
        <div className="flex flex-wrap gap-2 justify-end">
          <Button variant="outline" onClick={handleReset} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving || !hasChanges}>
            {saving ? "Salvando…" : "💾 Salvar fluxo"}
          </Button>
        </div>
      )}

      <details className="text-xs text-gray-600 dark:text-gray-400 mt-4">
        <summary className="cursor-pointer font-medium">Estrutura esperada do JSON</summary>
        <pre className="mt-2 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg overflow-x-auto">
{`{
  "on_stamp_added": [
    { "do": "create_reward", "if": "completed == true" },
    { "do": "send_email", "if": "completed == true",
      "params": { "template": "reward_ready" } }
  ],
  "on_customer_joined": [
    { "do": "send_email",
      "params": { "subject": "Bem-vindo!", "template": "welcome" } }
  ]
}`}
        </pre>
        <p className="mt-2">
          Cada chave do objeto raiz é um <strong>evento</strong>. Cada item do array é um <strong>step</strong>{" "}
          com pelo menos <code>do</code> (nome do handler). Opcional: <code>if</code> (expressão de condição) e <code>params</code> (parâmetros).
        </p>
      </details>
    </div>
  );
}

function prettyPrint(raw: string): string {
  try {
    return JSON.stringify(JSON.parse(raw), null, 2);
  } catch {
    return raw;
  }
}
