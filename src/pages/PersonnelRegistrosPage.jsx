import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Navigate, useOutletContext, useSearchParams } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { canAccessPersonnel } from "@/lib/roles";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { MagnifyingGlass, CaretDown, UsersThree, Folders, Funnel } from "@phosphor-icons/react";
import {
  EMPTY_PERSONNEL_REGISTROS_FILTERS,
  hasActivePersonnelRegistrosFilters,
} from "@/lib/personnelRegistrosListUtils";
import {
  PERSONNEL_REGISTRO_TOPICS,
  getVisibleGroupsAndTopics,
} from "@/lib/personnelRegistrosConfig";
import PositionsListPanel from "@/components/personnel/PositionsListPanel";
import AdequaciesListPanel from "@/components/personnel/AdequaciesListPanel";
import MonitoringsListPanel from "@/components/personnel/MonitoringsListPanel";
import ExperienceEvaluationsListPanel from "@/components/personnel/ExperienceEvaluationsListPanel";
import SelectionsListPanel from "@/components/personnel/SelectionsListPanel";
import AttendanceListsListPanel from "@/components/personnel/AttendanceListsListPanel";

const PANEL_BY_TOPIC = {
  "re-62c": PositionsListPanel,
  "re-62a": AdequaciesListPanel,
  "re-62e": MonitoringsListPanel,
  "re-62b": ExperienceEvaluationsListPanel,
  "pr-62f": SelectionsListPanel,
  "re-62d": AttendanceListsListPanel,
};

const filterFieldClass =
  "h-10 rounded-lg border-slate-200 bg-white text-sm shadow-sm focus-visible:ring-1 focus-visible:ring-slate-300";

function KpiCard({ label, value, icon: Icon, tint = "blue" }) {
  const tones = {
    blue: "bg-blue-50 text-blue-700 border-blue-100",
    slate: "bg-slate-50 text-slate-700 border-slate-100",
    green: "bg-emerald-50 text-emerald-700 border-emerald-100",
  };
  return (
    <Card className="border-slate-200">
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="text-[10px] uppercase tracking-[0.18em] text-slate-500">{label}</div>
            <div className="text-2xl sm:text-3xl font-display font-bold tracking-tight text-slate-900 mt-1.5">
              {value}
            </div>
          </div>
          <div className={`p-2 rounded-md border shrink-0 ${tones[tint]}`}>
            <Icon size={18} weight="duotone" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function PersonnelRegistrosPage({ embedded = false }) {
  const { user } = useAuth();
  const { currentTenantId, currentTenant } = useOutletContext();
  const [searchParams, setSearchParams] = useSearchParams();
  const [filters, setFilters] = useState(EMPTY_PERSONNEL_REGISTROS_FILTERS);
  const [rowCounts, setRowCounts] = useState({});
  const [openGroups, setOpenGroups] = useState({
    "cargos-competencia": true,
    acompanhamento: true,
    "selecao-capacitacao": true,
  });

  useEffect(() => {
    const topic = searchParams.get("topic");
    if (topic && PERSONNEL_REGISTRO_TOPICS.some((t) => t.id === topic)) {
      setFilters((prev) => ({ ...prev, topic }));
    }
  }, [searchParams]);

  const onTopicChange = useCallback((topic) => {
    setFilters((prev) => ({ ...prev, topic }));
    setSearchParams((prev) => {
      const p = new URLSearchParams(prev);
      p.set("tab", "registro");
      if (!topic || topic === "all") p.delete("topic");
      else p.set("topic", topic);
      return p;
    }, { replace: true });
  }, [setSearchParams]);

  const externalFilters = useMemo(
    () => ({ query: filters.query, date: filters.date }),
    [filters.query, filters.date],
  );

  const visibleGroups = useMemo(
    () => getVisibleGroupsAndTopics(filters.topic),
    [filters.topic],
  );

  const filtersActive = hasActivePersonnelRegistrosFilters(filters);
  const totalFiltered = useMemo(
    () => Object.values(rowCounts).reduce((a, b) => a + b, 0),
    [rowCounts],
  );

  const setTopicCount = useCallback((topicId) => (count) => {
    setRowCounts((prev) => (prev[topicId] === count ? prev : { ...prev, [topicId]: count }));
  }, []);

  if (!canAccessPersonnel(user?.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  if (!currentTenantId) {
    return (
      <div className="text-center py-16 text-slate-500">
        Selecione um ambiente (cliente) no topo para aceder aos registros de pessoal.
      </div>
    );
  }

  const clearFilters = () => {
    setFilters(EMPTY_PERSONNEL_REGISTROS_FILTERS);
    setSearchParams((prev) => {
      const p = new URLSearchParams(prev);
      p.set("tab", "registro");
      p.delete("topic");
      return p;
    }, { replace: true });
  };

  return (
    <div className="space-y-6 min-w-0" data-testid="personnel-registros-page">
      {!embedded && (
        <div>
          <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500">6.2 Pessoal</p>
          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 mt-1">
            Registros
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Documentos RE/PR do módulo Pessoal — {currentTenant?.name || "ambiente"}.
          </p>
        </div>
      )}

      {embedded && (
        <p className="text-sm text-slate-600">
          Registros do módulo 6.2 Pessoal — cargos, adequações, monitoramentos, avaliações, seleções e listas de presença.
        </p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <KpiCard
          label={filtersActive ? "Registros (filtrados)" : "Registros visíveis"}
          value={totalFiltered}
          icon={UsersThree}
        />
        <KpiCard
          label="Categorias visíveis"
          value={visibleGroups.reduce((n, g) => n + g.topics.length, 0)}
          icon={Folders}
          tint="slate"
        />
        <KpiCard
          label="Filtros ativos"
          value={filtersActive ? "Sim" : "Não"}
          icon={Funnel}
          tint={filtersActive ? "green" : "slate"}
        />
      </div>

      <div
        className="rounded-xl border border-slate-200 bg-white p-3 sm:p-4 shadow-sm"
        data-testid="personnel-registros-filters"
      >
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative min-w-0 flex-1">
            <MagnifyingGlass
              size={18}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              aria-hidden
            />
            <Input
              value={filters.query}
              onChange={(e) => setFilters((f) => ({ ...f, query: e.target.value }))}
              placeholder="Buscar por nome, matrícula, cargo, código do documento…"
              className={`${filterFieldClass} pl-10`}
            />
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center shrink-0">
            <Select value={filters.topic} onValueChange={onTopicChange}>
              <SelectTrigger className={`${filterFieldClass} w-full sm:w-[16rem]`}>
                <SelectValue placeholder="Tópico" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os tópicos</SelectItem>
                {PERSONNEL_REGISTRO_TOPICS.map((t) => (
                  <SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              type="date"
              value={filters.date}
              onChange={(e) => setFilters((f) => ({ ...f, date: e.target.value }))}
              className={`${filterFieldClass} w-full sm:w-[11.5rem] text-slate-600 ${!filters.date ? "text-slate-400" : ""}`}
              title="Filtrar por data do registo"
            />
          </div>
        </div>
        {filtersActive && (
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3">
            <p className="text-xs text-slate-500">
              {totalFiltered} registo(s) após filtros
            </p>
            <Button type="button" variant="ghost" size="sm" onClick={clearFilters}>
              Limpar filtros
            </Button>
          </div>
        )}
      </div>

      <div className="space-y-4">
        {visibleGroups.map((group) => (
          <Collapsible
            key={group.id}
            open={openGroups[group.id] !== false}
            onOpenChange={(open) => setOpenGroups((prev) => ({ ...prev, [group.id]: open }))}
          >
            <Card className="border-slate-200 overflow-hidden">
              <CollapsibleTrigger asChild>
                <button
                  type="button"
                  className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-slate-50 transition-colors"
                >
                  <div>
                    <h2 className="font-semibold text-slate-900">{group.label}</h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {group.topics.map((t) => t.code).join(" · ")}
                    </p>
                  </div>
                  <CaretDown
                    size={18}
                    className={`shrink-0 text-slate-500 transition-transform ${openGroups[group.id] !== false ? "rotate-180" : ""}`}
                  />
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="px-4 pb-4 pt-0 space-y-6 border-t border-slate-100">
                  {group.topics.map((topic) => {
                    const Panel = PANEL_BY_TOPIC[topic.id];
                    if (!Panel) return null;
                    return (
                      <div key={topic.id} className="space-y-2">
                        <h3 className="text-sm font-medium text-slate-700">{topic.label}</h3>
                        <Panel
                          tenantId={currentTenantId}
                          tenant={currentTenant}
                          compact
                          externalFilters={externalFilters}
                          topicId={topic.id}
                          onRowCountChange={setTopicCount(topic.id)}
                        />
                      </div>
                    );
                  })}
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>
        ))}
        {visibleGroups.length === 0 && (
          <Card className="border-slate-200">
            <CardContent className="p-8 text-center text-slate-500 text-sm">
              Nenhuma categoria corresponde aos filtros selecionados.
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
