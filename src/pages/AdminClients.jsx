import React, { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Plus, Buildings, UserPlus, Trash, Users, IdentificationCard } from "@phosphor-icons/react";
import { toast } from "sonner";
import { ROLES, RESPONSIBLE_ROLES, roleShort } from "@/lib/roles";

const AdminClients = () => {
  const { isAdmin, reloadTenants, currentTenantId, selectTenant } = useOutletContext();
  const [tenants, setTenants] = useState([]);
  const [users, setUsers] = useState({});
  const [resps, setResps] = useState({});
  const [openTenant, setOpenTenant] = useState(false);
  const [openUser, setOpenUser] = useState(false);
  const [openResp, setOpenResp] = useState(false);

  const [tName, setTName] = useState("");
  const [tCode, setTCode] = useState("");
  const [tDesc, setTDesc] = useState("");

  const [uTenant, setUTenant] = useState("");
  const [uName, setUName] = useState("");
  const [uEmail, setUEmail] = useState("");
  const [uPassword, setUPassword] = useState("");
  const [uRole, setURole] = useState("gerente_qualidade");

  const [rTenant, setRTenant] = useState("");
  const [rName, setRName] = useState("");
  const [rRole, setRRole] = useState("gerente_qualidade");
  const [rEmail, setREmail] = useState("");

  const load = async () => {
    const { data } = await api.get("/tenants");
    setTenants(data);
    const us = {}; const rs = {};
    for (const t of data) {
      try { us[t.id] = (await api.get(`/tenants/${t.id}/users`)).data; } catch { us[t.id] = []; }
      try { rs[t.id] = (await api.get(`/tenants/${t.id}/responsibles`)).data; } catch { rs[t.id] = []; }
    }
    setUsers(us); setResps(rs);
  };

  useEffect(() => { load(); }, []);

  if (!isAdmin) return <div className="text-slate-600">Acesso restrito.</div>;

  const createTenant = async () => {
    if (!tName.trim()) return toast.error("Informe o nome");
    try {
      await api.post("/tenants", { name: tName.trim(), code: tCode, description: tDesc });
      toast.success("Cliente criado");
      setOpenTenant(false); setTName(""); setTCode(""); setTDesc("");
      await load(); reloadTenants?.();
    } catch { toast.error("Falha"); }
  };

  const removeTenant = async (id) => {
    if (!window.confirm("Excluir cliente, seus documentos e usuários?")) return;
    try {
      await api.delete(`/tenants/${id}`);
      toast.success("Excluído");
      if (currentTenantId === id) selectTenant(null);
      await load(); reloadTenants?.();
    } catch { toast.error("Falha"); }
  };

  const createUser = async () => {
    if (!uTenant || !uEmail || !uPassword || !uName) return toast.error("Preencha todos os campos");
    try {
      await api.post("/auth/register", {
        name: uName, email: uEmail, password: uPassword, role: uRole,
        tenant_id: uRole === "admin" ? null : uTenant,
      });
      toast.success("Usuário criado");
      setOpenUser(false); setUName(""); setUEmail(""); setUPassword(""); setUTenant(""); setURole("gerente_qualidade");
      await load();
    } catch (e) {
      const msg = e.response?.data?.detail || "Falha";
      toast.error(typeof msg === "string" ? msg : "Falha");
    }
  };

  const createResp = async () => {
    if (!rTenant || !rName.trim()) return toast.error("Selecione cliente e informe o nome");
    try {
      await api.post(`/tenants/${rTenant}/responsibles`, { name: rName.trim(), role: rRole, email: rEmail });
      toast.success("Responsável cadastrado");
      setOpenResp(false); setRTenant(""); setRName(""); setRRole("gerente_qualidade"); setREmail("");
      await load();
    } catch { toast.error("Falha"); }
  };

  const removeResp = async (tenantId, rid) => {
    if (!window.confirm("Excluir este responsável?")) return;
    try {
      await api.delete(`/tenants/${tenantId}/responsibles/${rid}`);
      await load();
    } catch { toast.error("Falha"); }
  };

  return (
    <div className="space-y-6" data-testid="admin-clients">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <div className="text-[10px] uppercase tracking-[0.2em] text-slate-500">Administração</div>
          <h1 className="font-display text-3xl font-bold tracking-tight text-slate-900 mt-1">Clientes</h1>
          <p className="text-sm text-slate-600 mt-1">Cada cliente possui sua própria base de procedimentos, registros, usuários e responsáveis.</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Dialog open={openResp} onOpenChange={setOpenResp}>
            <DialogTrigger asChild>
              <Button variant="outline" data-testid="open-create-resp"><IdentificationCard size={16} className="mr-1.5" /> Novo responsável</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle className="font-display">Novo responsável</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div>
                  <Label>Cliente</Label>
                  <select value={rTenant} onChange={(e) => setRTenant(e.target.value)} className="w-full border border-slate-200 rounded-md h-10 px-3 mt-1 text-sm bg-white" data-testid="resp-tenant-select">
                    <option value="">Selecione…</option>
                    {tenants.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </div>
                <div><Label>Nome *</Label><Input value={rName} onChange={(e) => setRName(e.target.value)} data-testid="resp-name-input" /></div>
                <div>
                  <Label>Cargo</Label>
                  <select value={rRole} onChange={(e) => setRRole(e.target.value)} className="w-full border border-slate-200 rounded-md h-10 px-3 mt-1 text-sm bg-white" data-testid="resp-role-select">
                    {RESPONSIBLE_ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                  </select>
                </div>
                <div><Label>E-mail (opcional)</Label><Input type="email" value={rEmail} onChange={(e) => setREmail(e.target.value)} /></div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpenResp(false)}>Cancelar</Button>
                <Button onClick={createResp} className="bg-blue-600 hover:bg-blue-700 text-white" data-testid="confirm-create-resp">Cadastrar</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={openUser} onOpenChange={setOpenUser}>
            <DialogTrigger asChild>
              <Button variant="outline" data-testid="open-create-user"><UserPlus size={16} className="mr-1.5" /> Novo usuário</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle className="font-display">Novo usuário</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div>
                  <Label>Cliente {uRole === "admin" && <span className="text-xs text-slate-500">(não obrigatório para admin)</span>}</Label>
                  <select value={uTenant} onChange={(e) => setUTenant(e.target.value)} className="w-full border border-slate-200 rounded-md h-10 px-3 mt-1 text-sm bg-white" data-testid="user-tenant-select" disabled={uRole === "admin"}>
                    <option value="">Selecione…</option>
                    {tenants.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </div>
                <div>
                  <Label>Nível de acesso</Label>
                  <select value={uRole} onChange={(e) => setURole(e.target.value)} className="w-full border border-slate-200 rounded-md h-10 px-3 mt-1 text-sm bg-white" data-testid="user-role-select">
                    {ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                  </select>
                </div>
                <div><Label>Nome *</Label><Input value={uName} onChange={(e) => setUName(e.target.value)} data-testid="user-name-input" /></div>
                <div><Label>E-mail *</Label><Input type="email" value={uEmail} onChange={(e) => setUEmail(e.target.value)} data-testid="user-email-input" /></div>
                <div><Label>Senha *</Label><Input type="password" value={uPassword} onChange={(e) => setUPassword(e.target.value)} data-testid="user-password-input" /></div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpenUser(false)}>Cancelar</Button>
                <Button onClick={createUser} className="bg-blue-600 hover:bg-blue-700 text-white" data-testid="confirm-create-user">Criar</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={openTenant} onOpenChange={setOpenTenant}>
            <DialogTrigger asChild>
              <Button className="bg-blue-600 hover:bg-blue-700 text-white" data-testid="open-create-tenant"><Plus size={16} className="mr-1.5" /> Novo cliente</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle className="font-display">Novo cliente</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div><Label>Nome *</Label><Input value={tName} onChange={(e) => setTName(e.target.value)} data-testid="tenant-name-input" /></div>
                <div><Label>Código</Label><Input value={tCode} onChange={(e) => setTCode(e.target.value)} placeholder="ACME-001" /></div>
                <div><Label>Descrição</Label><Input value={tDesc} onChange={(e) => setTDesc(e.target.value)} /></div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpenTenant(false)}>Cancelar</Button>
                <Button onClick={createTenant} className="bg-blue-600 hover:bg-blue-700 text-white" data-testid="confirm-create-tenant">Criar</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {tenants.length === 0 && (
          <Card className="md:col-span-2 xl:col-span-3 border-slate-200 border-dashed">
            <CardContent className="p-10 text-center">
              <Buildings size={48} className="mx-auto text-slate-300" />
              <h3 className="font-display text-xl font-semibold mt-3">Nenhum cliente</h3>
              <p className="text-sm text-slate-600">Cadastre o primeiro cliente para começar.</p>
            </CardContent>
          </Card>
        )}
        {tenants.map((t) => (
          <Card key={t.id} className="border-slate-200" data-testid={`tenant-card-${t.id}`}>
            <CardHeader className="pb-2 flex flex-row items-start justify-between">
              <div className="min-w-0">
                <CardTitle className="font-display text-lg truncate">{t.name}</CardTitle>
                {t.code && <div className="text-xs font-mono text-slate-500 mt-0.5">{t.code}</div>}
              </div>
              <Button variant="ghost" size="sm" onClick={() => removeTenant(t.id)} className="text-red-600 hover:text-red-700"><Trash size={16} /></Button>
            </CardHeader>
            <CardContent>
              {t.description && <p className="text-sm text-slate-600 mb-3">{t.description}</p>}

              <Tabs defaultValue="resp">
                <TabsList className="w-full grid grid-cols-2 bg-slate-100">
                  <TabsTrigger value="resp" data-testid={`tab-resp-${t.id}`}>Responsáveis ({(resps[t.id] || []).length})</TabsTrigger>
                  <TabsTrigger value="users" data-testid={`tab-users-${t.id}`}>Usuários ({(users[t.id] || []).length})</TabsTrigger>
                </TabsList>

                <TabsContent value="resp" className="mt-3 space-y-1 max-h-44 overflow-y-auto">
                  {(resps[t.id] || []).length === 0 && (
                    <div className="text-xs text-slate-500 italic">Sem responsáveis. Use "Novo responsável".</div>
                  )}
                  {(resps[t.id] || []).map((r) => (
                    <div key={r.id} className="text-xs flex items-center justify-between border border-slate-100 rounded px-2 py-1.5">
                      <div className="min-w-0">
                        <div className="font-medium text-slate-700 truncate">{r.name}</div>
                        <div className="text-slate-500 truncate">{roleShort(r.role)}{r.email ? ` • ${r.email}` : ""}</div>
                      </div>
                      <button onClick={() => removeResp(t.id, r.id)} className="text-red-500 hover:text-red-700 p-1" title="Excluir"><Trash size={12} /></button>
                    </div>
                  ))}
                </TabsContent>

                <TabsContent value="users" className="mt-3 space-y-1 max-h-44 overflow-y-auto">
                  {(users[t.id] || []).length === 0 && (
                    <div className="text-xs text-slate-500 italic">Sem usuários.</div>
                  )}
                  {(users[t.id] || []).map((u) => (
                    <div key={u.id} className="text-xs flex items-center justify-between border border-slate-100 rounded px-2 py-1.5">
                      <div className="min-w-0">
                        <div className="font-medium text-slate-700 truncate">{u.name}</div>
                        <div className="text-slate-500 truncate">{u.email} • {roleShort(u.role)}</div>
                      </div>
                    </div>
                  ))}
                </TabsContent>
              </Tabs>

              <Button variant="outline" size="sm" className="w-full mt-4" onClick={() => selectTenant(t.id)} data-testid={`enter-tenant-${t.id}`}>
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
