import React from "react";
import { Navigate, useOutletContext, useParams } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { canAccessModule, canAccessRequirement, canAccessRequirementFolder, canAccessCadastroSection } from "@/lib/tenantAccess";

/**
 * Gate de módulo por modelo de ambiente — usar em rotas filhas de Layout (outlet context).
 */
export default function TenantModuleGate({ children, module = null }) {
  const { user } = useAuth();
  const { currentTenant } = useOutletContext() || {};

  if (module && !canAccessModule({ tenant: currentTenant, role: user?.role, module })) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

/** Gate para rotas /requirement/:id e /requirement/:id/:folderKey */
export function RequirementAccessGate({ children }) {
  const { user } = useAuth();
  const { currentTenant } = useOutletContext() || {};
  const { id, folderKey } = useParams();

  if (!canAccessRequirement({ tenant: currentTenant, role: user?.role, requirementId: id })) {
    return <Navigate to="/dashboard" replace />;
  }

  if (folderKey && !canAccessRequirementFolder({
    tenant: currentTenant,
    role: user?.role,
    requirementId: id,
    folderKey,
  })) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

/** Gate para secções /cadastros/:section */
export function CadastroSectionGate({ children, sectionId }) {
  const { user } = useAuth();
  const { currentTenant } = useOutletContext() || {};
  const params = useParams();
  const section = sectionId || params.section;

  if (section && !canAccessCadastroSection({ tenant: currentTenant, role: user?.role, sectionId: section })) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}
