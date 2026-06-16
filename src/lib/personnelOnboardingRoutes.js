import { cadastroSectionPath } from "@/lib/cadastroSections";
import { personnelRegistrosPath } from "@/lib/personnelRegistrosRoutes";
import {
  adequacyEditorPath,
  experienceEvaluationEditorPath,
  selectionEditorPath,
} from "@/lib/personnelRoutes";
import { PIPELINE_STAGES } from "@/lib/personnelPipelineStats";

export const PERSONNEL_ONBOARDING_RETURN_TO = personnelRegistrosPath({ topic: "re-62f" });

const ACTION_LABELS = {
  [PIPELINE_STAGES.AGUARDANDO_ADMISSAO]: "Vincular colaborador",
  [PIPELINE_STAGES.EM_EXPERIENCIA]: "Preencher avaliação RE-6.2B",
  [PIPELINE_STAGES.EXPERIENCIA_APROVADA]: "Registar adequação RE-6.2A",
  [PIPELINE_STAGES.ADEQUACAO_CONCLUIDA]: "Ver adequação",
};

export function getOnboardingActionLabel(stage) {
  return ACTION_LABELS[stage] || "Continuar";
}

function withQuery(basePath, params) {
  const q = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value != null && value !== "") q.set(key, String(value));
  }
  const qs = q.toString();
  return qs ? `${basePath}?${qs}` : basePath;
}

/**
 * @param {{ selection, employee, experience, adequacy, stage }} row
 */
export function getOnboardingNextPath(row, { returnTo = PERSONNEL_ONBOARDING_RETURN_TO } = {}) {
  if (!row) return PERSONNEL_ONBOARDING_RETURN_TO;

  const { selection, employee, experience, adequacy, stage } = row;

  switch (stage) {
    case PIPELINE_STAGES.AGUARDANDO_ADMISSAO:
      return withQuery(cadastroSectionPath("colaboradores"), {
        source_selection_id: selection?.id,
        full_name: selection?.candidate_name || "",
        position_id: selection?.position_id || "",
        open: "1",
        returnTo,
      });

    case PIPELINE_STAGES.EM_EXPERIENCIA:
      return withQuery(
        experienceEvaluationEditorPath(experience?.id || "nova"),
        {
          employee_id: employee?.id,
          selection_id: selection?.id,
          returnTo,
        },
      );

    case PIPELINE_STAGES.EXPERIENCIA_APROVADA:
      return withQuery(adequacyEditorPath("nova"), {
        employee_id: employee?.id,
        returnTo,
      });

    case PIPELINE_STAGES.ADEQUACAO_CONCLUIDA:
      if (adequacy?.id) return adequacyEditorPath(adequacy.id);
      return personnelRegistrosPath({ topic: "re-62a" });

    default:
      return selection?.id ? selectionEditorPath(selection.id) : PERSONNEL_ONBOARDING_RETURN_TO;
  }
}
