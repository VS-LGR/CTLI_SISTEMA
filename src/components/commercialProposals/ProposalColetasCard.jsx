import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { generateColetasFromProposal } from "@/lib/commercialProposals/commercialProposalToColeta";
import { coletaEditorPath } from "@/lib/coletaRoutes";
import { toast } from "sonner";
import { ClipboardText, ArrowSquareOut } from "@phosphor-icons/react";

export default function ProposalColetasCard({ proposalId, scales = [], onGenerated, userId }) {
  const [generating, setGenerating] = useState(false);

  const pending = scales.filter((s) => !s.collection_id);
  const created = scales.filter((s) => s.collection_id);

  const handleGenerate = async () => {
    if (!proposalId) return toast.error("Salve a proposta antes de gerar coletas");
    setGenerating(true);
    try {
      const result = await generateColetasFromProposal(proposalId, { userId });
      toast.success(`${result.created.length} coleta(s) gerada(s)`);
      onGenerated?.();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setGenerating(false);
    }
  };

  if (!proposalId) return null;

  return (
    <Card className="border-slate-200">
      <CardContent className="p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <ClipboardText size={20} className="text-blue-600" />
            <h3 className="text-sm font-semibold text-slate-800">Coletas de dados (RE-7.2A)</h3>
          </div>
          {pending.length > 0 && (
            <Button type="button" size="sm" onClick={handleGenerate} disabled={generating}>
              {generating ? "Gerando…" : `Gerar ${pending.length} coleta(s)`}
            </Button>
          )}
        </div>
        <p className="text-xs text-slate-600">Uma coleta por balança, com cliente e pontos pré-preenchidos.</p>
        <ul className="space-y-2 text-sm">
          {scales.map((s, i) => (
            <li key={s.id || i} className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2">
              <span>
                <span className="font-medium">#{i + 1}</span> Série {s.serial_number || "—"}
              </span>
              {s.collection_id ? (
                <Link to={coletaEditorPath(s.collection_id)} className="text-blue-600 text-xs inline-flex items-center gap-1 hover:underline">
                  Ver coleta <ArrowSquareOut size={14} />
                </Link>
              ) : (
                <span className="text-xs text-amber-700">Pendente</span>
              )}
            </li>
          ))}
        </ul>
        {created.length === scales.length && scales.length > 0 && (
          <p className="text-xs text-green-700">Todas as coletas foram geradas.</p>
        )}
      </CardContent>
    </Card>
  );
}
