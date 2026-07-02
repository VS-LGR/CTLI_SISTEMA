import React from "react";
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip,
} from "recharts";
import { ChartContainer } from "@/components/ui/chart-container";

const COLORS = {
  certificados: "#2563EB",
  propostas: "#059669",
};

const SERIES = [
  { key: "certificados", name: "Certificados", color: COLORS.certificados },
  { key: "propostas", name: "Propostas", color: COLORS.propostas },
];

function pct(value, total) {
  if (!total) return 0;
  return Math.round((value / total) * 100);
}

function CustomTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const p = payload[0];
  const total = payload[0]?.payload?.total ?? 0;
  const share = pct(p.value, total);
  return (
    <div className="rounded-md border border-slate-200 bg-white px-3 py-2 text-xs shadow-md">
      <div className="font-medium text-slate-800">{p.name}</div>
      <div className="text-slate-600">{p.value} registo(s) · {share}%</div>
    </div>
  );
}

function pieRadii(width, height) {
  const base = Math.min(width, height);
  const outerRadius = Math.max(52, Math.floor(base * 0.42));
  const innerRadius = Math.max(32, Math.floor(outerRadius * 0.62));
  return { innerRadius, outerRadius };
}

function renderLegend({ payload }) {
  if (!payload?.length) return null;
  return (
    <ul className="flex flex-col gap-2.5 w-full min-w-0">
      {payload.map((entry) => {
        const share = entry.payload?.share ?? 0;
        return (
          <li key={entry.value} className="flex items-center gap-2.5 min-w-0">
            <span
              className="w-3 h-3 rounded-full shrink-0 ring-2 ring-white shadow-sm"
              style={{ backgroundColor: entry.color }}
            />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-slate-800 truncate">{entry.value}</p>
              <p className="text-xs text-slate-500 tabular-nums">
                {entry.payload?.value ?? 0} · {share}%
              </p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

export default function ProposalsCertificatesChart({
  certificatesCount = 0,
  proposalsCount = 0,
  loading = false,
}) {
  const total = certificatesCount + proposalsCount;

  const pieData = SERIES
    .map((s) => ({
      name: s.name,
      value: s.key === "certificados" ? certificatesCount : proposalsCount,
      key: s.key,
      fill: s.color,
      total,
      share: pct(s.key === "certificados" ? certificatesCount : proposalsCount, total),
    }))
    .filter((d) => d.value > 0);

  if (loading) {
    return (
      <div className="h-[220px] sm:h-[240px] flex items-center justify-center text-sm text-slate-500">
        A carregar gráfico…
      </div>
    );
  }

  if (total === 0) {
    return (
      <div className="h-[220px] sm:h-[240px] flex flex-col items-center justify-center text-center px-4">
        <p className="text-sm text-slate-600">Ainda não há propostas nem certificados neste ambiente.</p>
        <p className="text-xs text-slate-400 mt-1">Os registos aparecerão aqui assim que forem criados.</p>
      </div>
    );
  }

  return (
    <div
      className="flex flex-col md:flex-row md:items-center gap-5 min-w-0 w-full"
      data-testid="proposals-certificates-chart"
    >
      <ChartContainer
        heightClass="h-[220px] sm:h-[240px]"
        className="mx-auto w-full max-w-[280px] md:max-w-none md:flex-1 md:min-w-[200px]"
      >
        {({ width, height }) => {
          const { innerRadius, outerRadius } = pieRadii(width, height);
          return (
            <>
              <ResponsiveContainer width={width} height={height}>
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={innerRadius}
                    outerRadius={outerRadius}
                    paddingAngle={pieData.length > 1 ? 4 : 0}
                    stroke="#fff"
                    strokeWidth={2}
                  >
                    {pieData.map((entry) => (
                      <Cell key={entry.key} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div
                className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center px-4"
                aria-hidden
              >
                <span className="text-[10px] uppercase tracking-wider text-slate-500">Total</span>
                <span className="text-2xl sm:text-3xl font-display font-bold text-slate-900 tabular-nums">
                  {total}
                </span>
              </div>
            </>
          );
        }}
      </ChartContainer>

      <div className="md:w-[11rem] shrink-0 min-w-0 w-full">
        {renderLegend({
          payload: SERIES.map((s) => {
            const value = s.key === "certificados" ? certificatesCount : proposalsCount;
            return {
              value: s.name,
              color: s.color,
              payload: { value, share: pct(value, total) },
            };
          }),
        })}
      </div>
    </div>
  );
}
