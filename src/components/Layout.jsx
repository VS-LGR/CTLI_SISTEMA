import React, { useCallback, useEffect, useState } from "react";
import { NavLink, Outlet, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import api, { asArray, isSupabaseAuthMode } from "@/lib/api";
import { supabase } from "@/lib/supabaseClient";
import {
  House, SignOut, CaretDown,
  ListChecks, Briefcase, Toolbox, GearSix, Database,
  Buildings, CaretRight, ClipboardText, List, X,
  FileText, Certificate, BookOpen, FolderSimple,
} from "@phosphor-icons/react";
import AppBrand from "@/components/branding/AppBrand";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { roleShort, isTechnicianOnlyNav, isSignatoryOnlyNav, canAccessColeta, canAccessMasterDocuments, canAccessCalibrationCertificates, canAccessCommercialProposals, canApproveCalibrationCertificate } from "@/lib/roles";
import { canAccessModule } from "@/lib/tenantAccess";
import { usesClientSidebarNav } from "@/lib/roleNav";
import { CLIENT_TOP_NAV_ITEMS, getClientListaMestraNavItems } from "@/lib/clientNavConfig";
import RoleRouteGuard from "@/components/tenant/RoleRouteGuard";
import { CERTIFICATE_PENDING_APPROVAL_PATH } from "@/lib/certificateRoutes";
import {
  getVisibleReqMenuItems,
  getFoldersForRequirement,
  requiresFolderNav,
  REQ_NAMES,
} from "@/lib/requirementNavConfig";
import { useAdminTenantSwitch } from "@/hooks/useAdminTenantSwitch";
import { useSidebarCollapsed } from "@/hooks/useSidebarCollapsed";
import TenantSwitchConfirmDialog from "@/components/tenant/TenantSwitchConfirmDialog";

function resolveNavGroupFromPath(pathname) {
  if (pathname.startsWith("/requirement/8/pr-8-3") || pathname.startsWith("/lista-mestra")) return "lista-mestra";
  const m = pathname.match(/^\/requirement\/(\d+)/);
  if (m) return `req-${m[1]}`;
  return null;
}

const CLIENT_NAV_ICONS = {
  dashboard: House,
  propostas: FileText,
  coleta: ClipboardText,
  certificados: Certificate,
  "manual-qualidade": BookOpen,
};
const REQ_ICONS = {
  "4": ListChecks,
  "5": Buildings,
  "6": Toolbox,
  "7": Briefcase,
  "8": GearSix,
};

function SidebarBrand({ collapsed = false }) {
  return (
    <div className="px-4 sm:px-6 py-5 border-b border-slate-800 shrink-0">
      <AppBrand variant={collapsed ? "sidebar-collapsed" : "sidebar"} />
    </div>
  );
}

function isFolderNavActive(location, requirementId, folderKey) {
  const prefix = `/requirement/${requirementId}/${folderKey}`;
  return location.pathname === prefix
    || location.pathname.startsWith(`${prefix}/`);
}

const Layout = () => {
  const { user, logout, currentTenantId, selectTenant } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [tenants, setTenants] = useState([]);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [openNavGroup, setOpenNavGroup] = useState(
    () => resolveNavGroupFromPath(location.pathname),
  );
  const {
    collapsed: sidebarCollapsed,
    overlayOpen: desktopSidebarOverlay,
    toggleDesktopMenu,
    closeOverlay: closeDesktopSidebarOverlay,
  } = useSidebarCollapsed();

  const loadTenants = useCallback(async () => {
    try {
      let data;
      if (isSupabaseAuthMode) {
        const { data: rows, error } = await supabase.from("tenants").select("*").order("name");
        if (error) throw error;
        data = rows || [];
      } else {
        const { data: d } = await api.get("/tenants");
        data = asArray(d);
      }
      setTenants(data);
      const ids = new Set(data.map((t) => t.id));
      if (currentTenantId && !ids.has(currentTenantId)) {
        selectTenant(data.length > 0 ? data[0].id : null);
      } else if (!currentTenantId && data.length > 0) {
        selectTenant(data[0].id);
      }
    } catch (e) { /* ignore */ }
  }, [currentTenantId, selectTenant]);

  useEffect(() => {
    if (user) loadTenants();
  }, [user, loadTenants]);

  useEffect(() => {
    setMobileNavOpen(false);
    closeDesktopSidebarOverlay();
  }, [location.pathname, closeDesktopSidebarOverlay]);

  const currentTenant = tenants.find((t) => t.id === currentTenantId);
  const isAdmin = user?.role === "admin";
  const technicianNav = isTechnicianOnlyNav(user?.role, currentTenant);
  const signatoryNav = isSignatoryOnlyNav(user?.role, currentTenant);
  const restrictedNav = technicianNav || signatoryNav;
  const clientSidebarNav = usesClientSidebarNav(user?.role, currentTenant, user);
  const showApprovalNav = canApproveCalibrationCertificate(user?.role) && !restrictedNav && !clientSidebarNav;

  const {
    confirmOpen: tenantConfirmOpen,
    setConfirmOpen: setTenantConfirmOpen,
    switching: tenantSwitching,
    currentTenant: switchCurrentTenant,
    pendingTenant: switchPendingTenant,
    requestSwitch: requestAdminTenantSwitch,
    cancelSwitch: cancelTenantSwitch,
    confirmSwitch: confirmTenantSwitch,
  } = useAdminTenantSwitch({
    navigate,
    selectTenant,
    currentTenantId,
    tenants,
  });

  const closeMobileNav = () => setMobileNavOpen(false);

  const navLinkClass = ({ isActive }) =>
    `flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-all ${
      isActive
        ? "bg-blue-600 text-white font-medium shadow-sm"
        : "text-slate-300 hover:bg-slate-800 hover:text-white"
    }`;

  const subNavLinkClass = ({ isActive }) =>
    `flex items-center gap-2 pl-9 pr-3 py-2 rounded-md text-xs transition-all leading-snug ${
      isActive
        ? "bg-slate-800 text-white font-medium ring-1 ring-inset ring-blue-500/40"
        : "text-slate-400 hover:bg-slate-800/70 hover:text-white"
    }`;

  const reqGroupPathPrefix = (rid) => `/requirement/${rid}`;
  const isReqGroupActive = (rid) => {
    const p = location.pathname;
    return p === reqGroupPathPrefix(rid) || p.startsWith(`${reqGroupPathPrefix(rid)}/`);
  };

  const reqMenuItems = getVisibleReqMenuItems(currentTenant, user?.role);
  const showBackupNav = canAccessModule({ tenant: currentTenant, role: user?.role, module: "backup" });

  useEffect(() => {
    const group = resolveNavGroupFromPath(location.pathname);
    if (group) setOpenNavGroup(group);
  }, [location.pathname]);

  const handleNavGroupOpenChange = (group) => (open) => {
    if (open) setOpenNavGroup(group);
    else if (openNavGroup === group) setOpenNavGroup(null);
  };

  const isListaMestraActive = location.pathname.startsWith("/requirement/8/pr-8-3")
    || location.pathname.startsWith("/lista-mestra");

  const isClientNavItemVisible = (item) => {
    if (item.requiresColeta && !canAccessColeta(user?.role)) return false;
    if (item.requiresCommercialProposals && !canAccessCommercialProposals(user?.role)) return false;
    if (item.requiresCalibrationCertificates && !canAccessCalibrationCertificates(user?.role)) return false;
    return true;
  };

  const isListaMestraTabActive = (to) => {
    const [path, query] = to.split("?");
    if (location.pathname !== path) return false;
    const expectedTab = new URLSearchParams(query || "").get("tab");
    const currentTab = new URLSearchParams(location.search).get("tab");
    return currentTab === expectedTab;
  };

  const renderClientNav = (onNavigate) => (
    <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto overscroll-contain">
      {CLIENT_TOP_NAV_ITEMS.filter(isClientNavItemVisible).map((item) => {
        const Icon = CLIENT_NAV_ICONS[item.id] || ListChecks;
        return (
          <NavLink
            key={item.id}
            to={item.to}
            className={navLinkClass}
            data-testid={`nav-client-${item.id}`}
            onClick={onNavigate}
            end={item.id === "dashboard"}
          >
            <Icon size={18} weight="duotone" />
            <span className="flex-1 min-w-0">{item.label}</span>
          </NavLink>
        );
      })}

      {canAccessMasterDocuments(user?.role) && (
        <Collapsible
          open={openNavGroup === "lista-mestra"}
          onOpenChange={handleNavGroupOpenChange("lista-mestra")}
        >
          <CollapsibleTrigger
            className={`flex w-full items-center gap-3 px-3 py-2.5 rounded-md text-sm text-left transition-all ${
              isListaMestraActive ? "text-white bg-slate-800/80" : "text-slate-300 hover:bg-slate-800 hover:text-white"
            }`}
            data-testid="nav-client-lista-mestra"
          >
            <FolderSimple size={18} weight="duotone" className="shrink-0" />
            <span className="flex-1 min-w-0">Lista Mestra</span>
            <CaretRight size={14} className="shrink-0 opacity-70" />
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-0.5 pt-0.5 pb-1">
            {getClientListaMestraNavItems().map((tab) => (
              <NavLink
                key={tab.key}
                to={tab.to}
                className={subNavLinkClass}
                title={tab.label}
                data-testid={`nav-client-lista-mestra-${tab.key}`}
                onClick={onNavigate}
                isActive={({ location: loc }) => isListaMestraTabActive(tab.to) || (
                  loc.pathname.startsWith("/lista-mestra/") && tab.key === "lista_mestra_internos"
                )}
              >
                <span className="truncate">{tab.label}</span>
              </NavLink>
            ))}
          </CollapsibleContent>
        </Collapsible>
      )}
    </nav>
  );

  const renderNav = (onNavigate) => (
    clientSidebarNav ? renderClientNav(onNavigate) : (
    <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto overscroll-contain">
      {!restrictedNav && (
        <NavLink to="/dashboard" className={navLinkClass} data-testid="nav-dashboard" onClick={onNavigate}>
          <House size={18} weight="duotone" /> Dashboard
        </NavLink>
      )}

      {showApprovalNav && (
        <NavLink to={CERTIFICATE_PENDING_APPROVAL_PATH} className={navLinkClass} data-testid="nav-certificates-approval" onClick={onNavigate}>
          <ClipboardText size={18} weight="duotone" /> Aprovação
        </NavLink>
      )}

      {signatoryNav && (
        <NavLink to={CERTIFICATE_PENDING_APPROVAL_PATH} className={navLinkClass} data-testid="nav-certificates-approval" onClick={onNavigate}>
          <ClipboardText size={18} weight="duotone" /> Aprovação
        </NavLink>
      )}

      {!restrictedNav && (
        <>
          <div className="pt-4 pb-1 px-3 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
            Requisitos
          </div>
          {reqMenuItems.map((r) => {
            const Icon = REQ_ICONS[r.id] || ListChecks;
            if (!requiresFolderNav(r.id)) {
              return (
                <NavLink
                  key={r.id}
                  to={`/requirement/${r.id}`}
                  className={navLinkClass}
                  data-testid={`nav-req-${r.id}`}
                  onClick={onNavigate}
                >
                  <Icon size={18} weight="duotone" />
                  <span className="flex-1 min-w-0 break-words">
                    {r.label || REQ_NAMES[r.id] || r.name}
                  </span>
                </NavLink>
              );
            }
            const folders = getFoldersForRequirement(r.id, currentTenant, user?.role);
            return (
              <Collapsible
                key={r.id}
                open={openNavGroup === `req-${r.id}`}
                onOpenChange={handleNavGroupOpenChange(`req-${r.id}`)}
              >
                <CollapsibleTrigger
                  className={`flex w-full items-center gap-3 px-3 py-2.5 rounded-md text-sm text-left transition-all ${
                    isReqGroupActive(r.id) ? "text-white bg-slate-800/80" : "text-slate-300 hover:bg-slate-800 hover:text-white"
                  }`}
                  data-testid={`nav-req-group-${r.id}`}
                >
                  <Icon size={18} weight="duotone" className="shrink-0" />
                  <span className="flex-1 min-w-0 break-words">
                    {r.label || REQ_NAMES[r.id] || r.name}
                  </span>
                  <CaretRight size={14} className="shrink-0 opacity-70" />
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-0.5 pt-0.5 pb-1">
                  {folders.map((f) => (
                    <NavLink
                      key={f.folderKey}
                      to={`/requirement/${r.id}/${f.folderKey}`}
                      className={subNavLinkClass}
                      title={f.label}
                      data-testid={`nav-req-${r.id}-${f.folderKey}`}
                      onClick={onNavigate}
                      isActive={({ location: loc }) => isFolderNavActive(loc, r.id, f.folderKey)}
                    >
                      <span className="truncate">{f.label}</span>
                    </NavLink>
                  ))}
                </CollapsibleContent>
              </Collapsible>
            );
          })}

          <div className="pt-4 pb-1 px-3 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
            Sistema
          </div>
          {showBackupNav && (
          <NavLink to="/backup" className={navLinkClass} data-testid="nav-backup" onClick={onNavigate}>
            <Database size={18} weight="duotone" /> Backup
          </NavLink>
          )}

          {isAdmin && (
            <>
              <div className="pt-4 pb-1 px-3 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
                Administração
              </div>
              <NavLink to="/admin/clients" className={navLinkClass} data-testid="nav-admin-clients" onClick={onNavigate}>
                <Buildings size={18} weight="duotone" /> Ambientes
              </NavLink>
            </>
          )}
        </>
      )}
    </nav>
    )
  );

  const renderUserMenu = () => (
    <div className="p-3 border-t border-slate-800 shrink-0">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button type="button" className="w-full flex items-center gap-3 px-3 py-2 rounded-md hover:bg-slate-800 transition" data-testid="user-menu-trigger">
            <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-sm font-semibold shrink-0">
              {user?.name?.[0]?.toUpperCase() || "U"}
            </div>
            <div className="flex-1 text-left min-w-0">
              <div className="text-sm font-medium truncate">{user?.name}</div>
              <div className="text-[10px] uppercase tracking-wider text-slate-400">{roleShort(user?.role)}</div>
            </div>
            <CaretDown size={14} className="shrink-0" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel className="truncate">{user?.email}</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => { logout(); navigate("/login"); }} data-testid="logout-btn">
            <SignOut size={16} className="mr-2" /> Sair
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );

  const sidebarInner = (onNavigate) => (
  <>
    <SidebarBrand />
    {renderNav(onNavigate)}
    {renderUserMenu()}
  </>
  );

  const desktopSidebarVisible = !sidebarCollapsed || desktopSidebarOverlay;

  return (
    <TooltipProvider delayDuration={200}>
    <div className="min-h-screen bg-slate-50 overflow-x-hidden">
      {/* Desktop sidebar — fixo quando expandido; overlay quando recolhido */}
      <aside
        className={`hidden lg:flex w-64 fixed inset-y-0 left-0 bg-slate-900 text-white border-r border-slate-800 z-40 flex-col transition-transform duration-200 ease-out ${
          desktopSidebarVisible ? "translate-x-0" : "-translate-x-full pointer-events-none"
        }`}
        aria-hidden={!desktopSidebarVisible}
      >
        {sidebarInner(closeDesktopSidebarOverlay)}
      </aside>

      {sidebarCollapsed && desktopSidebarOverlay && (
        <button
          type="button"
          className="hidden lg:block fixed inset-0 z-[35] bg-slate-900/40 backdrop-blur-[1px]"
          aria-label="Fechar menu"
          onClick={closeDesktopSidebarOverlay}
        />
      )}

      {/* Mobile / tablet drawer */}
      <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
        <SheetContent
          side="left"
          className="w-[min(18rem,88vw)] max-w-xs p-0 gap-0 flex flex-col bg-slate-900 text-white border-slate-800 [&>button]:text-slate-300 [&>button]:hover:text-white [&>button]:right-3 [&>button]:top-4"
        >
          {sidebarInner(closeMobileNav)}
        </SheetContent>
      </Sheet>

      <div
        className={`min-h-screen flex flex-col min-w-0 transition-[padding] duration-200 ease-out ${
          sidebarCollapsed ? "lg:pl-0" : "lg:pl-64"
        }`}
      >
        <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-slate-200 flex items-center gap-3 px-4 sm:px-6 lg:px-8 py-3 min-h-[4rem]">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="shrink-0 text-slate-700 hover:bg-slate-100"
            onClick={() => {
              if (typeof window !== "undefined" && window.matchMedia("(min-width: 1024px)").matches) {
                toggleDesktopMenu();
              } else {
                setMobileNavOpen(true);
              }
            }}
            aria-label={
              !sidebarCollapsed || desktopSidebarOverlay ? "Recolher menu" : "Abrir menu"
            }
            aria-expanded={!sidebarCollapsed || desktopSidebarOverlay}
            data-testid="desktop-sidebar-toggle"
          >
            <span className="lg:hidden">
              <List size={22} weight="bold" />
            </span>
            <span className="hidden lg:inline">
              {!sidebarCollapsed || desktopSidebarOverlay ? (
                <X size={22} weight="bold" />
              ) : (
                <List size={22} weight="bold" />
              )}
            </span>
          </Button>
          <div className="flex-1 min-w-0">
            <div className="text-[10px] uppercase tracking-[0.2em] text-slate-500 truncate">
              {isAdmin ? "Ambiente atual (pré-visualização)" : "O seu ambiente"}
            </div>
            {isAdmin ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="flex items-center gap-2 text-left text-base sm:text-lg font-display font-semibold text-slate-900 hover:text-blue-600 transition max-w-full"
                    data-testid="tenant-switcher"
                  >
                    <span className="truncate">
                      {currentTenant?.name || (tenants.length === 0 ? "Nenhum ambiente cadastrado" : "Selecionar ambiente")}
                    </span>
                    <CaretDown size={16} className="shrink-0" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-[min(18rem,calc(100vw-2rem))]">
                  <DropdownMenuLabel>Trocar de ambiente (cliente)</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {tenants.length === 0 && (
                    <div className="px-3 py-2 text-sm text-slate-500">Nenhum ambiente. Crie um em Administração CTLI → Ambientes.</div>
                  )}
                  {tenants.map((t) => (
                    <DropdownMenuItem
                      key={t.id}
                      onClick={() => requestAdminTenantSwitch(t.id)}
                      data-testid={`tenant-option-${t.id}`}
                      className={t.id === currentTenantId ? "bg-blue-50 text-blue-700" : ""}
                    >
                      <div className="min-w-0">
                        <div className="font-medium truncate">{t.name}</div>
                        {t.code && <div className="text-xs text-slate-500 truncate">{t.code}</div>}
                      </div>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <div className="text-base sm:text-lg font-display font-semibold text-slate-900 mt-0.5 truncate" data-testid="tenant-switcher">
                {currentTenant?.name || "—"}
              </div>
            )}
          </div>
        </header>

        <main className="relative flex-1 p-4 sm:p-6 lg:p-8 fade-in min-w-0 max-w-full overflow-x-hidden">
          {tenantSwitching && (
            <div
              className="absolute inset-0 z-20 flex items-center justify-center bg-white/75 backdrop-blur-sm"
              aria-busy="true"
              aria-live="polite"
            >
              <span className="text-sm text-slate-600">A mudar de ambiente…</span>
            </div>
          )}
          <RoleRouteGuard
            currentTenant={currentTenant}
            outletContext={{
              tenants,
              currentTenant,
              currentTenantId,
              isAdmin,
              reloadTenants: loadTenants,
              selectTenant,
              requestAdminTenantSwitch,
            }}
          />
        </main>
      </div>

      {isAdmin && (
        <TenantSwitchConfirmDialog
          open={tenantConfirmOpen}
          onOpenChange={(open) => {
            if (!open) cancelTenantSwitch();
            else setTenantConfirmOpen(true);
          }}
          currentTenant={switchCurrentTenant}
          pendingTenant={switchPendingTenant}
          onConfirm={confirmTenantSwitch}
          busy={tenantSwitching}
        />
      )}
    </div>
    </TooltipProvider>
  );
};

export default Layout;
