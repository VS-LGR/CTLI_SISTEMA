import React from "react";
import { Navigate, useOutletContext, useParams } from "react-router-dom";
import {
  getPersonnelSectionLabel,
  getVisiblePersonnelSections,
  isValidPersonnelSection,
  personnelSectionPath,
} from "@/lib/personnelNavConfig";
import PositionsListPanel from "@/components/personnel/PositionsListPanel";
import AdequaciesListPanel from "@/components/personnel/AdequaciesListPanel";
import MonitoringsListPanel from "@/components/personnel/MonitoringsListPanel";
import StandardOptionsPanel from "@/components/personnel/StandardOptionsPanel";

export default function PersonnelPage() {
  const { section } = useParams();
  const { user, currentTenantId, currentTenant } = useOutletContext();
  const visible = getVisiblePersonnelSections(user?.role);

  if (!currentTenantId) {
    return <div className="p-8 text-center text-slate-500">Selecione um ambiente no topo.</div>;
  }

  if (!section || !isValidPersonnelSection(section)) {
    const first = visible[0]?.id || "cargos";
    return <Navigate to={personnelSectionPath(first)} replace />;
  }

  const title = getPersonnelSectionLabel(section);

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 min-w-0">
      <h1 className="text-xl font-display font-bold text-slate-900 mb-1">6.2 Pessoal</h1>
      <p className="text-sm text-slate-600 mb-6">{title}</p>

      {section === "cargos" && <PositionsListPanel tenantId={currentTenantId} tenant={currentTenant} />}
      {section === "adequacao" && <AdequaciesListPanel tenantId={currentTenantId} tenant={currentTenant} />}
      {section === "monitoramento" && <MonitoringsListPanel tenantId={currentTenantId} tenant={currentTenant} />}
      {section === "listas" && <StandardOptionsPanel tenantId={currentTenantId} />}
    </div>
  );
}
