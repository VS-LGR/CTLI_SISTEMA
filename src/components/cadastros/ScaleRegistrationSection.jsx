import React, { useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, PencilSimple, Trash } from "@phosphor-icons/react";
import { toast } from "sonner";
import CadastroListFilterBar from "@/components/cadastros/CadastroListFilterBar";
import { filterCadastroByQuery } from "@/lib/cadastroListUtils";
import { PLATFORM_TYPE_OPTIONS } from "@/lib/scaleRegistrations/scaleRegistrationUtils";

const emptyForm = () => ({
  serial_number: "",
  identification_code: "",
  manufacturer: "",
  model: "",
  description: "",
  capacity_1: "",
  capacity_2: "",
  capacity_3: "",
  resolution_1: "",
  resolution_2: "",
  resolution_3: "",
  verification_division_1: "",
  verification_division_2: "",
  verification_division_3: "",
  instrument_class: "",
  working_point: "",
  unit: "g",
  platform_type: "quadrada",
  decimal_places_p1: 2,
  decimal_places_p2: 2,
  decimal_places_p3: 2,
  decimal_places_p4: 2,
  decimal_places_p5: 2,
  decimal_places_p6: 2,
  decimal_places_p7: 2,
  decimal_places_p8: 2,
  decimal_places_p9: 2,
  decimal_places_p10: 2,
});

export default function ScaleRegistrationSection({ rows = [], tenantId, onRefresh }) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [query, setQuery] = useState("");
  const [form, setForm] = useState(emptyForm);

  const filtered = useMemo(
    () => filterCadastroByQuery(rows, query, (r) => [
      r.serial_number,
      r.identification_code,
      r.manufacturer,
      r.model,
      r.description,
    ]),
    [rows, query],
  );

  const setF = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const reset = () => {
    setEditing(null);
    setForm(emptyForm());
  };

  const openEdit = (r) => {
    setEditing(r);
    setForm({
      ...emptyForm(),
      ...Object.fromEntries(Object.keys(emptyForm()).map((k) => [k, r[k] ?? emptyForm()[k]])),
    });
    setOpen(true);
  };

  const save = async () => {
    if (!tenantId) return toast.error("Selecione um ambiente");
    if (!form.serial_number.trim()) return toast.error("Informe o número de série");
    const payload = {
      tenant_id: tenantId,
      ...form,
      serial_number: form.serial_number.trim(),
      identification_code: form.identification_code.trim(),
      decimal_places_p1: Number(form.decimal_places_p1) || 0,
      decimal_places_p2: Number(form.decimal_places_p2) || 0,
      decimal_places_p3: Number(form.decimal_places_p3) || 0,
      decimal_places_p4: Number(form.decimal_places_p4) || 0,
      decimal_places_p5: Number(form.decimal_places_p5) || 0,
      decimal_places_p6: Number(form.decimal_places_p6) || 0,
      decimal_places_p7: Number(form.decimal_places_p7) || 0,
      decimal_places_p8: Number(form.decimal_places_p8) || 0,
      decimal_places_p9: Number(form.decimal_places_p9) || 0,
      decimal_places_p10: Number(form.decimal_places_p10) || 0,
      active: true,
    };
    try {
      if (editing) {
        const { error } = await supabase.from("scale_registrations").update(payload).eq("id", editing.id);
        if (error) throw error;
        toast.success("Balança atualizada");
      } else {
        const { error } = await supabase.from("scale_registrations").insert(payload);
        if (error) throw error;
        toast.success("Balança cadastrada");
      }
      setOpen(false);
      reset();
      onRefresh?.();
    } catch (e) {
      toast.error(e.message || "Falha ao guardar");
    }
  };

  const remove = async (r) => {
    if (!window.confirm(`Excluir balança série ${r.serial_number}?`)) return;
    const { error } = await supabase.from("scale_registrations").delete().eq("id", r.id);
    if (error) toast.error(error.message);
    else { toast.success("Removida"); onRefresh?.(); }
  };

  return (
    <Card className="border-slate-200">
      <CardContent className="p-4 space-y-4">
        <div className="flex flex-wrap justify-between gap-2">
          <p className="text-sm text-slate-600">Cadastro de balanças para emissão de certificados (aba BALANÇAS da planilha matriz).</p>
          <Button size="sm" className="bg-blue-600 text-white" onClick={() => { reset(); setOpen(true); }}>
            <Plus size={16} className="mr-1" /> Nova balança
          </Button>
        </div>
        <CadastroListFilterBar
          query={query}
          onQueryChange={setQuery}
          placeholder="Buscar por série, código, fabricante…"
          filteredCount={filtered.length}
          totalCount={rows.length}
          onClear={() => setQuery("")}
          testIdPrefix="balanca"
        />
        <div className="overflow-x-auto border rounded-md">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs text-slate-600">
              <tr>
                <th className="p-2">Série</th>
                <th className="p-2">Código</th>
                <th className="p-2">Fabricante</th>
                <th className="p-2">Modelo</th>
                <th className="p-2">Classe</th>
                <th className="p-2 w-24" />
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={6} className="p-4 text-center text-slate-500">Nenhuma balança cadastrada.</td></tr>
              )}
              {filtered.map((r) => (
                <tr key={r.id} className="border-t border-slate-100">
                  <td className="p-2 font-mono">{r.serial_number}</td>
                  <td className="p-2">{r.identification_code}</td>
                  <td className="p-2">{r.manufacturer}</td>
                  <td className="p-2">{r.model}</td>
                  <td className="p-2">{r.instrument_class || "—"}</td>
                  <td className="p-2">
                    <Button variant="ghost" size="sm" onClick={() => openEdit(r)}><PencilSimple size={16} /></Button>
                    <Button variant="ghost" size="sm" className="text-red-600" onClick={() => remove(r)}><Trash size={16} /></Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>{editing ? "Editar balança" : "Nova balança"}</DialogTitle></DialogHeader>
            <div className="grid sm:grid-cols-2 gap-3">
              <div><Label>Nº de série *</Label><Input value={form.serial_number} onChange={(e) => setF("serial_number", e.target.value)} /></div>
              <div><Label>Identificação / código</Label><Input value={form.identification_code} onChange={(e) => setF("identification_code", e.target.value)} /></div>
              <div><Label>Fabricante</Label><Input value={form.manufacturer} onChange={(e) => setF("manufacturer", e.target.value)} /></div>
              <div><Label>Modelo</Label><Input value={form.model} onChange={(e) => setF("model", e.target.value)} /></div>
              <div className="sm:col-span-2"><Label>Descrição</Label><Input value={form.description} onChange={(e) => setF("description", e.target.value)} /></div>
              <div><Label>C1 (carga máx.)</Label><Input value={form.capacity_1} onChange={(e) => setF("capacity_1", e.target.value)} /></div>
              <div><Label>d1 (resolução)</Label><Input value={form.resolution_1} onChange={(e) => setF("resolution_1", e.target.value)} /></div>
              <div><Label>e1 (div. verificação)</Label><Input value={form.verification_division_1} onChange={(e) => setF("verification_division_1", e.target.value)} /></div>
              <div><Label>C2</Label><Input value={form.capacity_2} onChange={(e) => setF("capacity_2", e.target.value)} /></div>
              <div><Label>d2</Label><Input value={form.resolution_2} onChange={(e) => setF("resolution_2", e.target.value)} /></div>
              <div><Label>e2</Label><Input value={form.verification_division_2} onChange={(e) => setF("verification_division_2", e.target.value)} /></div>
              <div><Label>C3</Label><Input value={form.capacity_3} onChange={(e) => setF("capacity_3", e.target.value)} /></div>
              <div><Label>d3</Label><Input value={form.resolution_3} onChange={(e) => setF("resolution_3", e.target.value)} /></div>
              <div><Label>e3</Label><Input value={form.verification_division_3} onChange={(e) => setF("verification_division_3", e.target.value)} /></div>
              <div><Label>Classe</Label><Input value={form.instrument_class} onChange={(e) => setF("instrument_class", e.target.value)} placeholder="I, II, III…" /></div>
              <div><Label>Ponto de trabalho</Label><Input value={form.working_point} onChange={(e) => setF("working_point", e.target.value)} /></div>
              <div>
                <Label>Unidade</Label>
                <select value={form.unit} onChange={(e) => setF("unit", e.target.value)} className="w-full border rounded-md h-9 px-2 text-sm">
                  <option value="g">g</option>
                  <option value="kg">kg</option>
                </select>
              </div>
              <div>
                <Label>Tipo de plataforma</Label>
                <select value={form.platform_type} onChange={(e) => setF("platform_type", e.target.value)} className="w-full border rounded-md h-9 px-2 text-sm">
                  {PLATFORM_TYPE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <div className="sm:col-span-2">
                <Label className="text-xs text-slate-600">Casas decimais por ponto (P1–P7 usados no certificado)</Label>
                <div className="grid grid-cols-5 gap-2 mt-1">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                    <div key={n}>
                      <Label className="text-[10px]">P{n}</Label>
                      <Input
                        type="number"
                        min={0}
                        max={6}
                        value={form[`decimal_places_p${n}`]}
                        onChange={(e) => setF(`decimal_places_p${n}`, e.target.value)}
                        className="h-8 text-sm"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button className="bg-blue-600 text-white" onClick={save}>Guardar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
