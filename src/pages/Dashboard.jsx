import React, { useCallback, useEffect, useState } from "react";
import { useOutletContext, Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { fetchDashboard } from "@/lib/dashboardApi";
import { canManageDashboardReminders, isCtliAdmin, canApproveCalibrationCertificate } from "@/lib/roles";
import { isEffectiveClientPortal } from "@/lib/tenantAccess";
import ClientPortalDashboard from "@/components/dashboard/ClientPortalDashboard";
import { getVisibleDashboardShortcuts, firstNameFromUser } from "@/lib/dashboardShortcuts";
import { Card, CardContent } from "@/components/ui/card";
import { FolderSimple, X, Info } from "@phosphor-icons/react";
import { consumeTenantSwitchNotice } from "@/lib/tenantSwitchNotice";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import DashboardContent from "@/components/dashboard/DashboardContent";

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

  if (loading && !data) return <div className="text-slate-600">Carregando dashboard…</div>;

  const portalMode = isEffectiveClientPortal(currentTenant, user?.role);

  if (portalMode) {
    return (
      <ClientPortalDashboard
        currentTenant={currentTenant}
        data={data}
        loading={loading}
        onRemindersChange={load}
      />
    );
  }

  const shortcuts = getVisibleDashboardShortcuts(user?.role, currentTenant);
  const pendingApprovals = data?.certificate_pending_approval || 0;
  const showApprovalQueue = canApproveCalibrationCertificate(user?.role) && pendingApprovals > 0;
  const showReminders = canManageDashboardReminders(user?.role);

  return (
    <div data-testid="dashboard">
      {switchNotice && (
        <Alert className="border-blue-300 bg-blue-50 text-blue-950 mb-8">
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

      <DashboardContent
        sectionLabel="Visão geral"
        currentTenant={currentTenant}
        user={user}
        data={data}
        loading={loading}
        shortcuts={shortcuts}
        greetingName={firstNameFromUser(user)}
        showApprovalQueue={showApprovalQueue}
        pendingApprovals={pendingApprovals}
        documentAlerts={data?.document_alerts}
        listaMestraPath={data?.lista_mestra_path}
        showReminders={showReminders}
        isAdmin={isCtliAdmin(user?.role)}
        onRemindersChange={load}
        onPinnedChange={load}
      />
    </div>
  );
};

export default Dashboard;
