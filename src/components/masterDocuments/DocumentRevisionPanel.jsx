import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus } from "@phosphor-icons/react";
import { toast } from "sonner";
import { createDocumentRevision, approveDocumentRevision } from "@/lib/masterDocuments/masterDocumentsApi";
import { revisionStatusLabel } from "@/lib/masterDocuments/masterDocumentConstants";
import { formatDateBr } from "@/lib/quotationRequestDisplay";

export default function DocumentRevisionPanel({ tenantId, masterDocumentId, revisions, onRefresh }) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    revision_number: "",
    issue_date: "",
    change_description: "",
    change_reason: "",
  });
  const [busy, setBusy] = useState(false);

  const save = async () => {
    setBusy(true);
    try {
      await createDocumentRevision(tenantId, masterDocumentId, { ...form, status: "rascunho" });
      toast.success("Revisão criada");
      setShowForm(false);
      onRefresh?.();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };

  const approve = async (revId) => {
    try {
      await approveDocumentRevision(revId);
      toast.success("Revisão aprovada");
      onRefresh?.();
    } catch (e) {
      toast.error(e.message);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button size="sm" onClick={() => setShowForm(!showForm)}><Plus size={14} className="mr-1" /> Nova revisão</Button>
      </div>
      {showForm && (
        <div className="border rounded-lg p-4 space-y-3 bg-slate-50">
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Nº revisão</Label><Input value={form.revision_number} onChange={(e) => setForm((f) => ({ ...f, revision_number: e.target.value }))} /></div>
            <div><Label>Emissão</Label><Input type="date" value={form.issue_date} onChange={(e) => setForm((f) => ({ ...f, issue_date: e.target.value }))} /></div>
          </div>
          <div><Label>Descrição da alteração</Label><Textarea value={form.change_description} onChange={(e) => setForm((f) => ({ ...f, change_description: e.target.value }))} /></div>
          <Button onClick={save} disabled={busy}>Guardar rascunho</Button>
        </div>
      )}
      <table className="w-full text-sm border rounded-lg overflow-hidden">
        <thead className="bg-slate-50 border-b">
          <tr className="text-[10px] uppercase text-slate-500">
            <th className="px-3 py-2 text-left">Rev.</th>
            <th className="px-3 py-2 text-left">Emissão</th>
            <th className="px-3 py-2 text-left">Descrição</th>
            <th className="px-3 py-2 text-left">Status</th>
            <th className="px-3 py-2 text-right">Ações</th>
          </tr>
        </thead>
        <tbody className="divide-y bg-white">
          {revisions.map((r) => (
            <tr key={r.id}>
              <td className="px-3 py-2">{r.revision_number}</td>
              <td className="px-3 py-2 text-xs">{formatDateBr(r.issue_date)}</td>
              <td className="px-3 py-2 text-xs max-w-[200px] truncate">{r.change_description}</td>
              <td className="px-3 py-2 text-xs">{revisionStatusLabel(r.status)}</td>
              <td className="px-3 py-2 text-right">
                {r.status === "rascunho" && (
                  <Button size="sm" variant="outline" onClick={() => approve(r.id)}>Aprovar</Button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
