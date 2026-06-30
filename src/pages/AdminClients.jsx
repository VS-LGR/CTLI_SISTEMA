import React, { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import api, { asArray, isSupabaseAuthMode } from "@/lib/api";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Plus, Buildings, UserPlus, Trash, Users, IdentificationCard, PencilSimple } from "@phosphor-icons/react";
import { toast } from "sonner";
import { ROLES, RESPONSIBLE_ROLES, roleShort } from "@/lib/roles";
import { TENANT_BRANDING_BUCKET, tenantLogoStoragePath } from "@/lib/tenantBranding";
import {
  DEFAULT_COLETA_FORM_CODE,
  DEFAULT_COLETA_FORM_TITLE,
  DEFAULT_COLETA_FORM_REVISION,
} from "@/lib/coletaDocMeta";
import { invokeSupabaseEdgeFunction, toastSupabaseAccessError } from "@/lib/supabaseFunctions";

const AdminClients = () => {
  const { isAdmin, reloadTenants, currentTenantId, selectTenant, requestAdminTenantSwitch } = useOutletContext();
  const [tenants, setTenants] = useState([]);
  const [adminProfiles, setAdminProfiles] = useState([]);
  const [users, setUsers] = useState({});
  const [resps, setResps] = useState({});
  const [openTenant, setOpenTenant] = useState(false);
  const [openUser, setOpenUser] = useState(false);
  const [openResp, setOpenResp] = useState(false);

  const [editingTenantId, setEditingTenantId] = useState(null);
  const [editingUserId, setEditingUserId] = useState(null);
  const [editingRespId, setEditingRespId] = useState(null);

  const [tName, setTName] = useState("");
  const [tCode, setTCode] = useState("");
  const [tDesc, setTDesc] = useState("");
  const [tLogoFile, setTLogoFile] = useState(null);
  const [tLogoPreview, setTLogoPreview] = useState("");
  const [tLogoPath, setTLogoPath] = useState("");
  const [tColetaCode, setTColetaCode] = useState(DEFAULT_COLETA_FORM_CODE);
  const [tColetaTitle, setTColetaTitle] = useState(DEFAULT_COLETA_FORM_TITLE);
  const [tColetaRev, setTColetaRev] = useState(DEFAULT_COLETA_FORM_REVISION);
  const [tLegalName, setTLegalName] = useState("");
  const [tTradeName, setTTradeName] = useState("");
  const [tBillingAddress, setTBillingAddress] = useState("");
  const [tBillingCep, setTBillingCep] = useState("");
  const [tBillingCity, setTBillingCity] = useState("");
  const [tBillingState, setTBillingState] = useState("");
  const [tBillingPhone, setTBillingPhone] = useState("");
  const [tBillingEmail, setTBillingEmail] = useState("");
  const [tBillingCnpj, setTBillingCnpj] = useState("");
  const [tBillingIe, setTBillingIe] = useState("");
  const [tEnvResponsible, setTEnvResponsible] = useState("");

  const [uTenant, setUTenant] = useState("");
  const [uName, setUName] = useState("");
  const [uEmail, setUEmail] = useState("");
  const [uPassword, setUPassword] = useState("");
  const [uRole, setURole] = useState("gerente_qualidade");
  const [uEmployeeId, setUEmployeeId] = useState("");
  const [tenantSignatories, setTenantSignatories] = useState([]);

  const [rTenant, setRTenant] = useState("");
  const [rName, setRName] = useState("");
  const [rRole, setRRole] = useState("gerente_qualidade");
  const [rEmail, setREmail] = useState("");

  const resetTenantForm = () => {
    setEditingTenantId(null);
    setTName("");
    setTCode("");
    setTDesc("");
    setTLogoFile(null);
    setTLogoPreview("");
    setTLogoPath("");
    setTColetaCode(DEFAULT_COLETA_FORM_CODE);
    setTColetaTitle(DEFAULT_COLETA_FORM_TITLE);
    setTColetaRev(DEFAULT_COLETA_FORM_REVISION);
    setTLegalName("");
    setTTradeName("");
    setTBillingAddress("");
    setTBillingCep("");
    setTBillingCity("");
    setTBillingState("");
    setTBillingPhone("");
    setTBillingEmail("");
    setTBillingCnpj("");
    setTBillingIe("");
    setTEnvResponsible("");
  };

  const billingPatch = () => ({
    legal_name: tLegalName.trim(),
    trade_name: tTradeName.trim(),
    billing_address: tBillingAddress.trim(),
    billing_cep: tBillingCep.trim(),
    billing_city: tBillingCity.trim(),
    billing_state: tBillingState.trim(),
    billing_phone: tBillingPhone.trim(),
    billing_email: tBillingEmail.trim(),
    billing_cnpj: tBillingCnpj.trim(),
    billing_state_registration: tBillingIe.trim(),
    environment_responsible_name: tEnvResponsible.trim(),
  });

  const resetUserForm = () => {
    setEditingUserId(null);
    setUTenant("");
    setUName("");
    setUEmail("");
    setUPassword("");
    setURole("gerente_qualidade");
    setUEmployeeId("");
  };

  const resetRespForm = () => {
    setEditingRespId(null);
    setRTenant("");
    setRName("");
    setRRole("gerente_qualidade");
    setREmail("");
  };

  const loadSupabase = async () => {
    const { data: trows, error: te } = await supabase.from("tenants").select("*").order("name");
    if (te) {
      toastSupabaseAccessError(te, te.message || "Falha ao carregar clientes");
      return;
    }
    const list = trows || [];
    setTenants(list);

    const { data: admins, error: ae } = await supabase.from("profiles").select("*").eq("role", "admin");
    if (ae) {
      toastSupabaseAccessError(ae, ae.message || "Falha ao listar administradores");
      return;
    }
    setAdminProfiles(admins || []);

    const us = {};
    const rs = {};
    for (const t of list) {
      const { data: profs, error: pe } = await supabase
        .from("profiles")
        .select("*")
        .eq("tenant_id", t.id);
      if (pe) us[t.id] = [];
      else us[t.id] = (profs || []).map((p) => ({
        id: p.id,
        name: p.full_name,
        email: p.email,
        role: p.role,
        employee_registration_id: p.employee_registration_id,
      }));

      const { data: respRows, error: re } = await supabase
        .from("responsibles")
        .select("*")
        .eq("tenant_id", t.id)
        .order("name");
      if (re) rs[t.id] = [];
      else rs[t.id] = respRows || [];
    }
    setUsers(us);
    setResps(rs);
  };

  const load = async () => {
    if (isSupabaseAuthMode) {
      await loadSupabase();
      return;
    }
    const { data } = await api.get("/tenants");
    const list = asArray(data);
    setTenants(list);
    const us = {};
    const rs = {};
    for (const t of list) {
      try {
        us[t.id] = asArray((await api.get(`/tenants/${t.id}/users`)).data);
      } catch {
        us[t.id] = [];
      }
      try {
        rs[t.id] = asArray((await api.get(`/tenants/${t.id}/responsibles`)).data);
      } catch {
        rs[t.id] = [];
      }
    }
    setUsers(us);
    setResps(rs);
  };

  useEffect(() => {
    load();
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, []);

  useEffect(() => {
    if (!isSupabaseAuthMode || !uTenant || uRole !== "signatario") {
      setTenantSignatories([]);
      return;
    }
    supabase
      .from("employee_registrations")
      .select("id, full_name, email, registration_code")
      .eq("tenant_id", uTenant)
      .eq("job_role", "signatario")
      .order("full_name")
      .then(({ data, error }) => {
        if (error) setTenantSignatories([]);
        else setTenantSignatories(data || []);
      });
  }, [uTenant, uRole]);

  if (!isAdmin) return <div className="text-slate-600">Acesso restrito a administradores CTLI.</div>;

  const uploadTenantLogo = async (tenantId) => {
    if (!tLogoFile || !tenantId) return tLogoPath || null;
    const path = tenantLogoStoragePath(tenantId, tLogoFile.name);
    const { error } = await supabase.storage.from(TENANT_BRANDING_BUCKET).upload(path, tLogoFile, {
      upsert: true,
      contentType: tLogoFile.type || undefined,
    });
    if (error) throw error;
    return path;
  };

  const createOrUpdateTenant = async () => {
    if (!tName.trim()) return toast.error("Informe o nome");
    try {
      if (isSupabaseAuthMode) {
        if (editingTenantId) {
          let logoPath = tLogoPath;
          if (tLogoFile) logoPath = await uploadTenantLogo(editingTenantId);
          const patch = {
            name: tName.trim(),
            code: tCode,
            description: tDesc,
            coleta_form_code: tColetaCode.trim() || DEFAULT_COLETA_FORM_CODE,
            coleta_form_title: tColetaTitle.trim() || DEFAULT_COLETA_FORM_TITLE,
            coleta_form_revision: tColetaRev.trim() || DEFAULT_COLETA_FORM_REVISION,
            ...billingPatch(),
          };
          if (logoPath) patch.logo_storage_path = logoPath;
          const { error } = await supabase.from("tenants").update(patch).eq("id", editingTenantId);
          if (error) throw error;
          toast.success("Cliente atualizado");
        } else {
          const { data: inserted, error } = await supabase
            .from("tenants")
            .insert({
              name: tName.trim(),
              code: tCode,
              description: tDesc,
              coleta_form_code: tColetaCode.trim() || DEFAULT_COLETA_FORM_CODE,
              coleta_form_title: tColetaTitle.trim() || DEFAULT_COLETA_FORM_TITLE,
              coleta_form_revision: tColetaRev.trim() || DEFAULT_COLETA_FORM_REVISION,
              ...billingPatch(),
            })
            .select("id")
            .single();
          if (error) throw error;
          if (tLogoFile && inserted?.id) {
            const logoPath = await uploadTenantLogo(inserted.id);
            await supabase.from("tenants").update({ logo_storage_path: logoPath }).eq("id", inserted.id);
          }
          toast.success("Cliente criado");
        }
      } else if (editingTenantId) {
        toast.error("Edição de cliente não disponível neste modo");
        return;
      } else {
        await api.post("/tenants", { name: tName.trim(), code: tCode, description: tDesc });
        toast.success("Cliente criado");
      }
      setOpenTenant(false);
      resetTenantForm();
      await load();
      reloadTenants?.();
    } catch (e) {
      toastSupabaseAccessError(e, "Falha");
    }
  };

  const openEditTenant = async (t) => {
    setEditingTenantId(t.id);
    setTName(t.name);
    setTCode(t.code || "");
    setTDesc(t.description || "");
    setTLogoFile(null);
    setTLogoPath(t.logo_storage_path || "");
    setTColetaCode(t.coleta_form_code || DEFAULT_COLETA_FORM_CODE);
    setTColetaTitle(t.coleta_form_title || DEFAULT_COLETA_FORM_TITLE);
    setTColetaRev(t.coleta_form_revision || DEFAULT_COLETA_FORM_REVISION);
    setTLegalName(t.legal_name || "");
    setTTradeName(t.trade_name || "");
    setTBillingAddress(t.billing_address || "");
    setTBillingCep(t.billing_cep || "");
    setTBillingCity(t.billing_city || "");
    setTBillingState(t.billing_state || "");
    setTBillingPhone(t.billing_phone || "");
    setTBillingEmail(t.billing_email || "");
    setTBillingCnpj(t.billing_cnpj || "");
    setTBillingIe(t.billing_state_registration || "");
    setTEnvResponsible(t.environment_responsible_name || "");
    setTLogoPreview("");
    if (t.logo_storage_path) {
      const { data } = await supabase.storage.from(TENANT_BRANDING_BUCKET).createSignedUrl(t.logo_storage_path, 3600);
      if (data?.signedUrl) setTLogoPreview(data.signedUrl);
    }
    setOpenTenant(true);
  };

  const onTenantLogoPick = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!/^image\/(png|jpeg|jpg|webp)$/i.test(file.type)) {
      toast.error("Use PNG, JPG ou WebP");
      return;
    }
    setTLogoFile(file);
    setTLogoPreview(URL.createObjectURL(file));
  };

  const removeTenant = async (id) => {
    if (!window.confirm("Excluir cliente, seus documentos e usuários?")) return;
    try {
      if (isSupabaseAuthMode) {
        const { error } = await supabase.from("tenants").delete().eq("id", id);
        if (error) throw error;
      } else {
        await api.delete(`/tenants/${id}`);
      }
      toast.success("Excluído");
      if (currentTenantId === id) selectTenant(null);
      await load();
      reloadTenants?.();
    } catch (e) {
      toastSupabaseAccessError(e, "Falha");
    }
  };

  const createOrUpdateUser = async () => {
    if (!uEmail || !uName.trim()) return toast.error("Preencha nome e e-mail");
    if (!editingUserId && !uPassword) return toast.error("Informe a senha para novo utilizador");
    if (uRole !== "admin" && !uTenant) return toast.error("Selecione o ambiente (cliente) para este utilizador");

    if (uRole === "signatario" && !uEmployeeId) {
      return toast.error("Selecione o colaborador signatário vinculado a este login");
    }

    try {
      if (isSupabaseAuthMode) {
        if (editingUserId) {
          await invokeSupabaseEdgeFunction("admin-update-user", {
            user_id: editingUserId,
            full_name: uName.trim(),
            role: uRole,
            tenant_id: uRole === "admin" ? null : uTenant,
            email: uEmail.trim(),
            employee_registration_id: uRole === "signatario" ? uEmployeeId : null,
          });
          toast.success("Utilizador atualizado");
        } else {
          await invokeSupabaseEdgeFunction("admin-create-user", {
            email: uEmail.trim(),
            password: uPassword,
            full_name: uName.trim(),
            role: uRole,
            tenant_id: uRole === "admin" ? null : uTenant,
            employee_registration_id: uRole === "signatario" ? uEmployeeId : undefined,
          });
          toast.success("Utilizador criado");
        }
      } else {
        if (editingUserId) {
          toast.error("Edição de utilizador não disponível neste modo");
          return;
        }
        await api.post("/auth/register", {
          name: uName,
          email: uEmail,
          password: uPassword,
          role: uRole,
          tenant_id: uRole === "admin" ? null : uTenant,
        });
        toast.success("Usuário criado");
      }
      setOpenUser(false);
      resetUserForm();
      await load();
    } catch (e) {
      toastSupabaseAccessError(e, "Falha");
    }
  };

  const openEditUser = (u, tenantIdForScope) => {
    setEditingUserId(u.id);
    setUName(u.name);
    setUEmail(u.email);
    setUPassword("");
    setURole(u.role);
    setUTenant(u.role === "admin" ? "" : tenantIdForScope || u.tenant_id || "");
    setUEmployeeId(u.employee_registration_id || "");
    setOpenUser(true);
  };

  const removeUser = async (userId) => {
    if (!isSupabaseAuthMode) return;
    if (!window.confirm("Eliminar este utilizador?")) return;
    try {
      await invokeSupabaseEdgeFunction("admin-delete-user", { user_id: userId });
      toast.success("Utilizador eliminado");
      await load();
    } catch (e) {
      toastSupabaseAccessError(e, e.message || "Falha");
    }
  };

  const createOrUpdateResp = async () => {
    if (!rTenant || !rName.trim()) return toast.error("Selecione o ambiente e informe o nome");
    try {
      if (isSupabaseAuthMode) {
        if (editingRespId) {
          const { error } = await supabase
            .from("responsibles")
            .update({ name: rName.trim(), role: rRole, email: rEmail || "" })
            .eq("id", editingRespId);
          if (error) throw error;
          toast.success("Responsável atualizado");
        } else {
          const { error } = await supabase
            .from("responsibles")
            .insert({ tenant_id: rTenant, name: rName.trim(), role: rRole, email: rEmail || "" });
          if (error) throw error;
          toast.success("Responsável cadastrado");
        }
      } else if (editingRespId) {
        toast.error("Edição de responsável não disponível neste modo");
        return;
      } else {
        await api.post(`/tenants/${rTenant}/responsibles`, {
          name: rName.trim(),
          role: rRole,
          email: rEmail,
        });
        toast.success("Responsável cadastrado");
      }
      setOpenResp(false);
      resetRespForm();
      await load();
    } catch (e) {
      toastSupabaseAccessError(e, "Falha");
    }
  };

  const openEditResp = (r, tenantId) => {
    setEditingRespId(r.id);
    setRTenant(tenantId);
    setRName(r.name);
    setRRole(r.role);
    setREmail(r.email || "");
    setOpenResp(true);
  };

  const removeResp = async (tenantId, rid) => {
    if (!window.confirm("Excluir este responsável?")) return;
    try {
      if (isSupabaseAuthMode) {
        const { error } = await supabase.from("responsibles").delete().eq("id", rid);
        if (error) throw error;
      } else {
        await api.delete(`/tenants/${tenantId}/responsibles/${rid}`);
      }
      await load();
    } catch (e) {
      toastSupabaseAccessError(e, "Falha");
    }
  };

  return (
    <div className="space-y-6" data-testid="admin-clients">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <div className="text-[10px] uppercase tracking-[0.2em] text-slate-500">Administração CTLI</div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 mt-1">Ambientes (clientes)</h1>
          <p className="text-sm text-slate-600 mt-1">
            Cada ambiente corresponde a um cliente: documentos, responsáveis e utilizadores do portal ficam isolados.
            A CTLI cria ambientes e as contas de acesso (incluindo &quot;Conta cliente&quot;) para o cliente entrar só no seu espaço.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Dialog
            open={openResp}
            onOpenChange={(o) => {
              setOpenResp(o);
              if (!o) resetRespForm();
            }}
          >
            <DialogTrigger asChild>
              <Button variant="outline" data-testid="open-create-resp">
                <IdentificationCard size={16} className="mr-1.5" /> Novo responsável
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="font-display">
                  {editingRespId ? "Editar responsável" : "Novo responsável"}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div>
                  <Label>Ambiente (cliente)</Label>
                  <select
                    value={rTenant}
                    onChange={(e) => setRTenant(e.target.value)}
                    className="w-full border border-slate-200 rounded-md h-10 px-3 mt-1 text-sm bg-white"
                    data-testid="resp-tenant-select"
                    disabled={Boolean(editingRespId)}
                  >
                    <option value="">Selecione…</option>
                    {tenants.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label>Nome *</Label>
                  <Input value={rName} onChange={(e) => setRName(e.target.value)} data-testid="resp-name-input" />
                </div>
                <div>
                  <Label>Cargo</Label>
                  <select
                    value={rRole}
                    onChange={(e) => setRRole(e.target.value)}
                    className="w-full border border-slate-200 rounded-md h-10 px-3 mt-1 text-sm bg-white"
                    data-testid="resp-role-select"
                  >
                    {RESPONSIBLE_ROLES.map((r) => (
                      <option key={r.value} value={r.value}>
                        {r.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label>E-mail (opcional)</Label>
                  <Input type="email" value={rEmail} onChange={(e) => setREmail(e.target.value)} />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpenResp(false)}>
                  Cancelar
                </Button>
                <Button onClick={createOrUpdateResp} className="bg-blue-600 hover:bg-blue-700 text-white" data-testid="confirm-create-resp">
                  {editingRespId ? "Guardar" : "Cadastrar"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog
            open={openUser}
            onOpenChange={(o) => {
              setOpenUser(o);
              if (!o) resetUserForm();
            }}
          >
            <DialogTrigger asChild>
              <Button variant="outline" data-testid="open-create-user">
                <UserPlus size={16} className="mr-1.5" /> Novo usuário
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="font-display">{editingUserId ? "Editar usuário" : "Novo usuário"}</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div>
                  <Label>
                    Ambiente (cliente) {uRole === "admin" && <span className="text-xs text-slate-500">(não aplicável a CTLI)</span>}
                  </Label>
                  <select
                    value={uTenant}
                    onChange={(e) => setUTenant(e.target.value)}
                    className="w-full border border-slate-200 rounded-md h-10 px-3 mt-1 text-sm bg-white"
                    data-testid="user-tenant-select"
                    disabled={uRole === "admin"}
                  >
                    <option value="">Selecione…</option>
                    {tenants.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label>Nível de acesso</Label>
                  <select
                    value={uRole}
                    onChange={(e) => {
                      setURole(e.target.value);
                      if (e.target.value !== "signatario") setUEmployeeId("");
                    }}
                    className="w-full border border-slate-200 rounded-md h-10 px-3 mt-1 text-sm bg-white"
                    data-testid="user-role-select"
                  >
                    {ROLES.map((r) => (
                      <option key={r.value} value={r.value}>
                        {r.label}
                      </option>
                    ))}
                  </select>
                </div>
                {uRole === "signatario" && (
                  <div>
                    <Label>Colaborador signatário *</Label>
                    <select
                      value={uEmployeeId}
                      onChange={(e) => setUEmployeeId(e.target.value)}
                      className="w-full border border-slate-200 rounded-md h-10 px-3 mt-1 text-sm bg-white"
                      disabled={!uTenant}
                    >
                      <option value="">Selecione o colaborador…</option>
                      {tenantSignatories.map((e) => (
                        <option key={e.id} value={e.id}>
                          {e.full_name}
                          {e.registration_code ? ` (${e.registration_code})` : ""}
                        </option>
                      ))}
                    </select>
                    {!uTenant && (
                      <p className="text-xs text-slate-500 mt-1">Selecione o ambiente primeiro.</p>
                    )}
                    {uTenant && tenantSignatories.length === 0 && (
                      <p className="text-xs text-amber-700 mt-1">
                        Cadastre um colaborador com função Signatário em Cadastros.
                      </p>
                    )}
                  </div>
                )}
                <div>
                  <Label>Nome *</Label>
                  <Input value={uName} onChange={(e) => setUName(e.target.value)} data-testid="user-name-input" />
                </div>
                <div>
                  <Label>E-mail *</Label>
                  <Input type="email" value={uEmail} onChange={(e) => setUEmail(e.target.value)} data-testid="user-email-input" />
                </div>
                {!editingUserId && (
                  <div>
                    <Label>Senha *</Label>
                    <Input type="password" value={uPassword} onChange={(e) => setUPassword(e.target.value)} data-testid="user-password-input" />
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpenUser(false)}>
                  Cancelar
                </Button>
                <Button onClick={createOrUpdateUser} className="bg-blue-600 hover:bg-blue-700 text-white" data-testid="confirm-create-user">
                  {editingUserId ? "Guardar" : "Criar"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog
            open={openTenant}
            onOpenChange={(o) => {
              setOpenTenant(o);
              if (!o) resetTenantForm();
            }}
          >
            <DialogTrigger asChild>
              <Button
                className="bg-blue-600 hover:bg-blue-700 text-white"
                data-testid="open-create-tenant"
                onClick={() => resetTenantForm()}
              >
                <Plus size={16} className="mr-1.5" /> Novo ambiente
              </Button>
            </DialogTrigger>
            <DialogContent className="w-[calc(100vw-2rem)] max-w-lg sm:max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="font-display">{editingTenantId ? "Editar ambiente" : "Novo ambiente"}</DialogTitle>
              </DialogHeader>
              <div className="space-y-3 min-w-0">
                <div>
                  <Label>Nome *</Label>
                  <Input value={tName} onChange={(e) => setTName(e.target.value)} data-testid="tenant-name-input" />
                </div>
                <div>
                  <Label>Código</Label>
                  <Input value={tCode} onChange={(e) => setTCode(e.target.value)} placeholder="ACME-001" />
                </div>
                <div>
                  <Label>Descrição</Label>
                  <Input value={tDesc} onChange={(e) => setTDesc(e.target.value)} />
                </div>
                <div>
                  <Label className="text-slate-700 font-medium">Formulário RE-7.2A</Label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-2">
                    <div className="min-w-0">
                      <Label className="text-xs">Código</Label>
                      <Input value={tColetaCode} onChange={(e) => setTColetaCode(e.target.value)} />
                    </div>
                    <div className="min-w-0">
                      <Label className="text-xs">Título</Label>
                      <Input value={tColetaTitle} onChange={(e) => setTColetaTitle(e.target.value)} />
                    </div>
                    <div className="min-w-0 sm:col-span-2 lg:col-span-1">
                      <Label className="text-xs">Revisão / data</Label>
                      <Input value={tColetaRev} onChange={(e) => setTColetaRev(e.target.value)} />
                    </div>
                  </div>
                </div>
                {isSupabaseAuthMode && (
                  <div>
                    <Label>Logo do ambiente (PDF coleta)</Label>
                    <Input type="file" accept="image/png,image/jpeg,image/webp" onChange={onTenantLogoPick} className="mt-1" />
                    {tLogoPreview && (
                      <img src={tLogoPreview} alt="Pré-visualização do logo" className="mt-2 h-16 w-auto object-contain border rounded p-1 bg-white" />
                    )}
                  </div>
                )}
                {isSupabaseAuthMode && editingTenantId && (
                  <div className="border-t pt-3 space-y-3">
                    <Label className="text-slate-700 font-medium">Dados para faturamento (pedidos de compra)</Label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 min-w-0">
                      <div className="min-w-0">
                        <Label className="text-xs">Razão social</Label>
                        <Input value={tLegalName} onChange={(e) => setTLegalName(e.target.value)} />
                      </div>
                      <div className="min-w-0">
                        <Label className="text-xs">Nome fantasia</Label>
                        <Input value={tTradeName} onChange={(e) => setTTradeName(e.target.value)} />
                      </div>
                      <div className="min-w-0 sm:col-span-2">
                        <Label className="text-xs">Endereço</Label>
                        <Input value={tBillingAddress} onChange={(e) => setTBillingAddress(e.target.value)} />
                      </div>
                      <div className="min-w-0 sm:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="min-w-0">
                          <Label className="text-xs">CEP</Label>
                          <Input value={tBillingCep} onChange={(e) => setTBillingCep(e.target.value)} />
                        </div>
                        <div className="min-w-0">
                          <Label className="text-xs">Cidade</Label>
                          <Input value={tBillingCity} onChange={(e) => setTBillingCity(e.target.value)} />
                        </div>
                        <div className="min-w-0">
                          <Label className="text-xs">UF</Label>
                          <Input value={tBillingState} onChange={(e) => setTBillingState(e.target.value)} />
                        </div>
                      </div>
                      <div className="min-w-0">
                        <Label className="text-xs">Telefone</Label>
                        <Input value={tBillingPhone} onChange={(e) => setTBillingPhone(e.target.value)} />
                      </div>
                      <div className="min-w-0">
                        <Label className="text-xs">E-mail (faturamento e envio de certificados)</Label>
                        <Input type="email" value={tBillingEmail} onChange={(e) => setTBillingEmail(e.target.value)} placeholder="certificados@empresa.com.br" />
                      </div>
                      <div className="min-w-0">
                        <Label className="text-xs">CNPJ</Label>
                        <Input value={tBillingCnpj} onChange={(e) => setTBillingCnpj(e.target.value)} />
                      </div>
                      <div className="min-w-0">
                        <Label className="text-xs">Inscrição estadual</Label>
                        <Input value={tBillingIe} onChange={(e) => setTBillingIe(e.target.value)} />
                      </div>
                      <div className="min-w-0 sm:col-span-2">
                        <Label className="text-xs">Responsável pelo ambiente</Label>
                        <Input value={tEnvResponsible} onChange={(e) => setTEnvResponsible(e.target.value)} />
                      </div>
                    </div>
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpenTenant(false)}>
                  Cancelar
                </Button>
                <Button onClick={createOrUpdateTenant} className="bg-blue-600 hover:bg-blue-700 text-white" data-testid="confirm-create-tenant">
                  {editingTenantId ? "Guardar" : "Criar"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {isSupabaseAuthMode && (
        <Card className="border-slate-200">
          <CardHeader className="pb-2">
            <CardTitle className="font-display text-lg flex items-center gap-2">
              <Users size={20} /> Administradores CTLI
            </CardTitle>
          </CardHeader>
          <CardContent>
            {adminProfiles.length === 0 ? (
              <p className="text-sm text-slate-500">Nenhum administrador CTLI listado.</p>
            ) : (
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {adminProfiles.map((p) => (
                  <div
                    key={p.id}
                    className="text-xs flex items-center justify-between border border-slate-100 rounded px-2 py-1.5 gap-2"
                  >
                    <div className="min-w-0">
                      <div className="font-medium text-slate-700 truncate">{p.full_name}</div>
                      <div className="text-slate-500 truncate">
                        {p.email} • {roleShort(p.role)}
                      </div>
                    </div>
                    <div className="flex items-center gap-0.5 shrink-0">
                      <button
                        type="button"
                        onClick={() =>
                          openEditUser(
                            { id: p.id, name: p.full_name, email: p.email, role: p.role },
                            null,
                          )
                        }
                        className="text-slate-500 hover:text-blue-600 p-1"
                        title="Editar"
                      >
                        <PencilSimple size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => removeUser(p.id)}
                        className="text-red-500 hover:text-red-700 p-1"
                        title="Excluir"
                      >
                        <Trash size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {tenants.length === 0 && (
          <Card className="md:col-span-2 xl:col-span-3 border-slate-200 border-dashed">
            <CardContent className="p-10 text-center">
              <Buildings size={48} className="mx-auto text-slate-300" />
              <h3 className="font-display text-xl font-semibold mt-3">Nenhum ambiente (cliente)</h3>
              <p className="text-sm text-slate-600">Cadastre o primeiro ambiente para começar.</p>
            </CardContent>
          </Card>
        )}
        {tenants.map((t) => (
          <Card key={t.id} className="border-slate-200" data-testid={`tenant-card-${t.id}`}>
            <CardHeader className="pb-2 flex flex-row items-start justify-between gap-2">
              <div className="min-w-0">
                <CardTitle className="font-display text-lg truncate">{t.name}</CardTitle>
                {t.code && <div className="text-xs font-mono text-slate-500 mt-0.5">{t.code}</div>}
              </div>
              <div className="flex items-center gap-0.5 shrink-0">
                {isSupabaseAuthMode && (
                  <Button variant="ghost" size="sm" onClick={() => openEditTenant(t)} className="text-slate-600" title="Editar">
                    <PencilSimple size={16} />
                  </Button>
                )}
                <Button variant="ghost" size="sm" onClick={() => removeTenant(t.id)} className="text-red-600 hover:text-red-700" title="Excluir">
                  <Trash size={16} />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {t.description && <p className="text-sm text-slate-600 mb-3">{t.description}</p>}

              <Tabs defaultValue="resp">
                <TabsList className="w-full grid grid-cols-2 bg-slate-100">
                  <TabsTrigger value="resp" data-testid={`tab-resp-${t.id}`}>
                    Responsáveis ({(resps[t.id] || []).length})
                  </TabsTrigger>
                  <TabsTrigger value="users" data-testid={`tab-users-${t.id}`}>
                    Usuários ({(users[t.id] || []).length})
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="resp" className="mt-3 space-y-1 max-h-44 overflow-y-auto">
                  {(resps[t.id] || []).length === 0 && (
                    <div className="text-xs text-slate-500 italic">Sem responsáveis. Use &quot;Novo responsável&quot;.</div>
                  )}
                  {(resps[t.id] || []).map((r) => (
                    <div key={r.id} className="text-xs flex items-center justify-between border border-slate-100 rounded px-2 py-1.5 gap-2">
                      <div className="min-w-0">
                        <div className="font-medium text-slate-700 truncate">{r.name}</div>
                        <div className="text-slate-500 truncate">
                          {roleShort(r.role)}
                          {r.email ? ` • ${r.email}` : ""}
                        </div>
                      </div>
                      <div className="flex items-center gap-0.5 shrink-0">
                        {isSupabaseAuthMode && (
                          <button
                            type="button"
                            onClick={() => openEditResp(r, t.id)}
                            className="text-slate-500 hover:text-blue-600 p-1"
                            title="Editar"
                          >
                            <PencilSimple size={12} />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => removeResp(t.id, r.id)}
                          className="text-red-500 hover:text-red-700 p-1"
                          title="Excluir"
                        >
                          <Trash size={12} />
                        </button>
                      </div>
                    </div>
                  ))}
                </TabsContent>

                <TabsContent value="users" className="mt-3 space-y-1 max-h-44 overflow-y-auto">
                  {(users[t.id] || []).length === 0 && <div className="text-xs text-slate-500 italic">Sem usuários.</div>}
                  {(users[t.id] || []).map((u) => (
                    <div key={u.id} className="text-xs flex items-center justify-between border border-slate-100 rounded px-2 py-1.5 gap-2">
                      <div className="min-w-0">
                        <div className="font-medium text-slate-700 truncate">{u.name}</div>
                        <div className="text-slate-500 truncate">
                          {u.email} • {roleShort(u.role)}
                        </div>
                      </div>
                      {isSupabaseAuthMode && (
                        <div className="flex items-center gap-0.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => openEditUser(u, t.id)}
                            className="text-slate-500 hover:text-blue-600 p-1"
                            title="Editar"
                          >
                            <PencilSimple size={12} />
                          </button>
                          <button type="button" onClick={() => removeUser(u.id)} className="text-red-500 hover:text-red-700 p-1" title="Excluir">
                            <Trash size={12} />
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </TabsContent>
              </Tabs>

              <Button
                variant="outline"
                size="sm"
                className="w-full mt-4"
                onClick={() => (requestAdminTenantSwitch || selectTenant)(t.id)}
                data-testid={`enter-tenant-${t.id}`}
              >
                Entrar no ambiente
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default AdminClients;
