import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import {
  DEFAULT_COLETA_FORM_CODE,
  DEFAULT_COLETA_FORM_TITLE,
  DEFAULT_COLETA_FORM_REVISION,
} from "@/lib/coletaDocMeta";

/** Configuração RE-7.2A + metadados do laboratório para certificados */
export default function ColetaTenantConfig({ tenantId, tenant, onSaved }) {
  const [code, setCode] = useState(DEFAULT_COLETA_FORM_CODE);
  const [title, setTitle] = useState(DEFAULT_COLETA_FORM_TITLE);
  const [revision, setRevision] = useState(DEFAULT_COLETA_FORM_REVISION);
  const [labAddress, setLabAddress] = useState("");
  const [labPhone, setLabPhone] = useState("");
  const [labWebsite, setLabWebsite] = useState("");
  const [ipemNumber, setIpemNumber] = useState("");
  const [cgcreCal, setCgcreCal] = useState("");
  const [popCode, setPopCode] = useState("POP-CAL-02");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!tenant) return;
    setCode(tenant.coleta_form_code || DEFAULT_COLETA_FORM_CODE);
    setTitle(tenant.coleta_form_title || DEFAULT_COLETA_FORM_TITLE);
    setRevision(tenant.coleta_form_revision || DEFAULT_COLETA_FORM_REVISION);
    setLabAddress(tenant.lab_address || "");
    setLabPhone(tenant.lab_phone || "");
    setLabWebsite(tenant.lab_website || "");
    setIpemNumber(tenant.ipem_accreditation_number || "");
    setCgcreCal(tenant.cgcre_cal_number || "");
    setPopCode(tenant.pop_calibration_code || "POP-CAL-02");
  }, [tenant]);

  const save = async () => {
    if (!tenantId) return toast.error("Selecione um ambiente");
    setSaving(true);
    const { error } = await supabase
      .from("tenants")
      .update({
        coleta_form_code: code.trim() || DEFAULT_COLETA_FORM_CODE,
        coleta_form_title: title.trim() || DEFAULT_COLETA_FORM_TITLE,
        coleta_form_revision: revision.trim() || DEFAULT_COLETA_FORM_REVISION,
        lab_address: labAddress.trim(),
        lab_phone: labPhone.trim(),
        lab_website: labWebsite.trim(),
        ipem_accreditation_number: ipemNumber.trim(),
        cgcre_cal_number: cgcreCal.trim(),
        pop_calibration_code: popCode.trim() || "POP-CAL-02",
      })
      .eq("id", tenantId);
    setSaving(false);
    if (error) toast.error(error.message);
    else {
      toast.success("Configuração guardada");
      onSaved?.();
    }
  };

  return (
    <Card className="border-slate-200 max-w-2xl">
      <CardContent className="p-4 space-y-6">
        <div>
          <h3 className="text-sm font-semibold text-slate-800">Formulário RE-7.2A</h3>
          <p className="text-sm text-slate-600 mt-1">
            Título exibido no formulário e PDF: <strong>{code} {title} {revision}</strong>
          </p>
          <div className="grid sm:grid-cols-3 gap-3 mt-3">
            <div><Label className="text-xs">Código</Label><Input value={code} onChange={(e) => setCode(e.target.value)} /></div>
            <div><Label className="text-xs">Título</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} /></div>
            <div><Label className="text-xs">Revisão / data</Label><Input value={revision} onChange={(e) => setRevision(e.target.value)} /></div>
          </div>
        </div>
        <div>
          <h3 className="text-sm font-semibold text-slate-800">Laboratório (cabeçalho do certificado)</h3>
          <div className="grid gap-3 mt-3">
            <div><Label className="text-xs">Endereço</Label><Input value={labAddress} onChange={(e) => setLabAddress(e.target.value)} /></div>
            <div className="grid sm:grid-cols-2 gap-3">
              <div><Label className="text-xs">Telefone</Label><Input value={labPhone} onChange={(e) => setLabPhone(e.target.value)} /></div>
              <div><Label className="text-xs">Website</Label><Input value={labWebsite} onChange={(e) => setLabWebsite(e.target.value)} /></div>
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              <div><Label className="text-xs">Credenciamento IPEM-MG (nº)</Label><Input value={ipemNumber} onChange={(e) => setIpemNumber(e.target.value)} placeholder="20000050" /></div>
              <div><Label className="text-xs">Nº CAL (RBC/CGCRE)</Label><Input value={cgcreCal} onChange={(e) => setCgcreCal(e.target.value)} placeholder="CAL-XXXXX" /></div>
            </div>
            <div><Label className="text-xs">POP de calibração</Label><Input value={popCode} onChange={(e) => setPopCode(e.target.value)} /></div>
          </div>
        </div>
        <Button onClick={save} disabled={saving} className="bg-blue-600 hover:bg-blue-700 text-white">
          {saving ? "A guardar…" : "Guardar configuração"}
        </Button>
      </CardContent>
    </Card>
  );
}
