import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { CaretDown, ArrowRight } from "@phosphor-icons/react";
import {
  PIPELINE_STAGE_LABELS,
  PIPELINE_STAGES,
} from "@/lib/personnelPipelineStats";
import {
  getOnboardingActionLabel,
  getOnboardingNextPath,
} from "@/lib/personnelOnboardingRoutes";
import { adequacyEditorPath, selectionEditorPath } from "@/lib/personnelRoutes";

function fmtDate(d) {
  if (!d) return "—";
  return String(d).slice(0, 10).split("-").reverse().join("/");
}

const STAGE_BADGE = {
  aguardando_admissao: "bg-slate-100 text-slate-700",
  em_experiencia: "bg-blue-100 text-blue-800",
  experiencia_aprovada: "bg-emerald-100 text-emerald-800",
  adequacao_concluida: "bg-green-100 text-green-900",
};

const STEPPER_STEPS = [
  { key: PIPELINE_STAGES.AGUARDANDO_ADMISSAO, label: "Seleção aprovada" },
  { key: PIPELINE_STAGES.EM_EXPERIENCIA, label: "Período experimental (90 dias)" },
  { key: PIPELINE_STAGES.EXPERIENCIA_APROVADA, label: "Experiência aprovada" },
  { key: PIPELINE_STAGES.ADEQUACAO_CONCLUIDA, label: "Adequação concluída" },
];

function StageBadge({ stage }) {
  return (
    <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded ${STAGE_BADGE[stage] || STAGE_BADGE.em_experiencia}`}>
      {PIPELINE_STAGE_LABELS[stage] || stage}
    </span>
  );
}

function PipelineRowActions({ row, variant = "active" }) {
  if (variant === "completed") {
    const path = row.adequacy?.id
      ? adequacyEditorPath(row.adequacy.id)
      : getOnboardingNextPath(row);
    return (
      <div className="flex flex-col gap-1 items-start">
        <Button size="sm" variant="outline" className="h-8" asChild>
          <Link to={path}>Ver adequação RE-6.2A</Link>
        </Button>
        <Button variant="ghost" size="sm" className="h-7 text-xs" asChild>
          <Link to={selectionEditorPath(row.selection.id)}>Ver PR-6.2F</Link>
        </Button>
      </div>
    );
  }

  const actionLabel = getOnboardingActionLabel(row.stage);
  const nextPath = getOnboardingNextPath(row);
  return (
    <div className="flex flex-col gap-1 items-start">
      <Button size="sm" className="bg-blue-600 text-white h-8" asChild>
        <Link to={nextPath}>{actionLabel}</Link>
      </Button>
      <Button variant="ghost" size="sm" className="h-7 text-xs" asChild>
        <Link to={selectionEditorPath(row.selection.id)}>Ver PR-6.2F</Link>
      </Button>
    </div>
  );
}

function PipelineRowCard({ row }) {
  const name = row.employee?.full_name || row.selection.candidate_name;
  const role = row.employee
    ? row.selection.position_title
    : row.selection.vacancy || row.selection.position_title;

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3 space-y-2 sm:hidden">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="font-medium text-slate-900 truncate">{name}</div>
          <div className="text-xs text-slate-500 truncate">{role || "—"}</div>
        </div>
        <StageBadge stage={row.stage} />
      </div>
      <dl className="grid grid-cols-2 gap-x-2 gap-y-1 text-xs text-slate-600">
        <dt>Seleção</dt><dd>{fmtDate(row.selection.selection_date)}</dd>
        <dt>Admissão</dt><dd>{fmtDate(row.employee?.admission_date)}</dd>
        <dt>Fim período</dt>
        <dd>
          {fmtDate(row.periodEnd)}
          {row.daysRemaining != null && row.daysRemaining > 0 && (
            <span className="text-slate-400"> ({row.daysRemaining}d)</span>
          )}
        </dd>
      </dl>
      <PipelineRowActions row={row} />
    </div>
  );
}

export default function PersonnelOnboardingPipeline({ pipeline, loading, compact = false }) {
  const [rejectedOpen, setRejectedOpen] = useState(false);
  const [completedOpen, setCompletedOpen] = useState(false);
  const { active = [], completed = [], rejected = [], stageCounts = {} } = pipeline || {};

  if (loading) {
    return (
      <div className="text-sm text-slate-500 py-4" data-testid="personnel-pipeline-loading">
        A carregar integração de pessoal…
      </div>
    );
  }

  const titleClass = compact ? "text-sm font-medium text-slate-700" : "text-xs font-semibold uppercase tracking-[0.15em] text-slate-500";

  return (
    <div className={`space-y-4 ${compact ? "mb-6" : ""}`} data-testid="personnel-pipeline">
      <div className="space-y-3">
        <div>
          <h2 className={titleClass}>Integração de pessoal</h2>
          {!compact && (
            <p className="text-xs text-slate-500 mt-1">
              Fluxo guiado: seleção aprovada → período experimental → adequação de competência.
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
          {STEPPER_STEPS.map((step, idx) => (
            <React.Fragment key={step.key}>
              <div className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5">
                <span className="font-medium text-slate-800">{step.label}</span>
                <span className="text-slate-400">({stageCounts[step.key] ?? 0})</span>
              </div>
              {idx < STEPPER_STEPS.length - 1 && (
                <ArrowRight size={14} className="text-slate-400 shrink-0" />
              )}
            </React.Fragment>
          ))}
        </div>

        <div className="space-y-2 sm:hidden">
          {active.length === 0 ? (
            <p className="text-sm text-slate-500 py-2 text-center">
              Nenhum fluxo pendente. Aprove uma seleção (PR-6.2F) e vincule o colaborador.
            </p>
          ) : (
            active.map((row) => <PipelineRowCard key={row.selection.id} row={row} />)
          )}
        </div>

        <Card className="border-slate-200 hidden sm:block" data-testid="personnel-pipeline-active">
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-sm min-w-[640px]">
              <thead className="bg-slate-50 text-xs text-slate-600 text-left">
                <tr>
                  <th className="p-2">Candidato / Colaborador</th>
                  <th className="p-2">Cargo / Vaga</th>
                  <th className="p-2">Etapa</th>
                  <th className="p-2">Seleção</th>
                  <th className="p-2">Admissão</th>
                  <th className="p-2">Fim do período</th>
                  <th className="p-2 w-40">Ação</th>
                </tr>
              </thead>
              <tbody>
                {active.length === 0 && (
                  <tr>
                    <td colSpan={7} className="p-4 text-center text-slate-500 text-sm">
                      Nenhum fluxo pendente. Aprove uma seleção (PR-6.2F) e vincule o colaborador no cadastro.
                    </td>
                  </tr>
                )}
                {active.map((row) => {
                  const name = row.employee?.full_name || row.selection.candidate_name;
                  const role = row.employee
                    ? row.selection.position_title
                    : row.selection.vacancy || row.selection.position_title;
                  return (
                    <tr key={row.selection.id} className="border-t border-slate-100">
                      <td className="p-2 font-medium">{name}</td>
                      <td className="p-2">{role || "—"}</td>
                      <td className="p-2"><StageBadge stage={row.stage} /></td>
                      <td className="p-2">{fmtDate(row.selection.selection_date)}</td>
                      <td className="p-2">{fmtDate(row.employee?.admission_date)}</td>
                      <td className="p-2">
                        {fmtDate(row.periodEnd)}
                        {row.daysRemaining != null && row.daysRemaining > 0 && (
                          <span className="text-xs text-slate-400 block">{row.daysRemaining} dia(s)</span>
                        )}
                      </td>
                      <td className="p-2">
                        <PipelineRowActions row={row} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>

      <Collapsible open={completedOpen} onOpenChange={setCompletedOpen}>
        <Card className="border-slate-200" data-testid="personnel-pipeline-completed">
          <CollapsibleTrigger asChild>
            <button
              type="button"
              className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-slate-50 transition-colors"
            >
              <div>
                <h3 className="font-semibold text-slate-900">Integrações concluídas</h3>
                <p className="text-xs text-slate-500 mt-0.5">{completed.length} registo(s)</p>
              </div>
              <CaretDown
                size={18}
                className={`shrink-0 text-slate-500 transition-transform ${completedOpen ? "rotate-180" : ""}`}
              />
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="px-4 pb-4 pt-0 border-t border-slate-100">
              {completed.length === 0 ? (
                <p className="text-sm text-slate-500 py-2">Nenhuma integração concluída ainda.</p>
              ) : (
                <div className="space-y-2">
                  {completed.map((row) => (
                    <div key={row.selection.id} className="flex flex-wrap items-center justify-between gap-2 py-2 border-b border-slate-100 last:border-0">
                      <div className="min-w-0">
                        <div className="font-medium text-sm">{row.employee?.full_name || row.selection.candidate_name}</div>
                        <div className="text-xs text-slate-500">{row.selection.position_title || row.selection.vacancy || "—"}</div>
                      </div>
                      <PipelineRowActions row={row} variant="completed" />
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      <Collapsible open={rejectedOpen} onOpenChange={setRejectedOpen}>
        <Card className="border-slate-200" data-testid="personnel-pipeline-rejected">
          <CollapsibleTrigger asChild>
            <button
              type="button"
              className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-slate-50 transition-colors"
            >
              <div>
                <h3 className="font-semibold text-slate-900">Reprovados e encerrados</h3>
                <p className="text-xs text-slate-500 mt-0.5">{rejected.length} registo(s)</p>
              </div>
              <CaretDown
                size={18}
                className={`shrink-0 text-slate-500 transition-transform ${rejectedOpen ? "rotate-180" : ""}`}
              />
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="px-4 pb-4 pt-0 border-t border-slate-100 space-y-4">
              {rejected.length === 0 ? (
                <p className="text-sm text-slate-500 py-2">Nenhuma reprovação registada.</p>
              ) : (
                <div className="overflow-x-auto border rounded-md">
                  <table className="w-full text-sm min-w-[520px]">
                    <thead className="bg-slate-50 text-xs text-slate-600 text-left">
                      <tr>
                        <th className="p-2">Motivo</th>
                        <th className="p-2">Candidato / Colaborador</th>
                        <th className="p-2">Vaga / Cargo</th>
                        <th className="p-2">Data seleção</th>
                        <th className="p-2 w-28">Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rejected.map((row) => (
                        <tr key={`${row.reason}-${row.selection.id}`} className="border-t">
                          <td className="p-2 text-xs">
                            {row.reason === "selecao" ? "Seleção reprovada" : "Experiência reprovada"}
                          </td>
                          <td className="p-2">
                            {row.employee?.full_name || row.selection.candidate_name}
                          </td>
                          <td className="p-2">{row.selection.vacancy || row.selection.position_title || "—"}</td>
                          <td className="p-2">{fmtDate(row.selection.selection_date)}</td>
                          <td className="p-2">
                            <Button variant="ghost" size="sm" asChild>
                              <Link to={selectionEditorPath(row.selection.id)}>PR-6.2F</Link>
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>
    </div>
  );
}
