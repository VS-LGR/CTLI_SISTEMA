import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import {
  DEFAULT_PROPOSAL_FORM_CODE,
  DEFAULT_PROPOSAL_FORM_REVISION,
  DEFAULT_PROPOSAL_FORM_TITLE,
  DEFAULT_PROPOSAL_BOILERPLATE,
} from "@/lib/commercialProposals/commercialProposalDocMeta";

const BOILERPLATE_FIELDS = [
  { key: "intro_text", label: "Texto introdutório", rows: 2 },
  { key: "mileage_note", label: "OBS quilometragem", rows: 2 },
  { key: "responsibilities", label: "Responsabilidades do Cliente", rows: 6 },
  { key: "supply_conditions", label: "Condições de fornecimento", rows: 5 },
  { key: "technical_info", label: "Informação Técnica", rows: 8 },
  { key: "payment", label: "Condição de Pagamento", rows: 4 },
  { key: "working_hours", label: "Horário de Trabalho", rows: 3 },
  { key: "validity_days", label: "Validade da Proposta", rows: 2 },
];

export default function CommercialProposalTenantConfig({ tenantId, tenant, onSaved }) {
  const [code, setCode] = useState(DEFAULT_PROPOSAL_FORM_CODE);
  const [title, setTitle] = useState(DEFAULT_PROPOSAL_FORM_TITLE);
  const [revision, setRevision] = useState(DEFAULT_PROPOSAL_FORM_REVISION);
  const [boilerplate, setBoilerplate] = useState({ ...DEFAULT_PROPOSAL_BOILERPLATE });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!tenant) return;
    setCode(tenant.commercial_proposal_form_code || DEFAULT_PROPOSAL_FORM_CODE);
    setTitle(tenant.commercial_proposal_form_title || DEFAULT_PROPOSAL_FORM_TITLE);
    setRevision(tenant.commercial_proposal_form_revision || DEFAULT_PROPOSAL_FORM_REVISION);
    setBoilerplate({
      ...DEFAULT_PROPOSAL_BOILERPLATE,
      ...(tenant.commercial_proposal_boilerplate || {}),
    });
  }, [tenant]);

  const setBp = (key, value) => setBoilerplate((prev) => ({ ...prev, [key]: value }));

  const save = async () => {
    if (!tenantId) return toast.error("Selecione um ambiente");
    setSaving(true);
    const { error } = await supabase
      .from("tenants")
      .update({
        commercial_proposal_form_code: code.trim() || DEFAULT_PROPOSAL_FORM_CODE,
        commercial_proposal_form_title: title.trim() || DEFAULT_PROPOSAL_FORM_TITLE,
        commercial_proposal_form_revision: revision.trim() || DEFAULT_PROPOSAL_FORM_REVISION,
        commercial_proposal_boilerplate: boilerplate,
      })
      .eq("id", tenantId);
    setSaving(false);
    if (error) toast.error(error.message);
    else {
      toast.success("Configuração RE-7.1A guardada");
      onSaved?.();
    }
  };

  return (
    <Card className="border-slate-200 max-w-3xl">
      <CardContent className="p-4 space-y-6">
        <div>
          <h3 className="text-sm font-semibold text-slate-800">Formulário RE-7.1A</h3>
          <p className="text-sm text-slate-600 mt-1">
            Metadados exibidos no PDF: <strong>{code} {title} {revision}</strong>
          </p>
          <div className="grid sm:grid-cols-3 gap-3 mt-3">
            <div><Label className="text-xs">Código</Label><Input value={code} onChange={(e) => setCode(e.target.value)} /></div>
            <div><Label className="text-xs">Título</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} /></div>
            <div><Label className="text-xs">Revisão / data</Label><Input value={revision} onChange={(e) => setRevision(e.target.value)} /></div>
          </div>
        </div>
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-slate-800">Textos institucionais (PDF)</h3>
          {BOILERPLATE_FIELDS.map(({ key, label, rows }) => (
            <div key={key}>
              <Label className="text-xs">{label}</Label>
              <Textarea
                className="mt-1 text-sm"
                rows={rows}
                value={boilerplate[key] || ""}
                onChange={(e) => setBp(key, e.target.value)}
              />
            </div>
          ))}
        </div>
        <Button onClick={save} disabled={saving}>{saving ? "Guardando…" : "Guardar configuração"}</Button>
      </CardContent>
    </Card>
  );
}
