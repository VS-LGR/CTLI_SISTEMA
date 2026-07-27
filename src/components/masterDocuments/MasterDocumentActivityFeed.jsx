import React, { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  PlusCircle,
  PencilSimple,
  ArrowsLeftRight,
  Prohibit,
  FileText,
  SealCheck,
  UsersThree,
  MagnifyingGlass,
  Trash,
  ClockCounterClockwise,
} from "@phosphor-icons/react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  listMasterDocumentChangeLogs,
  MASTER_DOCUMENT_CHANGE_ACTION_LABELS,
} from "@/lib/masterDocuments/masterDocumentChangeLog";
import { masterDocumentDetailPath, masterDocumentListPath } from "@/lib/masterDocuments/masterDocumentRoutes";

const ACTION_STYLE = {
  create: {
    label: MASTER_DOCUMENT_CHANGE_ACTION_LABELS.create,
    Icon: PlusCircle,
    className: "bg-emerald-50 text-emerald-800 border-emerald-200",
    dot: "bg-emerald-500",
  },
  update: {
    label: MASTER_DOCUMENT_CHANGE_ACTION_LABELS.update,
    Icon: PencilSimple,
    className: "bg-sky-50 text-sky-800 border-sky-200",
    dot: "bg-sky-500",
  },
  remap: {
    label: MASTER_DOCUMENT_CHANGE_ACTION_LABELS.remap,
    Icon: ArrowsLeftRight,
    className: "bg-violet-50 text-violet-800 border-violet-200",
    dot: "bg-violet-500",
  },
  obsolete: {
    label: MASTER_DOCUMENT_CHANGE_ACTION_LABELS.obsolete,
    Icon: Prohibit,
    className: "bg-amber-50 text-amber-900 border-amber-200",
    dot: "bg-amber-500",
  },
  revision: {
    label: MASTER_DOCUMENT_CHANGE_ACTION_LABELS.revision,
    Icon: FileText,
    className: "bg-slate-100 text-slate-800 border-slate-200",
    dot: "bg-slate-500",
  },
  approve_revision: {
    label: MASTER_DOCUMENT_CHANGE_ACTION_LABELS.approve_revision,
    Icon: SealCheck,
    className: "bg-teal-50 text-teal-800 border-teal-200",
    dot: "bg-teal-500",
  },
  distribution: {
    label: MASTER_DOCUMENT_CHANGE_ACTION_LABELS.distribution,
    Icon: UsersThree,
    className: "bg-indigo-50 text-indigo-800 border-indigo-200",
    dot: "bg-indigo-500",
  },
  critical_analysis: {
    label: MASTER_DOCUMENT_CHANGE_ACTION_LABELS.critical_analysis,
    Icon: MagnifyingGlass,
    className: "bg-orange-50 text-orange-900 border-orange-200",
    dot: "bg-orange-500",
  },
  delete: {
    label: MASTER_DOCUMENT_CHANGE_ACTION_LABELS.delete,
    Icon: Trash,
    className: "bg-red-50 text-red-800 border-red-200",
    dot: "bg-red-500",
  },
};

function formatRelative(iso) {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    const diff = Date.now() - d.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "agora";
    if (mins < 60) return `há ${mins} min`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `há ${hrs} h`;
    const days = Math.floor(hrs / 24);
    if (days < 7) return `há ${days} d`;
    return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
  } catch {
    return "—";
  }
}

function docLabel(row) {
  const doc = row.master_document;
  if (doc?.code || doc?.title) {
    return [doc.code, doc.title].filter(Boolean).join(" — ");
  }
  if (row.changes?.code?.to) return String(row.changes.code.to);
  if (row.changes?.code?.from) return String(row.changes.code.from);
  return null;
}

function highlightFields(changes) {
  if (!changes || typeof changes !== "object") return [];
  const preferred = ["code", "title", "status", "current_revision", "reference"];
  const keys = Object.keys(changes);
  const ordered = [
    ...preferred.filter((k) => keys.includes(k)),
    ...keys.filter((k) => !preferred.includes(k)),
  ];
  return ordered.slice(0, 3).map((field) => {
    const diff = changes[field];
    return { field, to: diff?.to, from: diff?.from };
  });
}

/**
 * Feed visual compacto das últimas alterações da Lista Mestra.
 */
export default function MasterDocumentActivityFeed({
  tenantId,
  limit = 8,
  compact = false,
  showHeader = true,
  className = "",
}) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!tenantId) return;
    setLoading(true);
    try {
      const data = await listMasterDocumentChangeLogs(tenantId, { limit });
      setRows(data);
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [tenantId, limit]);

  useEffect(() => { load(); }, [load]);

  const body = (
    <div className={className} data-testid="lista-mestra-activity-feed">
      {loading && (
        <p className="text-sm text-slate-500 py-6 text-center">A carregar alterações…</p>
      )}
      {!loading && rows.length === 0 && (
        <div className="py-8 text-center text-sm text-slate-500 flex flex-col items-center gap-2">
          <ClockCounterClockwise size={28} className="text-slate-300" />
          Nenhuma alteração registada ainda na Lista Mestra.
        </div>
      )}
      {!loading && rows.length > 0 && (
        <ul className="relative space-y-0">
          {rows.map((row, idx) => {
            const style = ACTION_STYLE[row.action] || ACTION_STYLE.update;
            const Icon = style.Icon;
            const label = docLabel(row);
            const fields = highlightFields(row.changes);
            const who = row.user_full_name || row.user_email || "Sistema";
            const role = row.user_function || "";
            return (
              <li
                key={row.id}
                className={`relative flex gap-3 ${compact ? "py-2.5" : "py-3"} ${
                  idx < rows.length - 1 ? "border-b border-slate-100" : ""
                }`}
              >
                <div className="flex flex-col items-center pt-1 shrink-0">
                  <span className={`h-2.5 w-2.5 rounded-full ${style.dot}`} aria-hidden />
                  {idx < rows.length - 1 && (
                    <span className="mt-1 w-px flex-1 min-h-[1.25rem] bg-slate-200" aria-hidden />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className={`text-[10px] gap-1 font-medium ${style.className}`}>
                      <Icon size={12} weight="bold" />
                      {style.label}
                    </Badge>
                    <span className="text-[10px] text-slate-400">{formatRelative(row.created_at)}</span>
                  </div>
                  <div className="mt-1 min-w-0">
                    {label && row.master_document_id ? (
                      <Link
                        to={masterDocumentDetailPath(row.master_document_id)}
                        className="text-sm font-medium text-slate-800 hover:text-blue-600 truncate block"
                      >
                        {label}
                      </Link>
                    ) : (
                      <p className="text-sm font-medium text-slate-800 truncate">
                        {label || row.summary || "Alteração na Lista Mestra"}
                      </p>
                    )}
                    {!compact && row.summary && label && (
                      <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{row.summary}</p>
                    )}
                    {fields.length > 0 && (
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        {fields.map((f) => (
                          <span
                            key={f.field}
                            className="inline-flex max-w-full items-center gap-1 rounded-md bg-slate-50 px-1.5 py-0.5 text-[10px] text-slate-600 border border-slate-100"
                            title={`${f.field}: ${f.from ?? "—"} → ${f.to ?? "—"}`}
                          >
                            <span className="font-mono text-slate-500">{f.field}</span>
                            <span className="truncate max-w-[7rem] text-slate-800">{String(f.to ?? "—")}</span>
                          </span>
                        ))}
                      </div>
                    )}
                    <p className="text-[11px] text-slate-500 mt-1 truncate">
                      {who}
                      {role ? ` · ${role}` : ""}
                    </p>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );

  if (!showHeader) return body;

  return (
    <Card className="border-slate-200 min-w-0" data-testid="lista-mestra-activity-card">
      <CardHeader className="pb-2 flex flex-row items-start justify-between gap-3 space-y-0">
        <div>
          <CardTitle className="font-display text-lg flex items-center gap-2">
            <ClockCounterClockwise size={18} /> Últimas alterações
          </CardTitle>
          <p className="text-xs text-slate-500 font-normal mt-1">
            Adições e mudanças recentes na Lista Mestra
          </p>
        </div>
        <Link
          to={masterDocumentListPath("lista_mestra_revisoes")}
          className="text-xs font-medium text-blue-600 hover:underline shrink-0 pt-1"
        >
          Ver tudo
        </Link>
      </CardHeader>
      <CardContent className="min-w-0 pt-0">{body}</CardContent>
    </Card>
  );
}
