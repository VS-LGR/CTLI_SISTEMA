import React from "react";
import { Link, Navigate, useOutletContext } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { isSupabaseAuthMode } from "@/lib/api";
import { canAccessColeta } from "@/lib/roles";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Scales, ClipboardText, ArrowRight, Microphone } from "@phosphor-icons/react";
import { COLETA_LIST_PATH, COLETA_NEW_PATH } from "@/lib/coletaRoutes";
import {
  WEIGHT_COLETA_LIST_PATH,
  WEIGHT_COLETA_NEW_PATH,
} from "@/lib/weightCalibration/weightColetaRoutes";

/**
 * Dashboard de entrada das coletas PR-7.2 (balanças × pesos-padrão).
 */
export default function ColetaHubPage({ embedded = false }) {
  const { user } = useAuth();
  const { currentTenantId } = useOutletContext() || {};

  if (!canAccessColeta(user?.role, user)) {
    return <Navigate to="/dashboard" replace />;
  }

  if (!isSupabaseAuthMode) {
    return (
      <div className="max-w-lg mx-auto text-center py-16 text-slate-600">
        <p className="font-medium text-slate-900 mb-2">Coleta requer autenticação Supabase</p>
      </div>
    );
  }

  if (!currentTenantId) {
    return (
      <div className="text-center py-16 text-slate-500">
        Selecione um ambiente (cliente) no topo para aceder às coletas.
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl w-full min-w-0" data-testid="coleta-hub-page">
      <div>
        {!embedded && (
          <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500">PR-7.2</p>
        )}
        <h1 className={`${embedded ? "text-xl" : "font-display text-2xl sm:text-3xl"} font-bold tracking-tight text-slate-900 ${embedded ? "" : "mt-1"}`}>
          Coleta de dados
        </h1>
        <p className="text-sm text-slate-600 mt-1">
          Escolha o tipo de coleta a registar ou consultar neste ambiente.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="border-slate-200 hover:border-blue-300 transition-colors">
          <CardContent className="p-5 sm:p-6 flex flex-col h-full gap-4">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-md border border-blue-100 bg-blue-50 text-blue-700 shrink-0">
                <ClipboardText size={22} weight="duotone" />
              </div>
              <div className="min-w-0">
                <h2 className="font-semibold text-slate-900 text-lg leading-snug">
                  Calibração de balanças
                </h2>
                <p className="text-sm text-slate-600 mt-1">
                  Coleta RE-7.2A — pontos, pesos de referência e condições ambientais da balança.
                </p>
              </div>
            </div>
            <div className="mt-auto flex flex-wrap gap-2">
              <Button asChild className="bg-blue-600 hover:bg-blue-700">
                <Link to={COLETA_LIST_PATH}>
                  Abrir listagem <ArrowRight size={16} className="ml-1" />
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link to={COLETA_NEW_PATH}>Nova coleta</Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 hover:border-teal-300 transition-colors">
          <CardContent className="p-5 sm:p-6 flex flex-col h-full gap-4">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-md border border-teal-100 bg-teal-50 text-teal-800 shrink-0">
                <Scales size={22} weight="duotone" />
              </div>
              <div className="min-w-0">
                <h2 className="font-semibold text-slate-900 text-lg leading-snug">
                  Calibração de pesos-padrão
                </h2>
                <p className="text-sm text-slate-600 mt-1">
                  Coleta RE-5.4.2A — ensaio ABA (PR-7.2 Rev.06), com opção de preenchimento por voz.
                </p>
              </div>
            </div>
            <p className="text-xs text-teal-900/80 flex items-center gap-1.5">
              <Microphone size={14} />
              Voz disponível no editor da coleta de pesos
            </p>
            <div className="mt-auto flex flex-wrap gap-2">
              <Button asChild className="bg-teal-700 hover:bg-teal-800">
                <Link to={WEIGHT_COLETA_LIST_PATH}>
                  Abrir listagem <ArrowRight size={16} className="ml-1" />
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link to={WEIGHT_COLETA_NEW_PATH}>Nova coleta</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
