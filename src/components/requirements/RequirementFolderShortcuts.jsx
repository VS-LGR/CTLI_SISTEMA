import React from "react";
import { useLocation } from "react-router-dom";
import { getFolderNavChildren } from "@/lib/requirementNavConfig";
import { getRequirementShortcutIcon } from "@/lib/requirementShortcutIcons";
import { isModuleLinkActive } from "@/lib/requirementFolderShortcutsUtils";
import {
  canAccessColeta,
  canAccessCalibrationCertificates,
  canAccessCommercialProposals,
  canEditPersonnelStandardOptions,
  canAccessMasterDocuments,
  canManageTechnicians,
  isCtliAdmin,
} from "@/lib/roles";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import RequirementShortcutTile from "@/components/requirements/RequirementShortcutTile";

export default function RequirementFolderShortcuts({ requirementId, folder, role, tenant, user }) {
  const location = useLocation();
  const filterOpts = {
    canColeta: canAccessColeta(role),
    canCalibrationCertificates: canAccessCalibrationCertificates(role),
    canPersonnelStandardOptions: canEditPersonnelStandardOptions(role),
    canMasterDocuments: canAccessMasterDocuments(role),
    canCommercialProposals: canAccessCommercialProposals(role),
    canCtliAdmin: isCtliAdmin(role),
    canTechnicians: canManageTechnicians(role),
    tenant,
    role,
    user,
  };
  // Após revisão: módulos operacionais vão para abas; este painel mostra só cadastros
  // e atalhos restantes (ex.: Níveis e Listas, Configurações da Proposta).
  const items = getFolderNavChildren(folder, filterOpts);

  if (!items.length) return null;

  return (
    <Card className="border-slate-200 shadow-sm min-w-0" data-testid={`req-folder-shortcuts-${folder?.folderKey}`}>
      <CardHeader className="pb-3">
        <CardTitle className="font-display text-base text-slate-900">Cadastros</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5 pt-0 min-w-0">
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 min-w-0">
          {items.map((item) => (
            <RequirementShortcutTile
              key={item.key}
              to={item.to}
              label={item.label}
              icon={getRequirementShortcutIcon(item.key)}
              active={isModuleLinkActive(location, item.to)}
              testId={`req-shortcut-${folder.folderKey}-${item.key}`}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
