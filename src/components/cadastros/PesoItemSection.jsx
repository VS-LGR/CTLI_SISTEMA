import React, { useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, PencilSimple, Trash } from "@phosphor-icons/react";
import { toast } from "sonner";
import { WEIGHT_ITEM_UNITS } from "@/lib/cadastroConstants";
import CadastroListFilterBar from "@/components/cadastros/CadastroListFilterBar";
import {
  filterCadastroByQuery,
  weightItemCertNumber,
  weightItemCertStatus,
} from "@/lib/cadastroListUtils";

export default function PesoItemSection({ rows, weightCerts = [], tenantId, onRefresh }) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [query, setQuery] = useState("");
  const [identification, setIdentification] = useState("");
  const [nominalValue, setNominalValue] = useState("");
  const [unit, setUnit] = useState("g");
  const [conventionalValue, setConventionalValue] = useState("");
  const [expandedUncertainty, setExpandedUncertainty] = useState("");
  const [certificateNumber, setCertificateNumber] = useState("");
  const [weightCertificateId, setWeightCertificateId] = useState("");

  const filtered = useMemo(
    () => filterCadastroByQuery(rows, query, (r) => [
      r.identification,
      r.nominal_value,
      r.certificate_number,
      weightItemCertNumber(r, weightCerts),
    ]),
    [rows, query, weightCerts],
  );

  const reset = () => {
    setEditing(null);
    setIdentification("");
    setNominalValue("");
    setConventionalValue("");
    setExpandedUncertainty("");
    setUnit("g");
    setCertificateNumber("");
    setWeightCertificateId("");
  };

  const save = async () => {
    if (!tenantId) return toast.error("Selecione um ambiente válido no topo da página");
    if (!identification.trim()) return toast.error("Informe a identificação do peso");
    const base = {
      tenant_id: tenantId,
      identification: identification.trim(),
      nominal_value: nominalValue.trim(),
      conventional_value: conventionalValue.trim(),
      expanded_uncertainty: expandedUncertainty.trim(),
      unit: unit || "g",
      active: true,
      certificate_number: certificateNumber.trim(),
      weight_certificate_id: weightCertificateId || null,
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

  const openEdit = (r) => {
    setEditing(r);
    setIdentification(r.identification);
    setNominalValue(r.nominal_value);
    setConventionalValue(r.conventional_value || "");
    setExpandedUncertainty(r.expanded_uncertainty || "");
    setUnit(r.unit || "g");
    setCertificateNumber(r.certificate_number || "");
    setWeightCertificateId(r.weight_certificate_id || "");
    setOpen(true);
  };

  return (
    <Card className="border-slate-200">
      <CardContent className="p-4 space-y-4">
        <div className="flex flex-wrap justify-between gap-2">
          <p className="text-sm text-slate-600">Pesos padrão individuais usados na coleta RE-7.2A.</p>
          <Button size="sm" className="bg-blue-600 text-white" onClick={() => { reset(); setOpen(true); }}>
            <Plus size={16} className="mr-1" /> Novo peso
          </Button>
        </div>

        <CadastroListFilterBar
          query={query}
          onQueryChange={setQuery}
          placeholder="Buscar por identificação, valor nominal ou certificado…"
          filteredCount={filtered.length}
          totalCount={rows.length}
          onClear={() => setQuery("")}
          testIdPrefix="peso-item"
        />

        <div className="overflow-x-auto border rounded-md">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs text-slate-600">
              <tr>
                <th className="p-2">Identificação</th>
                <th className="p-2">V.V.C</th>
                <th className="p-2">Ue</th>
                <th className="p-2">Nº certificado</th>
                <th className="p-2">Status</th>
                <th className="p-2 w-24" />
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={7} className="p-4 text-center text-slate-500">Nenhum peso encontrado.</td></tr>
              )}
              {filtered.map((r) => {
                const st = weightItemCertStatus(r, weightCerts);
                return (
                  <tr key={r.id} className="border-t border-slate-100">
                    <td className="p-2 font-mono">{r.identification}</td>
                    <td className="p-2">{r.nominal_value} {r.unit}</td>
                    <td className="p-2">{r.conventional_value || "—"} {r.conventional_value ? r.unit : ""}</td>
                    <td className="p-2">{r.expanded_uncertainty || "—"} {r.expanded_uncertainty ? r.unit : ""}</td>
                    <td className="p-2">{weightItemCertNumber(r, weightCerts)}</td>
                    <td className="p-2">
                      {st.vigente == null ? (
                        <span className="text-slate-400">—</span>
                      ) : (
                        <Badge
                          className={
                            st.vigente
                              ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-100 font-normal text-[10px]"
                              : "bg-red-100 text-red-800 hover:bg-red-100 font-normal text-[10px]"
                          }
                        >
                          {st.label}
                        </Badge>
                      )}
                    </td>
                    <td className="p-2">
                      <Button variant="ghost" size="sm" onClick={() => openEdit(r)}><PencilSimple size={16} /></Button>
                      <Button variant="ghost" size="sm" className="text-red-600" onClick={() => remove(r)}><Trash size={16} /></Button>
                    </td>
                  </tr>
                );
              })}
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
                  <Label>V.N (valor nominal)</Label>
                  <Input value={nominalValue} onChange={(e) => setNominalValue(e.target.value)} />
                </div>
                <div>
                  <Label>V.V.C (valor convencional)</Label>
                  <Input value={conventionalValue} onChange={(e) => setConventionalValue(e.target.value)} placeholder="Em gramas" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Ue (incerteza expandida)</Label>
                  <Input value={expandedUncertainty} onChange={(e) => setExpandedUncertainty(e.target.value)} placeholder="Em gramas" />
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
              <div>
                <Label>Certificado de conjunto (opcional)</Label>
                <select
                  value={weightCertificateId}
                  onChange={(e) => {
                    const id = e.target.value;
                    setWeightCertificateId(id);
                    const cert = weightCerts.find((c) => c.id === id);
                    if (cert?.certificate_number) setCertificateNumber(cert.certificate_number);
                  }}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-2 text-sm"
                >
                  <option value="">— Nenhum —</option>
                  {weightCerts.map((c) => (
                    <option key={c.id} value={c.id}>
                      {[c.set_name, c.certificate_number].filter(Boolean).join(" — ")}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label>Nº certificado (texto livre)</Label>
                <Input
                  value={certificateNumber}
                  onChange={(e) => setCertificateNumber(e.target.value)}
                  placeholder="Se não vincular conjunto acima"
                />
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
