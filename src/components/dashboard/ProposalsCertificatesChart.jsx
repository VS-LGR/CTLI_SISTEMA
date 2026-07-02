import React from "react";
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip,
} from "recharts";
import { ChartContainer } from "@/components/ui/chart-container";

const COLORS = {
  certificados: "#2563EB",
  propostas: "#10B981",
};

function CustomTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const p = payload[0];
  return (
    <div className="rounded-md border border-slate-200 bg-white px-3 py-2 text-xs shadow-md">
      <div className="font-medium text-slate-800">{p.name}</div>
      <div className="text-slate-600">{p.value} registo(s)</div>
    </div>
  );
}

function pieRadii(width, height) {
  const base = Math.min(width, height);
  const outerRadius = Math.max(40, Math.floor(base * 0.38));
  const innerRadius = Math.max(24, Math.floor(outerRadius * 0.65));
  return { innerRadius, outerRadius };
}

export default function ProposalsCertificatesChart({
  certificatesCount = 0,
  proposalsCount = 0,
  loading = false,
}) {
  const pieData = [
    { name: "Certificados emitidos", value: certificatesCount, key: "certificados" },
    { name: "Propostas geradas", value: proposalsCount, key: "propostas" },
  ].filter((d) => d.value > 0);

  const total = certificatesCount + proposalsCount;

  if (loading) {
    return (
      <div className="h-[200px] sm:h-[220px] flex items-center justify-center text-sm text-slate-500">
        A carregar gráfico…
      </div>
    );
  }

  if (total === 0) {
    return (
      <div className="h-[200px] sm:h-[220px] flex items-center justify-center text-sm text-slate-500">
        Ainda não há propostas nem certificados registados neste ambiente.
      </div>
    );
  }

  return (
    <div
      className="flex flex-col sm:flex-row sm:items-center gap-4 min-w-0 w-full"
      data-testid="proposals-certificates-chart"
    >
      <ChartContainer
        heightClass="h-[200px] sm:h-[220px]"
        className="mx-auto w-full max-w-full sm:flex-1"
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
                    cx={width / 2}
                    cy={height / 2}
                    innerRadius={innerRadius}
                    outerRadius={outerRadius}
                    paddingAngle={3}
                    stroke="#fff"
                    strokeWidth={2}
                  >
                    {pieData.map((entry) => (
                      <Cell key={entry.key} fill={COLORS[entry.key]} />
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
                <span className="text-2xl sm:text-3xl font-display font-bold text-slate-900">{total}</span>
              </div>
            </>
          );
        }}
      </ChartContainer>
      <ul className="flex flex-wrap sm:flex-col gap-2 sm:gap-2.5 w-full sm:w-auto shrink-0 sm:max-w-[12rem] text-xs min-w-0">
        <li className="flex items-center gap-2 min-w-0">
          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: COLORS.certificados }} />
          <span className="text-slate-700">
            Certificados
            <span className="text-slate-500 ml-1">({certificatesCount})</span>
          </span>
        </li>
        <li className="flex items-center gap-2 min-w-0">
          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: COLORS.propostas }} />
          <span className="text-slate-700">
            Propostas
            <span className="text-slate-500 ml-1">({proposalsCount})</span>
          </span>
        </li>
      </ul>
    </div>
  );
}
