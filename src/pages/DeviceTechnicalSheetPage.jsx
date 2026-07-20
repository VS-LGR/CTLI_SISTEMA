import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { isSupabaseAuthMode } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { FilePdf, MagnifyingGlass } from "@phosphor-icons/react";
import { toast } from "sonner";
import { DEVICE_SHEET_REQ_ID, DEVICE_SHEET_FOLDER_KEY } from "@/lib/deviceTechnicalSheetRoutes";
import { fmtDmyShort } from "@/lib/dateFormat";
import {
  buildDeviceTechnicalSheets,
  filterDeviceTechnicalSheets,
  uniqueSheetValues,
} from "@/lib/deviceTechnicalSheets/buildDeviceTechnicalSheets";
import { downloadDeviceTechnicalSheetPdf } from "@/lib/deviceTechnicalSheets/downloadDeviceTechnicalSheetPdf";
import EllipsisTooltip from "@/components/ui/ellipsis-tooltip";
import RequirementFolderQuickAccess from "@/components/requirements/RequirementFolderQuickAccess";

const STATUS_TONE = {
  APROVADO: "bg-emerald-100 text-emerald-800",
  VENCIDO: "bg-red-100 text-red-800",
  INATIVO: "bg-slate-200 text-slate-700",
  A_VERIFICAR: "bg-amber-100 text-amber-900",
};

export default function DeviceTechnicalSheetPage({ embedded = false }) {
  const { currentTenantId, currentTenant } = useOutletContext();
  const [weightItems, setWeightItems] = useState([]);
  const [weightCerts, setWeightCerts] = useState([]);
  const [envCerts, setEnvCerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyPdf, setBusyPdf] = useState(false);
  const [query, setQuery] = useState("");
  const [equipmentType, setEquipmentType] = useState("all");
  const [quantity, setQuantity] = useState("all");
  const [status, setStatus] = useState("all");
  const [year, setYear] = useState("all");

  const load = useCallback(async () => {
    if (!currentTenantId || !isSupabaseAuthMode) return;
    setLoading(true);
    try {
      const tid = currentTenantId;
      const [wi, wc, ec] = await Promise.all([
        supabase.from("standard_weight_items").select("*").eq("tenant_id", tid).order("identification"),
        supabase.from("weight_standard_certificates").select("*").eq("tenant_id", tid),
        supabase.from("environment_sensor_certificates").select("*").eq("tenant_id", tid).order("equipment_name"),
      ]);
      if (wi.error) throw wi.error;
      if (wc.error) throw wc.error;
      if (ec.error) throw ec.error;
      setWeightItems(wi.data || []);
      setWeightCerts(wc.data || []);
      setEnvCerts(ec.data || []);
    } catch (e) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  }, [currentTenantId]);

  useEffect(() => { load(); }, [load]);

  const rows = useMemo(
    () => buildDeviceTechnicalSheets({
      weightItems,
      weightCertificates: weightCerts,
      envCertificates: envCerts,
    }),
    [weightItems, weightCerts, envCerts],
  );

  const filtered = useMemo(
    () => filterDeviceTechnicalSheets(rows, { query, equipmentType, quantity, status, year }),
    [rows, query, equipmentType, quantity, status, year],
  );

  const typeOptions = useMemo(() => uniqueSheetValues(rows, "equipmentType"), [rows]);
  const quantityOptions = useMemo(() => uniqueSheetValues(rows, "quantity"), [rows]);
  const years = useMemo(() => {
    const set = new Set();
    rows.forEach((r) => {
      const y = String(r.calibrationDate || "").slice(0, 4);
      if (y) set.add(y);
    });
    return [...set].sort((a, b) => b.localeCompare(a));
  }, [rows]);

  const handlePdf = async () => {
    setBusyPdf(true);
    try {
      await downloadDeviceTechnicalSheetPdf(filtered, {
        tenantId: currentTenantId,
        tenantName: currentTenant?.name || "",
        tenant: currentTenant,
      });
      toast.success("PDF gerado");
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusyPdf(false);
    }
  };

  if (!isSupabaseAuthMode || !currentTenantId) {
    return <p className="text-sm text-slate-500 p-8">Ligação Supabase e ambiente necessários.</p>;
  }

  return (
    <div className="space-y-6 max-w-[1400px] w-full min-w-0" data-testid="device-technical-sheet-page">
      {!embedded && (
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <div className="text-[10px] uppercase tracking-[0.2em] text-slate-500">PR-6.4 · RE-6.4B</div>
            <h1 className="font-display text-xl font-semibold text-slate-900 mt-1">Ficha Técnica de Dispositivos</h1>
            <p className="text-sm text-slate-500 mt-1">
              Visão consolidada dos pesos padrão e termo-baro-higrômetros cadastrados.
            </p>
          </div>
          <Button type="button" onClick={handlePdf} disabled={busyPdf || loading || !filtered.length}>
            <FilePdf size={16} className="mr-1" />
            Exportar PDF (RE-6.4B)
          </Button>
        </div>
      )}
      {embedded && (
        <div className="flex justify-end">
          <Button type="button" onClick={handlePdf} disabled={busyPdf || loading || !filtered.length}>
            <FilePdf size={16} className="mr-1" />
            Exportar PDF
          </Button>
        </div>
      )}

      {!embedded && (
        <RequirementFolderQuickAccess
          requirementId={DEVICE_SHEET_REQ_ID}
          folderKey={DEVICE_SHEET_FOLDER_KEY}
        />
      )}

      <div className="flex flex-col gap-3">
        <div className="relative flex-1 max-w-xl">
          <MagnifyingGlass size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input
            className="pl-9 h-10"
            placeholder="Buscar ID, fabricante, certificado…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <Select value={equipmentType} onValueChange={setEquipmentType}>
            <SelectTrigger className="w-[200px] h-10"><SelectValue placeholder="Tipo" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os tipos</SelectItem>
              {typeOptions.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={quantity} onValueChange={setQuantity}>
            <SelectTrigger className="w-[160px] h-10"><SelectValue placeholder="Grandeza" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas grandezas</SelectItem>
              {quantityOptions.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-[160px] h-10"><SelectValue placeholder="Situação" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas situações</SelectItem>
              <SelectItem value="APROVADO">Aprovado</SelectItem>
              <SelectItem value="VENCIDO">Vencido</SelectItem>
              <SelectItem value="INATIVO">Inativo</SelectItem>
              <SelectItem value="A_VERIFICAR">A verificar</SelectItem>
            </SelectContent>
          </Select>
          <Select value={year} onValueChange={setYear}>
            <SelectTrigger className="w-[140px] h-10"><SelectValue placeholder="Ano" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os anos</SelectItem>
              {years.map((y) => <SelectItem key={y} value={y}>{y}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
          <span>A mostrar {filtered.length} de {rows.length} linha(s).</span>
          {(query || equipmentType !== "all" || quantity !== "all" || status !== "all" || year !== "all") && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8"
              onClick={() => {
                setQuery("");
                setEquipmentType("all");
                setQuantity("all");
                setStatus("all");
                setYear("all");
              }}
            >
              Limpar filtros
            </Button>
          )}
        </div>
      </div>

      <Card className="border-slate-200 overflow-hidden">
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-sm min-w-[1200px]">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="p-2">ID</th>
                <th className="p-2">Tipo</th>
                <th className="p-2">Fabricante</th>
                <th className="p-2">Nº cert.</th>
                <th className="p-2">Lab.</th>
                <th className="p-2">Calibração</th>
                <th className="p-2">Próxima</th>
                <th className="p-2">Checagem</th>
                <th className="p-2">Nominal</th>
                <th className="p-2">V.C.</th>
                <th className="p-2">Ue</th>
                <th className="p-2">Un.</th>
                <th className="p-2">Classe</th>
                <th className="p-2">Grandeza</th>
                <th className="p-2">Situação</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={15} className="p-8 text-center text-slate-500">A carregar…</td></tr>
              ) : !filtered.length ? (
                <tr><td colSpan={15} className="p-8 text-center text-slate-500">Nenhum equipamento encontrado.</td></tr>
              ) : filtered.map((r) => (
                <tr key={r.sourceId} className="border-t border-slate-100">
                  <td className="p-2 font-medium max-w-[120px]">
                    <EllipsisTooltip label={r.identification} className="block">{r.identification}</EllipsisTooltip>
                  </td>
                  <td className="p-2 max-w-[140px]">
                    <EllipsisTooltip label={r.equipmentType} className="block">{r.equipmentType}</EllipsisTooltip>
                  </td>
                  <td className="p-2">{r.manufacturer}</td>
                  <td className="p-2 font-mono text-xs">{r.certificateNumber || "—"}</td>
                  <td className="p-2 text-xs">{r.calibratedBy || "—"}</td>
                  <td className="p-2 whitespace-nowrap">{fmtDmyShort(r.calibrationDate)}</td>
                  <td className="p-2 whitespace-nowrap">{fmtDmyShort(r.nextCalibrationDate)}</td>
                  <td className="p-2 text-xs">{r.intermediateCheck}</td>
                  <td className="p-2">{r.nominalValue}</td>
                  <td className="p-2">{r.conventionalValue}</td>
                  <td className="p-2">{r.uncertainty}</td>
                  <td className="p-2">{r.unit}</td>
                  <td className="p-2">{r.equipmentClass}</td>
                  <td className="p-2">{r.quantity}</td>
                  <td className="p-2">
                    <Badge variant="secondary" className={STATUS_TONE[r.status] || ""}>{r.status}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
