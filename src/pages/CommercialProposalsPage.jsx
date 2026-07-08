import React from "react";
import { useOutletContext } from "react-router-dom";
import CommercialProposalsListPanel from "@/components/commercialProposals/CommercialProposalsListPanel";
import RequirementFolderQuickAccess from "@/components/requirements/RequirementFolderQuickAccess";

export default function CommercialProposalsPage() {
  const { currentTenantId, currentTenant } = useOutletContext();
  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6 min-w-0">
      <RequirementFolderQuickAccess requirementId="7" folderKey="pr-7-1" />
      <CommercialProposalsListPanel tenantId={currentTenantId} tenant={currentTenant} />
    </div>
  );
}
