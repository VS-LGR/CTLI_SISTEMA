import React from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Warning, CalendarBlank } from "@phosphor-icons/react";
import { fmtDmyShort } from "@/lib/dateFormat";

const STATUS_LABELS = {
  expired: "Vencido",
  warning: "A vencer",
};

function AlertRow({ item }) {
  const isExpired = item.status === "expired";
  return (
    <li className="flex items-start gap-2 text-sm py-2 border-b border-slate-100 last:border-0">
      <Warning
        size={16}
        className={`shrink-0 mt-0.5 ${isExpired ? "text-red-600" : "text-amber-600"}`}
        weight="fill"
      />
      <div className="min-w-0 flex-1">
        <p className="font-medium text-slate-800 truncate" title={item.label}>
          {item.label}
        </p>
        <p className="text-xs text-slate-500">
          {item.kind} · {STATUS_LABELS[item.status] || item.status} · {fmtDmyShort(item.expiry_date)}
        </p>
      </div>
    </li>
  );
}

export default function EquipmentExpiryAlerts({ alerts = [], loading = false }) {
  const items = alerts || [];
  const expired = items.filter((a) => a.status === "expired");
  const warning = items.filter((a) => a.status === "warning");

  return (
    <Card className="border-slate-200 min-w-0" data-testid="equipment-expiry-alerts">
      <CardHeader className="pb-2">
        <CardTitle className="font-display text-base flex items-center gap-2">
          <CalendarBlank size={18} className="text-amber-600" />
          Vencimentos — pesos e termo
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {loading && <p className="text-sm text-slate-500">A carregar…</p>}
        {!loading && items.length === 0 && (
          <p className="text-sm text-slate-500">Nenhum certificado próximo do vencimento.</p>
        )}
        {!loading && expired.length > 0 && (
          <div className="mb-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-red-700 mb-1">Vencidos</p>
            <ul>
              {expired.slice(0, 8).map((item) => (
                <AlertRow key={`${item.kind}-${item.id}`} item={item} />
              ))}
            </ul>
          </div>
        )}
        {!loading && warning.length > 0 && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-amber-700 mb-1">Próximos 60 dias</p>
            <ul>
              {warning.slice(0, 8).map((item) => (
                <AlertRow key={`${item.kind}-${item.id}`} item={item} />
              ))}
            </ul>
          </div>
        )}
        <div className="mt-4 flex flex-col gap-1 text-xs">
          <Link to="/cadastros/cert-peso" className="text-blue-600 hover:underline">
            Certificados de peso padrão
          </Link>
          <Link to="/cadastros/thermo" className="text-blue-600 hover:underline">
            Termo-baro-higrômetro
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
