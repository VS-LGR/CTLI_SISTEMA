import React from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowsClockwise } from "@phosphor-icons/react";

/**
 * Error boundary para páginas com BrowserRouter (sem data router / useRouteError).
 */
export default class PageErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error("[PageErrorBoundary]", error, info);
  }

  render() {
    const { error } = this.state;
    if (error) {
      const detail = error?.message || String(error);
      const showDetail = process.env.NODE_ENV !== "production" || /chunk|failed|navigation/i.test(detail);

      return (
        <div className="min-h-[50vh] flex items-center justify-center p-8" data-testid="page-error-boundary">
          <div className="max-w-md w-full text-center space-y-4">
            <h1 className="font-display text-xl font-semibold text-slate-900">
              {this.props.title || "Não foi possível abrir esta página"}
            </h1>
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

    return this.props.children;
  }
}
