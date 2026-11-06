import React, { useEffect, useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { saveExternalDocument } from "@/lib/masterDocuments/masterDocumentsApi";
import { externalValidityLabel } from "@/lib/masterDocuments/masterDocumentConstants";
import { validateExternalDocument } from "@/lib/masterDocuments/masterDocumentValidation";
import { deriveExternalValidityStatus } from "@/lib/masterDocuments/masterDocumentResolver";
import { loadTenantResponsibles } from "@/lib/tenantResponsiblesApi";
import { roleLabel } from "@/lib/roles";

const EMPTY = {
  title: "",
  consultation_location: "",
  issuing_organization: "",
  external_revision: "",
  last_consultation_date: "",
  consultation_period_months: 6,
  consultation_responsible_id: "",
  has_revision: false,
  involved_procedures: "",
  validity_status: "pendente_consulta",
  external_link: "",
  notes: "",
};

export default function ExternalDocumentFormDialog({ open, onOpenChange, tenantId, document, onSaved }) {
  const [form, setForm] = useState(EMPTY);
  const [responsibles, setResponsibles] = useState([]);
  const [busy, setBusy] = useState(false);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const validity = deriveExternalValidityStatus({
    lastDate: form.last_consultation_date,
    periodMonths: form.consultation_period_months,
    hasRevision: form.has_revision,
  });

  useEffect(() => {
    if (open) {
      setForm(document ? { ...EMPTY, ...document, consultation_responsible_id: document.consultation_responsible_id || "" } : { ...EMPTY });
      if (tenantId) loadTenantResponsibles(tenantId).then(setResponsibles).catch(() => setResponsibles([]));
    }
  }, [open, document, tenantId]);

  const save = async () => {
    const payload = { ...form, validity_status: validity };
    const v = validateExternalDocument(payload);
    if (!v.valid) { toast.error(v.errors.join("; ")); return; }
    setBusy(true);
    try {
      await saveExternalDocument(tenantId, { ...payload, id: document?.id });
      toast.success("Guardado");
      onSaved?.();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{document ? "Editar" : "Novo"} documento externo</DialogTitle></DialogHeader>
        <div className="grid gap-3 py-2">
          <div><Label>Título</Label><Input value={form.title} onChange={(e) => set("title", e.target.value)} /></div>
          <div><Label>Local para consulta</Label><Input value={form.consultation_location} onChange={(e) => set("consultation_location", e.target.value)} /></div>
          <div><Label>Revisão / versão externa</Label><Input value={form.external_revision} onChange={(e) => set("external_revision", e.target.value)} /></div>
          <div>
            <Label>Responsável pela consulta</Label>
            <Select value={form.consultation_responsible_id || "_"} onValueChange={(v) => set("consultation_responsible_id", v === "_" ? "" : v)}>
              <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="_">—</SelectItem>
                {responsibles.map((r) => (
                  <SelectItem key={r.id} value={r.id}>{r.name}{r.role ? ` — ${roleLabel(r.role)}` : ""}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Última consulta</Label><Input type="date" value={form.last_consultation_date || ""} onChange={(e) => set("last_consultation_date", e.target.value)} /></div>
            <div><Label>Consulta anterior</Label><Input type="date" value={form.previous_consultation_date || ""} disabled className="bg-background" /></div>
          </div>
          <div><Label>Periodicidade (meses)</Label><Input type="number" value={form.consultation_period_months} onChange={(e) => set("consultation_period_months", Number(e.target.value))} /></div>
          <div><Label>Procedimentos envolvidos</Label><Textarea value={form.involved_procedures} onChange={(e) => set("involved_procedures", e.target.value)} rows={2} /></div>
          <div>
            <Label>Status de validade</Label>
            <p className="text-sm mt-1">{externalValidityLabel(validity)}</p>
            <p className="text-xs text-muted-foreground">Calculado pela última consulta e pela periodicidade.</p>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={form.has_revision} onCheckedChange={(v) => set("has_revision", !!v)} />
            Houve revisão identificada
          </label>
          <div><Label>Link externo</Label><Input value={form.external_link} onChange={(e) => set("external_link", e.target.value)} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={save} disabled={busy}>Guardar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
