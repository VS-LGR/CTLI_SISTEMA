import React, { useCallback, useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DASHBOARD_CERTIFICATE_STATUSES } from "@/lib/dashboardPortalMetrics";

const PIE_COLORS = ["#1E3A5F", "#2563EB", "#0D9488", "#64748B", "#94A3B8"];

async function countTable(table, tenantId, extra = (q) => q) {
  let q = supabase
    .from(table)
    .select("id", { count: "exact", head: true })
    .eq("tenant_id", tenantId);
  q = extra(q);
  const { count, error } = await q;
  if (error) throw error;
  return count ?? 0;
}

export async function fetchDirectorMetrics(tenantId) {
  const [
    provedores,
    clientes,
    certsBalanca,
    certsPeso,
    propostas,
    proposalRows,
  ] = await Promise.all([
    countTable("supplier_registrations", tenantId),
    countTable("end_customer_registrations", tenantId),
    countTable("calibration_certificates", tenantId, (q) =>
      q.in("status", DASHBOARD_CERTIFICATE_STATUSES),
    ),
    countTable("weight_calibration_certificates", tenantId, (q) =>
      q.in("status", DASHBOARD_CERTIFICATE_STATUSES),
    ).catch(() => 0),
    countTable("commercial_proposals", tenantId),
    supabase
      .from("commercial_proposals")
      .select("total_value, proposal_date, status")
      .eq("tenant_id", tenantId)
      .then(({ data, error }) => {
        if (error) throw error;
        return data || [];
      }),
  ]);

  const revenue = (proposalRows || []).reduce(
    (sum, row) => sum + (Number(row.total_value) || 0),
    0,
  );

  const byMonth = {};
  (proposalRows || []).forEach((row) => {
    const d = String(row.proposal_date || "").slice(0, 7);
    if (!d) return;
    if (!byMonth[d]) byMonth[d] = { month: d, propostas: 0, receita: 0 };
    byMonth[d].propostas += 1;
    byMonth[d].receita += Number(row.total_value) || 0;
  });
  const monthly = Object.values(byMonth)
    .sort((a, b) => a.month.localeCompare(b.month))
    .slice(-12);

  return {
    provedores,
    clientes,
    certificados: certsBalanca + certsPeso,
    certsBalanca,
    certsPeso,
    propostas,
    revenue,
    monthly,
    composition: [
      { name: "Provedores", value: provedores },
      { name: "Clientes", value: clientes },
      { name: "Certificados", value: certsBalanca + certsPeso },
      { name: "Propostas", value: propostas },
    ],
  };
}

function moneyBr(n) {
  return Number(n || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

/**
 * Painel somente leitura para o Diretor — métricas e gráficos do ambiente.
 */
export default function DirectorMetricsDashboard({ tenantId, tenantName }) {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    if (!tenantId) {
      setMetrics(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await fetchDirectorMetrics(tenantId);
      setMetrics(data);
    } catch (e) {
      setError(e?.message || "Falha ao carregar métricas");
      setMetrics(null);
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading && !metrics) {
    return <div className="text-slate-600">Carregando métricas…</div>;
  }

  if (error) {
    return <div className="text-red-600 text-sm">{error}</div>;
  }

  if (!metrics) return null;

  const kpis = [
    { label: "Provedores", value: metrics.provedores },
    { label: "Clientes", value: metrics.clientes },
    { label: "Certificados emitidos", value: metrics.certificados },
    { label: "Propostas", value: metrics.propostas },
    { label: "Receita em propostas", value: moneyBr(metrics.revenue) },
  ];

  return (
    <div className="space-y-6" data-testid="director-metrics-dashboard">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Diretoria</p>
        <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
          Métricas {tenantName ? `— ${tenantName}` : ""}
        </h1>
        <p className="text-sm text-slate-600 mt-1">
          Visualização dos indicadores do ambiente. Sem criação ou edição de documentos.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
        {kpis.map((k) => (
          <Card key={k.label}>
            <CardContent className="p-4">
              <p className="text-xs text-slate-500">{k.label}</p>
              <p className="text-xl font-semibold text-slate-900 mt-1 tabular-nums">{k.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Composição do ambiente</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={metrics.composition}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={90}
                  label={({ name, value }) => `${name}: ${value}`}
                >
                  {metrics.composition.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Propostas e receita (últimos meses)</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            {metrics.monthly.length === 0 ? (
              <p className="text-sm text-slate-500 py-12 text-center">Sem propostas no período.</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={metrics.monthly}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis yAxisId="left" tick={{ fontSize: 11 }} />
                  <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} />
                  <Tooltip
                    formatter={(value, name) =>
                      name === "receita" ? moneyBr(value) : value
                    }
                  />
                  <Bar yAxisId="left" dataKey="propostas" fill="#2563EB" name="propostas" />
                  <Bar yAxisId="right" dataKey="receita" fill="#0D9488" name="receita" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
