import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  generateColetasFromProposal,
  generateColetaFromProposalScale,
} from "@/lib/commercialProposals/commercialProposalToColeta";
import { coletaEditorPath } from "@/lib/coletaRoutes";
import { canAccessColeta } from "@/lib/roles";
import { toast } from "sonner";
import { ClipboardText, ArrowSquareOut, Plus } from "@phosphor-icons/react";

export default function ProposalColetasCard({ proposalId, scales = [], onGenerated, userId }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [generatingAll, setGeneratingAll] = useState(false);
  const [generatingScaleId, setGeneratingScaleId] = useState(null);

  const pending = scales.filter((s) => !s.collection_id);
  const created = scales.filter((s) => s.collection_id);
  const canOpenColeta = canAccessColeta(user?.role);

  const openColeta = (collectionId) => {
    if (!canOpenColeta) {
      toast.info("Coleta criada. Um técnico de campo pode preenchê-la em PR-7.2 → Coleta de dados.");
      return;
    }
    navigate(coletaEditorPath(collectionId));
  };

  const handleGenerateAll = async () => {
    if (!proposalId) return toast.error("Salve a proposta antes de gerar coletas");
    setGeneratingAll(true);
    try {
      const result = await generateColetasFromProposal(proposalId, { userId });
      if (!result.created.length) {
        toast.info("Todas as balanças já possuem coleta vinculada");
      } else {
        toast.success(`${result.created.length} coleta(s) gerada(s) com dados da proposta`);
        if (result.created.length === 1 && canOpenColeta) {
          openColeta(result.created[0].collection.id);
        }
      }
      onGenerated?.();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setGeneratingAll(false);
    }
  };

  const handleGenerateOne = async (scale) => {
    if (!proposalId) return toast.error("Salve a proposta antes de gerar coleta");
    if (!scale.id) return toast.error("Salve a proposta para vincular a balança antes de gerar coleta");
    setGeneratingScaleId(scale.id);
    try {
      const { collection } = await generateColetaFromProposalScale(proposalId, scale.id, { userId });
      toast.success("Coleta gerada com cliente, balança e pontos pré-preenchidos");
      onGenerated?.();
      openColeta(collection.id);
    } catch (e) {
      toast.error(e.message);
    } finally {
      setGeneratingScaleId(null);
    }
  };

  if (!proposalId) {
    return (
      <Card className="border-slate-200 border-dashed">
        <CardContent className="p-4 text-sm text-slate-600">
          Guarde a proposta para gerar coletas de dados (RE-7.2A) com dados pré-preenchidos.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-slate-200">
      <CardContent className="p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <ClipboardText size={20} className="text-blue-600" />
            <h3 className="text-sm font-semibold text-slate-800">Coletas de dados (RE-7.2A)</h3>
          </div>
          {pending.length > 1 && (
            <Button type="button" size="sm" variant="outline" onClick={handleGenerateAll} disabled={generatingAll}>
              {generatingAll ? "Gerando…" : `Gerar todas (${pending.length})`}
            </Button>
          )}
        </div>
        <p className="text-xs text-slate-600">
          Gere uma coleta por balança. Cliente, dados da balança e pontos de calibração da proposta serão copiados automaticamente.
        </p>
        <ul className="space-y-2 text-sm">
          {scales.map((s, i) => (
            <li
              key={s.id || `scale-${i}`}
              className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-slate-100 bg-slate-50/50 px-3 py-2"
            >
              <span>
                <span className="font-medium">Balança {i + 1}</span>
                <span className="text-slate-500 ml-2 font-mono text-xs">Série {s.serial_number || "—"}</span>
              </span>
              <div className="flex items-center gap-2">
                {s.collection_id ? (
                  canOpenColeta ? (
                    <Button asChild variant="outline" size="sm">
                      <Link to={coletaEditorPath(s.collection_id)}>
                        Abrir coleta <ArrowSquareOut size={14} className="ml-1" />
                      </Link>
                    </Button>
                  ) : (
                    <span className="text-xs text-green-700">Coleta criada</span>
                  )
                ) : (
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => handleGenerateOne(s)}
                    disabled={generatingAll || generatingScaleId === s.id}
                  >
                    <Plus size={14} className="mr-1" />
                    {generatingScaleId === s.id ? "Gerando…" : "Gerar coleta"}
                  </Button>
                )}
              </div>
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
