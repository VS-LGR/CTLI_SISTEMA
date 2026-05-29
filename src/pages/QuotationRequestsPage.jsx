import React from "react";
import { useOutletContext } from "react-router-dom";
import QuotationRequestsListPanel from "@/components/quotationRequests/QuotationRequestsListPanel";

export default function QuotationRequestsPage() {
  const { currentTenantId, currentTenant } = useOutletContext();
  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <QuotationRequestsListPanel tenantId={currentTenantId} tenant={currentTenant} />
    </div>
  );
}
