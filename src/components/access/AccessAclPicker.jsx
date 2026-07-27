import React, { useMemo } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import {
  getAccessAclCatalog,
  normalizeAccessAcl,
  emptyAccessAcl,
  isAclActive,
} from "@/lib/accessAcl";

/**
 * Seleção granular de módulos e sub-procedimentos (PR) para uma conta.
 * value: access_acl JSON (version 1) ou {} legado.
 */
export default function AccessAclPicker({
  value,
  onChange,
  disabled = false,
  className = "",
}) {
  const catalog = useMemo(() => getAccessAclCatalog(), []);
  const acl = useMemo(() => {
    if (isAclActive(value)) return normalizeAccessAcl(value);
    return emptyAccessAcl();
  }, [value]);

  const emit = (next) => {
    onChange?.(normalizeAccessAcl(next));
  };

  const modulesSet = useMemo(() => new Set(acl.modules || []), [acl.modules]);

  const toggleModule = (id, checked) => {
    const next = new Set(modulesSet);
    if (checked) next.add(id);
    else next.delete(id);
    emit({ ...acl, modules: [...next] });
  };

  const folderKeys = (reqId) => acl.folders?.[String(reqId)] || [];

  const toggleFolder = (reqId, folderKey, checked) => {
    const rid = String(reqId);
    const current = new Set(folderKeys(rid));
    if (checked) current.add(folderKey);
    else current.delete(folderKey);
    const folders = { ...(acl.folders || {}) };
    if (current.size) folders[rid] = [...current];
    else delete folders[rid];
    emit({ ...acl, folders });
  };

  const setAllFolders = (reqId, keys, checked) => {
    const rid = String(reqId);
    const folders = { ...(acl.folders || {}) };
    if (checked) folders[rid] = [...keys];
    else delete folders[rid];
    emit({ ...acl, folders });
  };

  const reqState = (req) => {
    const keys = (req.folders || []).map((f) => f.folderKey);
    const selected = folderKeys(req.id);
    const n = selected.length;
    if (!keys.length) return { checked: false, indeterminate: false };
    if (n === 0) return { checked: false, indeterminate: false };
    if (n >= keys.length) return { checked: true, indeterminate: false };
    return { checked: false, indeterminate: true };
  };

  const selectAll = () => {
    const folders = {};
    catalog.requirements.forEach((req) => {
      const keys = (req.folders || []).map((f) => f.folderKey);
      if (keys.length) folders[req.id] = keys;
    });
    emit({
      modules: catalog.modules.map((m) => m.id),
      folders,
    });
  };

  const clearAll = () => emit(emptyAccessAcl());

  return (
    <div className={`space-y-3 min-w-0 ${className}`} data-testid="access-acl-picker">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium text-slate-800">Liberações de acesso</p>
        <div className="flex gap-2">
          <Button type="button" variant="outline" size="sm" disabled={disabled} onClick={selectAll}>
            Tudo
          </Button>
          <Button type="button" variant="ghost" size="sm" disabled={disabled} onClick={clearAll}>
            Limpar
          </Button>
        </div>
      </div>
      <p className="text-xs text-slate-500">
        Marque apenas os módulos e sub-procedimentos (ex.: PR-7.1, PR-6.2) que esta conta pode usar.
        A seleção gravada prevalece sobre o padrão do nível; alterações manuais não são apagadas ao
        mudar o nível (use “Padrão do nível” para repor).
      </p>

      <div className="max-h-[min(24rem,50vh)] overflow-y-auto overscroll-contain rounded-lg border border-slate-200 bg-white divide-y divide-slate-100">
        <div className="p-3 space-y-2">
          <p className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">Módulos operacionais</p>
          <ul className="space-y-2">
            {catalog.modules.map((m) => (
              <li key={m.id} className="flex items-start gap-2 min-w-0">
                <Checkbox
                  id={`acl-mod-${m.id}`}
                  checked={modulesSet.has(m.id)}
                  disabled={disabled}
                  onCheckedChange={(v) => toggleModule(m.id, v === true)}
                />
                <label htmlFor={`acl-mod-${m.id}`} className="text-sm text-slate-700 leading-snug cursor-pointer min-w-0">
                  {m.label}
                </label>
              </li>
            ))}
          </ul>
        </div>

        {catalog.requirements.map((req) => {
          const st = reqState(req);
          const keys = (req.folders || []).map((f) => f.folderKey);
          return (
            <div key={req.id} className="p-3 space-y-2">
              <div className="flex items-start gap-2 min-w-0">
                <Checkbox
                  id={`acl-req-${req.id}`}
                  checked={st.checked}
                  disabled={disabled || !keys.length}
                  onCheckedChange={(v) => setAllFolders(req.id, keys, v === true)}
                  {...(st.indeterminate ? { "data-state": "indeterminate" } : {})}
                  ref={(el) => {
                    if (el) el.indeterminate = st.indeterminate;
                  }}
                />
                <label htmlFor={`acl-req-${req.id}`} className="text-sm font-medium text-slate-800 cursor-pointer min-w-0">
                  {req.id}. {req.label}
                </label>
              </div>
              <ul className="pl-6 space-y-1.5">
                {(req.folders || []).map((f) => (
                  <li key={f.folderKey} className="flex items-start gap-2 min-w-0">
                    <Checkbox
                      id={`acl-folder-${req.id}-${f.folderKey}`}
                      checked={folderKeys(req.id).includes(f.folderKey)}
                      disabled={disabled}
                      onCheckedChange={(v) => toggleFolder(req.id, f.folderKey, v === true)}
                    />
                    <label
                      htmlFor={`acl-folder-${req.id}-${f.folderKey}`}
                      className="text-sm text-slate-600 leading-snug cursor-pointer min-w-0 break-words"
                    >
                      {f.label}
                    </label>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  );
}
