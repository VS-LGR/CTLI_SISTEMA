import React from "react";
import MasterDocumentListPanel from "./MasterDocumentListPanel";
import ExternalDocumentsPanel from "./ExternalDocumentsPanel";
import DocumentRevisionsPanel from "./DocumentRevisionsPanel";
import DocumentDistributionPanel from "./DocumentDistributionPanel";
import DocumentTemplatesPanel from "./DocumentTemplatesPanel";
import DocumentSnapshotsPanel from "./DocumentSnapshotsPanel";
import DocumentAlertsPanel from "./DocumentAlertsPanel";
import MasterDocumentSettingsPanel from "./MasterDocumentSettingsPanel";

export default function MasterDocumentHub({ tenantId, tenant, section }) {
  let panel = null;
  switch (section) {
    case "lista_mestra_internos":
      panel = <MasterDocumentListPanel tenantId={tenantId} filters={{ internalOnly: true, systemOnly: true }} />;
      break;
    case "lista_mestra_externos":
      panel = <ExternalDocumentsPanel tenantId={tenantId} />;
      break;
    case "lista_mestra_revisoes":
      panel = <DocumentRevisionsPanel tenantId={tenantId} />;
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
