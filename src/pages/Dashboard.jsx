import React, { useEffect, useState } from "react";
import { useOutletContext, Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import api from "@/lib/api";
import { canAccessColeta } from "@/lib/roles";
import { COLETA_LIST_PATH } from "@/lib/coletaRoutes";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, PieChart, Pie, Cell, Legend,
} from "recharts";
import { FileText, FolderSimple, WarningCircle, Clock, CheckCircle, XCircle, Scales } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";

const REQ_COLORS = ["#2563EB", "#0EA5E9", "#10B981", "#F59E0B", "#8B5CF6"];

const KpiCard = ({ label, value, icon: Icon, tint = "blue", testId }) => {
  const tones = {
    blue: "bg-blue-50 text-blue-700 border-blue-100",
    green: "bg-emerald-50 text-emerald-700 border-emerald-100",
    red: "bg-red-50 text-red-700 border-red-100",
    amber: "bg-amber-50 text-amber-700 border-amber-100",
  };
  return (
    <Card className="border-slate-200" data-testid={testId}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div>
            <div className="text-[10px] uppercase tracking-[0.2em] text-slate-500">{label}</div>
            <div className="text-3xl font-display font-bold tracking-tight text-slate-900 mt-2">{value}</div>
          </div>
          <div className={`p-2.5 rounded-md border ${tones[tint]}`}><Icon size={18} weight="duotone" /></div>
        </div>
      </CardContent>
    </Card>
  );
};

const Dashboard = () => {
  const { user } = useAuth();
  const { currentTenantId, currentTenant, tenants } = useOutletContext();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentTenantId) { setLoading(false); return; }
    setLoading(true);
    api.get(`/dashboard?tenant_id=${currentTenantId}`)
      .then((r) => setData(r.data))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [currentTenantId]);

  if (tenants && tenants.length === 0) {
    return (
      <div className="max-w-2xl">
        <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 mb-2">Dashboard</h1>
        <Card className="mt-6">
          <CardContent className="p-8 text-center">
            <FolderSimple size={48} className="mx-auto text-slate-400" />
            <h3 className="font-display text-xl font-semibold mt-4">Nenhum ambiente (cliente) cadastrado</h3>
            <p className="text-sm text-slate-600 mt-2">Para começar, cadastre o primeiro ambiente em <Link to="/admin/clients" className="text-blue-600 underline">Administração CTLI → Ambientes (clientes)</Link>.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!currentTenantId) {
    return <div className="text-slate-600">Selecione um ambiente para visualizar o dashboard.</div>;
  }

  if (loading) return <div className="text-slate-600">Carregando dashboard…</div>;

  const total = data?.total_documents || 0;
  const vigentes = data?.by_status?.vigente || 0;
  const obsoletos = data?.by_status?.obsoleto || 0;
  const nearReview = data?.near_review || [];

  const byReqArr = Object.entries(data?.by_requirement || {}).map(([k, v]) => ({
    name: `${k}. ${v.name?.replace("Requisitos de ", "").replace("Requisitos ", "")}`,
    procedimentos: v.procedimentos,
    registros: v.registros,
    obsoletos: v.obsoletos,
  }));

  const pieData = byReqArr.map((r) => ({
    name: r.name, value: r.procedimentos + r.registros + r.obsoletos,
  })).filter((d) => d.value > 0);

  return (
    <div className="space-y-8" data-testid="dashboard">
      <div>
        <div className="text-[10px] uppercase tracking-[0.2em] text-slate-500">Visão geral</div>
        <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 mt-1">Dashboard</h1>
        <p className="text-sm text-slate-600 mt-1">
          Indicadores documentais do ambiente <span className="font-medium text-slate-800">{currentTenant?.name}</span>.
        </p>
      </div>

      {canAccessColeta(user?.role) && (
        <Card className="border-blue-200 bg-blue-50/40">
          <CardContent className="p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-md bg-blue-600 text-white shrink-0">
                <Scales size={22} weight="duotone" />
              </div>
              <div>
                <h2 className="font-display font-semibold text-slate-900">Coleta RE-7.2A</h2>
                <p className="text-sm text-slate-600 mt-0.5">
                  Formulário de calibração de balança — PR-7.2 Registros.
                </p>
              </div>
            </div>
            <Button asChild className="bg-blue-600 hover:bg-blue-700 shrink-0">
              <Link to={COLETA_LIST_PATH}>Abrir coletas</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard testId="kpi-total" label="Total de documentos" value={total} icon={FileText} tint="blue" />
        <KpiCard testId="kpi-vigentes" label="Vigentes" value={vigentes} icon={CheckCircle} tint="green" />
        <KpiCard testId="kpi-obsoletos" label="Obsoletos" value={obsoletos} icon={XCircle} tint="red" />
        <KpiCard testId="kpi-review" label="Próximos de revisão" value={nearReview.length} icon={WarningCircle} tint="amber" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 border-slate-200">
          <CardHeader className="pb-2">
            <CardTitle className="font-display text-lg">Distribuição por requisito</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={byReqArr}>
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#475569" }} />
                <YAxis tick={{ fontSize: 11, fill: "#475569" }} allowDecimals={false} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="procedimentos" name="Procedimentos" fill="#2563EB" radius={[6, 6, 0, 0]} />
                <Bar dataKey="registros" name="Registros" fill="#0EA5E9" radius={[6, 6, 0, 0]} />
                <Bar dataKey="obsoletos" name="Obsoletos" fill="#DC2626" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-slate-200">
          <CardHeader className="pb-2">
            <CardTitle className="font-display text-lg">Mix de documentos</CardTitle>
          </CardHeader>
          <CardContent>
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={50} outerRadius={90} paddingAngle={2}>
                    {pieData.map((_, i) => <Cell key={i} fill={REQ_COLORS[i % REQ_COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-sm text-slate-500">Sem dados ainda</div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-slate-200">
          <CardHeader className="pb-2">
            <CardTitle className="font-display text-lg flex items-center gap-2"><Clock size={18} /> Últimas atualizações</CardTitle>
          </CardHeader>
          <CardContent>
            {(data?.recent_updates || []).length === 0 && <div className="text-sm text-slate-500">Sem atividade ainda.</div>}
            <ul className="divide-y divide-slate-100">
              {(data?.recent_updates || []).map((r) => (
                <li key={r.id} className="py-3 flex items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <Link to={`/document/${r.id}`} className="font-medium text-sm text-slate-800 hover:text-blue-600 truncate block" data-testid={`recent-doc-${r.id}`}>{r.title}</Link>
                    <div className="text-xs text-slate-500 mt-0.5">
                      Requisito {r.requirement} • {r.section}
                    </div>
                  </div>
                  <Badge variant={r.status === "vigente" ? "default" : "destructive"} className={r.status === "vigente" ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-100" : ""}>
                    {r.status}
                  </Badge>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card className="border-slate-200">
          <CardHeader className="pb-2">
            <CardTitle className="font-display text-lg flex items-center gap-2"><WarningCircle size={18} /> Próximos de revisão</CardTitle>
          </CardHeader>
          <CardContent>
            {nearReview.length === 0 && <div className="text-sm text-slate-500">Nenhum documento próximo da data de revisão.</div>}
            <ul className="divide-y divide-slate-100">
              {nearReview.map((r) => (
                <li key={r.id} className="py-3 flex items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <Link to={`/document/${r.id}`} className="font-medium text-sm text-slate-800 hover:text-blue-600 truncate block">{r.title}</Link>
                    <div className="text-xs text-slate-500 mt-0.5">Revisão em {r.review_date}</div>
                  </div>
                  <Badge className={r.days_left < 0 ? "bg-red-100 text-red-700 hover:bg-red-100" : "bg-amber-100 text-amber-700 hover:bg-amber-100"}>
                    {r.days_left < 0 ? `${Math.abs(r.days_left)}d atrasado` : `${r.days_left}d`}
                  </Badge>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
