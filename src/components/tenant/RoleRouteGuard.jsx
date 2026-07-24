import React from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import {
  usesRestrictedNav,
  usesClientSidebarNav,
  restrictedNavHomePath,
  isDirectorOnlyNav,
} from "@/lib/roleNav";
import { isClientAllowedPath } from "@/lib/clientNavConfig";
import { isColetaPath } from "@/lib/coletaRoutes";
import { isCertificatePath } from "@/lib/certificateRoutes";
import { APPROVAL_HUB_PATH } from "@/lib/approvalRoutes";
import { CERTIFICATE_NEW_PATH } from "@/lib/certificateRoutes";
import { WEIGHT_CERTIFICATE_LIST_PATH, WEIGHT_CERTIFICATE_NEW_PATH } from "@/lib/weightCalibration/weightCertificateRoutes";
import { HELP_PATH } from "@/lib/help/helpModules";
import {
  canAccessModule,
  canAccessRequirement,
  canAccessRequirementFolder,
} from "@/lib/tenantAccess";
import { canEditCalibrationCertificate } from "@/lib/roles";

function isHelpPath(pathname) {
  return pathname === HELP_PATH || pathname.startsWith(`${HELP_PATH}/`);
}

function isDashboardPath(pathname) {
  return pathname === "/dashboard" || pathname.startsWith("/dashboard/");
}

function isSignatoryAllowedPath(pathname) {
  if (!pathname) return false;
  if (isHelpPath(pathname)) return true;
  if (pathname === APPROVAL_HUB_PATH || pathname.startsWith(`${APPROVAL_HUB_PATH}/`)) return true;
  if (isCertificatePath(pathname)) return true;
  if (pathname.startsWith(WEIGHT_CERTIFICATE_LIST_PATH)) return true;
  return false;
}

function isCertificateCreatePath(pathname) {
  if (!pathname) return false;
  if (pathname === CERTIFICATE_NEW_PATH || pathname.startsWith(`${CERTIFICATE_NEW_PATH}/`)) return true;
  if (pathname === WEIGHT_CERTIFICATE_NEW_PATH || pathname.startsWith(`${WEIGHT_CERTIFICATE_NEW_PATH}/`)) {
    return true;
  }
  return false;
}

/**
 * Redireciona técnico, signatário, diretor e conta cliente; valida pastas por matriz RBAC.
 */
export default function RoleRouteGuard({ currentTenant, outletContext }) {
  const { user } = useAuth();
  const loc = useLocation();

  if (!user || user === false) {
    return <Outlet context={outletContext} />;
  }

  if (isHelpPath(loc.pathname)) {
    return <Outlet context={outletContext} />;
  }

  if (isDirectorOnlyNav(user.role)) {
    if (!isDashboardPath(loc.pathname) && !isHelpPath(loc.pathname)) {
      return <Navigate to={restrictedNavHomePath(user.role)} replace />;
    }
    return <Outlet context={outletContext} />;
  }

  if (usesRestrictedNav(user.role)) {
    if (user.role === "tecnico_campo" && !isColetaPath(loc.pathname)) {
      return <Navigate to={restrictedNavHomePath(user.role)} replace />;
    }

    if (user.role === "signatario") {
      if (isCertificateCreatePath(loc.pathname) && !canEditCalibrationCertificate(user.role, user)) {
        return <Navigate to={restrictedNavHomePath(user.role)} replace />;
      }
      if (!isSignatoryAllowedPath(loc.pathname)) {
        return <Navigate to={restrictedNavHomePath(user.role)} replace />;
      }
    }

    return <Outlet context={outletContext} />;
  }

  if (usesClientSidebarNav(user.role, currentTenant, user) && !isClientAllowedPath(loc.pathname)) {
    return <Navigate to="/dashboard" replace />;
  }

  // Matriz RBAC: requisitos / pastas
  const reqMatch = loc.pathname.match(/^\/requirement\/(\d+)(?:\/([^/?#]+))?/);
  if (reqMatch) {
    const requirementId = reqMatch[1];
    const folderKey = reqMatch[2];
    if (!canAccessRequirement({ tenant: currentTenant, role: user.role, requirementId, user })) {
      return <Navigate to="/dashboard" replace />;
    }
    if (
      folderKey
      && !canAccessRequirementFolder({
        tenant: currentTenant,
        role: user.role,
        requirementId,
        folderKey,
        user,
      })
    ) {
      return <Navigate to="/dashboard" replace />;
    }
  }

  if (isColetaPath(loc.pathname) && !canAccessModule({ tenant: currentTenant, role: user.role, module: "coleta", user })) {
    return <Navigate to="/dashboard" replace />;
  }

  if (
    (isCertificatePath(loc.pathname) || loc.pathname.startsWith(WEIGHT_CERTIFICATE_LIST_PATH))
    && !canAccessModule({ tenant: currentTenant, role: user.role, module: "certificados", user })
  ) {
    return <Navigate to="/dashboard" replace />;
  }

  if (isCertificateCreatePath(loc.pathname) && !canEditCalibrationCertificate(user.role, user)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet context={outletContext} />;
}
