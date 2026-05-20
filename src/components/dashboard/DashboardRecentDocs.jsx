import React from "react";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { FileText } from "@phosphor-icons/react";

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
    if (days < 7) return `há ${days} dia(s)`;
    return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit" });
  } catch {
    return "—";
  }
}

/**
 * @param {{ documents: Array<Record<string, unknown>> }} props
 */
export default function DashboardRecentDocs({ documents = [] }) {
  if (!documents.length) {
    return (
      <div className="py-8 text-center text-sm text-slate-500 flex flex-col items-center gap-2">
        <FileText size={28} className="text-slate-300" />
        Nenhum documento criado ou atualizado recentemente.
      </div>
    );
  }

  return (
    <ul className="divide-y divide-slate-100" data-testid="dashboard-recent-docs">
      {documents.map((r) => (
        <li key={r.id} className="py-3 flex items-start justify-between gap-3 min-w-0">
          <div className="min-w-0 flex-1">
            <Link
              to={`/document/${r.id}`}
              className="font-medium text-sm text-slate-800 hover:text-blue-600 truncate block"
              data-testid={`recent-doc-${r.id}`}
            >
              {r.title}
            </Link>
            <div className="text-xs text-slate-500 mt-0.5 truncate">
              Req. {r.requirement} • {r.section}
              {r.version ? ` • Rev. ${r.version}` : ""}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">
              {formatRelative(r.updated_at || r.created_at)}
            </div>
          </div>
          <Badge
            variant="outline"
            className={
              r.status === "vigente"
                ? "bg-emerald-50 text-emerald-700 border-emerald-100 text-[10px] shrink-0"
                : "text-[10px] shrink-0"
            }
          >
            {r.status}
          </Badge>
        </li>
      ))}
    </ul>
  );
}
