import React from "react";
import { Navigate, useOutletContext, useParams } from "react-router-dom";
import { legacySectionToRegistrosPath } from "@/lib/personnelNavConfig";
import { PERSONNEL_REGISTROS_PATH } from "@/lib/personnelRegistrosRoutes";
import StandardOptionsPanel from "@/components/personnel/StandardOptionsPanel";

export default function PersonnelPage() {
  const { section } = useParams();
  const { currentTenantId } = useOutletContext();

  if (section === "listas") {
    if (!currentTenantId) {
      return <div className="p-8 text-center text-slate-500">Selecione um ambiente no topo.</div>;
    }
    return (
      <div className="max-w-6xl mx-auto px-4 py-6 min-w-0">
        <h1 className="text-xl font-display font-bold text-slate-900 mb-1">6.2 Pessoal</h1>
        <p className="text-sm text-slate-600 mb-6">Níveis e Listas Padrão</p>
        <StandardOptionsPanel tenantId={currentTenantId} />
      </div>
    );
  }

  if (section) {
    return <Navigate to={legacySectionToRegistrosPath(section)} replace />;
  }

  return <Navigate to={PERSONNEL_REGISTROS_PATH} replace />;
}
