import React from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { usesRestrictedNav, restrictedNavHomePath } from "@/lib/roleNav";
import { isCertificatePath, isPr72ModulePath } from "@/lib/certificateRoutes";

/**
 * Redireciona técnicos/signatários em ambiente full para coleta/aprovação.
 * No portal cliente, estes cargos têm nav completa.
 */
export default function RoleRouteGuard({ currentTenant, outletContext }) {
  const { user } = useAuth();
  const loc = useLocation();

  if (!user || user === false) {
    return <Outlet context={outletContext} />;
  }

  if (!usesRestrictedNav(user.role, currentTenant)) {
    return <Outlet context={outletContext} />;
  }

  if (user.role === "tecnico_campo" && !isPr72ModulePath(loc.pathname)) {
    return <Navigate to={restrictedNavHomePath(user.role, currentTenant)} replace />;
  }

  if (user.role === "signatario" && !isCertificatePath(loc.pathname)) {
    return <Navigate to={restrictedNavHomePath(user.role, currentTenant)} replace />;
  }

  return <Outlet context={outletContext} />;
}
