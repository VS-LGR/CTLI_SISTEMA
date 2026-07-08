import React from "react";
import { Link, useLocation } from "react-router-dom";
import { ArrowSquareOut } from "@phosphor-icons/react";
import { getFolderNavChildren } from "@/lib/requirementNavConfig";
import {
  canAccessColeta,
  canAccessCalibrationCertificates,
  canAccessCommercialProposals,
  canEditPersonnelStandardOptions,
  canAccessMasterDocuments,
  canManageTechnicians,
  isCtliAdmin,
} from "@/lib/roles";

function isModuleLinkActive(location, to) {
  const [path] = to.split("?");
  if (location.pathname === path) return true;
  if (path !== "/" && location.pathname.startsWith(`${path}/`)) return true;
  if (to.includes("?")) {
    const expected = new URLSearchParams(to.split("?")[1] || "");
    const current = new URLSearchParams(location.search);
    for (const [key, value] of expected.entries()) {
      if (current.get(key) !== value) return false;
    }
    return location.pathname === path;
  }
  return false;
}

function ShortcutGrid({ items, folder, location }) {
  if (!items.length) return null;
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
      {items.map((item) => {
        const active = isModuleLinkActive(location, item.to);
        return (
          <Link
            key={item.key}
            to={item.to}
            className={`flex items-center justify-between gap-2 rounded-lg border px-3 py-2.5 text-sm transition-colors ${
              active
                ? "border-blue-200 bg-blue-50 text-blue-900 font-medium"
                : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
            }`}
            data-testid={`req-shortcut-${folder.folderKey}-${item.key}`}
          >
            <span className="min-w-0 leading-snug">{item.label}</span>
            <ArrowSquareOut size={16} className="shrink-0 opacity-60" />
          </Link>
        );
      })}
    </div>
  );
}

export default function RequirementFolderShortcuts({ requirementId, folder, role, tenant, user }) {
  const location = useLocation();
  const filterOpts = {
    canColeta: canAccessColeta(role),
    canCalibrationCertificates: canAccessCalibrationCertificates(role),
    canPersonnelStandardOptions: canEditPersonnelStandardOptions(role),
    canMasterDocuments: canAccessMasterDocuments(role),
    canCommercialProposals: canAccessCommercialProposals(role),
    canCtliAdmin: isCtliAdmin(role),
    canTechnicians: canManageTechnicians(role),
    tenant,
    role,
    user,
  };
  const items = getFolderNavChildren(folder, filterOpts);
  const modules = items.filter((i) => i.kind !== "cadastro");
  const cadastros = items.filter((i) => i.kind === "cadastro");

  if (!modules.length && !cadastros.length) return null;

  return (
    <div className="space-y-4" data-testid={`req-folder-shortcuts-${folder?.folderKey}`}>
      {modules.length > 0 && (
        <div className="space-y-2">
          <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
            Módulos e registros
          </div>
          <ShortcutGrid items={modules} folder={folder} location={location} />
        </div>
      )}
      {cadastros.length > 0 && (
        <div className="space-y-2">
          <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
            Cadastros
          </div>
          <ShortcutGrid items={cadastros} folder={folder} location={location} />
        </div>
      )}
    </div>
  );
}
