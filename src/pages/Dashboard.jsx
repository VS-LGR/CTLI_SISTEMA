import React, { Suspense, lazy, useCallback, useEffect, useState } from "react";
import { useOutletContext, Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { fetchDashboard } from "@/lib/dashboardApi";
import { canManageDashboardReminders, isCtliAdmin } from "@/lib/roles";
import { getVisibleDashboardShortcuts } from "@/lib/dashboardShortcuts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  FolderSimple, PushPin, NotePencil, X, Info,
} from "@phosphor-icons/react";
import { consumeTenantSwitchNotice } from "@/lib/tenantSwitchNotice";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import DashboardRecentDocs from "@/components/dashboard/DashboardRecentDocs";
import DashboardReminders from "@/components/dashboard/DashboardReminders";
import DashboardPinnedDocs from "@/components/dashboard/DashboardPinnedDocs";
import DashboardShortcutCard from "@/components/dashboard/DashboardShortcutCard";

const DocumentDistributionPie = lazy(
  () => import("@/components/dashboard/DocumentDistributionPie"),
);

const pieChartFallback = (
  <div className="h-[240px] sm:h-[280px] flex items-center justify-center text-sm text-slate-500">
    A carregar gráfico…
  </div>
);

const Dashboard = () => {
  const { user } = useAuth();
  const { currentTenantId, currentTenant, tenants } = useOutletContext();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [switchNotice, setSwitchNotice] = useState(null);

  useEffect(() => {
    const notice = consumeTenantSwitchNotice();
    if (notice?.name) setSwitchNotice(notice);
    else setSwitchNotice(null);
  }, [currentTenantId]);

  const load = useCallback(() => {
    if (!currentTenantId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    fetchDashboard(currentTenantId)
      .then((r) => setData(r.data))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [currentTenantId]);

  useEffect(() => {
    load();
  }, [load]);

  if (tenants && tenants.length === 0) {
    return (
      <div className="max-w-2xl">
        <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 mb-2">Dashboard</h1>
        <Card className="mt-6">
          <CardContent className="p-8 text-center">
            <FolderSimple size={48} className="mx-auto text-slate-400" />
            <h3 className="font-display text-xl font-semibold mt-4">Nenhum ambiente (cliente) cadastrado</h3>
            <p className="text-sm text-slate-600 mt-2">
              Para começar, cadastre o primeiro ambiente em{" "}
              <Link to="/admin/clients" className="text-blue-600 underline">
                Administração CTLI → Ambientes (clientes)
              </Link>
              .
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!currentTenantId) {
    return <div className="text-slate-600">Selecione um ambiente para visualizar o dashboard.</div>;
  }

  if (loading) return <div className="text-slate-600">Carregando dashboard…</div>;

  const pinned = data?.pinned_documents || [];
  const recent = data?.recent_documents || [];
  const reminders = data?.reminders || [];
  const documentAlerts = data?.document_alerts;
  const listaMestraPath = data?.lista_mestra_path;
  const alertCount = documentAlerts?.totalCount || 0;
  const showReminders = canManageDashboardReminders(user?.role);
  const shortcuts = getVisibleDashboardShortcuts(user?.role);

  return (
    <div className="space-y-8 min-w-0" data-testid="dashboard">
      {switchNotice && (
        <Alert className="border-blue-300 bg-blue-50 text-blue-950">
          <Info size={18} className="text-blue-600" />
          <AlertTitle className="font-display text-blue-950">Ambiente alterado</AlertTitle>
          <AlertDescription className="text-blue-900/90 pr-8">
            A pré-visualizar: <strong>{switchNotice.name}</strong>. Os documentos e ficheiros listados
            abaixo pertencem apenas a este cliente — confirme o ambiente antes de editar ou exportar.
          </AlertDescription>
          <button
            type="button"
            onClick={() => setSwitchNotice(null)}
            className="absolute right-3 top-3 rounded-md p-1 text-blue-700 hover:bg-blue-100"
            aria-label="Fechar aviso"
          >
            <X size={16} />
          </button>
        </Alert>
      )}

      <div>
        <div className="text-[10px] uppercase tracking-[0.2em] text-slate-500">Visão geral</div>
        <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 mt-1">Dashboard</h1>
        <p className="text-sm text-slate-600 mt-1">
          Atalhos e visão documental do ambiente <span className="font-medium text-slate-800">{currentTenant?.name}</span>.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 min-w-0">
        {shortcuts.map((s) => (
          <DashboardShortcutCard
            key={s.id}
            id={s.id}
            label={s.label}
            to={s.to}
            active={s.active}
            disabledReason={s.disabledReason}
          />
        ))}
      </div>

      {alertCount > 0 && listaMestraPath && (
        <Alert className="border-amber-300 bg-amber-50">
          <Info size={18} className="text-amber-700" />
          <AlertTitle className="text-amber-950">Lista Mestra — {alertCount} alerta(s)</AlertTitle>
          <AlertDescription className="text-amber-900/90">
            Há documentos com análise crítica, consulta externa ou validação pendente.{" "}
            <Link to={`${listaMestraPath.replace("lista_mestra_internos", "lista_mestra_alertas")}`} className="underline font-medium">
              Ver alertas
            </Link>
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 min-w-0 items-start">
        <Card className="lg:col-span-2 border-slate-200 min-w-0 self-start">
          <CardHeader className="pb-2">
            <CardTitle className="font-display text-lg">Distribuição por requisito</CardTitle>
          </CardHeader>
          <CardContent className="min-w-0 overflow-hidden pt-0 pb-4">
            <Suspense fallback={pieChartFallback}>
              <DocumentDistributionPie byRequirement={data?.by_requirement || {}} />
            </Suspense>
          </CardContent>
        </Card>

        <Card className="border-slate-200 min-w-0">
          <CardHeader className="pb-2">
            <CardTitle className="font-display text-lg">Mix de documentos</CardTitle>
            <p className="text-xs text-slate-500 font-normal mt-1">Criados ou atualizados recentemente</p>
          </CardHeader>
          <CardContent className="min-w-0">
            <DashboardRecentDocs documents={recent} />
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 min-w-0">
        {showReminders && (
          <Card className="border-slate-200 min-w-0">
            <CardHeader className="pb-2">
              <CardTitle className="font-display text-lg flex items-center gap-2">
                <NotePencil size={18} /> Lembretes
              </CardTitle>
            </CardHeader>
            <CardContent className="min-w-0">
              <DashboardReminders
                tenantId={currentTenantId}
                reminders={reminders}
                userId={user?.id}
                isAdmin={isCtliAdmin(user?.role)}
                onChange={load}
              />
            </CardContent>
          </Card>
        )}

        <Card className={`border-slate-200 min-w-0 ${!showReminders ? "lg:col-span-2" : ""}`}>
          <CardHeader className="pb-2">
            <CardTitle className="font-display text-lg flex items-center gap-2">
              <PushPin size={18} weight="fill" /> Documentos marcados
            </CardTitle>
          </CardHeader>
          <CardContent className="min-w-0">
            <DashboardPinnedDocs documents={pinned} onChange={load} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
