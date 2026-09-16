import React, { Suspense, lazy, useState } from "react";
import { Navigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { canApproveCalibrationCertificate } from "@/lib/roles";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

const CertificateListPage = lazy(() => import("@/pages/CertificateListPage"));
const WeightCertificateListPage = lazy(() => import("@/pages/WeightCertificateListPage"));

const TAB_BALANCAS = "balancas";
const TAB_PESOS = "pesos";

export default function ApprovalHubPage() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const tabFromUrl = searchParams.get("tab");
  const [tab, setTab] = useState(
    tabFromUrl === TAB_PESOS ? TAB_PESOS : TAB_BALANCAS,
  );

  if (!canApproveCalibrationCertificate(user?.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  const onTabChange = (next) => {
    setTab(next);
    setSearchParams(next === TAB_BALANCAS ? {} : { tab: next }, { replace: true });
  };

  return (
    <div className="space-y-6 min-w-0 max-w-6xl" data-testid="approval-hub-page" data-tour="tour-aprovacao-hub">
      <div>
        <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Signatário</p>
        <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-foreground mt-1">
          Aprovação
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Consulte os certificados emitidos e aprove os que aguardam a sua assinatura. Sem emissão de novos certificados nem coleta neste espaço.
        </p>
      </div>

      <Tabs value={tab} onValueChange={onTabChange}>
        <TabsList className="bg-card border border-border h-auto flex-wrap">
          <TabsTrigger
            value={TAB_BALANCAS}
            className="whitespace-normal text-left max-w-[280px] sm:max-w-none"
            data-tour="tour-aprovacao-tab-balancas"
          >
            Aprovação dos Certificados de Calibração de Balanças
          </TabsTrigger>
          <TabsTrigger
            value={TAB_PESOS}
            className="whitespace-normal text-left max-w-[280px] sm:max-w-none"
            data-tour="tour-aprovacao-tab-pesos"
          >
            Aprovação dos Certificados de Calibração de Peso Padrão
          </TabsTrigger>
        </TabsList>

        <TabsContent value={TAB_BALANCAS} className="mt-4">
          <Suspense fallback={<div className="text-muted-foreground text-sm py-8 text-center">A carregar…</div>}>
            <CertificateListPage embedded approvalMode />
          </Suspense>
        </TabsContent>
        <TabsContent value={TAB_PESOS} className="mt-4">
          <Suspense fallback={<div className="text-muted-foreground text-sm py-8 text-center">A carregar…</div>}>
            <WeightCertificateListPage embedded approvalMode />
          </Suspense>
        </TabsContent>
      </Tabs>
    </div>
  );
}
