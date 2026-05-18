import React, { useCallback, useEffect, useState } from "react";
import { Link, Navigate, useNavigate, useOutletContext, useParams } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabaseClient";
import { isSupabaseAuthMode } from "@/lib/api";
import { canAccessColeta } from "@/lib/roles";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ArrowLeft, FloppyDisk, FilePdf, FileDoc, Table, CaretDown } from "@phosphor-icons/react";
import { toast } from "sonner";
import ColetaForm from "@/components/coleta/ColetaForm";
import {
  emptyColetaPayload, mergeColetaPayload, denormalizeFromPayload,
} from "@/lib/coletaSchema";
import { exportColetaPdf, exportColetaDocx, exportColetaXlsx } from "@/lib/coletaExport";

const ColetaEditorPage = () => {
  const { id } = useParams();
  const isNew = id === "nova";
  const navigate = useNavigate();
  const { user } = useAuth();
  const { currentTenantId, currentTenant } = useOutletContext();
  const tenantName = currentTenant?.name || "";

  const [payload, setPayload] = useState(emptyColetaPayload);
  const [commercialProposalRef, setCommercialProposalRef] = useState("");
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (isNew || !id) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("scale_calibration_collections")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    if (!data) {
      toast.error("Coleta não encontrada");
      navigate("/coleta");
      return;
    }
    if (data.tenant_id !== currentTenantId && user?.role !== "admin") {
      toast.error("Sem permissão para esta coleta");
      navigate("/coleta");
      return;
    }
    setPayload(mergeColetaPayload(data.payload));
    setCommercialProposalRef(data.commercial_proposal_ref || "");
  }, [id, isNew, currentTenantId, user?.role, navigate]);

  useEffect(() => { load(); }, [load]);

  if (!canAccessColeta(user?.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  if (!isSupabaseAuthMode || !currentTenantId) {
    return <Navigate to="/coleta" replace />;
  }

  const buildRow = () => {
    const denorm = denormalizeFromPayload(payload, commercialProposalRef);
    return {
      tenant_id: currentTenantId,
      commercial_proposal_ref: denorm.commercial_proposal_ref,
      payload: denorm.payload,
      client_name: denorm.client_name,
      responsible_name: denorm.responsible_name,
      scale_serial: denorm.scale_serial,
      calibration_date: denorm.calibration_date || null,
      updated_by: user.id,
    };
  };

  const save = async () => {
    setSaving(true);
    const row = buildRow();
    try {
      if (isNew) {
        const { data, error } = await supabase
          .from("scale_calibration_collections")
          .insert({ ...row, created_by: user.id })
          .select("id")
          .single();
        if (error) throw error;
        toast.success("Coleta criada");
        navigate(`/coleta/${data.id}`, { replace: true });
      } else {
        const { error } = await supabase
          .from("scale_calibration_collections")
          .update(row)
          .eq("id", id);
        if (error) throw error;
        toast.success("Coleta guardada");
      }
    } catch (e) {
      toast.error(e?.message || "Falha ao guardar");
    } finally {
      setSaving(false);
    }
  };

  const exportCurrent = async (format) => {
    const row = {
      id,
      commercial_proposal_ref: commercialProposalRef,
      payload,
      ...denormalizeFromPayload(payload, commercialProposalRef),
    };
    try {
      if (format === "pdf") exportColetaPdf(row, tenantName);
      else if (format === "docx") await exportColetaDocx(row, tenantName);
      else exportColetaXlsx(row, tenantName);
    } catch (e) {
      toast.error(e?.message || "Falha na exportação");
    }
  };

  if (loading) {
    return <p className="text-sm text-slate-500 py-12 text-center">A carregar formulário…</p>;
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="sm">
            <Link to="/coleta"><ArrowLeft size={18} className="mr-1" /> Voltar</Link>
          </Button>
          <h1 className="font-display text-xl font-semibold text-slate-900">
            {isNew ? "Nova coleta" : "Editar coleta"}
          </h1>
        </div>
        <div className="flex flex-wrap gap-2">
          {!isNew && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" type="button">
                  Exportar <CaretDown size={14} className="ml-1" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => exportCurrent("pdf")}>
                  <FilePdf size={16} className="mr-2" /> PDF
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => exportCurrent("docx")}>
                  <FileDoc size={16} className="mr-2" /> Word
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => exportCurrent("xlsx")}>
                  <Table size={16} className="mr-2" /> Excel
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          <Button onClick={save} disabled={saving} className="bg-blue-600 hover:bg-blue-700">
            <FloppyDisk size={18} className="mr-1" />
            {saving ? "A guardar…" : "Guardar"}
          </Button>
        </div>
      </div>

      <ColetaForm
        payload={payload}
        onChange={setPayload}
        commercialProposalRef={commercialProposalRef}
        onProposalChange={setCommercialProposalRef}
      />
    </div>
  );
};

export default ColetaEditorPage;
