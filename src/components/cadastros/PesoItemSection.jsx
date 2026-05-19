import React, { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, PencilSimple, Trash } from "@phosphor-icons/react";
import { toast } from "sonner";
import { WEIGHT_ITEM_UNITS } from "@/lib/cadastroConstants";

export default function PesoItemSection({ rows, tenantId, onRefresh }) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [identification, setIdentification] = useState("");
  const [nominalValue, setNominalValue] = useState("");
  const [unit, setUnit] = useState("g");

  const reset = () => {
    setEditing(null);
    setIdentification("");
    setNominalValue("");
    setUnit("g");
  };

  const save = async () => {
    if (!tenantId) return toast.error("Selecione um ambiente válido no topo da página");
    if (!identification.trim()) return toast.error("Informe a identificação do peso");
    const base = {
      tenant_id: tenantId,
      identification: identification.trim(),
      nominal_value: nominalValue.trim(),
      unit: unit || "g",
      active: true,
    };
    try {
      if (editing) {
        const { error } = await supabase.from("standard_weight_items").update(base).eq("id", editing.id);
        if (error) throw error;
        toast.success("Atualizado");
      } else {
        const { error } = await supabase.from("standard_weight_items").insert(base);
        if (error) throw error;
        toast.success("Cadastrado");
      }
      setOpen(false);
      reset();
      onRefresh();
    } catch (err) {
      const msg = err?.message || "Falha";
      if (/tenant_id_fkey/i.test(msg)) {
        toast.error("Ambiente inválido. Selecione novamente o cliente no topo.");
      } else toast.error(msg);
    }
  };

  const remove = async (r) => {
    if (!window.confirm(`Excluir peso ${r.identification}?`)) return;
    const { error } = await supabase.from("standard_weight_items").delete().eq("id", r.id);
    if (error) toast.error(error.message);
    else { toast.success("Removido"); onRefresh(); }
  };

  return (
    <Card className="border-slate-200">
      <CardContent className="p-4 space-y-4">
        <div className="flex flex-wrap justify-between gap-2">
          <p className="text-sm text-slate-600">Pesos padrão individuais usados na coleta RE-7.2A (identificação + valor nominal).</p>
          <Button size="sm" className="bg-blue-600 text-white" onClick={() => { reset(); setOpen(true); }}>
            <Plus size={16} className="mr-1" /> Novo peso
          </Button>
        </div>
        <div className="overflow-x-auto border rounded-md">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs text-slate-600">
              <tr>
                <th className="p-2">Identificação</th>
                <th className="p-2">Valor nominal</th>
                <th className="p-2">Unidade</th>
                <th className="p-2 w-24" />
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr><td colSpan={4} className="p-4 text-center text-slate-500">Nenhum peso cadastrado.</td></tr>
              )}
              {rows.map((r) => (
                <tr key={r.id} className="border-t border-slate-100">
                  <td className="p-2 font-mono">{r.identification}</td>
                  <td className="p-2">{r.nominal_value}</td>
                  <td className="p-2">{r.unit}</td>
                  <td className="p-2">
                    <Button variant="ghost" size="sm" onClick={() => {
                      setEditing(r);
                      setIdentification(r.identification);
                      setNominalValue(r.nominal_value);
                      setUnit(r.unit || "g");
                      setOpen(true);
                    }}><PencilSimple size={16} /></Button>
                    <Button variant="ghost" size="sm" className="text-red-600" onClick={() => remove(r)}><Trash size={16} /></Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
          <DialogContent>
            <DialogHeader><DialogTitle>{editing ? "Editar peso" : "Novo peso padrão"}</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>Identificação *</Label>
                <Input value={identification} onChange={(e) => setIdentification(e.target.value)} placeholder="Ex.: PP-001" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Valor nominal</Label>
                  <Input value={nominalValue} onChange={(e) => setNominalValue(e.target.value)} />
                </div>
                <div>
                  <Label>Unidade</Label>
                  <select
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-2 text-sm"
                  >
                    {WEIGHT_ITEM_UNITS.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
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
