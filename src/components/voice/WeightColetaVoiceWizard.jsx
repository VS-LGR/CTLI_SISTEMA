import React, { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useSpeechToText } from "@/hooks/useSpeechToText";
import VoiceConfirmDialog from "@/components/voice/VoiceConfirmDialog";
import { isSpeechRecognitionSupported } from "@/lib/voice/speechRecognition";
import {
  YES_NO_OPTIONS,
  NOMINAL_UNIT_OPTIONS,
} from "@/lib/voice/spokenMatch";
import {
  WEIGHT_CLASSES,
  MATERIALS,
} from "@/lib/weightCalibration/weightCertificateSchema";
import {
  DEFAULT_WEIGHT_CYCLE_COUNT,
  clampWeightCycleCount,
} from "@/lib/weightCalibration/weightColetaSchema";
import { envCertIdentification } from "@/lib/coletaSchema";

function speakPrompt(text) {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  try {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "pt-BR";
    u.rate = 1;
    window.speechSynthesis.speak(u);
  } catch {
    /* ignore */
  }
}

function classOptions() {
  return WEIGHT_CLASSES.map((c) => ({ value: c, label: c, aliases: [c.toLowerCase()] }));
}

function materialOptions() {
  return MATERIALS.map((m) => ({
    value: m,
    label: m,
    aliases: [m.toLowerCase()],
  }));
}

/**
 * Monta a fila completa da coleta RE-5.4.2A para o assistente de voz.
 * @param {object} opts
 * @param {boolean} [opts.confirmHeaderThenReadings] — coleta pré-preenchida: confirma cabeçalho, depois TBH/leituras
 */
export function buildWeightColetaVoiceSteps({
  payload,
  endCustomers,
  weightItems,
  envCerts,
  applyCustomer,
  setClienteField,
  setGeralField,
  setAmbientField,
  setExecutores,
  setPesoDescricao,
  patchItem,
  applyItemReference,
  ensureItemCycles,
  setItemCycleReading,
  confirmHeaderThenReadings = false,
}) {
  const steps = [];
  const cliente = payload?.cliente || {};
  const geral = payload?.geral || {};

  if (confirmHeaderThenReadings) {
    const summary = [
      cliente.solicitante && `Cliente ${cliente.solicitante}`,
      geral.processo_numero && `proposta ${geral.processo_numero}`,
      geral.identificacao && `identificação ${geral.identificacao}`,
      geral.fabricante && `fabricante ${geral.fabricante}`,
      geral.serie && `série ${geral.serie}`,
    ].filter(Boolean).join(". ");

    steps.push({
      id: "confirm-header",
      label: "Confirmar cabeçalho",
      prompt: summary
        ? `Cabeçalho pré-preenchido. ${summary}. Confirme dizendo confirmar, ou diga corrigir se precisar alterar no formulário.`
        : "Confirme os dados do cabeçalho pré-preenchidos. Diga confirmar para seguir, ou corrigir.",
      kind: "choice",
      options: [
        { value: "ok", label: "Confirmar", aliases: ["confirmar", "ok", "certo", "sim", "próximo", "proximo"] },
        { value: "retry", label: "Corrigir depois", aliases: ["corrigir", "refazer", "alterar"] },
      ],
      apply: () => {},
    });

    const itemSummaries = (payload?.itens || [])
      .filter((it) => String(it.identification || "").trim() || String(it.nominal_value || "").trim())
      .map((it, i) => {
        const bits = [
          it.identification || `item ${i + 1}`,
          it.nominal_value ? `${it.nominal_value} ${it.nominal_unit || "g"}` : "",
          it.uut_class || "",
        ].filter(Boolean);
        return bits.join(", ");
      });
    if (itemSummaries.length) {
      steps.push({
        id: "confirm-items",
        label: "Confirmar itens",
        prompt: `Itens pré-preenchidos: ${itemSummaries.join("; ")}. Confirme para seguir às leituras.`,
        kind: "choice",
        options: [
          { value: "ok", label: "Confirmar", aliases: ["confirmar", "ok", "certo", "sim"] },
          { value: "retry", label: "Corrigir depois", aliases: ["corrigir", "refazer"] },
        ],
        apply: () => {},
      });
    }

    steps.push({
      id: "geral-data_calibracao",
      label: "Data de calibração",
      prompt: "Informe a data de calibração. Pode dizer o dia, mês e ano.",
      kind: "text",
      apply: (p) => setGeralField?.("data_calibracao", p.value),
    });

    steps.push({
      id: "executores",
      label: "Executores",
      prompt: "Informe o nome do responsável pela calibração.",
      kind: "text",
      apply: (p) => setExecutores?.(p.value),
    });
  } else {
    steps.push({
      id: "cliente",
      label: "Cliente (cadastro)",
      prompt: "Informe o nome do cliente.",
      kind: "lookup",
      records: endCustomers,
      getLabel: (c) => c.name || "",
      getSearchText: (c) => `${c.name || ""} ${c.cnpj || ""}`,
      apply: (payloadResult) => {
        const rec = payloadResult.record;
        if (rec) applyCustomer?.(rec.id);
        else if (payloadResult.label) setClienteField?.("solicitante", payloadResult.label);
      },
    });

    const geralText = [
      ["data_calibracao", "Data de calibração", "Informe a data de calibração. Pode dizer o dia, mês e ano."],
      ["processo_numero", "Número do processo", "Informe o número do processo ou proposta."],
      ["identificacao", "Identificação ou tag", "Informe a identificação ou tag do conjunto."],
      ["fabricante", "Fabricante", "Informe o fabricante."],
      ["serie", "Série", "Informe o número de série."],
    ];
    geralText.forEach(([key, label, prompt]) => {
      steps.push({
        id: `geral-${key}`,
        label,
        prompt,
        kind: "text",
        apply: (p) => setGeralField?.(key, p.value),
      });
    });

    steps.push({
      id: "geral-foi_ajuste",
      label: "Foi ajuste",
      prompt: "Foi realizado ajuste? Diga sim ou não.",
      kind: "choice",
      options: YES_NO_OPTIONS,
      apply: (p) => setGeralField?.("foi_ajuste", p.value),
    });

    steps.push({
      id: "executores",
      label: "Executores",
      prompt: "Informe o nome do responsável pela calibração.",
      kind: "text",
      apply: (p) => setExecutores?.(p.value),
    });

    for (let i = 0; i < 2; i += 1) {
      steps.push({
        id: `desc-${i}`,
        label: `Descrição ${i + 1}`,
        prompt: `Informe a descrição ${i + 1} do peso, ou diga pular.`,
        kind: "text",
        apply: (p) => setPesoDescricao?.(i, p.value),
      });
    }
  }

  steps.push({
    id: "tbh-1",
    label: "Termo-baro-higrômetro 1",
    prompt: "Informe a identificação do primeiro termo-baro-higrômetro.",
    kind: "lookup",
    records: envCerts,
    getLabel: envCertIdentification,
    getSearchText: (e) => `${envCertIdentification(e)} ${e.certificate_number || ""}`,
    apply: (p) => setAmbientField?.("thermo_cert_id", p.record?.id || p.value || ""),
  });

  steps.push({
    id: "tbh-2",
    label: "Termo-baro-higrômetro 2 (opcional)",
    prompt: "Informe o segundo termo-baro-higrômetro, ou diga pular.",
    kind: "lookup",
    records: envCerts,
    getLabel: envCertIdentification,
    getSearchText: (e) => `${envCertIdentification(e)} ${e.certificate_number || ""}`,
    apply: (p) => setAmbientField?.("thermo_cert_id_2", p.record?.id || p.value || ""),
  });

  [
    ["horario_inicial", "Horário inicial", "Informe o horário inicial."],
    ["horario_final", "Horário final", "Informe o horário final."],
    ["temp_inicial", "Temperatura inicial", "Informe a temperatura inicial em graus Celsius.", "number"],
    ["temp_final", "Temperatura final", "Informe a temperatura final.", "number"],
    ["umidade_inicial", "Umidade inicial", "Informe a umidade relativa inicial.", "number"],
    ["umidade_final", "Umidade final", "Informe a umidade relativa final.", "number"],
    ["pressao_inicial", "Pressão inicial", "Informe a pressão atmosférica inicial.", "number"],
    ["pressao_final", "Pressão final", "Informe a pressão atmosférica final.", "number"],
  ].forEach(([key, label, prompt, kind = "text"]) => {
    steps.push({
      id: `amb-${key}`,
      label,
      prompt,
      kind,
      apply: (p) => setAmbientField?.(key, p.value),
    });
  });

  const itemCount = Math.max(1, (payload?.itens || []).length);
  for (let ii = 0; ii < itemCount; ii += 1) {
    const item = payload?.itens?.[ii] || {};
    const prefix = `item-${ii}`;
    const metaPrefilled = confirmHeaderThenReadings && (
      String(item.identification || "").trim() || String(item.nominal_value || "").trim()
    );

    if (!metaPrefilled) {
      steps.push({
        id: `${prefix}-id`,
        label: `Item ${ii + 1} — Identificação`,
        prompt: `Item ${ii + 1}. Informe a identificação do peso mensurando.`,
        kind: "text",
        apply: (p) => patchItem?.(ii, { identification: p.value }),
      });
      steps.push({
        id: `${prefix}-nom`,
        label: `Item ${ii + 1} — Valor nominal`,
        prompt: `Item ${ii + 1}. Informe o valor nominal.`,
        kind: "number",
        apply: (p) => patchItem?.(ii, { nominal_value: p.value }),
      });
      steps.push({
        id: `${prefix}-unit`,
        label: `Item ${ii + 1} — Unidade`,
        prompt: `Item ${ii + 1}. Informe a unidade: miligrama, grama ou quilograma.`,
        kind: "choice",
        options: NOMINAL_UNIT_OPTIONS,
        apply: (p) => patchItem?.(ii, { nominal_unit: p.value }),
      });
      steps.push({
        id: `${prefix}-class`,
        label: `Item ${ii + 1} — Classe`,
        prompt: `Item ${ii + 1}. Informe a classe OIML, por exemplo F1 ou M1.`,
        kind: "choice",
        options: classOptions(),
        apply: (p) => patchItem?.(ii, { uut_class: p.value }),
      });
      steps.push({
        id: `${prefix}-mat-uut`,
        label: `Item ${ii + 1} — Material do mensurando`,
        prompt: `Item ${ii + 1}. Informe o material do mensurando.`,
        kind: "choice",
        options: materialOptions(),
        apply: (p) => patchItem?.(ii, { uut_material: p.value }),
      });
    }

    steps.push({
      id: `${prefix}-ref`,
      label: `Item ${ii + 1} — Peso de referência`,
      prompt: `Item ${ii + 1}. Informe a identificação do peso padrão de referência cadastrado.`,
      kind: "lookup",
      records: weightItems,
      getLabel: (w) => w.identification || "",
      getSearchText: (w) => `${w.identification || ""} ${w.conventional_value || ""}`,
      apply: (p) => {
        if (p.record?.id) applyItemReference?.(ii, p.record.id);
        else patchItem?.(ii, { reference_identification: p.label || p.value });
      },
    });
    steps.push({
      id: `${prefix}-res`,
      label: `Item ${ii + 1} — Resolução`,
      prompt: `Item ${ii + 1}. Informe a resolução da balança.`,
      kind: "number",
      apply: (p) => patchItem?.(ii, { balance_resolution: p.value }),
    });
    steps.push({
      id: `${prefix}-cycles-n`,
      label: `Item ${ii + 1} — Número de ciclos`,
      prompt: `Item ${ii + 1}. Informe o número de ciclos. O padrão é cinco.`,
      kind: "number",
      apply: (p) => {
        const n = clampWeightCycleCount(p.numeric ?? p.value);
        ensureItemCycles?.(ii, n);
      },
    });

    const cycleCount = clampWeightCycleCount(
      item.cycle_count || (item.cycles || []).length || DEFAULT_WEIGHT_CYCLE_COUNT,
    );
    for (let ci = 0; ci < cycleCount; ci += 1) {
      steps.push({
        id: `${prefix}-c${ci}-p`,
        label: `Item ${ii + 1} — Ciclo ${ci + 1} padrão (P)`,
        prompt: `Item ${ii + 1}, ciclo ${ci + 1}. Leitura do padrão.`,
        kind: "number",
        apply: (p) => setItemCycleReading?.(ii, ci, "standard_reading", p.value),
      });
      steps.push({
        id: `${prefix}-c${ci}-m`,
        label: `Item ${ii + 1} — Ciclo ${ci + 1} mensurando (M)`,
        prompt: `Item ${ii + 1}, ciclo ${ci + 1}. Leitura do mensurando.`,
        kind: "number",
        apply: (p) => setItemCycleReading?.(ii, ci, "measuring_reading", p.value),
      });
    }
  }

  return steps;
}

/**
 * Assistente sequencial completo da coleta de pesos (PR-7.2 ABA).
 */
export default function WeightColetaVoiceWizard({
  open,
  steps = [],
  onClose,
  onComplete,
}) {
  const supported = isSpeechRecognitionSupported();
  const speech = useSpeechToText({ enabled: open && supported });
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState("prompt");
  const [confirmOpen, setConfirmOpen] = useState(false);

  const field = steps[index] || null;
  const total = steps.length;

  const resetForField = useCallback(() => {
    speech.abort();
    speech.clearTranscript();
    setConfirmOpen(false);
    setPhase("prompt");
  }, [speech]);

  useEffect(() => {
    if (!open) {
      speech.abort();
      setIndex(0);
      setPhase("prompt");
      setConfirmOpen(false);
      return undefined;
    }
    setIndex(0);
    setPhase("prompt");
    return undefined;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!open || !field || phase !== "prompt") return undefined;
    const prompt = field.prompt || `Informe ${field.label}`;
    speakPrompt(prompt);
    const t = setTimeout(() => {
      setPhase("listening");
      speech.clearTranscript();
      speech.start();
    }, 650);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, index, phase, field?.id]);

  useEffect(() => {
    if (!open || phase !== "listening") return;
    if (speech.finalTranscript && !speech.listening) {
      setConfirmOpen(true);
      setPhase("confirm");
    }
  }, [open, phase, speech.finalTranscript, speech.listening]);

  const advance = useCallback(() => {
    if (index + 1 >= total) {
      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
      onComplete?.();
      onClose?.();
      return;
    }
    setIndex((i) => i + 1);
    resetForField();
  }, [index, total, onComplete, onClose, resetForField]);

  const handleConfirm = (payload) => {
    field?.apply?.(payload);
    setConfirmOpen(false);
    advance();
  };

  const handleRetry = () => {
    speech.clearTranscript();
    setConfirmOpen(false);
    setPhase("listening");
    speech.start();
  };

  const handleSkip = () => {
    advance();
  };

  const handleClose = () => {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    speech.abort();
    onClose?.();
  };

  return (
    <>
      <Dialog open={open && !confirmOpen} onOpenChange={(v) => { if (!v) handleClose(); }}>
        <DialogContent className="sm:max-w-lg" onPointerDownOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>Sequência de voz — coleta de pesos</DialogTitle>
            <DialogDescription>
              {total
                ? `Passo ${Math.min(index + 1, total)} de ${total}. Cliente, geral, ambiente e ensaio ABA.`
                : "Nenhum passo na sequência."}
            </DialogDescription>
          </DialogHeader>

          {!supported ? (
            <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
              Reconhecimento de voz não suportado. Use Chrome ou Edge.
            </p>
          ) : field ? (
            <div className="space-y-3">
              <p className="text-base font-medium text-slate-900">{field.label}</p>
              <div className="rounded-md border bg-slate-50 px-3 py-3 min-h-[3.5rem]">
                <p className="text-[11px] uppercase tracking-wide text-slate-500 mb-1">
                  {phase === "listening" || speech.listening ? "A ouvir" : "Aguardando"}
                </p>
                <p className="text-base text-slate-900 break-words">
                  {speech.listening
                    ? (speech.interim || "A ouvir…")
                    : (speech.finalTranscript || "Fale o valor quando solicitado.")}
                </p>
              </div>
              {speech.error ? (
                <p className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-md px-3 py-2">
                  {speech.error}
                </p>
              ) : null}
            </div>
          ) : (
            <p className="text-sm text-slate-600">Sequência vazia.</p>
          )}

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button type="button" variant="outline" className="min-h-11 text-base" onClick={handleClose}>
              Encerrar
            </Button>
            <Button type="button" variant="ghost" className="min-h-11 text-base" onClick={handleSkip}>
              Pular
            </Button>
            <Button
              type="button"
              variant="secondary"
              className="min-h-11 text-base"
              disabled={speech.listening || !supported}
              onClick={handleRetry}
            >
              Refazer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <VoiceConfirmDialog
        open={open && confirmOpen}
        fieldLabel={field?.label || "Valor"}
        transcript={speech.finalTranscript}
        listening={speech.listening}
        interim={speech.interim}
        error={speech.error}
        kind={field?.kind || "text"}
        options={field?.options || []}
        records={field?.records || []}
        getLabel={field?.getLabel}
        getSearchText={field?.getSearchText}
        confirmLabel="Confirmar e continuar"
        onConfirm={handleConfirm}
        onRetry={handleRetry}
        onCancel={() => {
          setConfirmOpen(false);
          handleClose();
        }}
      />
    </>
  );
}
