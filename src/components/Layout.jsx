import React, { useCallback, useEffect, useState } from "react";
import { NavLink, Outlet, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import api, { isSupabaseAuthMode } from "@/lib/api";
import { supabase } from "@/lib/supabaseClient";
import {
  House, SignOut, CaretDown, ShieldCheck,
  ListChecks, Briefcase, Toolbox, GearSix, Database,
  Buildings, CaretRight, ClipboardText,
} from "@phosphor-icons/react";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { roleShort } from "@/lib/roles";
import {
  REQ_MENU_ITEMS,
  getFoldersForRequirement,
  requiresFolderNav,
} from "@/lib/requirementNavConfig";

const REQ_ICONS = {
  "4": ListChecks,
  "5": Buildings,
  "6": Toolbox,
  "7": Briefcase,
  "8": GearSix,
};

const Layout = () => {
  const { user, logout, currentTenantId, selectTenant } = useAuth();
  const [tenants, setTenants] = useState([]);
  const navigate = useNavigate();
  const location = useLocation();

  const loadTenants = useCallback(async () => {
    try {
      let data;
      if (isSupabaseAuthMode) {
        const { data: rows, error } = await supabase.from("tenants").select("*").order("name");
        if (error) throw error;
        data = rows || [];
      } else {
        const { data: d } = await api.get("/tenants");
        data = d;
      }
      setTenants(data);
      if (!currentTenantId && data.length > 0) selectTenant(data[0].id);
    } catch (e) { /* ignore */ }
  }, [currentTenantId, selectTenant]);

  useEffect(() => {
    if (user) loadTenants();
  }, [user, loadTenants]);

  const currentTenant = tenants.find((t) => t.id === currentTenantId);
  const isAdmin = user?.role === "admin";

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

  const reqGroupPathPrefix = (rid) => `/requirement/${rid}`;
  const isReqGroupActive = (rid) => {
    const p = location.pathname;
    return p === reqGroupPathPrefix(rid) || p.startsWith(`${reqGroupPathPrefix(rid)}/`);
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <aside className="w-64 fixed inset-y-0 left-0 bg-slate-900 text-white border-r border-slate-800 z-40 flex flex-col">
        <div className="px-6 py-5 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-md bg-blue-600 flex items-center justify-center">
              <ShieldCheck size={20} weight="bold" />
            </div>
            <div>
              <div className="font-display font-bold text-lg tracking-tight">ProcVault</div>
              <div className="text-[10px] uppercase tracking-[0.18em] text-slate-400">QMS</div>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          <NavLink to="/dashboard" className={navLinkClass} data-testid="nav-dashboard">
            <House size={18} weight="duotone" /> Dashboard
          </NavLink>

          <NavLink to="/cadastros" className={navLinkClass} data-testid="nav-cadastros">
            <ClipboardText size={18} weight="duotone" /> Cadastros
          </NavLink>

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
                >
                  <Icon size={18} weight="duotone" />
                  <span className="flex-1">
                    <span className="font-mono text-xs text-slate-400 mr-1.5">{r.id}.</span>
                    Requisitos de {r.name}
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
                  <Icon size={18} weight="duotone" />
                  <span className="flex-1 min-w-0">
                    <span className="font-mono text-xs text-slate-400 mr-1.5">{r.id}.</span>
                    Requisitos de {r.name}
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
                    >
                      <span className="truncate">{f.label}</span>
                    </NavLink>
                  ))}
                </CollapsibleContent>
              </Collapsible>
            );
          })}

          {isAdmin && (
            <>
              <div className="pt-4 pb-1 px-3 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
                Administração CTLI
              </div>
              <NavLink to="/admin/clients" className={navLinkClass} data-testid="nav-admin-clients">
                <Buildings size={18} weight="duotone" /> Ambientes (clientes)
              </NavLink>
            </>
          )}

          <div className="pt-4 pb-1 px-3 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
            Sistema
          </div>
          <NavLink to="/backup" className={navLinkClass} data-testid="nav-backup">
            <Database size={18} weight="duotone" /> Backup
          </NavLink>
        </nav>

        <div className="p-3 border-t border-slate-800">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="w-full flex items-center gap-3 px-3 py-2 rounded-md hover:bg-slate-800 transition" data-testid="user-menu-trigger">
                <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-sm font-semibold">
                  {user?.name?.[0]?.toUpperCase() || "U"}
                </div>
                <div className="flex-1 text-left">
                  <div className="text-sm font-medium truncate">{user?.name}</div>
                  <div className="text-[10px] uppercase tracking-wider text-slate-400">{roleShort(user?.role)}</div>
                </div>
                <CaretDown size={14} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>{user?.email}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => { logout(); navigate("/login"); }} data-testid="logout-btn">
                <SignOut size={16} className="mr-2" /> Sair
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>

      <div className="pl-64 min-h-screen">
        <header className="sticky top-0 z-30 h-16 bg-white/80 backdrop-blur-xl border-b border-slate-200 flex items-center px-8">
          <div className="flex-1">
            <div className="text-[10px] uppercase tracking-[0.2em] text-slate-500">
              {isAdmin ? "Ambiente atual (pré-visualização)" : "O seu ambiente"}
            </div>
            {isAdmin ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button type="button" className="flex items-center gap-2 text-base font-display font-semibold text-slate-900 hover:text-blue-600 transition" data-testid="tenant-switcher">
                    {currentTenant?.name || (tenants.length === 0 ? "Nenhum ambiente cadastrado" : "Selecionar ambiente")}
                    <CaretDown size={16} />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-72">
                  <DropdownMenuLabel>Trocar de ambiente (cliente)</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {tenants.length === 0 && (
                    <div className="px-3 py-2 text-sm text-slate-500">Nenhum ambiente. Crie um em Administração CTLI → Ambientes.</div>
                  )}
                  {tenants.map((t) => (
                    <DropdownMenuItem
                      key={t.id}
                      onClick={() => selectTenant(t.id)}
                      data-testid={`tenant-option-${t.id}`}
                      className={t.id === currentTenantId ? "bg-blue-50 text-blue-700" : ""}
                    >
                      <div>
                        <div className="font-medium">{t.name}</div>
                        {t.code && <div className="text-xs text-slate-500">{t.code}</div>}
                      </div>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <div className="text-base font-display font-semibold text-slate-900 mt-0.5" data-testid="tenant-switcher">
                {currentTenant?.name || "—"}
              </div>
            )}
          </div>
        </header>

        <main className="p-8 fade-in">
          <Outlet context={{ tenants, currentTenant, currentTenantId, isAdmin, reloadTenants: loadTenants, selectTenant }} />
        </main>
      </div>
    </div>
  );
};

export default Layout;
