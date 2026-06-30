import React, { useState } from "react";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { CRITICAL_ANALYSIS_CHECKLIST, emptyCriticalChecklist } from "@/lib/calibrationCertificates/certificateSchema";

export default function CriticalAnalysisDialog({ open, onOpenChange, onConfirm, initial = null }) {
  const [checklist, setChecklist] = useState(initial || emptyCriticalChecklist());

  const toggle = (key) => setChecklist((c) => ({ ...c, [key]: !c[key] }));

  const allChecked = CRITICAL_ANALYSIS_CHECKLIST.every((item) => checklist[item.key]);

  const handleConfirm = () => {
    if (!allChecked) return;
    onConfirm(checklist);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Análise crítica antes da aprovação</DialogTitle>
          <DialogDescription>
            Marque todos os itens conferidos antes de enviar o certificado para aprovação.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2 max-h-[60vh] overflow-y-auto">
          {CRITICAL_ANALYSIS_CHECKLIST.map((item) => (
            <div key={item.key} className="flex items-start gap-2">
              <Checkbox
                id={item.key}
                checked={!!checklist[item.key]}
                onCheckedChange={() => toggle(item.key)}
              />
              <Label htmlFor={item.key} className="text-sm font-normal leading-snug cursor-pointer">
                {item.label}
              </Label>
            </div>
          ))}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleConfirm} disabled={!allChecked}>Confirmar e enviar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
