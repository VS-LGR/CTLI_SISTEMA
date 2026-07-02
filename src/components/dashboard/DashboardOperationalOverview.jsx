import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartPieSlice, FileText, Scroll } from "@phosphor-icons/react";
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
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Card className="border-slate-200">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="rounded-lg bg-blue-50 p-2.5">
              <Scroll size={24} className="text-blue-600" weight="duotone" />
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wide">Certificados</p>
              <p className="text-2xl font-display font-bold text-slate-900">
                {loading ? "—" : certificatesCount}
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5">Aprovados, emitidos ou enviados</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-slate-200">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="rounded-lg bg-emerald-50 p-2.5">
              <FileText size={24} className="text-emerald-600" weight="duotone" />
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wide">Propostas geradas</p>
              <p className="text-2xl font-display font-bold text-slate-900">
                {loading ? "—" : proposalsCount}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-slate-200 min-w-0">
        <CardHeader className="pb-2">
          <CardTitle className="font-display text-lg flex items-center gap-2">
            <ChartPieSlice size={20} className="text-blue-600" />
            Propostas e certificados
          </CardTitle>
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
