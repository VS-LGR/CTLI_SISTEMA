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
import { toast } from "sonner";
import { recordCriticalAnalysis } from "@/lib/masterDocuments/masterDocumentsApi";
import { CRITICAL_ANALYSIS_RESULTS } from "@/lib/masterDocuments/masterDocumentConstants";
import { loadTenantResponsibles } from "@/lib/tenantResponsiblesApi";

export default function CriticalAnalysisDialog({
  open, onOpenChange, tenantId, masterDocumentId, documentTitle, onSaved,
}) {
  const [responsibles, setResponsibles] = useState([]);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    analysis_date: new Date().toISOString().slice(0, 10),
    result: CRITICAL_ANALYSIS_RESULTS[0],
    notes: "",
    responsible_id: "",
  });

  useEffect(() => {
    if (open && tenantId) {
      loadTenantResponsibles(tenantId).then(setResponsibles).catch(() => setResponsibles([]));
      setForm({
        analysis_date: new Date().toISOString().slice(0, 10),
        result: CRITICAL_ANALYSIS_RESULTS[0],
        notes: "",
        responsible_id: "",
      });
    }
  }, [open, tenantId]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const save = async () => {
    if (!tenantId || !masterDocumentId) return;
    if (!form.analysis_date) {
      toast.error("Data da análise obrigatória");
      return;
    }
    setBusy(true);
    try {
      await recordCriticalAnalysis(tenantId, masterDocumentId, {
        analysis_date: form.analysis_date,
        result: form.result,
        notes: form.notes,
        responsible_id: form.responsible_id || null,
      });
      toast.success("Análise crítica registrada");
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
          <DialogTitle>Registrar análise crítica</DialogTitle>
        </DialogHeader>
        {documentTitle && <p className="text-sm text-slate-600 truncate">{documentTitle}</p>}
        <div className="grid gap-3 py-2">
          <div>
            <Label>Data da análise</Label>
            <Input type="date" value={form.analysis_date} onChange={(e) => set("analysis_date", e.target.value)} />
          </div>
          <div>
            <Label>Resultado</Label>
            <Select value={form.result} onValueChange={(v) => set("result", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {CRITICAL_ANALYSIS_RESULTS.map((r) => (
                  <SelectItem key={r} value={r}>{r}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Responsável</Label>
            <Select value={form.responsible_id || "__none"} onValueChange={(v) => set("responsible_id", v === "__none" ? "" : v)}>
              <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none">—</SelectItem>
                {responsibles.map((r) => (
                  <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Observações</Label>
            <Textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} rows={3} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={save} disabled={busy}>Registrar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
