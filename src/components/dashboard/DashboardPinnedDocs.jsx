import React from "react";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PushPin, PushPinSlash } from "@phosphor-icons/react";
import { toast } from "sonner";
import { toggleDocumentPin } from "@/lib/dashboardApi";

/**
 * @param {{ documents: Array<Record<string, unknown>>, onChange: () => void }} props
 */
export default function DashboardPinnedDocs({ documents = [], onChange }) {
  const unpin = async (id) => {
    try {
      await toggleDocumentPin(id, false);
      toast.success("Removido da dashboard");
      onChange?.();
    } catch (e) {
      toast.error(e?.response?.data?.detail || e?.message || "Falha");
    }
  };

  if (!documents.length) {
    return (
      <p className="text-sm text-slate-500 py-4">
        Nenhum documento marcado. Use o ícone de pin na listagem ou no editor.
      </p>
    );
  }

  return (
    <ul className="divide-y divide-slate-100" data-testid="dashboard-pinned-docs">
      {documents.map((r) => (
        <li key={r.id} className="py-3 flex items-center justify-between gap-3 min-w-0">
          <div className="min-w-0 flex-1">
            <Link
              to={`/document/${r.id}`}
              className="font-medium text-sm text-slate-800 hover:text-blue-600 truncate block"
            >
              {r.title}
            </Link>
            <div className="text-xs text-slate-500 mt-0.5 truncate">
              Req. {r.requirement} • {r.section}
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <Badge className="bg-amber-50 text-amber-800 border-amber-100 text-[10px] font-normal hidden sm:inline-flex">
              <PushPin size={10} weight="fill" className="mr-0.5" />
              Fixado
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 text-slate-500"
              title="Remover da dashboard"
              onClick={() => unpin(r.id)}
              data-testid={`unpin-${r.id}`}
            >
              <PushPinSlash size={16} />
            </Button>
          </div>
        </li>
      ))}
    </ul>
  );
}
