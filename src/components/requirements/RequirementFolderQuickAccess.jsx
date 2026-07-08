import React from "react";
import { useLocation, useOutletContext } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { getFoldersForRequirement } from "@/lib/requirementNavConfig";
import { resolveRequirementFolderContext } from "@/lib/resolveRequirementFolderContext";
import RequirementFolderShortcuts from "@/components/requirements/RequirementFolderShortcuts";
import { cn } from "@/lib/utils";

/**
 * Painel "Acesso rápido" reutilizável em páginas de módulos/cadastros do PR.
 * Aceita requirementId/folderKey explícitos ou infere do pathname.
 */
export default function RequirementFolderQuickAccess({
  requirementId = null,
  folderKey = null,
  className,
}) {
  const location = useLocation();
  const { user } = useAuth();
  const { currentTenant } = useOutletContext() || {};

  const ctx = requirementId && folderKey
    ? { requirementId: String(requirementId), folderKey }
    : resolveRequirementFolderContext(location.pathname);

  if (!ctx || !user) return null;

  const folder = getFoldersForRequirement(ctx.requirementId, currentTenant, user.role)
    .find((f) => f.folderKey === ctx.folderKey);

  if (!folder) return null;

  return (
    <div className={cn("min-w-0", className)}>
      <RequirementFolderShortcuts
        requirementId={ctx.requirementId}
        folder={folder}
        role={user.role}
        tenant={currentTenant}
        user={user}
      />
    </div>
  );
}
