import React, { useCallback, useEffect, useState } from "react";
import { NavLink, Outlet, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import api, { asArray, isSupabaseAuthMode } from "@/lib/api";
import { supabase } from "@/lib/supabaseClient";
import {
  House, SignOut, CaretDown, ShieldCheck,
  ListChecks, Briefcase, Toolbox, GearSix, Database,
  Buildings, CaretRight, ClipboardText, List, X, UsersThree,
} from "@phosphor-icons/react";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { roleShort, isTechnicianOnlyNav, canAccessColeta, canAccessPersonnel } from "@/lib/roles";
import { getVisiblePersonnelNavItems, isPersonnelNavActive } from "@/lib/personnelNavConfig";
import {
  REQ_MENU_ITEMS,
  getFoldersForRequirement,
  getFolderNavChildren,
  requiresFolderNav,
} from "@/lib/requirementNavConfig";
import { cadastroSectionPath, getVisibleCadastroSections } from "@/lib/cadastroSections";
import { useAdminTenantSwitch } from "@/hooks/useAdminTenantSwitch";
import { useSidebarCollapsed } from "@/hooks/useSidebarCollapsed";
import TenantSwitchConfirmDialog from "@/components/tenant/TenantSwitchConfirmDialog";

const REQ_ICONS = {
  "4": ListChecks,
  "5": Buildings,
  "6": Toolbox,
  "7": Briefcase,
  "8": GearSix,
};

function SidebarBrand() {
  return (
    <div className="px-4 sm:px-6 py-5 border-b border-slate-800 shrink-0">
      <div className="flex items-center gap-2">
        <div className="w-9 h-9 rounded-md bg-blue-600 flex items-center justify-center shrink-0">
          <ShieldCheck size={20} weight="bold" />
        </div>
        <div className="min-w-0">
          <div className="font-display font-bold text-lg tracking-tight truncate">ProcVault</div>
          <div className="text-[10px] uppercase tracking-[0.18em] text-slate-400">QMS</div>
        </div>
      </div>
    </div>
  );
}

const Layout = () => {
  const { user, logout, currentTenantId, selectTenant } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [tenants, setTenants] = useState([]);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [cadastrosExpanded, setCadastrosExpanded] = useState(
    () => location.pathname.startsWith("/cadastros"),
  );
  const [pessoalExpanded, setPessoalExpanded] = useState(
    () => location.pathname.startsWith("/pessoal") || location.pathname.includes("/requirement/6/pr-6-2"),
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
  const technicianNav = isTechnicianOnlyNav(user?.role);

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
        ? "bg-blue-600 text-white"
        : "text-slate-300 hover:bg-slate-800 hover:text-white"
    }`;

  const subNavLinkClass = ({ isActive }) =>
    `flex items-center gap-2 pl-9 pr-3 py-2 rounded-md text-xs transition-all leading-snug ${
      isActive
        ? "bg-blue-600 text-white"
        : "text-slate-400 hover:bg-slate-800 hover:text-white"
    }`;

  const subNavNestedLinkClass = ({ isActive }) =>
    `flex items-center gap-2 pl-12 pr-3 py-1.5 rounded-md text-xs transition-all leading-snug ${
      isActive
        ? "bg-blue-600 text-white"
        : "text-slate-400 hover:bg-slate-800 hover:text-white"
    }`;

  const reqGroupPathPrefix = (rid) => `/requirement/${rid}`;
  const isReqGroupActive = (rid) => {
    const p = location.pathname;
    return p === reqGroupPathPrefix(rid) || p.startsWith(`${reqGroupPathPrefix(rid)}/`);
  };

  const isCadastrosActive = location.pathname.startsWith("/cadastros");
  const cadastroSections = getVisibleCadastroSections(user?.role);

  useEffect(() => {
    if (isCadastrosActive) setCadastrosExpanded(true);
  }, [isCadastrosActive]);

  const isPessoalActive = location.pathname.startsWith("/pessoal")
    || location.pathname.includes("/requirement/6/pr-6-2");
  const personnelNavItems = getVisiblePersonnelNavItems(user?.role);

  useEffect(() => {
    if (isPessoalActive) setPessoalExpanded(true);
  }, [isPessoalActive]);

  const renderNav = (onNavigate) => (
    <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto overscroll-contain">
      {!technicianNav && (
        <NavLink to="/dashboard" className={navLinkClass} data-testid="nav-dashboard" onClick={onNavigate}>
          <House size={18} weight="duotone" /> Dashboard
        </NavLink>
      )}

      {!technicianNav && (
        <Collapsible open={cadastrosExpanded} onOpenChange={setCadastrosExpanded}>
          <CollapsibleTrigger
            className={`flex w-full items-center gap-3 px-3 py-2.5 rounded-md text-sm text-left transition-all ${
              isCadastrosActive ? "text-white bg-slate-800/80" : "text-slate-300 hover:bg-slate-800 hover:text-white"
            }`}
            data-testid="nav-cadastros"
          >
            <ClipboardText size={18} weight="duotone" className="shrink-0" />
            <span className="flex-1 min-w-0">Cadastros</span>
            <CaretRight size={14} className="shrink-0 opacity-70" />
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-0.5 pt-0.5 pb-1">
            {cadastroSections.map((s) => (
              <NavLink
                key={s.id}
                to={cadastroSectionPath(s.id)}
                className={subNavLinkClass}
                title={s.label}
                data-testid={`nav-cadastros-${s.id}`}
                onClick={onNavigate}
              >
                <span className="truncate">{s.label}</span>
              </NavLink>
            ))}
          </CollapsibleContent>
        </Collapsible>
      )}

      {!technicianNav && canAccessPersonnel(user?.role) && personnelNavItems.length > 0 && (
        <Collapsible open={pessoalExpanded} onOpenChange={setPessoalExpanded}>
          <CollapsibleTrigger
            className={`flex w-full items-center gap-3 px-3 py-2.5 rounded-md text-sm text-left transition-all ${
              isPessoalActive ? "text-white bg-slate-800/80" : "text-slate-300 hover:bg-slate-800 hover:text-white"
            }`}
            data-testid="nav-pessoal"
          >
            <UsersThree size={18} weight="duotone" className="shrink-0" />
            <span className="flex-1 min-w-0">6.2 Pessoal</span>
            <CaretRight size={14} className="shrink-0 opacity-70" />
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-0.5 pt-0.5 pb-1">
            {personnelNavItems.map((item) => (
              <NavLink
                key={item.id}
                to={item.to}
                className={({ isActive }) => subNavLinkClass({
                  isActive: isActive || isPersonnelNavActive(location.pathname + location.search, item),
                })}
                title={item.label}
                data-testid={`nav-pessoal-${item.id}`}
                onClick={onNavigate}
              >
                <span className="truncate">{item.label}</span>
              </NavLink>
            ))}
          </CollapsibleContent>
        </Collapsible>
      )}

      {!technicianNav && (
        <>
          <div className="pt-4 pb-1 px-3 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
            Requisitos
          </div>
          {REQ_MENU_ITEMS.map((r) => {
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
                  <span className="flex-1 min-w-0">
                    <span className="font-mono text-xs text-slate-400 mr-1.5">{r.id}.</span>
                    <span className="break-words">Requisitos de {r.name}</span>
                  </span>
                </NavLink>
              );
            }
            const folders = getFoldersForRequirement(r.id);
            return (
              <Collapsible key={r.id} defaultOpen={isReqGroupActive(r.id)}>
                <CollapsibleTrigger
                  className={`flex w-full items-center gap-3 px-3 py-2.5 rounded-md text-sm text-left transition-all ${
                    isReqGroupActive(r.id) ? "text-white bg-slate-800/80" : "text-slate-300 hover:bg-slate-800 hover:text-white"
                  }`}
                  data-testid={`nav-req-group-${r.id}`}
                >
                  <Icon size={18} weight="duotone" className="shrink-0" />
                  <span className="flex-1 min-w-0">
                    <span className="font-mono text-xs text-slate-400 mr-1.5">{r.id}.</span>
                    <span className="break-words">Requisitos de {r.name}</span>
                  </span>
                  <CaretRight size={14} className="shrink-0 opacity-70" />
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-0.5 pt-0.5 pb-1">
                  {folders.map((f) => {
                    const children = getFolderNavChildren(f, {
                      canColeta: canAccessColeta(user?.role),
                    });
                    return (
                      <div key={f.folderKey} className="space-y-0.5">
                        <NavLink
                          to={`/requirement/${r.id}/${f.folderKey}`}
                          end={children.length > 0}
                          className={subNavLinkClass}
                          title={f.label}
                          data-testid={`nav-req-${r.id}-${f.folderKey}`}
                          onClick={onNavigate}
                        >
                          <span className="truncate">{f.label}</span>
                        </NavLink>
                        {children.map((c) => (
                          <NavLink
                            key={c.key}
                            to={c.to}
                            className={subNavNestedLinkClass}
                            title={c.label}
                            data-testid={`nav-req-${r.id}-${f.folderKey}-${c.key}`}
                            onClick={onNavigate}
                          >
                            <span className="truncate">{c.label}</span>
                          </NavLink>
                        ))}
                      </div>
                    );
                  })}
                </CollapsibleContent>
              </Collapsible>
            );
          })}

          {isAdmin && (
            <>
              <div className="pt-4 pb-1 px-3 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
                Administração CTLI
              </div>
              <NavLink to="/admin/clients" className={navLinkClass} data-testid="nav-admin-clients" onClick={onNavigate}>
                <Buildings size={18} weight="duotone" /> Ambientes (clientes)
              </NavLink>
            </>
          )}

          <div className="pt-4 pb-1 px-3 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
            Sistema
          </div>
          <NavLink to="/backup" className={navLinkClass} data-testid="nav-backup" onClick={onNavigate}>
            <Database size={18} weight="duotone" /> Backup
          </NavLink>
        </>
      )}
    </nav>
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
          <Outlet
            context={{
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
  );
};

export default Layout;
