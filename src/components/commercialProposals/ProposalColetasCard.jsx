import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  generateColetasFromProposal,
  generateColetaFromProposalScale,
} from "@/lib/commercialProposals/commercialProposalToColeta";
import { generateWeightColetaFromProposalItem } from "@/lib/commercialProposals/commercialProposalToWeightColeta";
import { coletaEditorPath } from "@/lib/coletaRoutes";
import { weightColetaEditorPath } from "@/lib/weightCalibration/weightColetaRoutes";
import { canAccessColeta } from "@/lib/roles";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "sonner";
import { ClipboardText, ArrowSquareOut, Plus } from "@phosphor-icons/react";

const STATUS_BADGE = {
  pending: { label: "Coleta pendente", className: "text-amber-700 bg-amber-50 border-amber-200" },
  rascunho: { label: "Coleta gerada", className: "text-blue-700 bg-blue-50 border-blue-200" },
  preenchida: { label: "Coleta preenchida", className: "text-emerald-700 bg-emerald-50 border-emerald-200" },
  conferida: { label: "Coleta conferida", className: "text-emerald-800 bg-emerald-50 border-emerald-300" },
  aprovada_certificado: { label: "Aguardando certificado", className: "text-indigo-700 bg-indigo-50 border-indigo-200" },
  certificado_gerado: { label: "Certificado gerado", className: "text-green-800 bg-green-50 border-green-300" },
  cancelada: { label: "Cancelada", className: "text-slate-600 bg-slate-50 border-slate-200" },
};

function StatusBadge({ status }) {
  const meta = STATUS_BADGE[status] || STATUS_BADGE.pending;
  return (
    <span className={`inline-flex items-center rounded border px-1.5 py-0.5 text-[10px] font-medium ${meta.className}`}>
      {meta.label}
    </span>
  );
}

export default function ProposalColetasCard({
  proposalId,
  scales = [],
  weightItems = [],
  onGenerated,
  userId,
}) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [generatingAll, setGeneratingAll] = useState(false);
  const [generatingScaleId, setGeneratingScaleId] = useState(null);
  const [generatingWeightId, setGeneratingWeightId] = useState(null);
  const [scaleStatuses, setScaleStatuses] = useState({});
  const [weightStatuses, setWeightStatuses] = useState({});

  const pendingScales = scales.filter((s) => s.id && !s.collection_id);
  const pendingWeights = weightItems.filter(
    (w) => w.id && !w.collection_id && String(w.identification || "").trim(),
  );
  const pendingCount = pendingScales.length + pendingWeights.length;
  const canOpenColeta = canAccessColeta(user?.role, user);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const scaleIds = scales.map((s) => s.collection_id).filter(Boolean);
      const weightIds = weightItems.map((w) => w.collection_id).filter(Boolean);
      const nextScale = {};
      const nextWeight = {};

      if (scaleIds.length) {
        const { data } = await supabase
          .from("scale_calibration_collections")
          .select("id, workflow_status, certificate_id")
          .in("id", scaleIds);
        (data || []).forEach((row) => {
          nextScale[row.id] = row.certificate_id
            ? "certificado_gerado"
            : row.workflow_status || "rascunho";
        });
      }
      if (weightIds.length) {
        const { data } = await supabase
          .from("weight_calibration_collections")
          .select("id, workflow_status, certificate_id")
          .in("id", weightIds);
        (data || []).forEach((row) => {
          nextWeight[row.id] = row.certificate_id
            ? "certificado_gerado"
            : row.workflow_status || "rascunho";
        });
      }
      if (!cancelled) {
        setScaleStatuses(nextScale);
        setWeightStatuses(nextWeight);
      }
    })();
    return () => { cancelled = true; };
  }, [scales, weightItems]);

  const openScaleColeta = (collectionId) => {
    if (!canOpenColeta) {
      toast.info("Coleta criada. Um técnico de campo pode preenchê-la em PR-7.2 → Coleta de dados.");
      return;
    }
    navigate(coletaEditorPath(collectionId));
  };

  const openWeightColeta = (collectionId) => {
    if (!canOpenColeta) {
      toast.info("Coleta criada. Um técnico de campo pode preenchê-la em PR-7.2 → Coleta de dados.");
      return;
    }
    navigate(weightColetaEditorPath(collectionId));
  };

  const handleGenerateAll = async () => {
    if (!proposalId) return toast.error("Salve a proposta antes de gerar coletas");
    setGeneratingAll(true);
    try {
      const result = await generateColetasFromProposal(proposalId, { userId });
      if (!result.created.length) {
        toast.info("Todos os itens já possuem coleta vinculada");
      } else {
        toast.success(`${result.created.length} coleta(s) gerada(s) com dados da proposta`);
        if (result.created.length === 1 && canOpenColeta) {
          const row = result.created[0];
          if (row.kind === "weight") openWeightColeta(row.collection.id);
          else openScaleColeta(row.collection.id);
        }
      }
      onGenerated?.();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setGeneratingAll(false);
    }
  };

  const handleGenerateOneScale = async (scale) => {
    if (!proposalId) return toast.error("Salve a proposta antes de gerar coleta");
    if (!scale.id) return toast.error("Salve a proposta para vincular a balança antes de gerar coleta");
    setGeneratingScaleId(scale.id);
    try {
      const { collection } = await generateColetaFromProposalScale(proposalId, scale.id, { userId });
      toast.success("Coleta gerada com cliente, balança e pontos pré-preenchidos");
      onGenerated?.();
      openScaleColeta(collection.id);
    } catch (e) {
      toast.error(e.message);
    } finally {
      setGeneratingScaleId(null);
    }
  };

  const handleGenerateOneWeight = async (item) => {
    if (!proposalId) return toast.error("Salve a proposta antes de gerar coleta");
    if (!item.id) return toast.error("Salve a proposta para vincular o peso antes de gerar coleta");
    setGeneratingWeightId(item.id);
    try {
      const { collection } = await generateWeightColetaFromProposalItem(proposalId, item.id, { userId });
      toast.success("Coleta de pesos gerada com cliente e item pré-preenchidos");
      onGenerated?.();
      openWeightColeta(collection.id);
    } catch (e) {
      toast.error(e.message);
    } finally {
      setGeneratingWeightId(null);
    }
  };

  if (!proposalId) {
    return (
      <Card className="border-slate-200 border-dashed">
        <CardContent className="p-4 text-sm text-slate-600">
          Guarde a proposta para gerar coletas de dados (balanças RE-7.2A e pesos RE-5.4.2A) com dados pré-preenchidos.
        </CardContent>
      </Card>
    );
  }

  const hasAnyItem = scales.length > 0 || weightItems.length > 0;

  return (
    <Card className="border-slate-200">
      <CardContent className="p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <ClipboardText size={20} className="text-blue-600" />
            <h3 className="text-sm font-semibold text-slate-800">Coletas de dados</h3>
          </div>
          {pendingCount > 0 && (
            <Button type="button" size="sm" variant="outline" onClick={handleGenerateAll} disabled={generatingAll}>
              {generatingAll ? "Gerando…" : `Gerar todas (${pendingCount})`}
            </Button>
          )}
        </div>
        <p className="text-xs text-slate-600">
          Gere uma coleta por item desta proposta. Cliente e equipamento são copiados; o técnico preenche leituras e TBH.
        </p>

        {scales.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-slate-700">Balanças (RE-7.2A)</p>
            <ul className="space-y-2 text-sm">
              {scales.map((s, i) => (
                <li
                  key={s.id || `scale-${i}`}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-slate-100 bg-slate-50/50 px-3 py-2"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span>
                      <span className="font-medium">Balança {i + 1}</span>
                      <span className="text-slate-500 ml-2 font-mono text-xs">Série {s.serial_number || "—"}</span>
                    </span>
                    <StatusBadge status={s.collection_id ? (scaleStatuses[s.collection_id] || "rascunho") : "pending"} />
                  </div>
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
                        onClick={() => handleGenerateOneScale(s)}
                        disabled={generatingAll || generatingScaleId === s.id || !s.id}
                      >
                        <Plus size={14} className="mr-1" />
                        {generatingScaleId === s.id ? "Gerando…" : "Gerar coleta"}
                      </Button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        {weightItems.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-slate-700">Pesos-padrão (RE-5.4.2A)</p>
            <ul className="space-y-2 text-sm">
              {weightItems.map((w, i) => (
                <li
                  key={w.id || `weight-${i}`}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-slate-100 bg-slate-50/50 px-3 py-2"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span>
                      <span className="font-medium">Peso {i + 1}</span>
                      <span className="text-slate-500 ml-2 font-mono text-xs">{w.identification || "—"}</span>
                    </span>
                    <StatusBadge status={w.collection_id ? (weightStatuses[w.collection_id] || "rascunho") : "pending"} />
                  </div>
                  <div className="flex items-center gap-2">
                    {w.collection_id ? (
                      canOpenColeta ? (
                        <Button asChild variant="outline" size="sm">
                          <Link to={weightColetaEditorPath(w.collection_id)}>
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
                        onClick={() => handleGenerateOneWeight(w)}
                        disabled={generatingAll || generatingWeightId === w.id || !w.id}
                      >
                        <Plus size={14} className="mr-1" />
                        {generatingWeightId === w.id ? "Gerando…" : "Gerar coleta"}
                      </Button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        {!hasAnyItem && (
          <p className="text-xs text-slate-500">Adicione balanças ou pesos na proposta para gerar coletas.</p>
        )}
        {hasAnyItem && pendingCount === 0 && (
          <p className="text-xs text-green-700">Todas as coletas foram geradas.</p>
        )}
      </CardContent>
    </Card>
  );
}
