import React from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { getVisibleDashboardShortcuts } from "@/lib/dashboardShortcuts";
import { canManageDashboardReminders, canApproveCalibrationCertificate } from "@/lib/roles";
import { CERTIFICATE_PENDING_APPROVAL_PATH } from "@/lib/certificateRoutes";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { SealCheck, FileText, Scroll } from "@phosphor-icons/react";
import DashboardShortcutCard from "@/components/dashboard/DashboardShortcutCard";
import DashboardReminders from "@/components/dashboard/DashboardReminders";
import EquipmentExpiryAlerts from "@/components/dashboard/EquipmentExpiryAlerts";

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

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Card className="border-slate-200">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="rounded-lg bg-blue-50 p-2.5">
              <Scroll size={24} className="text-blue-600" weight="duotone" />
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wide">Certificados emitidos</p>
              <p className="text-2xl font-display font-bold text-slate-900">
                {loading ? "—" : (data?.certificates_issued_count ?? 0)}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-slate-200">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="rounded-lg bg-emerald-50 p-2.5">
              <FileText size={24} className="text-emerald-600" weight="duotone" />
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wide">Propostas emitidas</p>
              <p className="text-2xl font-display font-bold text-slate-900">
                {loading ? "—" : (data?.proposals_issued_count ?? 0)}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <div className="lg:col-span-2 space-y-4">
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
              isAdmin={user?.role === "admin" || user?.role === "client"}
              onChange={onRemindersChange}
            />
          )}
        </div>
        <EquipmentExpiryAlerts alerts={data?.equipment_expiry_alerts} loading={loading} />
      </div>
    </div>
  );
}
