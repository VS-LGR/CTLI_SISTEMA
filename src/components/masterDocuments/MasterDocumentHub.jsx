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
  switch (section) {
    case "lista_mestra_internos":
      return <MasterDocumentListPanel tenantId={tenantId} filters={{ internalOnly: true, systemOnly: true }} />;
    case "lista_mestra_externos":
      return <ExternalDocumentsPanel tenantId={tenantId} />;
    case "lista_mestra_revisoes":
      return <DocumentRevisionsPanel tenantId={tenantId} />;
    case "lista_mestra_distribuicao":
      return <DocumentDistributionPanel tenantId={tenantId} />;
    case "lista_mestra_templates":
      return <DocumentTemplatesPanel tenantId={tenantId} />;
    case "lista_mestra_gerados":
      return <DocumentSnapshotsPanel tenantId={tenantId} />;
    case "lista_mestra_alertas":
      return <DocumentAlertsPanel tenantId={tenantId} />;
    case "lista_mestra_config":
      return <MasterDocumentSettingsPanel tenantId={tenantId} tenant={tenant} />;
    default:
      return <MasterDocumentListPanel tenantId={tenantId} />;
  }
}
