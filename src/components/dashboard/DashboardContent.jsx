import React from "react";
import { Link } from "react-router-dom";
import { CERTIFICATE_PENDING_APPROVAL_PATH } from "@/lib/certificateRoutes";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { SealCheck, Info, PushPin, NotePencil } from "@phosphor-icons/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import DashboardHeroSection from "@/components/dashboard/DashboardHeroSection";
import DashboardOperationalOverview from "@/components/dashboard/DashboardOperationalOverview";
import EquipmentExpiryAlerts from "@/components/dashboard/EquipmentExpiryAlerts";
import DashboardRecentDocs from "@/components/dashboard/DashboardRecentDocs";
import DashboardPinnedDocs from "@/components/dashboard/DashboardPinnedDocs";
import DashboardReminders from "@/components/dashboard/DashboardReminders";

export default function DashboardContent({
  sectionLabel = "Visão geral",
  currentTenant,
  user,
  data,
  loading,
  shortcuts,
  greetingName,
  showApprovalQueue,
  pendingApprovals,
  documentAlerts,
  listaMestraPath,
  showReminders,
  isAdmin,
  onRemindersChange,
  onPinnedChange,
}) {
  const recent = data?.recent_documents || [];
  const pinned = data?.pinned_documents || [];
  const reminders = data?.reminders || [];
  const alertCount = documentAlerts?.totalCount || 0;
  const monthlyEmissions = data?.monthly_emissions;

  return (
    <div className="space-y-8 min-w-0" data-testid="dashboard-content">
      <div>
        <div className="text-[10px] uppercase tracking-[0.2em] text-slate-500">{sectionLabel}</div>
        <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 mt-1">
          Dashboard
        </h1>
        <p className="text-sm text-slate-600 mt-1">
          Atalhos e visão documental do ambiente{" "}
          <span className="font-medium text-slate-800">{currentTenant?.name}</span>.
        </p>
      </div>

      <DashboardHeroSection shortcuts={shortcuts} greetingName={greetingName} />

      {showApprovalQueue && (
        <Alert className="border-orange-300 bg-orange-50">
          <SealCheck size={18} className="text-orange-700" />
          <AlertTitle className="text-orange-950">
            {pendingApprovals} certificado{pendingApprovals === 1 ? "" : "s"} aguardando aprovação
          </AlertTitle>
          <AlertDescription className="text-orange-900/90">
            Há certificados na fila de aprovação do signatário.{" "}
            <Link to={CERTIFICATE_PENDING_APPROVAL_PATH} className="underline font-medium">
              Abrir fila
            </Link>
          </AlertDescription>
        </Alert>
      )}

      {alertCount > 0 && listaMestraPath && (
        <Alert className="border-amber-300 bg-amber-50">
          <Info size={18} className="text-amber-700" />
          <AlertTitle className="text-amber-950">Lista Mestra — {alertCount} alerta(s)</AlertTitle>
          <AlertDescription className="text-amber-900/90">
            Há documentos com análise crítica, consulta externa ou validação pendente.{" "}
            <Link
              to={`${listaMestraPath.replace("lista_mestra_internos", "lista_mestra_alertas")}`}
              className="underline font-medium"
            >
              Ver alertas
            </Link>
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4 lg:gap-6 items-start min-w-0">
        <DashboardOperationalOverview
          monthlyEmissions={monthlyEmissions}
          loading={loading}
        />
        <EquipmentExpiryAlerts
          alerts={data?.equipment_expiry_alerts}
          loading={loading}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 min-w-0 items-start">
        <Card className="border-slate-200 min-w-0 lg:row-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="font-display text-lg">Documentos recentes</CardTitle>
            <p className="text-xs text-slate-500 font-normal mt-1">Criados ou atualizados recentemente</p>
          </CardHeader>
          <CardContent className="min-w-0">
            <DashboardRecentDocs documents={recent} />
          </CardContent>
        </Card>

        <Card className="border-slate-200 min-w-0">
          <CardHeader className="pb-2">
            <CardTitle className="font-display text-lg flex items-center gap-2">
              <PushPin size={18} weight="fill" /> Documentos marcados
            </CardTitle>
          </CardHeader>
          <CardContent className="min-w-0">
            <DashboardPinnedDocs documents={pinned} onChange={onPinnedChange} />
          </CardContent>
        </Card>

        {showReminders && (
          <Card className="border-slate-200 min-w-0">
            <CardHeader className="pb-2">
              <CardTitle className="font-display text-lg flex items-center gap-2">
                <NotePencil size={18} /> Lembretes
              </CardTitle>
            </CardHeader>
            <CardContent className="min-w-0">
              <DashboardReminders
                tenantId={currentTenant?.id}
                reminders={reminders}
                userId={user?.id}
                isAdmin={isAdmin}
                onChange={onRemindersChange}
              />
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
