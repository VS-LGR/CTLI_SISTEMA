import React, { useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, PencilSimple, Trash } from "@phosphor-icons/react";
import CadastroListFilterBar from "@/components/cadastros/CadastroListFilterBar";
import { filterCadastroByQuery } from "@/lib/cadastroListUtils";
import EllipsisTooltip from "@/components/ui/ellipsis-tooltip";

const emptyForm = () => ({
  identification: "",
  brand: "",
  model: "",
  operating_system: "",
  location: "",
  responsible: "",
  notes: "",
  active: true,
});

export default function ComputerEquipmentSection({ rows = [], tenantId, onRefresh }) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [query, setQuery] = useState("");
  const [form, setForm] = useState(emptyForm());

  const filtered = useMemo(
    () => filterCadastroByQuery(rows, query, (r) => [
      r.identification, r.brand, r.model, r.operating_system, r.location, r.responsible,
    ]),
    [rows, query],
  );

  const reset = () => {
    setEditing(null);
    setForm(emptyForm());
  };

  const openNew = () => {
    reset();
    setOpen(true);
  };

  const openEdit = (r) => {
    setEditing(r);
    setForm({
      identification: r.identification || "",
      brand: r.brand || "",
      model: r.model || "",
      operating_system: r.operating_system || "",
      location: r.location || "",
      responsible: r.responsible || "",
      notes: r.notes || "",
      active: r.active !== false,
    });
    setOpen(true);
  };

  const save = async () => {
    if (!tenantId) return toast.error("Selecione um ambiente válido");
    if (!form.identification.trim()) return toast.error("Informe a identificação / patrimônio");
    const payload = {
      tenant_id: tenantId,
      identification: form.identification.trim(),
      brand: form.brand.trim(),
      model: form.model.trim(),
      operating_system: form.operating_system.trim(),
      location: form.location.trim(),
      responsible: form.responsible.trim(),
      notes: form.notes.trim(),
      active: !!form.active,
    };
    try {
      if (editing?.id) {
        const { error } = await supabase.from("equipment_computers").update(payload).eq("id", editing.id);
        if (error) throw error;
        toast.success("Computador atualizado");
      } else {
        const { error } = await supabase.from("equipment_computers").insert(payload);
        if (error) throw error;
        toast.success("Computador cadastrado");
      }
      setOpen(false);
      reset();
      onRefresh?.();
    } catch (e) {
      toast.error(e.message);
    }
  };

  const remove = async (r) => {
    if (!window.confirm(`Remover computador ${r.identification}?`)) return;
    try {
      const { error } = await supabase.from("equipment_computers").delete().eq("id", r.id);
      if (error) throw error;
      toast.success("Removido");
      onRefresh?.();
    } catch (e) {
      toast.error(e.message);
    }
  };

  const setField = (key) => (e) => setForm((prev) => ({ ...prev, [key]: e.target.value }));

  return (
    <div className="space-y-4" data-testid="computer-equipment-section">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <CadastroListFilterBar
          query={query}
          onQueryChange={setQuery}
          filteredCount={filtered.length}
          totalCount={rows.length}
          onClear={() => setQuery("")}
          testIdPrefix="computer"
        />
        <Button type="button" onClick={openNew}>
          <Plus size={16} className="mr-1" /> Novo computador
        </Button>
      </div>

      <Card className="border-slate-200 overflow-hidden">
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-sm min-w-[760px]">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="p-3">Identificação</th>
                <th className="p-3">Marca</th>
                <th className="p-3">Modelo</th>
                <th className="p-3">SO</th>
                <th className="p-3">Localização</th>
                <th className="p-3">Responsável</th>
                <th className="p-3">Status</th>
                <th className="p-3">Ações</th>
              </tr>
            </thead>
            <tbody>
              {!filtered.length ? (
                <tr><td colSpan={8} className="p-8 text-center text-slate-500">Nenhum computador cadastrado.</td></tr>
              ) : filtered.map((r) => (
                <tr key={r.id} className="border-t border-slate-100">
                  <td className="p-3 font-medium">{r.identification}</td>
                  <td className="p-3">{r.brand || "—"}</td>
                  <td className="p-3 max-w-[120px]">
                    <EllipsisTooltip label={r.model || ""} className="block">{r.model || "—"}</EllipsisTooltip>
                  </td>
                  <td className="p-3">{r.operating_system || "—"}</td>
                  <td className="p-3">{r.location || "—"}</td>
                  <td className="p-3">{r.responsible || "—"}</td>
                  <td className="p-3">
                    <Badge variant="secondary" className={r.active === false ? "bg-slate-200" : "bg-emerald-100 text-emerald-800"}>
                      {r.active === false ? "Inativo" : "Ativo"}
                    </Badge>
                  </td>
                  <td className="p-3 whitespace-nowrap">
                    <Button type="button" variant="ghost" size="sm" onClick={() => openEdit(r)} title="Editar">
                      <PencilSimple size={16} />
                    </Button>
                    <Button type="button" variant="ghost" size="sm" onClick={() => remove(r)} title="Remover">
                      <Trash size={16} />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={(v) => { if (!v) { setOpen(false); reset(); } else setOpen(v); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar computador" : "Novo computador"}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 py-2">
            <div className="sm:col-span-2 space-y-1">
              <Label>Identificação / patrimônio *</Label>
              <Input value={form.identification} onChange={setField("identification")} />
            </div>
            <div className="space-y-1">
              <Label>Marca</Label>
              <Input value={form.brand} onChange={setField("brand")} />
            </div>
            <div className="space-y-1">
              <Label>Modelo</Label>
              <Input value={form.model} onChange={setField("model")} />
            </div>
            <div className="space-y-1">
              <Label>Sistema operacional</Label>
              <Input value={form.operating_system} onChange={setField("operating_system")} />
            </div>
            <div className="space-y-1">
              <Label>Localização</Label>
              <Input value={form.location} onChange={setField("location")} />
            </div>
            <div className="sm:col-span-2 space-y-1">
              <Label>Responsável</Label>
              <Input value={form.responsible} onChange={setField("responsible")} />
            </div>
            <div className="sm:col-span-2 space-y-1">
              <Label>Notas</Label>
              <Input value={form.notes} onChange={setField("notes")} />
            </div>
            <label className="sm:col-span-2 inline-flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={!!form.active}
                onChange={(e) => setForm((prev) => ({ ...prev, active: e.target.checked }))}
              />
              Ativo
            </label>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => { setOpen(false); reset(); }}>Cancelar</Button>
            <Button type="button" onClick={save}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
