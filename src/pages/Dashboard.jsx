import React, { useCallback, useEffect, useState } from "react";
import { useOutletContext, Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { fetchDashboard } from "@/lib/dashboardApi";
import { canAccessColeta, canManageDashboardReminders, isCtliAdmin } from "@/lib/roles";
import { COLETA_LIST_PATH } from "@/lib/coletaRoutes";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  FileText, FolderSimple, CheckCircle, XCircle, Scales, PushPin, NotePencil,
} from "@phosphor-icons/react";
import DocumentDistributionPie from "@/components/dashboard/DocumentDistributionPie";
import DashboardRecentDocs from "@/components/dashboard/DashboardRecentDocs";
import DashboardReminders from "@/components/dashboard/DashboardReminders";
import DashboardPinnedDocs from "@/components/dashboard/DashboardPinnedDocs";

const KpiCard = ({ label, value, icon: Icon, tint = "blue", testId }) => {
  const tones = {
    blue: "bg-blue-50 text-blue-700 border-blue-100",
    green: "bg-emerald-50 text-emerald-700 border-emerald-100",
    red: "bg-red-50 text-red-700 border-red-100",
    amber: "bg-amber-50 text-amber-700 border-amber-100",
  };
  return (
    <Card className="border-slate-200" data-testid={testId}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div>
            <div className="text-[10px] uppercase tracking-[0.2em] text-slate-500">{label}</div>
            <div className="text-3xl font-display font-bold tracking-tight text-slate-900 mt-2">{value}</div>
          </div>
          <div className={`p-2.5 rounded-md border ${tones[tint]}`}><Icon size={18} weight="duotone" /></div>
        </div>
      </CardContent>
    </Card>
  );
};

const Dashboard = () => {
  const { user } = useAuth();
  const { currentTenantId, currentTenant, tenants } = useOutletContext();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

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

  const total = data?.total_documents || 0;
  const vigentes = data?.by_status?.vigente || 0;
  const obsoletos = data?.by_status?.obsoleto || 0;
  const pinned = data?.pinned_documents || [];
  const recent = data?.recent_documents || [];
  const reminders = data?.reminders || [];
  const showReminders = canManageDashboardReminders(user?.role);

  return (
    <div className="space-y-8 min-w-0" data-testid="dashboard">
      <div>
        <div className="text-[10px] uppercase tracking-[0.2em] text-slate-500">Visão geral</div>
        <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 mt-1">Dashboard</h1>
        <p className="text-sm text-slate-600 mt-1">
          Indicadores documentais do ambiente <span className="font-medium text-slate-800">{currentTenant?.name}</span>.
        </p>
      </div>

      {canAccessColeta(user?.role) && (
        <Card className="border-blue-200 bg-blue-50/40">
          <CardContent className="p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-start gap-3 min-w-0">
              <div className="p-2 rounded-md bg-blue-600 text-white shrink-0">
                <Scales size={22} weight="duotone" />
              </div>
              <div className="min-w-0">
                <h2 className="font-display font-semibold text-slate-900">Coleta RE-7.2A</h2>
                <p className="text-sm text-slate-600 mt-0.5">
                  Formulário de calibração de balança — PR-7.2 Registros.
                </p>
              </div>
            </div>
            <Button asChild className="bg-blue-600 hover:bg-blue-700 shrink-0 w-full sm:w-auto">
              <Link to={COLETA_LIST_PATH}>Abrir coletas</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard testId="kpi-total" label="Total de documentos" value={total} icon={FileText} tint="blue" />
        <KpiCard testId="kpi-vigentes" label="Vigentes" value={vigentes} icon={CheckCircle} tint="green" />
        <KpiCard testId="kpi-obsoletos" label="Obsoletos" value={obsoletos} icon={XCircle} tint="red" />
        <KpiCard
          testId="kpi-pinned"
          label="Documentos marcados"
          value={pinned.length}
          icon={PushPin}
          tint="amber"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 min-w-0">
        <Card className="lg:col-span-2 border-slate-200 min-w-0">
          <CardHeader className="pb-2">
            <CardTitle className="font-display text-lg">Distribuição por requisito</CardTitle>
          </CardHeader>
          <CardContent className="min-w-0">
            <DocumentDistributionPie byRequirement={data?.by_requirement || {}} />
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
