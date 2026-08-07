import React, { useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Microphone } from "@phosphor-icons/react";
import TbhCorrectionPanel from "@/components/coleta/TbhCorrectionPanel";
import VoiceFieldControl from "@/components/voice/VoiceFieldControl";
import { AMBIENT_VOICE_FIELD_DEFS } from "@/components/voice/VoiceGuidedSession";
import { envCertIdentification } from "@/lib/coletaSchema";
import {
  calculateAirDensityFromEnvironmental,
  formatAirDensityDisplay,
} from "@/lib/certificateCalculations/environmentalCalculations";
import { cadastroSectionPath } from "@/lib/cadastroSections";
import { Link } from "react-router-dom";

const READING_KEYS = [
  "temp_inicial",
  "temp_final",
  "umidade_inicial",
  "umidade_final",
  "pressao_inicial",
  "pressao_final",
];

const READING_LABELS = Object.fromEntries(
  AMBIENT_VOICE_FIELD_DEFS.map((d) => [d.key, d.label]),
);

/**
 * Condições ambientais no padrão RE-7.2A/B (seleção TBH, horários, T/UR/P, correção TBH, ρ_ar).
 */
export default function WeightAmbientSection({
  ambiente = {},
  envCerts = [],
  onAmbienteChange,
  disabled = false,
  fieldClass = "h-9 text-sm",
  voiceEnabled = false,
  onStartAmbientVoiceSequence,
}) {
  const setField = (key, value) => {
    if (disabled || !onAmbienteChange) return;
    const next = { ...ambiente, [key]: value };
    if (READING_KEYS.includes(key) && ambiente.tbh_correction_applied) {
      next.tbh_correction_applied = false;
      const raw = { ...(next.tbh_correction_raw || {}) };
      delete raw[key];
      next.tbh_correction_raw = raw;
    }
    onAmbienteChange(next);
  };

  const airDensity = useMemo(
    () => calculateAirDensityFromEnvironmental({
      initial_temperature: ambiente.temp_inicial,
      final_temperature: ambiente.temp_final,
      initial_humidity: ambiente.umidade_inicial,
      final_humidity: ambiente.umidade_final,
      initial_pressure: ambiente.pressao_inicial,
      final_pressure: ambiente.pressao_final,
    }),
    [ambiente],
  );

  const renderReadingInput = (key) => (
    <div key={key}>
      <Label className="text-[11px]">{READING_LABELS[key] || key}</Label>
      <VoiceFieldControl
        disabled={disabled}
        voiceEnabled={voiceEnabled}
        label={READING_LABELS[key] || key}
        inputClassName={fieldClass}
        value={ambiente[key] || ""}
        onChange={(v) => setField(key, v)}
        onConfirmValue={(v) => setField(key, v)}
      />
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-medium text-slate-900">Condições ambientais durante a calibração</h2>
        {onStartAmbientVoiceSequence && !disabled && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="min-h-10"
            onClick={onStartAmbientVoiceSequence}
          >
            <Microphone size={16} className="mr-1" />
            Sequência de voz (ambiente)
          </Button>
        )}
      </div>

      {envCerts.length === 0 ? (
        <p className="text-sm text-slate-600">
          Nenhum termo-baro-higrômetro cadastrado.{" "}
          <Link to={cadastroSectionPath("thermo")} className="text-blue-600 hover:underline">
            PR-6.4 → Termobarohigrômetro
          </Link>
        </p>
      ) : (
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <Label className="text-[11px]">Identificação 1 (termo-baro-higrômetro)</Label>
            <select
              disabled={disabled}
              value={ambiente.thermo_cert_id || ""}
              onChange={(e) => setField("thermo_cert_id", e.target.value)}
              className="w-full border rounded-md h-10 px-3 text-sm bg-white mt-1"
            >
              <option value="">Selecionar equipamento…</option>
              {envCerts.map((e) => (
                <option key={e.id} value={e.id}>{envCertIdentification(e)}</option>
              ))}
            </select>
          </div>
          <div>
            <Label className="text-[11px]">Identificação 2 (termo-baro-higrômetro)</Label>
            <select
              disabled={disabled}
              value={ambiente.thermo_cert_id_2 || ""}
              onChange={(e) => setField("thermo_cert_id_2", e.target.value)}
              className="w-full border rounded-md h-10 px-3 text-sm bg-white mt-1"
            >
              <option value="">Selecionar equipamento…</option>
              {envCerts.map((e) => (
                <option key={e.id} value={e.id}>{envCertIdentification(e)}</option>
              ))}
            </select>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        <div>
          <Label className="text-[11px]">Horário inicial</Label>
          <Input
            type="time"
            disabled={disabled}
            className={fieldClass}
            value={ambiente.horario_inicial || ""}
            onChange={(e) => setField("horario_inicial", e.target.value)}
          />
        </div>
        <div>
          <Label className="text-[11px]">Horário final</Label>
          <Input
            type="time"
            disabled={disabled}
            className={fieldClass}
            value={ambiente.horario_final || ""}
            onChange={(e) => setField("horario_final", e.target.value)}
          />
        </div>
        {READING_KEYS.map(renderReadingInput)}
        <div>
          <Label className="text-[11px]">Massa específica do ar (calculada)</Label>
          <Input
            readOnly
            className={`${fieldClass} bg-slate-50`}
            value={`${formatAirDensityDisplay(airDensity.valid ? airDensity.value : null)} kg/m³`}
          />
        </div>
      </div>

      {!disabled && (
        <TbhCorrectionPanel
          mode="coleta"
          ambiente={ambiente}
          envCerts={envCerts}
          onAmbienteChange={onAmbienteChange}
        />
      )}

      <div>
        <Label className="text-[11px]">Observações</Label>
        <Textarea
          disabled={disabled}
          rows={2}
          className="mt-1 text-sm"
          value={ambiente.observacoes || ""}
          onChange={(e) => setField("observacoes", e.target.value)}
        />
      </div>
    </div>
  );
}
