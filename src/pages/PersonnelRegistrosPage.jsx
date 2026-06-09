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
import { MagnifyingGlass, CaretDown, Briefcase, Clock, UsersThree, UserCircle, Hourglass } from "@phosphor-icons/react";
import {
  EMPTY_PERSONNEL_REGISTROS_FILTERS,
  hasActivePersonnelRegistrosFilters,
  sumPersonnelTopicTotals,
  topicStatsEqual,
} from "@/lib/personnelRegistrosListUtils";
import {
  PERSONNEL_REGISTRO_TOPICS,
  getVisibleTopics,
} from "@/lib/personnelRegistrosConfig";
import { usePersonnelComplianceStats } from "@/hooks/usePersonnelComplianceStats";
import { usePersonnelPipeline } from "@/hooks/usePersonnelPipeline";
import PersonnelTopicCountCard from "@/components/personnel/PersonnelTopicCountCard";
import PersonnelEnvKpiCard from "@/components/personnel/PersonnelEnvKpiCard";
import PersonnelOnboardingPipeline from "@/components/personnel/PersonnelOnboardingPipeline";
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

const DEFAULT_OPEN_TOPICS = Object.fromEntries(
  PERSONNEL_REGISTRO_TOPICS.map((t) => [t.id, t.id === "pr-62f"]),
);

const filterFieldClass =
  "h-10 rounded-lg border-slate-200 bg-white text-sm shadow-sm focus-visible:ring-1 focus-visible:ring-slate-300";

export default function PersonnelRegistrosPage({ embedded = false }) {
  const { user } = useAuth();
  const { currentTenantId, currentTenant } = useOutletContext();
  const [searchParams, setSearchParams] = useSearchParams();
  const [filters, setFilters] = useState(EMPTY_PERSONNEL_REGISTROS_FILTERS);
  const [topicStats, setTopicStats] = useState({});
  const [openTopics, setOpenTopics] = useState(DEFAULT_OPEN_TOPICS);

  const { compliance, loading: complianceLoading } = usePersonnelComplianceStats(currentTenantId);
  const { pipeline, loading: pipelineLoading } = usePersonnelPipeline(currentTenantId);

  useEffect(() => {
    const topic = searchParams.get("topic");
    if (topic && PERSONNEL_REGISTRO_TOPICS.some((t) => t.id === topic)) {
      setFilters((prev) => ({ ...prev, topic }));
      setOpenTopics((prev) => ({ ...prev, [topic]: true }));
    }
  }, [searchParams]);

  const onTopicChange = useCallback((topic) => {
    setFilters((prev) => ({ ...prev, topic }));
    if (topic && topic !== "all") {
      setOpenTopics((prev) => ({ ...prev, [topic]: true }));
    }
    setSearchParams((prev) => {
      const p = new URLSearchParams(prev);
      p.set("tab", "registro");
      if (!topic || topic === "all") p.delete("topic");
      else p.set("topic", topic);
      return p;
    }, { replace: true });
  }, [setSearchParams]);

  const onTopicCardClick = useCallback((topicId) => {
    if (filters.topic === topicId) return;
    onTopicChange(topicId);
  }, [filters.topic, onTopicChange]);

  const externalFilters = useMemo(
    () => ({ query: filters.query, date: filters.date }),
    [filters.query, filters.date],
  );

  const visibleTopics = useMemo(
    () => getVisibleTopics(filters.topic),
    [filters.topic],
  );

  const filtersActive = hasActivePersonnelRegistrosFilters(filters);
  const visibleTopicIds = useMemo(
    () => visibleTopics.map((t) => t.id),
    [visibleTopics],
  );

  const scopedTopicStats = useMemo(
    () => Object.fromEntries(
      visibleTopicIds
        .filter((id) => topicStats[id])
        .map((id) => [id, topicStats[id]]),
    ),
    [topicStats, visibleTopicIds],
  );

  const totalFiltered = useMemo(
    () => sumPersonnelTopicTotals(scopedTopicStats),
    [scopedTopicStats],
  );

  const setTopicStatsFor = useCallback((topicId) => (stats) => {
    setTopicStats((prev) => (topicStatsEqual(prev[topicId], stats) ? prev : { ...prev, [topicId]: stats }));
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

  const renderTopicPanel = (topic) => {
    const Panel = PANEL_BY_TOPIC[topic.id];
    if (!Panel) return null;

    const loadEnabled = openTopics[topic.id] !== false;

    return (
      <Panel
        tenantId={currentTenantId}
        tenant={currentTenant}
        compact
        loadEnabled={loadEnabled}
        externalFilters={externalFilters}
        topicId={topic.id}
        onTopicStatsChange={setTopicStatsFor(topic.id)}
      />
    );
  };

  const kpiValue = (key) => (complianceLoading ? "…" : compliance?.[key] ?? 0);

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

      <div className="space-y-3" data-testid="personnel-topic-totals">
        <h2 className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">
          Total por tópico
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3">
          {PERSONNEL_REGISTRO_TOPICS.map((topic) => (
            <PersonnelTopicCountCard
              key={topic.id}
              code={topic.code}
              shortLabel={topic.shortLabel}
              nbrRef={topic.nbrRef}
              value={topicStats[topic.id]?.total ?? 0}
              filtered={filtersActive}
              active={filters.topic === topic.id}
              onClick={() => onTopicCardClick(topic.id)}
              testId={`personnel-topic-${topic.id}`}
            />
          ))}
        </div>
      </div>

      <div className="space-y-3" data-testid="personnel-env-kpis">
        <h2 className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">
          Indicadores do ambiente
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-3">
          <PersonnelEnvKpiCard
            label="Cargos obsoletos"
            value={topicStats["re-62c"]?.obsoletePositions ?? 0}
            hint="Cargos inativos no RE-6.2C"
            icon={Briefcase}
            tint="amber"
            testId="personnel-kpi-obsolete-positions"
          />
          <PersonnelEnvKpiCard
            label="Monitoramento vencido"
            value={kpiValue("overdueMonitoring")}
            hint="Colaboradores com próximo monitoramento vencido"
            icon={Clock}
            tint="slate"
            testId="personnel-kpi-overdue-monitoring"
          />
          <PersonnelEnvKpiCard
            label="Experiência pendente"
            value={kpiValue("pendingExperience")}
            hint="Colaboradores sem avaliação RE-6.2B concluída"
            icon={Hourglass}
            tint="blue"
            testId="personnel-kpi-pending-experience"
          />
          <PersonnelEnvKpiCard
            label="Sem adequação"
            value={kpiValue("withoutCompletedAdequacy")}
            hint="Colaboradores sem adequação RE-6.2A concluída"
            icon={UserCircle}
            tint="amber"
            testId="personnel-kpi-without-adequacy"
          />
          <PersonnelEnvKpiCard
            label="Participantes aprovados"
            value={topicStats["re-62d"]?.totalParticipantsApproved ?? 0}
            hint="Total em listas de presença"
            icon={UsersThree}
            tint="green"
            testId="personnel-kpi-participants-approved"
          />
        </div>
      </div>

      <PersonnelOnboardingPipeline pipeline={pipeline} loading={pipelineLoading} />

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
        {visibleTopics.map((topic) => (
          <Collapsible
            key={topic.id}
            open={openTopics[topic.id] !== false}
            onOpenChange={(open) => setOpenTopics((prev) => ({ ...prev, [topic.id]: open }))}
          >
            <Card className="border-slate-200 overflow-hidden" data-testid={`personnel-topic-panel-${topic.id}`}>
              <CollapsibleTrigger asChild>
                <button
                  type="button"
                  className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-slate-50 transition-colors"
                >
                  <div className="min-w-0">
                    <h2 className="font-semibold text-slate-900">{topic.label}</h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {topic.code}
                      {topicStats[topic.id]?.total != null && (
                        <span className="ml-2">· {topicStats[topic.id].total} registo(s)</span>
                      )}
                    </p>
                  </div>
                  <CaretDown
                    size={18}
                    className={`shrink-0 text-slate-500 transition-transform ${openTopics[topic.id] !== false ? "rotate-180" : ""}`}
                  />
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="px-4 pb-4 pt-0 border-t border-slate-100">
                  {renderTopicPanel(topic)}
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>
        ))}
        {visibleTopics.length === 0 && (
          <Card className="border-slate-200">
            <CardContent className="p-8 text-center text-slate-500 text-sm">
              Nenhum tópico corresponde aos filtros selecionados.
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
