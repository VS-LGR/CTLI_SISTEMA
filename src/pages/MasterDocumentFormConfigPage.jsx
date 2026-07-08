import React from "react";
import { Navigate, useOutletContext, useParams, Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { isCtliAdmin } from "@/lib/roles";
import ColetaTenantConfig from "@/components/cadastros/ColetaTenantConfig";
import CommercialProposalTenantConfig from "@/components/cadastros/CommercialProposalTenantConfig";
import { LISTA_MESTRA_PATH } from "@/lib/masterDocuments/masterDocumentRoutes";
import RequirementFolderQuickAccess from "@/components/requirements/RequirementFolderQuickAccess";

const CONFIG_META = {
  "re-72a": {
    title: "Config. RE-7.2A",
    subtitle: "Formulário de coleta de dados e metadados do laboratório",
  },
  "re-71a": {
    title: "Config. RE-7.1A",
    subtitle: "Textos institucionais da proposta comercial",
  },
};

export default function MasterDocumentFormConfigPage() {
  const { id, folderKey, configKey } = useParams();
  const { user } = useAuth();
  const { currentTenantId, currentTenant, reloadTenants } = useOutletContext() || {};
  const meta = CONFIG_META[configKey];

  if (!isCtliAdmin(user?.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  if (!meta || !currentTenantId) {
    return <Navigate to={LISTA_MESTRA_PATH} replace />;
  }

  return (
    <div className="space-y-6 min-w-0" data-testid={`master-form-config-${configKey}`}>
      <div>
        <div className="text-xs text-slate-500 flex items-center gap-1.5 flex-wrap">
          <Link to="/dashboard" className="hover:text-blue-600">Início</Link>
          <span>/</span>
          <Link to={LISTA_MESTRA_PATH} className="hover:text-blue-600">Lista Mestra</Link>
          <span>/</span>
          <span className="text-slate-700 font-medium">{meta.title}</span>
        </div>
        <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 mt-2">
          {meta.title}
        </h1>
        <p className="text-sm text-slate-600 mt-1">{meta.subtitle}</p>
      </div>

      {id && folderKey && (
        <RequirementFolderQuickAccess requirementId={id} folderKey={folderKey} />
      )}

      {configKey === "re-72a" && (
        <ColetaTenantConfig
          tenantId={currentTenantId}
          tenant={currentTenant}
          onSaved={() => reloadTenants?.()}
        />
      )}
      {configKey === "re-71a" && (
        <CommercialProposalTenantConfig
          tenantId={currentTenantId}
          tenant={currentTenant}
          onSaved={() => reloadTenants?.()}
        />
      )}
    </div>
  );
}
