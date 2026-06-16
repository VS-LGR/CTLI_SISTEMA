import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Plus, PencilSimple, Trash } from "@phosphor-icons/react";
import { toast } from "sonner";
import {
  saveDocumentDistribution,
  deleteDocumentDistribution,
} from "@/lib/masterDocuments/masterDocumentsApi";
import { COPY_TYPES, copyTypeLabel } from "@/lib/masterDocuments/masterDocumentConstants";
import { formatDateBr } from "@/lib/quotationRequestDisplay";

const EMPTY = {
  area: "",
  copy_number: "",
  copy_type: "copia_eletronica",
  distribution_method: "Eletrônico",
  distribution_date: "",
  status: "ativa",
};

export default function DocumentDistributionEditor({ tenantId, masterDocumentId, distributions, onRefresh }) {
  const [showForm, setShowForm] = useState(false);
  const [editRow, setEditRow] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [busy, setBusy] = useState(false);

  const openNew = () => {
    setEditRow(null);
    setForm({ ...EMPTY, distribution_date: new Date().toISOString().slice(0, 10) });
    setShowForm(true);
  };

  const openEdit = (row) => {
    setEditRow(row);
    setForm({
      area: row.area || "",
      copy_number: row.copy_number ?? "",
      copy_type: row.copy_type || "copia_eletronica",
      distribution_method: row.distribution_method || "",
      distribution_date: row.distribution_date || "",
      status: row.status || "ativa",
    });
    setShowForm(true);
  };

  const save = async () => {
    if (!form.area?.trim()) {
      toast.error("Área obrigatória");
      return;
    }
    setBusy(true);
    try {
      await saveDocumentDistribution(tenantId, {
        ...form,
        id: editRow?.id,
        master_document_id: masterDocumentId,
        copy_number: form.copy_number === "" ? null : Number(form.copy_number),
      });
      toast.success(editRow ? "Distribuição atualizada" : "Distribuição adicionada");
      setShowForm(false);
      onRefresh?.();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id) => {
    if (!window.confirm("Excluir distribuição?")) return;
    try {
      await deleteDocumentDistribution(tenantId, id);
      toast.success("Excluído");
      onRefresh?.();
    } catch (e) {
      toast.error(e.message);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button size="sm" onClick={openNew}><Plus size={14} className="mr-1" /> Adicionar</Button>
      </div>
      {showForm && (
        <div className="border rounded-lg p-4 space-y-3 bg-slate-50">
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Área / usuário</Label><Input value={form.area} onChange={(e) => setForm((f) => ({ ...f, area: e.target.value }))} /></div>
            <div><Label>Cópia nº</Label><Input type="number" value={form.copy_number} onChange={(e) => setForm((f) => ({ ...f, copy_number: e.target.value }))} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Tipo</Label>
              <Select value={form.copy_type} onValueChange={(v) => setForm((f) => ({ ...f, copy_type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {COPY_TYPES.map((t) => <SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div><Label>Data</Label><Input type="date" value={form.distribution_date || ""} onChange={(e) => setForm((f) => ({ ...f, distribution_date: e.target.value }))} /></div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={save} disabled={busy}>Guardar</Button>
            <Button size="sm" variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
          </div>
        </div>
      )}
      <table className="w-full text-sm border rounded-lg overflow-hidden">
        <thead className="bg-slate-50 border-b">
          <tr className="text-[10px] uppercase text-slate-500">
            <th className="px-3 py-2 text-left">Área</th>
            <th className="px-3 py-2 text-left">Cópia</th>
            <th className="px-3 py-2 text-left">Tipo</th>
            <th className="px-3 py-2 text-left">Data</th>
            <th className="px-3 py-2 text-right">Ações</th>
          </tr>
        </thead>
        <tbody className="divide-y bg-white">
          {distributions.length === 0 && (
            <tr><td colSpan={5} className="px-3 py-4 text-center text-slate-500 text-xs">Nenhuma distribuição.</td></tr>
          )}
          {distributions.map((d) => (
            <tr key={d.id}>
              <td className="px-3 py-2">{d.area}</td>
              <td className="px-3 py-2">{d.copy_number ?? "—"}</td>
              <td className="px-3 py-2 text-xs">{copyTypeLabel(d.copy_type)}</td>
              <td className="px-3 py-2 text-xs">{formatDateBr(d.distribution_date)}</td>
              <td className="px-3 py-2 text-right">
                <Button variant="ghost" size="sm" onClick={() => openEdit(d)}><PencilSimple size={16} /></Button>
                <Button variant="ghost" size="sm" className="text-red-600" onClick={() => remove(d.id)}><Trash size={16} /></Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
