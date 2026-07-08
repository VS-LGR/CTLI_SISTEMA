import React from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Warning, CalendarBlank } from "@phosphor-icons/react";
import { fmtDmyShort } from "@/lib/dateFormat";
import EllipsisTooltip from "@/components/ui/ellipsis-tooltip";
import { expandDisplayLabel } from "@/lib/metrologyDisplayLabels";
import { cadastroSectionPath } from "@/lib/cadastroSections";

const STATUS_LABELS = {
  expired: "Vencido",
  warning: "A vencer",
};

function AlertRow({ item }) {
  const isExpired = item.status === "expired";
  const kindExpanded = expandDisplayLabel(item.kind);
  return (
    <li
      className={`rounded-lg border px-3 py-3 ${
        isExpired
          ? "border-red-100 bg-red-50/60"
          : "border-amber-100 bg-amber-50/50"
      }`}
    >
      <div className="flex items-start gap-3 min-w-0">
        <Warning
          size={18}
          className={`shrink-0 mt-0.5 ${isExpired ? "text-red-600" : "text-amber-600"}`}
          weight="fill"
        />
        <div className="min-w-0 flex-1 space-y-1.5">
          <EllipsisTooltip
            label={item.label}
            className="font-medium text-slate-900 text-sm block"
          />
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-600">
            <EllipsisTooltip
              label={kindExpanded}
              className="inline-block max-w-full sm:max-w-[14rem]"
              onlyWhenTruncated={kindExpanded !== item.kind}
            >
              {item.kind}
            </EllipsisTooltip>
            <span
              className={`inline-flex items-center rounded-full px-2 py-0.5 font-medium ${
                isExpired
                  ? "bg-red-100 text-red-800"
                  : "bg-amber-100 text-amber-900"
              }`}
            >
              {STATUS_LABELS[item.status] || item.status}
            </span>
            <span className="tabular-nums text-slate-500">
              {fmtDmyShort(item.expiry_date)}
            </span>
          </div>
        </div>
      </div>
    </li>
  );
}

function AlertSection({ title, tone, items }) {
  if (!items.length) return null;
  const titleClass =
    tone === "expired" ? "text-red-700" : "text-amber-800";
  return (
    <div className="space-y-2">
      <p className={`text-xs font-semibold uppercase tracking-wide ${titleClass}`}>
        {title}
        <span className="ml-1.5 font-normal normal-case tracking-normal text-slate-500">
          ({items.length})
        </span>
      </p>
      <ul className="space-y-2">
        {items.slice(0, 8).map((item) => (
          <AlertRow key={`${item.kind}-${item.id}`} item={item} />
        ))}
      </ul>
    </div>
  );
}

export default function EquipmentExpiryAlerts({ alerts = [], loading = false }) {
  const items = alerts || [];
  const expired = items.filter((a) => a.status === "expired");
  const warning = items.filter((a) => a.status === "warning");

  return (
    <Card
      className="border-slate-200 min-w-0 h-full flex flex-col"
      data-testid="equipment-expiry-alerts"
    >
      <CardHeader className="pb-3">
        <CardTitle className="font-display text-lg flex items-center gap-2">
          <CalendarBlank size={20} className="text-amber-600" weight="duotone" />
          Avisos de vencimento
        </CardTitle>
        <p className="text-xs text-slate-500 font-normal mt-1 max-w-prose">
          Pesos padrão e termo-baro-higrômetro vencidos ou a vencer nos próximos 60 dias
        </p>
      </CardHeader>
      <CardContent className="pt-0 flex-1 flex flex-col min-w-0">
        {loading && <p className="text-sm text-slate-500">A carregar…</p>}
        {!loading && items.length === 0 && (
          <p className="text-sm text-slate-500 py-2">
            Nenhum certificado próximo do vencimento.
          </p>
        )}
        {!loading && items.length > 0 && (
          <div className="space-y-5 flex-1 min-w-0">
            <AlertSection title="Vencidos" tone="expired" items={expired} />
            <AlertSection title="Próximos 60 dias" tone="warning" items={warning} />
          </div>
        )}
        <div className="mt-5 pt-4 border-t border-slate-100 flex flex-wrap gap-x-4 gap-y-1 text-xs">
          <Link to={cadastroSectionPath("cert-peso")} className="text-blue-600 hover:underline">
            Certificados de peso padrão
          </Link>
          <Link to={cadastroSectionPath("thermo")} className="text-blue-600 hover:underline">
            Termo-baro-higrômetro
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
