import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartBar } from "@phosphor-icons/react";
import MonthlyEmissionsChart from "@/components/dashboard/MonthlyEmissionsChart";

export default function DashboardOperationalOverview({
  monthlyEmissions,
  loading = false,
}) {
  return (
    <Card className="border-slate-200 min-w-0" data-testid="dashboard-operational-overview">
      <CardHeader className="pb-2">
        <CardTitle className="font-display text-lg flex items-center gap-2">
          <ChartBar size={20} className="text-blue-600" weight="duotone" />
          Indicadores
        </CardTitle>
        <p className="text-xs text-slate-500 font-normal mt-1 max-w-xl">
          Quantidade emitida por mês. Pode ver o valor de cada mês no gráfico ou ao passar o cursor sobre as barras.
        </p>
      </CardHeader>
      <CardContent className="pt-0 min-w-0">
        <div className="min-w-0 overflow-hidden">
          <MonthlyEmissionsChart monthlyEmissions={monthlyEmissions} loading={loading} />
        </div>
      </CardContent>
    </Card>
  );
}
