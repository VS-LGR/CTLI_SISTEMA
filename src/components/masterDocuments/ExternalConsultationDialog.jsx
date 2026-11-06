import React, { useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { recordExternalConsultation } from "@/lib/masterDocuments/masterDocumentsApi";
import { externalValidityLabel } from "@/lib/masterDocuments/masterDocumentConstants";
import { deriveExternalValidityStatus } from "@/lib/masterDocuments/masterDocumentResolver";
import { formatDateBr } from "@/lib/quotationRequestDisplay";

export default function ExternalConsultationDialog({
  open, onOpenChange, tenantId, externalDoc, onSaved,
}) {
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    consultation_date: new Date().toISOString().slice(0, 10),
    has_revision: false,
    external_revision: "",
    validity_status: "valido",
    notes: "",
  });

  React.useEffect(() => {
    if (open && externalDoc) {
      setForm({
        consultation_date: new Date().toISOString().slice(0, 10),
        has_revision: !!externalDoc.has_revision,
        external_revision: externalDoc.external_revision || "",
        validity_status: externalDoc.validity_status || "valido",
        notes: "",
      });
    }
  }, [open, externalDoc]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const save = async () => {
    if (!tenantId || !externalDoc?.id) return;
    setBusy(true);
    try {
      const validity_status = deriveExternalValidityStatus({
        lastDate: form.consultation_date,
        periodMonths: externalDoc.consultation_period_months,
        hasRevision: form.has_revision,
      });
      await recordExternalConsultation(tenantId, externalDoc.id, { ...form, validity_status });
      toast.success("Consulta registrada");
      onSaved?.();
      onOpenChange(false);
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Registrar consulta semestral</DialogTitle>
        </DialogHeader>
        {externalDoc && (
          <p className="text-sm text-muted-foreground truncate">{externalDoc.title}</p>
        )}
        {externalDoc?.last_consultation_date && (
          <p className="text-xs text-muted-foreground">
            Última consulta: {formatDateBr(externalDoc.last_consultation_date)}
          </p>
        )}
        <div className="grid gap-3 py-2">
          <div>
            <Label>Data da consulta</Label>
            <Input type="date" value={form.consultation_date} onChange={(e) => set("consultation_date", e.target.value)} />
          </div>
          <div>
            <Label>Revisão / versão externa</Label>
            <Input value={form.external_revision} onChange={(e) => set("external_revision", e.target.value)} />
          </div>
          <p className="text-sm">
            Status: {externalValidityLabel(deriveExternalValidityStatus({
              lastDate: form.consultation_date,
              periodMonths: externalDoc?.consultation_period_months,
              hasRevision: form.has_revision,
            }))}
          </p>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={form.has_revision} onCheckedChange={(v) => set("has_revision", !!v)} />
            Houve revisão identificada
          </label>
          <div>
            <Label>Observações</Label>
            <Textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} rows={2} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={save} disabled={busy}>Registrar consulta</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
