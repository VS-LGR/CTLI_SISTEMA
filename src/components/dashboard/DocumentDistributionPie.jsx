import React from "react";
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip,
} from "recharts";

const REQ_COLORS = ["#2563EB", "#0EA5E9", "#10B981", "#F59E0B", "#8B5CF6"];

function CustomTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const p = payload[0];
  return (
    <div className="rounded-md border border-slate-200 bg-white px-3 py-2 text-xs shadow-md">
      <div className="font-medium text-slate-800">{p.name}</div>
      <div className="text-slate-600">{p.value} documento(s) vigente(s)</div>
    </div>
  );
}

/**
 * @param {{ byRequirement: Record<string, { name: string, procedimentos: number, registros: number }> }} props
 */
export default function DocumentDistributionPie({ byRequirement = {} }) {
  const pieData = Object.entries(byRequirement)
    .map(([req, v]) => ({
      name: `${req}. ${(v.name || "")
        .replace("Requisitos de ", "")
        .replace("Requisitos ", "")}`,
      value: (v.procedimentos || 0) + (v.registros || 0),
      req,
    }))
    .filter((d) => d.value > 0);

  const totalVigentes = pieData.reduce((s, d) => s + d.value, 0);

  if (pieData.length === 0) {
    return (
      <div className="h-[260px] sm:h-[300px] flex items-center justify-center text-sm text-slate-500">
        Sem documentos vigentes por requisito
      </div>
    );
  }

  return (
    <div
      className="flex flex-col lg:flex-row lg:items-center gap-4 min-w-0"
      data-testid="dashboard-pie-chart"
    >
      <div className="relative flex-1 min-w-0 h-[260px] sm:h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={pieData}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius="52%"
              outerRadius="78%"
              paddingAngle={3}
              stroke="#fff"
              strokeWidth={2}
            >
              {pieData.map((entry, i) => (
                <Cell key={entry.req} fill={REQ_COLORS[i % REQ_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>
        <div
          className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center px-4"
          aria-hidden
        >
          <span className="text-[10px] uppercase tracking-wider text-slate-500">Vigentes</span>
          <span className="text-2xl sm:text-3xl font-display font-bold text-slate-900">{totalVigentes}</span>
        </div>
      </div>
      <ul className="flex flex-wrap lg:flex-col gap-2 lg:gap-2.5 shrink-0 lg:max-w-[11rem] text-xs">
        {pieData.map((d, i) => (
          <li key={d.req} className="flex items-center gap-2 min-w-0">
            <span
              className="w-2.5 h-2.5 rounded-full shrink-0"
              style={{ backgroundColor: REQ_COLORS[i % REQ_COLORS.length] }}
            />
            <span className="text-slate-700 truncate" title={d.name}>
              {d.name}
              <span className="text-slate-500 ml-1">({d.value})</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
