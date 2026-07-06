import React, { useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { ChartContainer } from "@/components/ui/chart-container";

const SERIES = [
  { key: "certificates", name: "Certificados Emitidos por Mês", color: "#2563EB" },
  { key: "coletas", name: "Coletas Emitidas por Mês", color: "#F97316" },
  { key: "proposals", name: "Propostas Emitidas por Mês", color: "#22C55E" },
];

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-md border border-slate-200 bg-white px-3 py-2 text-xs shadow-md">
      <div className="font-medium text-slate-800 mb-1">{label}</div>
      {payload.map((p) => (
        <div key={p.dataKey} className="text-slate-600">
          {p.name}: <span className="font-medium tabular-nums">{p.value}</span>
        </div>
      ))}
    </div>
  );
}

export default function MonthlyEmissionsChart({ monthlyEmissions, loading = false }) {
  const chartData = useMemo(() => {
    const months = monthlyEmissions?.months || [];
    const totals = monthlyEmissions?.totals || { proposals: 0, certificates: 0, coletas: 0 };
    const monthRows = months.map((m) => ({
      label: m.label.slice(0, 3),
      fullLabel: m.label,
      proposals: m.proposals,
      certificates: m.certificates,
      coletas: m.coletas,
    }));
    return [
      ...monthRows,
      {
        label: "Total",
        fullLabel: "Total",
        proposals: totals.proposals,
        certificates: totals.certificates,
        coletas: totals.coletas,
      },
    ];
  }, [monthlyEmissions]);

  const hasData = chartData.some(
    (row) => row.proposals > 0 || row.certificates > 0 || row.coletas > 0,
  );

  if (loading) {
    return (
      <div className="h-[280px] sm:h-[320px] flex items-center justify-center text-sm text-slate-500">
        A carregar gráfico…
      </div>
    );
  }

  if (!hasData) {
    return (
      <div className="h-[280px] sm:h-[320px] flex flex-col items-center justify-center text-center px-4">
        <p className="text-sm text-slate-600">Ainda não há emissões registadas neste ano.</p>
        <p className="text-xs text-slate-400 mt-1">Propostas, coletas e certificados aparecerão aqui por mês.</p>
      </div>
    );
  }

  return (
    <div className="min-w-0 w-full" data-testid="monthly-emissions-chart">
      <ChartContainer heightClass="h-[280px] sm:h-[320px]" className="w-full min-w-0">
        {({ width, height }) => (
          <ResponsiveContainer width={width} height={height}>
            <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 10, fill: "#64748b" }}
                interval={0}
                angle={-45}
                textAnchor="end"
                height={56}
              />
              <YAxis tick={{ fontSize: 10, fill: "#64748b" }} width={40} allowDecimals={false} />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
                formatter={(value) => <span className="text-slate-700">{value}</span>}
              />
              {SERIES.map((s) => (
                <Bar key={s.key} dataKey={s.key} name={s.name} fill={s.color} radius={[2, 2, 0, 0]} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        )}
      </ChartContainer>
    </div>
  );
}
