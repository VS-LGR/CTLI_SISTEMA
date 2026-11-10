import React, { useEffect, useState } from "react";
import MasterDocumentListPanel from "./MasterDocumentListPanel";
import ExternalDocumentsPanel from "./ExternalDocumentsPanel";
import DocumentRevisionsPanel from "./DocumentRevisionsPanel";
import DocumentDistributionPanel from "./DocumentDistributionPanel";
import DocumentTemplatesPanel from "./DocumentTemplatesPanel";
import DocumentSnapshotsPanel from "./DocumentSnapshotsPanel";
import DocumentAlertsPanel from "./DocumentAlertsPanel";
import MasterDocumentSettingsPanel from "./MasterDocumentSettingsPanel";
import ControlledSoftwarePanel from "./ControlledSoftwarePanel";
import DocumentChangeLogPanel from "./DocumentChangeLogPanel";
import MasterDocumentActivityFeed from "./MasterDocumentActivityFeed";

const REGISTRO_TABS = [
  { id: "lista_mestra_internos", label: "Documentos internos" },
  { id: "lista_mestra_externos", label: "Documentos externos" },
  { id: "lista_mestra_software", label: "Planilhas / software" },
  { id: "lista_mestra_revisoes", label: "Histórico de revisões", tour: "tour-lista-mestra-historico" },
  { id: "lista_mestra_distribuicao", label: "Distribuição" },
];

const CONFIG_TABS = [
  { id: "lista_mestra_templates", label: "Templates", adminOnly: true },
  { id: "lista_mestra_gerados", label: "Registros gerados" },
  { id: "lista_mestra_alertas", label: "Alertas" },
  { id: "lista_mestra_config", label: "Configurações" },
];

function SubTabs({ tabs, value, onChange }) {
  return (
    <div className="flex flex-wrap gap-2">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          data-tour={tab.tour || undefined}
          onClick={() => onChange(tab.id)}
          className={`rounded-md border px-3 py-1.5 text-sm ${
            value === tab.id
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border bg-card text-foreground"
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

function RegistroPanel({ tenantId, sub }) {
  if (sub === "lista_mestra_externos") return <ExternalDocumentsPanel tenantId={tenantId} />;
  if (sub === "lista_mestra_software") return <ControlledSoftwarePanel tenantId={tenantId} />;
  if (sub === "lista_mestra_distribuicao") return <DocumentDistributionPanel tenantId={tenantId} />;
  if (sub === "lista_mestra_revisoes") {
    return (
      <div className="space-y-6">
        <div>
          <h3 className="text-sm font-semibold text-foreground mb-2">Histórico documental (revisões)</h3>
          <DocumentRevisionsPanel tenantId={tenantId} />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-foreground mb-2">Histórico detalhado (conta / função)</h3>
          <DocumentChangeLogPanel tenantId={tenantId} limit={150} />
        </div>
        <MasterDocumentActivityFeed tenantId={tenantId} limit={10} compact />
      </div>
    );
  }
  return <MasterDocumentListPanel tenantId={tenantId} filters={{ internalOnly: true }} />;
}

function ConfigPanel({ tenantId, tenant, sub }) {
  if (sub === "lista_mestra_templates") return <DocumentTemplatesPanel tenantId={tenantId} />;
  if (sub === "lista_mestra_gerados") return <DocumentSnapshotsPanel tenantId={tenantId} />;
  if (sub === "lista_mestra_alertas") return <DocumentAlertsPanel tenantId={tenantId} />;
  return <MasterDocumentSettingsPanel tenantId={tenantId} tenant={tenant} />;
}

export default function MasterDocumentHub({ tenantId, tenant, section, isAdmin = false }) {
  const registroIds = REGISTRO_TABS.map((t) => t.id);
  const configTabs = CONFIG_TABS.filter((t) => !t.adminOnly || isAdmin);
  const configIds = configTabs.map((t) => t.id);
  const inRegistro = section === "lista_mestra_registro" || registroIds.includes(section);
  const inConfig = section === "lista_mestra_configuracoes" || configIds.includes(section) || section === "lista_mestra_config";
  const [sub, setSub] = useState(inConfig ? "lista_mestra_config" : "lista_mestra_internos");

  useEffect(() => {
    if (registroIds.includes(section)) setSub(section);
    else if (section === "lista_mestra_registro") setSub("lista_mestra_internos");
    else if (configIds.includes(section)) setSub(section);
    else if (section === "lista_mestra_configuracoes" || section === "lista_mestra_config") setSub("lista_mestra_config");
  }, [section]); // eslint-disable-line react-hooks/exhaustive-deps

  let panel = null;
  if (inRegistro) {
    panel = (
      <div className="space-y-4">
        <SubTabs tabs={REGISTRO_TABS} value={sub} onChange={setSub} />
        <RegistroPanel tenantId={tenantId} sub={sub} />
      </div>
    );
  } else if (inConfig) {
    panel = (
      <div className="space-y-4">
        <SubTabs tabs={configTabs} value={configIds.includes(sub) ? sub : "lista_mestra_config"} onChange={setSub} />
        <ConfigPanel tenantId={tenantId} tenant={tenant} sub={configIds.includes(sub) ? sub : "lista_mestra_config"} />
      </div>
    );
  } else {
    panel = <MasterDocumentListPanel tenantId={tenantId} filters={{ internalOnly: true }} />;
  }

  return (
    <div className="min-w-0" data-tour="tour-lista-mestra">
      {panel}
    </div>
  );
}
