import { PROPOSAL_LIST_PATH } from "@/lib/commercialProposals/commercialProposalRoutes";
import { PERSONNEL_LISTAS_PATH } from "@/lib/personnelRoutes";

/**
 * Resolve requisito + pasta PR a partir do pathname (rotas de módulos/cadastros).
 * @returns {{ requirementId: string, folderKey: string } | null}
 */
export function resolveRequirementFolderContext(pathname) {
  if (!pathname) return null;

  const requirementMatch = pathname.match(/^\/requirement\/(\d+)\/([^/]+)/);
  if (requirementMatch) {
    return { requirementId: requirementMatch[1], folderKey: requirementMatch[2] };
  }

  if (pathname === PERSONNEL_LISTAS_PATH || pathname.startsWith(`${PERSONNEL_LISTAS_PATH}/`)) {
    return { requirementId: "6", folderKey: "pr-6-2" };
  }

  if (pathname === PROPOSAL_LIST_PATH || pathname.startsWith(`${PROPOSAL_LIST_PATH}/`)) {
    return { requirementId: "7", folderKey: "pr-7-1" };
  }

  return null;
}
