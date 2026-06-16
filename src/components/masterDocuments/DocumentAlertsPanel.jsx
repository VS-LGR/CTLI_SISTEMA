import React, { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { getAllDocumentAlerts } from "@/lib/masterDocuments/masterDocumentAlerts";
import { formatDateBr } from "@/lib/quotationRequestDisplay";
import CriticalAnalysisDialog from "./CriticalAnalysisDialog";
import ExternalConsultationDialog from "./ExternalConsultationDialog";

function AlertList({ title, items, variant = "warning", actionLabel, onAction }) {
  if (!items?.length) return null;
  return (
    <Card className="border-slate-200">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          {title}
          <Badge variant={variant === "danger" ? "destructive" : "secondary"}>{items.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <ul className="space-y-1 text-sm">
          {items.map((item) => (
            <li key={item.id} className="flex justify-between gap-2 border-b border-slate-100 py-1.5 last:border-0 items-center">
              <span className="truncate min-w-0">{item.code ? `${item.code} — ` : ""}{item.title}</span>
              <div className="flex items-center gap-2 shrink-0">
                {item.next_critical_analysis_date && (
                  <span className="text-xs text-slate-500">{formatDateBr(item.next_critical_analysis_date)}</span>
                )}
                {item.next_consultation_date && (
                  <span className="text-xs text-slate-500">{formatDateBr(item.next_consultation_date)}</span>
                )}
                {item.daysUntil != null && (
                  <span className="text-xs text-amber-600">{item.daysUntil < 0 ? "Vencido" : `${item.daysUntil}d`}</span>
                )}
                {onAction && (
                  <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => onAction(item)}>
                    {actionLabel}
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

export default function DocumentAlertsPanel({ tenantId }) {
  const [alerts, setAlerts] = useState(null);
  const [loading, setLoading] = useState(true);
  const [analysisDoc, setAnalysisDoc] = useState(null);
  const [consultDoc, setConsultDoc] = useState(null);

  const load = useCallback(async () => {
    if (!tenantId) return;
    setLoading(true);
    try {
      setAlerts(await getAllDocumentAlerts(tenantId));
    } catch (e) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <div className="text-slate-500 text-sm py-8 text-center">Carregando alertas…</div>;
  if (!alerts) return null;

  const empty = alerts.totalCount === 0;

  return (
    <div className="space-y-4">
      {empty && (
        <p className="text-sm text-slate-600 py-4">Nenhum alerta pendente.</p>
      )}
      <AlertList
        title="Análise crítica vencida"
        items={alerts.criticalAnalysisOverdue}
        variant="danger"
        actionLabel="Registrar"
        onAction={(item) => setAnalysisDoc(item)}
      />
      <AlertList
        title="Análise crítica próxima (30 dias)"
        items={alerts.criticalAnalysisUpcoming}
        actionLabel="Registrar"
        onAction={(item) => setAnalysisDoc(item)}
      />
      <AlertList
        title="Análise crítica pendente"
        items={alerts.criticalAnalysisPending}
        actionLabel="Registrar"
        onAction={(item) => setAnalysisDoc(item)}
      />
      <AlertList
        title="Consulta externa vencida"
        items={alerts.externalConsultationOverdue}
        variant="danger"
        actionLabel="Consulta"
        onAction={(item) => setConsultDoc(item)}
      />
      <AlertList
        title="Consulta externa próxima"
        items={alerts.externalConsultationUpcoming}
        actionLabel="Consulta"
        onAction={(item) => setConsultDoc(item)}
      />
      <AlertList
        title="Consulta externa pendente"
        items={alerts.externalConsultationPending}
        actionLabel="Consulta"
        onAction={(item) => setConsultDoc(item)}
      />
      <AlertList title="Validação de software vencida" items={alerts.softwareValidationOverdue} variant="danger" />
      <AlertList title="Software sem data de validação" items={alerts.softwareValidationMissing} />
      <AlertList title="Templates ativos com documento obsoleto" items={alerts.obsoleteActiveTemplates} variant="danger" />

      <CriticalAnalysisDialog
        open={!!analysisDoc}
        onOpenChange={(o) => !o && setAnalysisDoc(null)}
        tenantId={tenantId}
        masterDocumentId={analysisDoc?.id}
        documentTitle={analysisDoc ? `${analysisDoc.code || ""} — ${analysisDoc.title}` : ""}
        onSaved={() => { setAnalysisDoc(null); load(); }}
      />
      <ExternalConsultationDialog
        open={!!consultDoc}
        onOpenChange={(o) => !o && setConsultDoc(null)}
        tenantId={tenantId}
        externalDoc={consultDoc}
        onSaved={() => { setConsultDoc(null); load(); }}
      />
    </div>
  );
}
