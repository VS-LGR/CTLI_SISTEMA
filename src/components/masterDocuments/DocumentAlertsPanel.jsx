import React, { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { getAllDocumentAlerts } from "@/lib/masterDocuments/masterDocumentAlerts";
import { formatDateBr } from "@/lib/quotationRequestDisplay";

function AlertList({ title, items, variant = "warning" }) {
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
            <li key={item.id} className="flex justify-between gap-2 border-b border-slate-100 py-1.5 last:border-0">
              <span className="truncate">{item.code ? `${item.code} — ` : ""}{item.title}</span>
              {item.next_critical_analysis_date && (
                <span className="text-xs text-slate-500 shrink-0">{formatDateBr(item.next_critical_analysis_date)}</span>
              )}
              {item.next_consultation_date && (
                <span className="text-xs text-slate-500 shrink-0">{formatDateBr(item.next_consultation_date)}</span>
              )}
              {item.daysUntil != null && (
                <span className="text-xs text-amber-600 shrink-0">{item.daysUntil < 0 ? "Vencido" : `${item.daysUntil}d`}</span>
              )}
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
      <AlertList title="Análise crítica vencida" items={alerts.criticalAnalysisOverdue} variant="danger" />
      <AlertList title="Análise crítica próxima (30 dias)" items={alerts.criticalAnalysisUpcoming} />
      <AlertList title="Consulta externa vencida" items={alerts.externalConsultationOverdue} variant="danger" />
      <AlertList title="Consulta externa próxima" items={alerts.externalConsultationUpcoming} />
      <AlertList title="Validação de software vencida" items={alerts.softwareValidationOverdue} variant="danger" />
      <AlertList title="Software sem data de validação" items={alerts.softwareValidationMissing} />
      <AlertList title="Templates ativos com documento obsoleto" items={alerts.obsoleteActiveTemplates} variant="danger" />
    </div>
  );
}
