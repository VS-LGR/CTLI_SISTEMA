import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Plus } from "@phosphor-icons/react";
import { toast } from "sonner";
import {
  createDocumentRevision,
  approveDocumentRevision,
  revisionResponsibleName,
} from "@/lib/masterDocuments/masterDocumentsApi";
import { revisionStatusLabel } from "@/lib/masterDocuments/masterDocumentConstants";
import { validateRevisionBeforeApproval } from "@/lib/masterDocuments/masterDocumentValidation";
import { formatDateBr } from "@/lib/quotationRequestDisplay";
import { loadTenantResponsibles } from "@/lib/tenantResponsiblesApi";

export default function DocumentRevisionPanel({ tenantId, masterDocumentId, revisions, onRefresh }) {
  const [showForm, setShowForm] = useState(false);
  const [responsibles, setResponsibles] = useState([]);
  const [form, setForm] = useState({
    revision_number: "",
    issue_date: "",
    revision_date: "",
    change_description: "",
    change_reason: "",
    changed_by_id: "",
  });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (tenantId) {
      loadTenantResponsibles(tenantId).then(setResponsibles).catch(() => setResponsibles([]));
    }
  }, [tenantId]);

  const save = async () => {
    if (!form.revision_number?.trim() || !form.change_description?.trim()) {
      toast.error("Revisão e descrição obrigatórias");
      return;
    }
    setBusy(true);
    try {
      await createDocumentRevision(tenantId, masterDocumentId, {
        ...form,
        revision_date: form.revision_date || form.issue_date,
        changed_by_id: form.changed_by_id || null,
        status: "rascunho",
      });
      toast.success("Revisão criada");
      setShowForm(false);
      setForm({
        revision_number: "",
        issue_date: "",
        revision_date: "",
        change_description: "",
        change_reason: "",
        changed_by_id: "",
      });
      onRefresh?.();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };

  const approve = async (rev) => {
    const v = validateRevisionBeforeApproval({
      ...rev,
      approved_by_id: rev.approved_by_id || rev.changed_by_id,
    });
    if (!v.valid) {
      toast.error(v.errors.join("; "));
      return;
    }
    try {
      await approveDocumentRevision(rev.id, rev.approved_by_id || rev.changed_by_id);
      toast.success("Revisão aprovada");
      onRefresh?.();
    } catch (e) {
      toast.error(e.message);
    }
  };

  const revisionDate = (r) => r.revision_date || r.issue_date;

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
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Data da alteração</Label><Input type="date" value={form.revision_date} onChange={(e) => setForm((f) => ({ ...f, revision_date: e.target.value }))} /></div>
            <div>
              <Label>Responsável</Label>
              <Select value={form.changed_by_id || "__none"} onValueChange={(v) => setForm((f) => ({ ...f, changed_by_id: v === "__none" ? "" : v }))}>
                <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none">—</SelectItem>
                  {responsibles.map((r) => (
                    <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div><Label>Descrição da alteração</Label><Textarea value={form.change_description} onChange={(e) => setForm((f) => ({ ...f, change_description: e.target.value }))} /></div>
          <Button onClick={save} disabled={busy}>Guardar rascunho</Button>
        </div>
      )}
      <table className="w-full text-sm border rounded-lg overflow-hidden">
        <thead className="bg-slate-50 border-b">
          <tr className="text-[10px] uppercase text-slate-500">
            <th className="px-3 py-2 text-left">Rev.</th>
            <th className="px-3 py-2 text-left">Data</th>
            <th className="px-3 py-2 text-left">Descrição</th>
            <th className="px-3 py-2 text-left">Responsável</th>
            <th className="px-3 py-2 text-left">Status</th>
            <th className="px-3 py-2 text-right">Ações</th>
          </tr>
        </thead>
        <tbody className="divide-y bg-white">
          {revisions.map((r) => (
            <tr key={r.id}>
              <td className="px-3 py-2">{r.revision_number}</td>
              <td className="px-3 py-2 text-xs">{formatDateBr(revisionDate(r))}</td>
              <td className="px-3 py-2 text-xs max-w-[240px]">{r.change_description}</td>
              <td className="px-3 py-2 text-xs">{revisionResponsibleName(r)}</td>
              <td className="px-3 py-2 text-xs">{revisionStatusLabel(r.status)}</td>
              <td className="px-3 py-2 text-right">
                {r.status === "rascunho" && (
                  <Button size="sm" variant="outline" onClick={() => approve(r)}>Aprovar</Button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
