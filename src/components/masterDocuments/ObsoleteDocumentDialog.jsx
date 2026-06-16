import React, { useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";

export default function ObsoleteDocumentDialog({ open, onOpenChange, onConfirm }) {
  const [form, setForm] = useState({
    obsolete_reason: "",
    replaced_by_code: "",
    retained_for_legal: false,
    retained_for_knowledge: false,
    obsolete_identification_applied: false,
  });

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleConfirm = () => {
    onConfirm?.({
      ...form,
      obsolete_date: new Date().toISOString().slice(0, 10),
    });
    setForm({
      obsolete_reason: "",
      replaced_by_code: "",
      retained_for_legal: false,
      retained_for_knowledge: false,
      obsolete_identification_applied: false,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Marcar como Documento Obsoleto</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div>
            <Label>Motivo da obsolescência</Label>
            <Textarea value={form.obsolete_reason} onChange={(e) => set("obsolete_reason", e.target.value)} />
          </div>
          <div>
            <Label>Substituído por (código)</Label>
            <Input value={form.replaced_by_code} onChange={(e) => set("replaced_by_code", e.target.value)} />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={form.retained_for_legal} onCheckedChange={(v) => set("retained_for_legal", !!v)} />
            Retido por motivo legal
          </label>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={form.retained_for_knowledge} onCheckedChange={(v) => set("retained_for_knowledge", !!v)} />
            Retido para preservação de conhecimento
          </label>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={form.obsolete_identification_applied} onCheckedChange={(v) => set("obsolete_identification_applied", !!v)} />
            Identificação de obsoleto aplicada
          </label>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button variant="destructive" onClick={handleConfirm}>Confirmar obsolescência</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
