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
import { PLATFORM_TYPE_OPTIONS, formRowsFromPointMaxTolerances, loadMaxTolerancesFromForm, omitPointMaxToleranceFormKeys } from "@/lib/scaleRegistrations/scaleRegistrationUtils";
import PointMaxToleranceFields from "@/components/forms/PointMaxToleranceFields";
import ScaleIndicationRangesFields from "@/components/forms/ScaleIndicationRangesFields";
import { TIPO_BALANCA_OPTIONS, UNIDADE_OPTIONS } from "@/lib/coletaSchema";
import { countScaleRanges } from "@/lib/scaleRegistrations/scaleRegistrationUtils";
import EllipsisTooltip from "@/components/ui/ellipsis-tooltip";

const emptyForm = () => ({
  end_customer_id: "",
  serial_number: "",
  identification_code: "",
  tag: "",
  manufacturer: "",
  model: "",
  description: "",
  tipo_balanca: "",
  local_instalacao: "",
  etiqueta_ipem: "",
  portaria_inmetro: "",
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
  point_max_tolerances: [],
});

function SectionHeading({ title, description }) {
  return (
    <div className="sm:col-span-2 pt-2 border-t border-slate-100 first:border-0 first:pt-0">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-700">{title}</p>
      {description && <p className="text-[11px] text-slate-500 mt-0.5">{description}</p>}
    </div>
  );
}

function FieldLabel({ title, hint, required }) {
  return (
    <div className="mb-1">
      <Label>
        {title}
        {required && <span className="text-red-600"> *</span>}
      </Label>
      {hint && <p className="text-[11px] text-slate-500 leading-snug mt-0.5">{hint}</p>}
    </div>
  );
}

export default function ScaleRegistrationSection({ rows = [], endCustomers = [], tenantId, onRefresh }) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [query, setQuery] = useState("");
  const [form, setForm] = useState(emptyForm);

  const customerName = (id) => endCustomers.find((c) => c.id === id)?.name || "—";

  const filtered = useMemo(
    () => filterCadastroByQuery(rows, query, (r) => [
      r.serial_number,
      r.identification_code,
      r.manufacturer,
      r.model,
      endCustomers.find((c) => c.id === r.end_customer_id)?.name || "—",
    ]),
    [rows, query, endCustomers],
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
      end_customer_id: r.end_customer_id || "",
      point_max_tolerances: formRowsFromPointMaxTolerances(r.point_max_tolerances, r.unit || "g"),
    });
    setOpen(true);
  };

  const save = async () => {
    if (!tenantId) return toast.error("Selecione um ambiente");
    if (!form.serial_number.trim()) return toast.error("Informe o número de série");
    const payload = {
      tenant_id: tenantId,
      ...omitPointMaxToleranceFormKeys(form),
      end_customer_id: form.end_customer_id || null,
      serial_number: form.serial_number.trim(),
      identification_code: form.identification_code.trim(),
      tag: form.tag.trim(),
      local_instalacao: form.local_instalacao.trim(),
      etiqueta_ipem: form.etiqueta_ipem.trim(),
      portaria_inmetro: form.portaria_inmetro.trim(),
      tipo_balanca: form.tipo_balanca.trim(),
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
      point_max_tolerances: loadMaxTolerancesFromForm(form.point_max_tolerances, form.unit || "g"),
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
          <p className="text-sm text-slate-600">Cadastro de balanças por cliente do ambiente (aba BALANÇAS da planilha matriz).</p>
          <Button size="sm" className="bg-blue-600 text-white" onClick={() => { reset(); setOpen(true); }}>
            <Plus size={16} className="mr-1" /> Nova balança
          </Button>
        </div>
        <CadastroListFilterBar
          query={query}
          onQueryChange={setQuery}
          placeholder="Buscar por série, código, fabricante, cliente…"
          filteredCount={filtered.length}
          totalCount={rows.length}
          onClear={() => setQuery("")}
          testIdPrefix="balanca"
        />
        <div className="overflow-x-auto border rounded-md">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs text-slate-600">
              <tr>
                <th className="p-2">Cliente</th>
                <th className="p-2">Série</th>
                <th className="p-2">Identificação</th>
                <th className="p-2">Fabricante</th>
                <th className="p-2">Modelo</th>
                <th className="p-2">Faixas</th>
                <th className="p-2">Classe</th>
                <th className="p-2 w-24" />
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={8} className="p-4 text-center text-slate-500">Nenhuma balança cadastrada.</td></tr>
              )}
              {filtered.map((r) => (
                <tr key={r.id} className="border-t border-slate-100">
                  <td className="p-2 max-w-[9rem]">
                    <EllipsisTooltip label={customerName(r.end_customer_id) || ""} className="block">
                      {customerName(r.end_customer_id)}
                    </EllipsisTooltip>
                  </td>
                  <td className="p-2 font-mono max-w-[6rem]">
                    <EllipsisTooltip label={r.serial_number || ""} className="block">
                      {r.serial_number}
                    </EllipsisTooltip>
                  </td>
                  <td className="p-2 max-w-[7rem]">
                    <EllipsisTooltip label={r.identification_code || r.tag || ""} className="block">
                      {r.identification_code || r.tag || "—"}
                    </EllipsisTooltip>
                  </td>
                  <td className="p-2 max-w-[8rem]">
                    <EllipsisTooltip label={r.manufacturer || ""} className="block">
                      {r.manufacturer}
                    </EllipsisTooltip>
                  </td>
                  <td className="p-2 max-w-[8rem]">
                    <EllipsisTooltip label={r.model || ""} className="block">
                      {r.model}
                    </EllipsisTooltip>
                  </td>
                  <td className="p-2 text-xs text-slate-600">{countScaleRanges(r) || "—"}</td>
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
              <SectionHeading
                title="Vínculo e identificação"
                description="Dados do instrumento conforme aba BALANÇAS da planilha RE-7.2B."
              />
              <div className="sm:col-span-2">
                <FieldLabel title="Cliente do ambiente" hint="Cliente final onde a balança está instalada." />
                <select
                  value={form.end_customer_id}
                  onChange={(e) => setF("end_customer_id", e.target.value)}
                  className="w-full border rounded-md h-9 px-2 text-sm"
                >
                  <option value="">— Selecionar cliente —</option>
                  {endCustomers.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <FieldLabel title="Nº de série" hint="Número de série informado pelo fabricante (coluna Série)." required />
                <Input value={form.serial_number} onChange={(e) => setF("serial_number", e.target.value)} />
              </div>
              <div>
                <FieldLabel title="Identificação / patrimônio" hint="Código interno ou patrimônio do equipamento." />
                <Input value={form.identification_code} onChange={(e) => setF("identification_code", e.target.value)} />
              </div>
              <div>
                <FieldLabel title="TAG" hint="Etiqueta ou identificação operacional no local (ex.: AP-2000)." />
                <Input value={form.tag} onChange={(e) => setF("tag", e.target.value)} />
              </div>
              <div>
                <FieldLabel title="Tipo de balança" hint="Classificação operacional (industrial, analítica, etc.)." />
                <select value={form.tipo_balanca} onChange={(e) => setF("tipo_balanca", e.target.value)} className="w-full border rounded-md h-9 px-2 text-sm">
                  <option value="">—</option>
                  {TIPO_BALANCA_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <div>
                <FieldLabel title="Fabricante" hint="Marca do instrumento." />
                <Input value={form.manufacturer} onChange={(e) => setF("manufacturer", e.target.value)} />
              </div>
              <div>
                <FieldLabel title="Modelo" hint="Modelo comercial da balança." />
                <Input value={form.model} onChange={(e) => setF("model", e.target.value)} />
              </div>
              <div className="sm:col-span-2">
                <FieldLabel title="Descrição" hint="Texto livre para complementar a identificação no certificado." />
                <Input value={form.description} onChange={(e) => setF("description", e.target.value)} />
              </div>
              <div>
                <FieldLabel title="Local de instalação" hint="Setor ou endereço onde a calibração foi realizada." />
                <Input value={form.local_instalacao} onChange={(e) => setF("local_instalacao", e.target.value)} />
              </div>
              <div>
                <FieldLabel title="Unidade de massa" hint="Unidade principal das faixas C, d e e (mg, g ou kg)." />
                <select value={form.unit} onChange={(e) => setF("unit", e.target.value)} className="w-full border rounded-md h-9 px-2 text-sm">
                  {UNIDADE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <div>
                <FieldLabel title="Tipo de plataforma" hint="Formato da bandeja ou plataforma de pesagem." />
                <select value={form.platform_type} onChange={(e) => setF("platform_type", e.target.value)} className="w-full border rounded-md h-9 px-2 text-sm">
                  {PLATFORM_TYPE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>

              <SectionHeading
                title="Metrologia legal"
                description="Campos usados na metrologia legal — Portaria INMETRO nº 157/2022 (quando aplicável)."
              />
              <div>
                <FieldLabel title="Etiqueta IPEM" hint="Número da etiqueta de verificação ou selo legal." />
                <Input value={form.etiqueta_ipem} onChange={(e) => setF("etiqueta_ipem", e.target.value)} />
              </div>
              <div>
                <FieldLabel title="Portaria INMETRO" hint="Referência normativa ou indicação de escopo legal." />
                <Input value={form.portaria_inmetro} onChange={(e) => setF("portaria_inmetro", e.target.value)} />
              </div>
              <div>
                <FieldLabel title="Classe do instrumento" hint="Classe metrológica: I, II ou III (OIML R 76)." />
                <Input value={form.instrument_class} onChange={(e) => setF("instrument_class", e.target.value)} placeholder="I, II, III…" />
              </div>
              <div>
                <FieldLabel title="Ponto de trabalho" hint="Carga nominal habitual de utilização do instrumento." />
                <Input value={form.working_point} onChange={(e) => setF("working_point", e.target.value)} />
              </div>

              <SectionHeading
                title="Faixas de indicação (multi-escala)"
                description="Até 3 faixas em ordem crescente de capacidade. Cada ponto de calibração usa a resolução (d) da faixa correspondente."
              />
              <div className="sm:col-span-2">
                <ScaleIndicationRangesFields
                  variant="registration"
                  values={form}
                  unit={form.unit || "g"}
                  onChange={(key, value) => setF(key, value)}
                />
              </div>

              <SectionHeading
                title="Certificado — casas decimais"
                description="Quantidade de casas decimais por ponto de calibração (P1 a P10) na emissão RE-7.2B."
              />
              <div className="sm:col-span-2">
                <div className="grid grid-cols-5 gap-2">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                    <div key={n}>
                      <Label className="text-[10px] text-slate-600">Ponto P{n}</Label>
                      <Input
                        type="number"
                        min={0}
                        max={6}
                        value={form[`decimal_places_p${n}`]}
                        onChange={(e) => setF(`decimal_places_p${n}`, e.target.value)}
                        className="h-8 text-sm mt-0.5"
                        title={`Casas decimais no certificado para o ponto P${n}`}
                      />
                    </div>
                  ))}
                </div>
              </div>

              <SectionHeading
                title="Tolerância máxima por valor de pesagem"
                description="Informe a pesagem calibrada (V.R.) e o limite máximo de |Erro + Incerteza| para essa carga."
              />
              <div className="sm:col-span-2">
                <PointMaxToleranceFields
                  tolerances={form.point_max_tolerances}
                  unit={form.unit || "g"}
                  onChange={(next) => setF("point_max_tolerances", next)}
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
