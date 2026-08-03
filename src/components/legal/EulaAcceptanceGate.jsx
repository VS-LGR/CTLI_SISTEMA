import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuth } from "@/context/AuthContext";
import { acceptLegalTerms } from "@/lib/legal/acceptLegalTermsApi";
import {
  LEGAL_ACCEPTANCE_TITLE,
  LEGAL_ACCEPTANCE_VERSION,
} from "@/lib/legal/acceptance";
import { LEGAL_ROUTES, APP_COPYRIGHT, PRODUCT_NAME } from "@/lib/legal/copyright";
import { EULA_SECTIONS, EULA_TITLE } from "@/lib/legal/eulaContent";
import { LICENSE_SECTIONS, LICENSE_TITLE } from "@/lib/legal/licenseContent";

function TermsPreview({ title, sections }) {
  return (
    <section className="space-y-3 min-w-0">
      <h2 className="font-display text-base font-semibold text-slate-900">{title}</h2>
      <div className="max-h-48 sm:max-h-56 overflow-y-auto rounded-md border border-slate-200 bg-slate-50/80 p-3 space-y-3 text-xs text-slate-700 leading-relaxed">
        {sections.slice(0, 6).map((s) => (
          <div key={s.id} className="space-y-1">
            <p className="font-medium text-slate-800">{s.title}</p>
            {(s.paragraphs || []).slice(0, 2).map((p, i) => (
              <p key={`${s.id}-${i}`}>{p}</p>
            ))}
          </div>
        ))}
        <p className="text-slate-500">… texto completo nas páginas ligadas abaixo.</p>
      </div>
    </section>
  );
}

/**
 * Bloqueia a app até o utilizador aceitar EULA + Licença.
 * Recusar → logout. Aceitar → persiste e permite o tutorial.
 */
export default function EulaAcceptanceGate({ children }) {
  const { user, logout, refreshMe } = useAuth();
  const [accepted, setAccepted] = useState(false);
  const [busy, setBusy] = useState(false);

  const needsAcceptance = useMemo(() => {
    if (!user || user === false) return false;
    const version = user.legal_accepted_version;
    const at = user.legal_accepted_at;
    if (!at) return true;
    return String(version || "") !== LEGAL_ACCEPTANCE_VERSION;
  }, [user]);

  if (!needsAcceptance) return children;

  const onAccept = async () => {
    if (!accepted) {
      toast.error("Marque a opção de aceite para continuar.");
      return;
    }
    setBusy(true);
    try {
      await acceptLegalTerms(LEGAL_ACCEPTANCE_VERSION);
      await refreshMe?.();
      toast.success("Termos aceites. Bem-vindo ao " + PRODUCT_NAME + ".");
    } catch (e) {
      toast.error(e?.message || "Não foi possível registar o aceite.");
    } finally {
      setBusy(false);
    }
  };

  const onDecline = async () => {
    setBusy(true);
    try {
      await logout();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="eula-gate-title"
      data-testid="eula-acceptance-gate"
    >
      <div className="w-full max-w-2xl my-4 rounded-xl border border-slate-200 bg-white shadow-lg">
        <div className="px-5 sm:px-6 pt-5 sm:pt-6 pb-3 border-b border-slate-100">
          <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500">Primeiro acesso</p>
          <h1 id="eula-gate-title" className="font-display text-xl sm:text-2xl font-semibold text-slate-900 mt-1">
            {LEGAL_ACCEPTANCE_TITLE}
          </h1>
          <p className="text-sm text-slate-600 mt-2">
            Antes de continuar e de ver os tutoriais, leia e aceite os Termos de Adesão (EULA) e a
            Licença de Uso do {PRODUCT_NAME}. Sem aceite, a sessão será encerrada.
          </p>
          <p className="text-xs text-slate-400 mt-1">{APP_COPYRIGHT}</p>
        </div>

        <div className="px-5 sm:px-6 py-4 space-y-5 max-h-[min(55vh,28rem)] overflow-y-auto">
          <TermsPreview title={EULA_TITLE} sections={EULA_SECTIONS} />
          <TermsPreview title={LICENSE_TITLE} sections={LICENSE_SECTIONS} />
          <p className="text-xs text-slate-500">
            Documentos completos:{" "}
            <Link to={LEGAL_ROUTES.eula} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
              Termos de Adesão
            </Link>
            {" · "}
            <Link to={LEGAL_ROUTES.license} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
              Licença
            </Link>
          </p>
        </div>

        <div className="px-5 sm:px-6 py-4 border-t border-slate-100 space-y-4">
          <label className="flex items-start gap-3 cursor-pointer select-none">
            <Checkbox
              checked={accepted}
              onCheckedChange={(v) => setAccepted(v === true)}
              className="mt-0.5"
              data-testid="eula-accept-checkbox"
            />
            <span className="text-sm text-slate-700 leading-snug">
              Li e aceito todos os Termos de Adesão ao Serviço (EULA) e a Licença de Uso, com todos os
              direitos reservados à CTLI.
            </span>
          </label>

          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              onClick={onDecline}
              data-testid="eula-decline-btn"
            >
              Recusar e sair
            </Button>
            <Button
              type="button"
              disabled={busy || !accepted}
              onClick={onAccept}
              className="bg-blue-600 hover:bg-blue-700 text-white"
              data-testid="eula-accept-btn"
            >
              {busy ? "A guardar…" : "Aceitar e continuar"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
