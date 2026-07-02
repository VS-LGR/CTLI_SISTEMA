import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartPieSlice } from "@phosphor-icons/react";
import ProposalsCertificatesChart from "@/components/dashboard/ProposalsCertificatesChart";
import EquipmentExpiryAlerts from "@/components/dashboard/EquipmentExpiryAlerts";

export default function DashboardOperationalOverview({
  certificatesCount = 0,
  proposalsCount = 0,
  expiryAlerts,
  loading = false,
  compact = false,
}) {
  return (
    <div className={compact ? "space-y-4" : "space-y-6"}>
      <Card className="border-slate-200 min-w-0">
        <CardHeader className="pb-2">
          <CardTitle className="font-display text-lg flex items-center gap-2">
            <ChartPieSlice size={20} className="text-blue-600" weight="duotone" />
            Propostas e certificados
          </CardTitle>
          <p className="text-xs text-slate-500 font-normal mt-1">
            Comparativo de registos operacionais do ambiente
          </p>
        </CardHeader>
        <CardContent className="pt-0 min-w-0 overflow-hidden">
          <ProposalsCertificatesChart
            certificatesCount={certificatesCount}
            proposalsCount={proposalsCount}
            loading={loading}
          />
        </CardContent>
      </Card>

      <EquipmentExpiryAlerts alerts={expiryAlerts} loading={loading} />
    </div>
  );
}
