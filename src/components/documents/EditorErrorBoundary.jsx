import React from "react";
import { Button } from "@/components/ui/button";
import { ArrowsClockwise } from "@phosphor-icons/react";

export default class EditorErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error("[EditorErrorBoundary]", error, info);
  }

  componentDidUpdate(prevProps) {
    const { resetKey } = this.props;
    if (resetKey !== prevProps.resetKey && this.state.error) {
      this.setState({ error: null });
    }
  }

  render() {
    const { error } = this.state;
    if (error) {
      const detail = error?.message || String(error);
      const showDetail = process.env.NODE_ENV !== "production" || /chunk|prosemirror|eigenpal/i.test(detail);

      return (
        <div
          className="p-6 text-sm border border-red-200 rounded-xl min-h-[200px] bg-red-50"
          data-testid="docx-editor-error"
        >
          <p className="font-medium text-red-900">Não foi possível carregar o editor Word.</p>
          <p className="text-red-800 mt-2">
            Recarregue a página ou volte à lista e abra o documento novamente.
          </p>
          {showDetail && (
            <p className="text-xs text-red-700/80 mt-3 font-mono break-words">{detail}</p>
          )}
          <Button
            type="button"
            variant="outline"
            className="mt-4"
            onClick={() => this.setState({ error: null })}
          >
            <ArrowsClockwise size={16} className="mr-1.5" /> Tentar de novo
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}
