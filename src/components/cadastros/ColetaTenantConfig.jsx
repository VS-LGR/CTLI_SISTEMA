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

/** Configuração RE-7.2A do ambiente — admin CTLI ou client */
export default function ColetaTenantConfig({ tenantId, tenant, onSaved }) {
  const [code, setCode] = useState(DEFAULT_COLETA_FORM_CODE);
  const [title, setTitle] = useState(DEFAULT_COLETA_FORM_TITLE);
  const [revision, setRevision] = useState(DEFAULT_COLETA_FORM_REVISION);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!tenant) return;
    setCode(tenant.coleta_form_code || DEFAULT_COLETA_FORM_CODE);
    setTitle(tenant.coleta_form_title || DEFAULT_COLETA_FORM_TITLE);
    setRevision(tenant.coleta_form_revision || DEFAULT_COLETA_FORM_REVISION);
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
      })
      .eq("id", tenantId);
    setSaving(false);
    if (error) toast.error(error.message);
    else {
      toast.success("Configuração da coleta guardada");
      onSaved?.();
    }
  };

  return (
    <Card className="border-slate-200 max-w-xl">
      <CardContent className="p-4 space-y-4">
        <p className="text-sm text-slate-600">
          Título exibido no formulário e PDF: <strong>{code} {title} {revision}</strong>
        </p>
        <div className="grid sm:grid-cols-3 gap-3">
          <div>
            <Label className="text-xs">Código</Label>
            <Input value={code} onChange={(e) => setCode(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">Título</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">Revisão / data</Label>
            <Input value={revision} onChange={(e) => setRevision(e.target.value)} />
          </div>
        </div>
        <Button onClick={save} disabled={saving} className="bg-blue-600 hover:bg-blue-700 text-white">
          {saving ? "A guardar…" : "Guardar configuração"}
        </Button>
      </CardContent>
    </Card>
  );
}
