import React from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { usesRestrictedNav, usesClientSidebarNav, restrictedNavHomePath } from "@/lib/roleNav";
import { isClientAllowedPath } from "@/lib/clientNavConfig";
import { isColetaPath } from "@/lib/coletaRoutes";
import { isCertificatePath } from "@/lib/certificateRoutes";
import { APPROVAL_HUB_PATH } from "@/lib/approvalRoutes";
import { WEIGHT_CERTIFICATE_LIST_PATH } from "@/lib/weightCalibration/weightCertificateRoutes";
import { HELP_PATH } from "@/lib/help/helpModules";

function isHelpPath(pathname) {
  return pathname === HELP_PATH || pathname.startsWith(`${HELP_PATH}/`);
}

function isSignatoryAllowedPath(pathname) {
  if (!pathname) return false;
  if (isHelpPath(pathname)) return true;
  if (pathname === APPROVAL_HUB_PATH || pathname.startsWith(`${APPROVAL_HUB_PATH}/`)) return true;
  if (isCertificatePath(pathname)) return true;
  if (pathname.startsWith(WEIGHT_CERTIFICATE_LIST_PATH)) return true;
  return false;
}

/**
 * Redireciona técnicos para coleta, signatários para aprovação e utilizadores cliente para rotas permitidas.
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

  if (usesRestrictedNav(user.role, currentTenant)) {
    if (user.role === "tecnico_campo" && !isColetaPath(loc.pathname)) {
      return <Navigate to={restrictedNavHomePath(user.role, currentTenant)} replace />;
    }

    if (user.role === "signatario" && !isSignatoryAllowedPath(loc.pathname)) {
      return <Navigate to={restrictedNavHomePath(user.role, currentTenant)} replace />;
    }

    return <Outlet context={outletContext} />;
  }

  if (usesClientSidebarNav(user.role, currentTenant, user) && !isClientAllowedPath(loc.pathname)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet context={outletContext} />;
}
