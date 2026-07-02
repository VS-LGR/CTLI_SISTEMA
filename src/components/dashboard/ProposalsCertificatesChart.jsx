import React from "react";
import { FileText, Scroll } from "@phosphor-icons/react";

const SERIES = [
  {
    key: "certificados",
    label: "Certificados",
    subtitle: "Aprovados, emitidos ou enviados",
    color: "#2563EB",
    trackColor: "#DBEAFE",
    Icon: Scroll,
  },
  {
    key: "propostas",
    label: "Propostas",
    subtitle: "Propostas comerciais geradas",
    color: "#059669",
    trackColor: "#D1FAE5",
    Icon: FileText,
  },
];

function pct(value, total) {
  if (!total) return 0;
  return Math.round((value / total) * 100);
}

function MetricRow({ item, value, total, maxValue }) {
  const share = pct(value, total);
  const barWidth = maxValue > 0 ? Math.max(value > 0 ? 8 : 0, (value / maxValue) * 100) : 0;
  const { label, subtitle, color, trackColor, Icon } = item;

  return (
    <div className="space-y-2 min-w-0" data-testid={`chart-row-${item.key}`}>
      <div className="flex items-start justify-between gap-3 min-w-0">
        <div className="flex items-start gap-2.5 min-w-0">
          <div
            className="rounded-lg p-2 shrink-0"
            style={{ backgroundColor: trackColor }}
          >
            <Icon size={18} weight="duotone" style={{ color }} />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-slate-800">{label}</p>
            <p className="text-xs text-slate-500 truncate">{subtitle}</p>
          </div>
        </div>
        <div className="text-right shrink-0">
          <p className="text-xl font-display font-bold text-slate-900 tabular-nums">{value}</p>
          <p className="text-[11px] text-slate-500 tabular-nums">{share}% do total</p>
        </div>
      </div>
      <div
        className="h-2.5 w-full rounded-full overflow-hidden"
        style={{ backgroundColor: trackColor }}
        role="presentation"
      >
        <div
          className="h-full rounded-full transition-all duration-500 ease-out"
          style={{ width: `${barWidth}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}

export default function ProposalsCertificatesChart({
  certificatesCount = 0,
  proposalsCount = 0,
  loading = false,
}) {
  const values = {
    certificados: certificatesCount,
    propostas: proposalsCount,
  };
  const total = certificatesCount + proposalsCount;
  const maxValue = Math.max(certificatesCount, proposalsCount, 1);

  if (loading) {
    return (
      <div className="py-10 flex items-center justify-center text-sm text-slate-500">
        A carregar gráfico…
      </div>
    );
  }

  if (total === 0) {
    return (
      <div className="py-10 flex flex-col items-center justify-center text-center px-4">
        <p className="text-sm text-slate-600">Ainda não há propostas nem certificados neste ambiente.</p>
        <p className="text-xs text-slate-400 mt-1">Os registos aparecerão aqui assim que forem criados.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5 min-w-0 w-full" data-testid="proposals-certificates-chart">
      {SERIES.map((item) => (
        <MetricRow
          key={item.key}
          item={item}
          value={values[item.key]}
          total={total}
          maxValue={maxValue}
        />
      ))}
      <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-3 text-xs text-slate-500">
        <span>Total operacional</span>
        <span className="font-medium text-slate-700 tabular-nums">
          {total} registo{total === 1 ? "" : "s"}
        </span>
      </div>
    </div>
  );
}
