import React from "react";
import { useOutletContext } from "react-router-dom";
import CommercialProposalsListPanel from "@/components/commercialProposals/CommercialProposalsListPanel";

export default function CommercialProposalsPage() {
  const { currentTenantId, currentTenant } = useOutletContext();
  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <CommercialProposalsListPanel tenantId={currentTenantId} tenant={currentTenant} />
    </div>
  );
}
