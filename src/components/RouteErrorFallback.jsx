import React from "react";
import { useRouteError, Link, isRouteErrorResponse } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowsClockwise } from "@phosphor-icons/react";

function errorMessage(error) {
  if (isRouteErrorResponse(error)) {
    return error.statusText || error.data?.message || `Erro ${error.status}`;
  }
  if (error instanceof Error) return error.message;
  return String(error || "Erro desconhecido");
}

export default function RouteErrorFallback({ title = "Não foi possível abrir esta página" }) {
  const error = useRouteError();
  const detail = errorMessage(error);
  const showDetail = process.env.NODE_ENV !== "production" || /chunk|failed/i.test(detail);

  return (
    <div className="min-h-[50vh] flex items-center justify-center p-8" data-testid="route-error-fallback">
      <div className="max-w-md w-full text-center space-y-4">
        <h1 className="font-display text-xl font-semibold text-slate-900">{title}</h1>
        <p className="text-sm text-slate-600">
          Tente recarregar a página. Se acabou de publicar uma atualização, use Ctrl+Shift+R para limpar a cache.
        </p>
        {showDetail && detail && (
          <p className="text-xs text-slate-500 font-mono break-words bg-slate-100 rounded-md p-3 text-left">
            {detail}
          </p>
        )}
        <div className="flex flex-wrap items-center justify-center gap-2">
          <Button variant="outline" asChild>
            <Link to="/dashboard">
              <ArrowLeft size={16} className="mr-1.5" /> Voltar ao início
            </Link>
          </Button>
          <Button
            className="bg-blue-600 hover:bg-blue-700 text-white"
            onClick={() => window.location.reload()}
          >
            <ArrowsClockwise size={16} className="mr-1.5" /> Recarregar página
          </Button>
        </div>
      </div>
    </div>
  );
}
