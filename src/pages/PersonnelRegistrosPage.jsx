import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Navigate, useOutletContext, useSearchParams } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { canAccessPersonnel } from "@/lib/roles";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger,
} from "@/components/ui/select";
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  MagnifyingGlass, CaretDown, Briefcase, Clock, UsersThree, UserCircle, Hourglass, X, Funnel,
} from "@phosphor-icons/react";
import {
  EMPTY_PERSONNEL_REGISTROS_FILTERS,
  hasActivePersonnelRegistrosFilters,
  sumPersonnelTopicTotals,
} from "@/lib/personnelRegistrosListUtils";
import {
  PERSONNEL_REGISTRO_TOPICS,
  getVisibleTopics,
  getPersonnelTopicById,
} from "@/lib/personnelRegistrosConfig";
import {
  parsePersonnelTopicsParam,
  formatPersonnelTopicsParam,
} from "@/lib/personnelRegistrosRoutes";
import { usePersonnelComplianceStats } from "@/hooks/usePersonnelComplianceStats";
import { usePersonnelPipeline } from "@/hooks/usePersonnelPipeline";
import { usePersonnelRegistrosTopicStats } from "@/hooks/usePersonnelRegistrosTopicStats";
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
  "re-62f": SelectionsListPanel,
  "re-62d": AttendanceListsListPanel,
};

const DEFAULT_OPEN_TOPICS = Object.fromEntries(
  PERSONNEL_REGISTRO_TOPICS.map((t) => [t.id, t.id === "re-62f"]),
);

const filterFieldClass =
  "h-10 rounded-lg border-slate-200 bg-white text-sm shadow-sm focus-visible:ring-1 focus-visible:ring-slate-300";

function syncTopicsToSearchParams(topics, setSearchParams) {
  setSearchParams((prev) => {
    const p = new URLSearchParams(prev);
    const formatted = formatPersonnelTopicsParam(topics);
    if (formatted) p.set("topic", formatted);
    else p.delete("topic");
    return p;
  }, { replace: true });
}

export default function PersonnelRegistrosPage({ embedded = false, lockedTopic = null }) {
  const { user } = useAuth();
  const { currentTenantId, currentTenant } = useOutletContext();
  const [searchParams, setSearchParams] = useSearchParams();
  const [filters, setFilters] = useState(() => (
    lockedTopic
      ? { ...EMPTY_PERSONNEL_REGISTROS_FILTERS, topics: [lockedTopic] }
      : EMPTY_PERSONNEL_REGISTROS_FILTERS
  ));
  const [openTopics, setOpenTopics] = useState(() => (
    lockedTopic
      ? { ...DEFAULT_OPEN_TOPICS, [lockedTopic]: true }
      : DEFAULT_OPEN_TOPICS
  ));

  const { compliance, loading: complianceLoading } = usePersonnelComplianceStats(currentTenantId);
  const { pipeline, loading: pipelineLoading } = usePersonnelPipeline(currentTenantId);

  const externalFilters = useMemo(
    () => ({ query: filters.query, date: filters.date }),
    [filters.query, filters.date],
  );

  const { topicStats, loading: topicStatsLoading, reload: reloadTopicStats } = usePersonnelRegistrosTopicStats(
    currentTenantId,
    externalFilters,
  );

  useEffect(() => {
    if (lockedTopic) {
      setFilters((prev) => ({ ...prev, topics: [lockedTopic] }));
      setOpenTopics((prev) => ({ ...prev, [lockedTopic]: true }));
      return;
    }
    const topics = parsePersonnelTopicsParam(searchParams.get("topic"));
    if (topics.length > 0) {
      setFilters((prev) => ({ ...prev, topics }));
      setOpenTopics((prev) => {
        const next = { ...prev };
        topics.forEach((id) => { next[id] = true; });
        return next;
      });
    }
  }, [searchParams, lockedTopic]);

  const setTopics = useCallback((topics) => {
    setFilters((prev) => ({ ...prev, topics }));
    syncTopicsToSearchParams(topics, setSearchParams);
  }, [setSearchParams]);

  const toggleTopic = useCallback((topicId) => {
    setFilters((prev) => {
      const has = prev.topics.includes(topicId);
      const topics = has
        ? prev.topics.filter((id) => id !== topicId)
        : [...prev.topics, topicId];
      syncTopicsToSearchParams(topics, setSearchParams);
      if (!has) {
        setOpenTopics((o) => ({ ...o, [topicId]: true }));
      }
      return { ...prev, topics };
    });
  }, [setSearchParams]);

  const removeTopic = useCallback((topicId) => {
    setFilters((prev) => {
      const topics = prev.topics.filter((id) => id !== topicId);
      syncTopicsToSearchParams(topics, setSearchParams);
      return { ...prev, topics };
    });
  }, [setSearchParams]);

  const onSelectTopicAdd = useCallback((value) => {
    if (value === "all") {
      setTopics([]);
      return;
    }
    setFilters((prev) => {
      if (prev.topics.includes(value)) return prev;
      const topics = [...prev.topics, value];
      syncTopicsToSearchParams(topics, setSearchParams);
      setOpenTopics((o) => ({ ...o, [value]: true }));
      return { ...prev, topics };
    });
  }, [setSearchParams, setTopics]);

  const visibleTopics = useMemo(
    () => getVisibleTopics(filters.topics),
    [filters.topics],
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

  const selectTopicLabel = useMemo(() => {
    if (filters.topics.length === 0) return "Todos os tópicos";
    if (filters.topics.length === 1) {
      return getPersonnelTopicById(filters.topics[0])?.shortLabel || "1 tópico";
    }
    return `${filters.topics.length} tópicos selecionados`;
  }, [filters.topics]);

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
    setFilters(lockedTopic
      ? { ...EMPTY_PERSONNEL_REGISTROS_FILTERS, topics: [lockedTopic] }
      : EMPTY_PERSONNEL_REGISTROS_FILTERS);
    if (!lockedTopic) {
      setSearchParams((prev) => {
        const p = new URLSearchParams(prev);
        p.delete("topic");
        return p;
      }, { replace: true });
    }
  };

  const lockedTopicMeta = lockedTopic ? getPersonnelTopicById(lockedTopic) : null;
  const filtersActiveForUi = lockedTopic
    ? Boolean(filters.query.trim() || filters.date)
    : filtersActive;

  const renderTopicPanel = (topic) => {
    const Panel = PANEL_BY_TOPIC[topic.id];
    if (!Panel) return null;

    const loadEnabled = lockedTopic ? true : openTopics[topic.id] !== false;

    return (
      <Panel
        tenantId={currentTenantId}
        tenant={currentTenant}
        compact
        loadEnabled={loadEnabled}
        externalFilters={externalFilters}
        topicId={topic.id}
        onRecordsChange={reloadTopicStats}
      />
    );
  };

  const kpiValue = (key) => (complianceLoading ? "…" : compliance?.[key] ?? 0);
  const topicTotalValue = (topicId) => (topicStatsLoading ? "…" : topicStats[topicId]?.total ?? 0);

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
          {lockedTopicMeta
            ? `${lockedTopicMeta.label} — ${currentTenant?.name || "ambiente"}.`
            : "Registros do módulo 6.2 Pessoal — cargos, adequações, monitoramentos, avaliações, seleções e listas de presença."}
        </p>
      )}

      {!lockedTopic && (
      <div className="space-y-3" data-testid="personnel-topic-totals">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">
            Total por tópico
          </h2>
          {filtersActive && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={clearFilters}
              className="shrink-0 border-slate-300 text-slate-700"
              data-testid="personnel-clear-filters-top"
            >
              <Funnel size={16} className="mr-1.5" />
              Limpar filtros
            </Button>
          )}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3">
          {PERSONNEL_REGISTRO_TOPICS.map((topic) => (
            <PersonnelTopicCountCard
              key={topic.id}
              code={topic.code}
              shortLabel={topic.shortLabel}
              nbrRef={topic.nbrRef}
              value={topicTotalValue(topic.id)}
              filtered={filtersActive}
              active={filters.topics.includes(topic.id)}
              onClick={() => toggleTopic(topic.id)}
              testId={`personnel-topic-${topic.id}`}
            />
          ))}
        </div>
        {filters.topics.length > 0 && (
          <div className="flex flex-wrap items-center gap-2" data-testid="personnel-topic-chips">
            {filters.topics.map((topicId) => {
              const topic = getPersonnelTopicById(topicId);
              if (!topic) return null;
              return (
                <span
                  key={topicId}
                  className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-800"
                >
                  {topic.shortLabel}
                  <button
                    type="button"
                    onClick={() => removeTopic(topicId)}
                    className="rounded-full p-0.5 hover:bg-blue-100 transition-colors"
                    aria-label={`Remover filtro ${topic.shortLabel}`}
                  >
                    <X size={12} weight="bold" />
                  </button>
                </span>
              );
            })}
          </div>
        )}
      </div>
      )}

      {!lockedTopic && (
      <div className="space-y-3" data-testid="personnel-env-kpis">
        <h2 className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">
          Indicadores do ambiente
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-3">
          <PersonnelEnvKpiCard
            label="Cargos obsoletos"
            value={topicStatsLoading ? "…" : topicStats["re-62c"]?.obsoletePositions ?? 0}
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
            value={topicStatsLoading ? "…" : topicStats["re-62d"]?.totalParticipantsApproved ?? 0}
            hint="Total em listas de presença"
            icon={UsersThree}
            tint="green"
            testId="personnel-kpi-participants-approved"
          />
        </div>
      </div>
      )}

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
            {!lockedTopic && (
              <Select onValueChange={onSelectTopicAdd}>
                <SelectTrigger className={`${filterFieldClass} w-full sm:w-[16rem]`}>
                  <span className="truncate text-left">{selectTopicLabel}</span>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os tópicos</SelectItem>
                  {PERSONNEL_REGISTRO_TOPICS.map((t) => (
                    <SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <Input
              type="date"
              value={filters.date}
              onChange={(e) => setFilters((f) => ({ ...f, date: e.target.value }))}
              className={`${filterFieldClass} w-full sm:w-[11.5rem] text-slate-600 ${!filters.date ? "text-slate-400" : ""}`}
              title="Filtrar por data do registo"
            />
            {filtersActiveForUi && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={clearFilters}
                className="shrink-0 border-slate-300 text-slate-700 h-10"
                data-testid="personnel-clear-filters-bar"
              >
                <X size={16} className="mr-1.5" />
                Limpar filtros
              </Button>
            )}
          </div>
        </div>
        {filtersActiveForUi && (
          <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
            <p className="text-xs text-slate-500">
              {totalFiltered} registo(s) após filtros
            </p>
          </div>
        )}
      </div>

      <div className="space-y-4">
        {lockedTopic ? (
          visibleTopics.map((topic) => (
            <Card key={topic.id} className="border-slate-200 overflow-hidden" data-testid={`personnel-topic-panel-${topic.id}`}>
              <CardContent className="p-4">
                {renderTopicPanel(topic)}
              </CardContent>
            </Card>
          ))
        ) : (
          visibleTopics.map((topic) => (
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
                        {!topicStatsLoading && topicStats[topic.id]?.total != null && (
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
          ))
        )}
        {visibleTopics.length === 0 && (
          <Card className="border-slate-200">
            <CardContent className="p-8 text-center text-slate-500 text-sm">
              Nenhum tópico corresponde aos filtros selecionados.
            </CardContent>
          </Card>
        )}
      </div>

      {!lockedTopic && (
        <div className="mt-6" data-testid="personnel-onboarding-pipeline">
          <PersonnelOnboardingPipeline pipeline={pipeline} loading={pipelineLoading} />
        </div>
      )}
    </div>
  );
}
