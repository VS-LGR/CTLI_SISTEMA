import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { NotePencil, Trash } from "@phosphor-icons/react";
import { toast } from "sonner";
import { addDashboardReminder, deleteDashboardReminder } from "@/lib/dashboardApi";
import { formatApiError } from "@/lib/api";

function formatWhen(iso) {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

/**
 * @param {{ tenantId: string, reminders: Array<Record<string, unknown>>, userId: string, isAdmin: boolean, onChange: () => void }} props
 */
export default function DashboardReminders({
  tenantId,
  reminders = [],
  userId,
  isAdmin,
  onChange,
}) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);

  const add = async () => {
    if (!text.trim()) return toast.error("Escreva o lembrete");
    setBusy(true);
    try {
      await addDashboardReminder(tenantId, text.trim());
      setText("");
      toast.success("Lembrete adicionado");
      onChange?.();
    } catch (e) {
      const detail = e?.response?.data?.detail ?? e?.message;
      toast.error(formatApiError(detail) || "Falha ao guardar");
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id, createdById) => {
    if (!isAdmin && createdById !== userId) {
      toast.error("Só pode excluir os seus lembretes");
      return;
    }
    if (!window.confirm("Excluir este lembrete?")) return;
    try {
      await deleteDashboardReminder(tenantId, id);
      toast.success("Removido");
      onChange?.();
    } catch (e) {
      const detail = e?.response?.data?.detail ?? e?.message;
      toast.error(formatApiError(detail) || "Falha ao excluir");
    }
  };

  return (
    <div className="space-y-4" data-testid="dashboard-reminders">
      <div className="space-y-2">
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Novo lembrete para este ambiente…"
          rows={3}
          className="text-sm resize-y min-h-[4.5rem]"
          data-testid="dashboard-reminder-input"
        />
        <Button
          size="sm"
          className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white"
          onClick={add}
          disabled={busy}
          data-testid="dashboard-reminder-add"
        >
          <NotePencil size={16} className="mr-1" />
          {busy ? "A guardar…" : "Adicionar lembrete"}
        </Button>
      </div>
      {reminders.length === 0 ? (
        <p className="text-sm text-slate-500">Nenhum lembrete ainda.</p>
      ) : (
        <ul className="divide-y divide-slate-100 max-h-[280px] overflow-y-auto">
          {reminders.map((r) => (
            <li key={r.id} className="py-3 flex gap-2 min-w-0">
              <div className="min-w-0 flex-1">
                <p className="text-sm text-slate-800 whitespace-pre-wrap break-words">{r.text}</p>
                <p className="text-[10px] text-slate-500 mt-1">
                  {r.created_by_name} • {formatWhen(r.created_at)}
                </p>
              </div>
              {(isAdmin || r.created_by_id === userId) && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="shrink-0 text-red-600 hover:text-red-700 h-8 w-8 p-0"
                  onClick={() => remove(r.id, r.created_by_id)}
                  title="Excluir lembrete"
                  data-testid={`reminder-del-${r.id}`}
                >
                  <Trash size={16} />
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
