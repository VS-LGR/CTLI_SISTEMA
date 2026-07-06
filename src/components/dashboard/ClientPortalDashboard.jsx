import React from "react";
import { useAuth } from "@/context/AuthContext";
import { getVisibleDashboardShortcuts, firstNameFromUser } from "@/lib/dashboardShortcuts";
import { canManageDashboardReminders, canApproveCalibrationCertificate, isCtliAdmin } from "@/lib/roles";
import DashboardContent from "@/components/dashboard/DashboardContent";

export default function ClientPortalDashboard({
  currentTenant,
  data,
  loading,
  onRemindersChange,
}) {
  const { user } = useAuth();
  const shortcuts = getVisibleDashboardShortcuts(user?.role, currentTenant, user);
  const pendingApprovals = data?.certificate_pending_approval || 0;
  const showApprovalQueue = canApproveCalibrationCertificate(user?.role) && pendingApprovals > 0;
  const showReminders = canManageDashboardReminders(user?.role);

  return (
    <div data-testid="client-portal-dashboard">
      <DashboardContent
        sectionLabel="Portal"
        currentTenant={currentTenant}
        user={user}
        data={data}
        loading={loading}
        shortcuts={shortcuts}
        greetingName={firstNameFromUser(user)}
        showApprovalQueue={showApprovalQueue}
        pendingApprovals={pendingApprovals}
        documentAlerts={null}
        listaMestraPath={null}
        showReminders={showReminders}
        isAdmin={isCtliAdmin(user?.role) || user?.role === "client" || user?.role === "signatario"}
        onRemindersChange={onRemindersChange}
        onPinnedChange={onRemindersChange}
      />
    </div>
  );
}
