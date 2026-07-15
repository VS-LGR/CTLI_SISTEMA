import React, { useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import TbhCorrectionPanel from "@/components/coleta/TbhCorrectionPanel";
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

/**
 * Condições ambientais no padrão RE-7.2A/B (seleção TBH, horários, T/UR/P, correção TBH, ρ_ar).
 */
export default function WeightAmbientSection({
  ambiente = {},
  envCerts = [],
  onAmbienteChange,
  disabled = false,
  fieldClass = "h-9 text-sm",
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

  return (
    <div className="space-y-4">
      <h2 className="font-medium text-slate-900">Condições ambientais durante a calibração</h2>

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
        <div>
          <Label className="text-[11px]">Temperatura inicial (°C)</Label>
          <Input
            disabled={disabled}
            className={fieldClass}
            value={ambiente.temp_inicial || ""}
            onChange={(e) => setField("temp_inicial", e.target.value)}
          />
        </div>
        <div>
          <Label className="text-[11px]">Temperatura final (°C)</Label>
          <Input
            disabled={disabled}
            className={fieldClass}
            value={ambiente.temp_final || ""}
            onChange={(e) => setField("temp_final", e.target.value)}
          />
        </div>
        <div>
          <Label className="text-[11px]">Umidade inicial (%ur)</Label>
          <Input
            disabled={disabled}
            className={fieldClass}
            value={ambiente.umidade_inicial || ""}
            onChange={(e) => setField("umidade_inicial", e.target.value)}
          />
        </div>
        <div>
          <Label className="text-[11px]">Umidade final (%ur)</Label>
          <Input
            disabled={disabled}
            className={fieldClass}
            value={ambiente.umidade_final || ""}
            onChange={(e) => setField("umidade_final", e.target.value)}
          />
        </div>
        <div>
          <Label className="text-[11px]">Pressão inicial (hPa)</Label>
          <Input
            disabled={disabled}
            className={fieldClass}
            value={ambiente.pressao_inicial || ""}
            onChange={(e) => setField("pressao_inicial", e.target.value)}
          />
        </div>
        <div>
          <Label className="text-[11px]">Pressão final (hPa)</Label>
          <Input
            disabled={disabled}
            className={fieldClass}
            value={ambiente.pressao_final || ""}
            onChange={(e) => setField("pressao_final", e.target.value)}
          />
        </div>
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
