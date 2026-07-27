import React, { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Plus, PencilSimple, Trash } from "@phosphor-icons/react";
import { toast } from "sonner";
import {
  listControlledSoftware,
  saveControlledSoftware,
  deleteControlledSoftware,
} from "@/lib/masterDocuments/masterDocumentsApi";
import { formatDateBr } from "@/lib/quotationRequestDisplay";
import { loadTenantResponsibles } from "@/lib/tenantResponsiblesApi";
import { recordMasterDocumentChange } from "@/lib/masterDocuments/masterDocumentChangeLog";

const EMPTY = {
  title: "",
  revision: "00",
  last_validation_date: "",
  validation_location: "",
  validation_responsible_id: "",
  generated_document_code: "",
  related_procedure_code: "",
  status: "ativo",
  notes: "",
};

export default function ControlledSoftwarePanel({ tenantId }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editRow, setEditRow] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [responsibles, setResponsibles] = useState([]);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!tenantId) return;
    setLoading(true);
    try {
      const [soft, resp] = await Promise.all([
        listControlledSoftware(tenantId),
        loadTenantResponsibles(tenantId).catch(() => []),
      ]);
      setRows(soft);
      setResponsibles(resp);
    } catch (e) {
      toast.error(e.message || "Falha ao carregar softwares");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => { load(); }, [load]);

  const openNew = () => {
    setEditRow(null);
    setForm({ ...EMPTY });
    setShowForm(true);
  };

  const openEdit = (row) => {
    setEditRow(row);
    setForm({
      title: row.title || "",
      revision: row.revision || "00",
      last_validation_date: row.last_validation_date || "",
      validation_location: row.validation_location || "",
      validation_responsible_id: row.validation_responsible_id || "",
      generated_document_code: row.generated_document_code || "",
      related_procedure_code: row.related_procedure_code || "",
      status: row.status || "ativo",
      notes: row.notes || "",
    });
    setShowForm(true);
  };

  const save = async () => {
    if (!form.title?.trim()) {
      toast.error("Título obrigatório");
      return;
    }
    setBusy(true);
    try {
      const saved = await saveControlledSoftware(tenantId, {
        ...form,
        id: editRow?.id,
        validation_responsible_id: form.validation_responsible_id || null,
      });
      await recordMasterDocumentChange({
        tenantId,
        masterDocumentId: saved.master_document_id || null,
        action: "update",
        changes: {
          software_title: { from: editRow?.title || null, to: saved.title },
          software_revision: { from: editRow?.revision || null, to: saved.revision },
          validation_location: { from: editRow?.validation_location || null, to: saved.validation_location },
        },
        summary: `${editRow ? "Atualização" : "Criação"} de planilha/software: ${saved.title}`,
      });
      toast.success(editRow ? "Software atualizado" : "Software adicionado");
      setShowForm(false);
      load();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };

  const remove = async (row) => {
    if (!window.confirm(`Excluir "${row.title}"?`)) return;
    try {
      await deleteControlledSoftware(tenantId, row.id);
      await recordMasterDocumentChange({
        tenantId,
        masterDocumentId: row.master_document_id || null,
        action: "delete",
        changes: { software_title: { from: row.title, to: null } },
        summary: `Exclusão de planilha/software: ${row.title}`,
      });
      toast.success("Excluído");
      load();
    } catch (e) {
      toast.error(e.message);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center gap-2 flex-wrap">
        <p className="text-sm text-slate-600">
          Planilhas e softwares controlados pela Lista Mestra (validação periódica).
        </p>
        <Button size="sm" onClick={openNew}><Plus size={14} className="mr-1" /> Novo</Button>
      </div>

      {showForm && (
        <Card className="p-4 space-y-3 bg-slate-50 border-slate-200">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <Label>Título</Label>
              <Input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
            </div>
            <div>
              <Label>Revisão</Label>
              <Input value={form.revision} onChange={(e) => setForm((f) => ({ ...f, revision: e.target.value }))} />
            </div>
            <div>
              <Label>Última validação</Label>
              <Input type="date" value={form.last_validation_date || ""} onChange={(e) => setForm((f) => ({ ...f, last_validation_date: e.target.value }))} />
            </div>
            <div>
              <Label>Local</Label>
              <Input value={form.validation_location} onChange={(e) => setForm((f) => ({ ...f, validation_location: e.target.value }))} placeholder="Laboratório" />
            </div>
            <div>
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm((f) => ({ ...f, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ativo">Ativo</SelectItem>
                  <SelectItem value="obsoleto">Obsoleto</SelectItem>
                  <SelectItem value="em_validacao">Em validação</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Responsável validação</Label>
              <Select
                value={form.validation_responsible_id || "__none"}
                onValueChange={(v) => setForm((f) => ({ ...f, validation_responsible_id: v === "__none" ? "" : v }))}
              >
                <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none">—</SelectItem>
                  {responsibles.map((r) => (
                    <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Código gerado</Label>
              <Input value={form.generated_document_code} onChange={(e) => setForm((f) => ({ ...f, generated_document_code: e.target.value }))} placeholder="RE-7.2B" />
            </div>
            <div>
              <Label>Procedimento relacionado</Label>
              <Input value={form.related_procedure_code} onChange={(e) => setForm((f) => ({ ...f, related_procedure_code: e.target.value }))} placeholder="PR-7.2" />
            </div>
            <div className="col-span-2">
              <Label>Notas</Label>
              <Textarea value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} rows={2} />
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={save} disabled={busy}>Guardar</Button>
            <Button size="sm" variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
          </div>
        </Card>
      )}

      <Card className="border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[800px]">
            <thead className="bg-slate-50 border-b">
              <tr className="text-left text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
                <th className="px-3 py-2">Título</th>
                <th className="px-3 py-2">Rev.</th>
                <th className="px-3 py-2">Última validação</th>
                <th className="px-3 py-2">Local</th>
                <th className="px-3 py-2">Procedimento</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y bg-white">
              {loading && (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-500">Carregando…</td></tr>
              )}
              {!loading && rows.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-500">Nenhuma planilha/software controlado.</td></tr>
              )}
              {rows.map((row) => (
                <tr key={row.id}>
                  <td className="px-3 py-2">{row.title}</td>
                  <td className="px-3 py-2 font-mono text-xs">{row.revision}</td>
                  <td className="px-3 py-2 text-xs">{formatDateBr(row.last_validation_date)}</td>
                  <td className="px-3 py-2 text-xs">{row.validation_location || "—"}</td>
                  <td className="px-3 py-2 font-mono text-xs">{row.related_procedure_code || "—"}</td>
                  <td className="px-3 py-2 text-xs">{row.status}</td>
                  <td className="px-3 py-2 text-right">
                    <Button variant="ghost" size="sm" onClick={() => openEdit(row)}><PencilSimple size={16} /></Button>
                    <Button variant="ghost" size="sm" className="text-red-600" onClick={() => remove(row)}><Trash size={16} /></Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
