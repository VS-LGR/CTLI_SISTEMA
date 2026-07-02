import React from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { getVisibleDashboardShortcuts } from "@/lib/dashboardShortcuts";
import { canManageDashboardReminders, canApproveCalibrationCertificate } from "@/lib/roles";
import { CERTIFICATE_PENDING_APPROVAL_PATH } from "@/lib/certificateRoutes";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { SealCheck } from "@phosphor-icons/react";
import DashboardShortcutCard from "@/components/dashboard/DashboardShortcutCard";
import DashboardReminders from "@/components/dashboard/DashboardReminders";
import DashboardOperationalOverview from "@/components/dashboard/DashboardOperationalOverview";

export default function ClientPortalDashboard({
  currentTenant,
  data,
  loading,
  onRemindersChange,
}) {
  const { user } = useAuth();
  const shortcuts = getVisibleDashboardShortcuts(user?.role, currentTenant);
  const pendingApprovals = data?.certificate_pending_approval || 0;
  const showApprovalQueue = canApproveCalibrationCertificate(user?.role) && pendingApprovals > 0;
  const showReminders = canManageDashboardReminders(user?.role);
  const reminders = data?.reminders || [];
  const certificatesCount = data?.certificates_issued_count ?? 0;
  const proposalsCount = data?.proposals_issued_count ?? 0;

  return (
    <div className="space-y-6 min-w-0" data-testid="client-portal-dashboard">
      <div>
        <div className="text-[10px] uppercase tracking-[0.2em] text-slate-500">Portal</div>
        <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 mt-1">
          Dashboard
        </h1>
        <p className="text-sm text-slate-600 mt-1">
          Ambiente <span className="font-medium text-slate-800">{currentTenant?.name}</span>
        </p>
      </div>

      <DashboardOperationalOverview
        certificatesCount={certificatesCount}
        proposalsCount={proposalsCount}
        expiryAlerts={data?.equipment_expiry_alerts}
        loading={loading}
      />

      {showApprovalQueue && (
        <Alert className="border-orange-300 bg-orange-50">
          <SealCheck size={18} className="text-orange-700" />
          <AlertTitle className="text-orange-950">
            {pendingApprovals} certificado{pendingApprovals === 1 ? "" : "s"} aguardando aprovação
          </AlertTitle>
          <AlertDescription className="text-orange-900/90">
            <Link to={CERTIFICATE_PENDING_APPROVAL_PATH} className="underline font-medium">
              Abrir fila
            </Link>
          </AlertDescription>
        </Alert>
      )}

      <div className="space-y-4">
        <h2 className="font-display text-lg font-semibold text-slate-900">Atalhos</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
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
        {showReminders && (
          <DashboardReminders
            tenantId={currentTenant?.id}
            reminders={reminders}
            userId={user?.id}
            isAdmin={user?.role === "admin" || user?.role === "client" || user?.role === "signatario"}
            onChange={onRemindersChange}
          />
        )}
      </div>
    </div>
  );
}
