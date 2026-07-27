import React from "react";
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

export default function MasterDocumentHub({ tenantId, tenant, section }) {
  let panel = null;
  switch (section) {
    case "lista_mestra_internos":
      panel = <MasterDocumentListPanel tenantId={tenantId} filters={{ internalOnly: true, systemOnly: true }} />;
      break;
    case "lista_mestra_externos":
      panel = <ExternalDocumentsPanel tenantId={tenantId} />;
      break;
    case "lista_mestra_software":
      panel = <ControlledSoftwarePanel tenantId={tenantId} />;
      break;
    case "lista_mestra_revisoes":
      panel = (
        <div className="space-y-6">
          <div>
            <h3 className="text-sm font-semibold text-slate-800 mb-2">Histórico documental (revisões)</h3>
            <DocumentRevisionsPanel tenantId={tenantId} />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-800 mb-2">Histórico de alterações (conta / função)</h3>
            <DocumentChangeLogPanel tenantId={tenantId} limit={150} />
          </div>
        </div>
      );
      break;
    case "lista_mestra_distribuicao":
      panel = <DocumentDistributionPanel tenantId={tenantId} />;
      break;
    case "lista_mestra_templates":
      panel = <DocumentTemplatesPanel tenantId={tenantId} />;
      break;
    case "lista_mestra_gerados":
      panel = <DocumentSnapshotsPanel tenantId={tenantId} />;
      break;
    case "lista_mestra_alertas":
      panel = <DocumentAlertsPanel tenantId={tenantId} />;
      break;
    case "lista_mestra_config":
      panel = <MasterDocumentSettingsPanel tenantId={tenantId} tenant={tenant} />;
      break;
    default:
      panel = <MasterDocumentListPanel tenantId={tenantId} />;
  }

  return (
    <div className="min-w-0" data-tour="tour-lista-mestra">
      {panel}
    </div>
  );
}
