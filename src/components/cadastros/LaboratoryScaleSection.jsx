import React, { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, PencilSimple, Trash } from "@phosphor-icons/react";
import { toast } from "sonner";
import { fmtDmyShort } from "@/lib/dateFormat";

const EMPTY = {
  identification: "",
  manufacturer: "",
  model: "",
  serial_number: "",
  certificate_number: "",
  calibration_date: "",
  expiry_date: "",
  location: "",
  status: "ativo",
  notes: "",
};

export default function LaboratoryScaleSection({ tenantId }) {
  const [rows, setRows] = useState([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!tenantId) return;
    const { data, error } = await supabase
      .from("laboratory_scales")
      .select("*")
      .eq("tenant_id", tenantId)
      .order("identification");
    if (error) {
      toast.error(error.message);
      return;
    }
    setRows(data || []);
  }, [tenantId]);

  useEffect(() => { load(); }, [load]);

  const setField = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const openNew = () => {
    setEditing(null);
    setForm(EMPTY);
    setOpen(true);
  };

  const openEdit = (row) => {
    setEditing(row);
    setForm({
      identification: row.identification || "",
      manufacturer: row.manufacturer || "",
      model: row.model || "",
      serial_number: row.serial_number || "",
      certificate_number: row.certificate_number || "",
      calibration_date: row.calibration_date || "",
      expiry_date: row.expiry_date || "",
      location: row.location || "",
      status: row.status || "ativo",
      notes: row.notes || "",
    });
    setOpen(true);
  };

  const save = async () => {
    if (!form.identification.trim()) return toast.error("Informe a identificação");
    setBusy(true);
    try {
      const payload = {
        ...form,
        identification: form.identification.trim(),
        calibration_date: form.calibration_date || null,
        expiry_date: form.expiry_date || null,
        tenant_id: tenantId,
      };
      const query = editing
        ? supabase.from("laboratory_scales").update(payload).eq("id", editing.id)
        : supabase.from("laboratory_scales").insert(payload);
      const { error } = await query;
      if (error) throw error;
      toast.success(editing ? "Balança atualizada" : "Balança registada");
      setOpen(false);
      await load();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };

  const remove = async (row) => {
    if (!window.confirm(`Remover a balança ${row.identification}?`)) return;
    const { error } = await supabase.from("laboratory_scales").delete().eq("id", row.id);
    if (error) return toast.error(error.message);
    toast.success("Removida");
    await load();
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          Equipamento do laboratório usado na calibração de pesos. Não substitui as balanças de cliente do PR-7.1.
        </p>
        <Button type="button" onClick={openNew}>
          <Plus size={16} className="mr-1" /> Nova balança
        </Button>
      </div>
      <div className="border rounded-lg overflow-x-auto">
        <table className="w-full text-sm min-w-[760px]">
          <thead className="bg-background text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="p-2">Identificação</th>
              <th className="p-2">Fabricante</th>
              <th className="p-2">Série</th>
              <th className="p-2">Certificado</th>
              <th className="p-2">Calibração</th>
              <th className="p-2">Validade</th>
              <th className="p-2">Situação</th>
              <th className="p-2 w-24" />
            </tr>
          </thead>
          <tbody>
            {!rows.length ? (
              <tr><td colSpan={8} className="p-6 text-center text-muted-foreground">Nenhuma balança do laboratório.</td></tr>
            ) : rows.map((row) => (
              <tr key={row.id} className="border-t border-border">
                <td className="p-2 font-medium">{row.identification}</td>
                <td className="p-2">{row.manufacturer || "—"}</td>
                <td className="p-2 font-mono text-xs">{row.serial_number || "—"}</td>
                <td className="p-2 font-mono text-xs">{row.certificate_number || "—"}</td>
                <td className="p-2">{fmtDmyShort(row.calibration_date)}</td>
                <td className="p-2">{fmtDmyShort(row.expiry_date)}</td>
                <td className="p-2">{row.status === "inativo" ? "Inativo" : "Ativo"}</td>
                <td className="p-2 text-right">
                  <Button type="button" variant="ghost" size="sm" onClick={() => openEdit(row)}><PencilSimple size={16} /></Button>
                  <Button type="button" variant="ghost" size="sm" className="text-red-600" onClick={() => remove(row)}><Trash size={16} /></Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar balança do laboratório" : "Nova balança do laboratório"}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <Label>Identificação *</Label>
              <Input value={form.identification} onChange={(e) => setField("identification", e.target.value)} />
            </div>
            <div>
              <Label>Fabricante</Label>
              <Input value={form.manufacturer} onChange={(e) => setField("manufacturer", e.target.value)} />
            </div>
            <div>
              <Label>Modelo</Label>
              <Input value={form.model} onChange={(e) => setField("model", e.target.value)} />
            </div>
            <div>
              <Label>Número de série</Label>
              <Input value={form.serial_number} onChange={(e) => setField("serial_number", e.target.value)} />
            </div>
            <div>
              <Label>Certificado vigente</Label>
              <Input value={form.certificate_number} onChange={(e) => setField("certificate_number", e.target.value)} />
            </div>
            <div>
              <Label>Data de calibração</Label>
              <Input type="date" value={form.calibration_date || ""} onChange={(e) => setField("calibration_date", e.target.value)} />
            </div>
            <div>
              <Label>Validade</Label>
              <Input type="date" value={form.expiry_date || ""} onChange={(e) => setField("expiry_date", e.target.value)} />
            </div>
            <div>
              <Label>Localização</Label>
              <Input value={form.location} onChange={(e) => setField("location", e.target.value)} />
            </div>
            <div>
              <Label>Situação</Label>
              <select
                value={form.status}
                onChange={(e) => setField("status", e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-2 text-sm"
              >
                <option value="ativo">Ativo</option>
                <option value="inativo">Inativo</option>
              </select>
            </div>
            <div className="sm:col-span-2">
              <Label>Notas</Label>
              <Input value={form.notes} onChange={(e) => setField("notes", e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button type="button" onClick={save} disabled={busy}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
