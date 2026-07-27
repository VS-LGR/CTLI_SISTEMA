import React, { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, PencilSimple, Trash } from "@phosphor-icons/react";
import { toast } from "sonner";
import { invokeSupabaseEdgeFunction } from "@/lib/supabaseFunctions";
import { ROLES, roleShort } from "@/lib/roles";
import { TENANT_ADMIN_CREATABLE_ROLES } from "@/lib/tenantAccess";
import { useAuth } from "@/context/AuthContext";
import AccessAclPicker from "@/components/access/AccessAclPicker";
import {
  accessFlagsFromAcl,
  isAclActive,
  normalizeAccessAcl,
  presetAccessAclForRole,
} from "@/lib/accessAcl";
import { ensureProfileAccessAcl } from "@/lib/accessAclPersist";

const ASSIGNABLE_ROLES = ROLES.filter((r) => TENANT_ADMIN_CREATABLE_ROLES.includes(r.value));

export default function TenantUsersPanel({ tenantId, isAdmin }) {
  const { user } = useAuth();
  const [rows, setRows] = useState([]);
  const [signatories, setSignatories] = useState([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("gerente_qualidade");
  const [employeeId, setEmployeeId] = useState("");
  const [accessAcl, setAccessAcl] = useState(() => presetAccessAclForRole("gerente_qualidade"));
  /** true = liberações personalizadas ou carregadas da BD — não sobrescrever ao mudar o nível. */
  const aclDirtyRef = useRef(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!tenantId) return;
    const { data, error } = await supabase
      .from("profiles")
      .select("id, email, full_name, role, employee_registration_id, access_coleta, access_certificados, access_acl")
      .eq("tenant_id", tenantId)
      .neq("role", "admin")
      .order("full_name");
    if (error) toast.error(error.message);
    else {
      const list = data || [];
      setRows(isAdmin ? list : list.filter((p) => p.role !== "client" || p.id === user?.id));
    }

    const { data: emps } = await supabase
      .from("employee_registrations")
      .select("id, full_name, registration_code")
      .eq("tenant_id", tenantId)
      .eq("job_role", "signatario")
      .order("full_name");
    setSignatories(emps || []);
  }, [tenantId, isAdmin, user?.id]);

  useEffect(() => { load(); }, [load]);

  const resetForm = () => {
    setEditing(null);
    setName("");
    setEmail("");
    setPassword("");
    setRole("gerente_qualidade");
    setEmployeeId("");
    aclDirtyRef.current = false;
    setAccessAcl(presetAccessAclForRole("gerente_qualidade"));
  };

  const applyRoleAclPreset = (roleValue = role) => {
    aclDirtyRef.current = false;
    setAccessAcl(presetAccessAclForRole(roleValue));
  };

  const handleAclChange = (next) => {
    aclDirtyRef.current = true;
    setAccessAcl(next);
  };

  const openCreate = () => {
    resetForm();
    setOpen(true);
  };

  const openEdit = (row) => {
    if (row.role === "client" && row.id !== user?.id && !isAdmin) return;
    setEditing(row);
    setName(row.full_name || "");
    setEmail(row.email || "");
    setPassword("");
    setRole(row.role || "gerente_qualidade");
    setEmployeeId(row.employee_registration_id || "");
    aclDirtyRef.current = true;
    setAccessAcl(
      isAclActive(row.access_acl)
        ? normalizeAccessAcl(row.access_acl)
        : presetAccessAclForRole(row.role),
    );
    setOpen(true);
  };

  const invoke = (body) =>
    invokeSupabaseEdgeFunction("tenant-manage-user", {
      ...body,
      ...(isAdmin ? { tenant_id: tenantId } : {}),
    });

  const save = async () => {
    if (!name.trim() || !email.trim()) return toast.error("Nome e e-mail são obrigatórios");
    if (!editing && !password) return toast.error("Senha obrigatória para novo usuário");
    if (role === "signatario" && !employeeId) return toast.error("Selecione o colaborador signatário");
    setSaving(true);
    try {
      const aclPayload = normalizeAccessAcl(accessAcl);
      const flags = accessFlagsFromAcl(aclPayload);
      const payload = {
        access_coleta: flags.access_coleta,
        access_certificados: flags.access_certificados,
        access_acl: aclPayload,
      };
      if (editing) {
        await invoke({
          action: "update",
          user_id: editing.id,
          full_name: name.trim(),
          email: email.trim(),
          role,
          ...(password ? { password } : {}),
          ...(role === "signatario" ? { employee_registration_id: employeeId } : {}),
          ...payload,
        });
        await ensureProfileAccessAcl(editing.id, aclPayload, flags);
        toast.success("Usuário atualizado");
      } else {
        const created = await invoke({
          action: "create",
          full_name: name.trim(),
          email: email.trim(),
          password,
          role,
          ...(role === "signatario" ? { employee_registration_id: employeeId } : {}),
          ...payload,
        });
        if (created?.id) {
          await ensureProfileAccessAcl(created.id, aclPayload, flags);
        }
        toast.success("Usuário criado");
      }
      setOpen(false);
      resetForm();
      load();
    } catch (e) {
      toast.error(e?.message || "Falha ao guardar usuário");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (row) => {
    if (row.id === user?.id) return toast.error("Não pode excluir a própria conta");
    if (!window.confirm(`Excluir usuário ${row.full_name}?`)) return;
    try {
      await invoke({ action: "delete", user_id: row.id });
      toast.success("Usuário excluído");
      load();
    } catch (e) {
      toast.error(e?.message || "Falha ao excluir");
    }
  };

  return (
    <div className="space-y-4" data-testid="tenant-users-panel">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-slate-600">
          Gerir acessos operacionais do ambiente (técnico, signatário, gerentes, etc.).
        </p>
        <Button onClick={openCreate} size="sm" className="bg-blue-600 hover:bg-blue-700 text-white">
          <Plus size={16} className="mr-1" /> Novo usuário
        </Button>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left">
            <tr>
              <th className="p-3 font-medium">Nome</th>
              <th className="p-3 font-medium">E-mail</th>
              <th className="p-3 font-medium">Nível</th>
              <th className="p-3 w-24" />
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-t border-slate-100">
                <td className="p-3">{row.full_name}</td>
                <td className="p-3 text-slate-600">{row.email}</td>
                <td className="p-3">{roleShort(row.role)}</td>
                <td className="p-3 text-right space-x-1">
                  {(row.role !== "client" || row.id === user?.id || isAdmin) && (
                    <>
                      <Button variant="ghost" size="icon" onClick={() => openEdit(row)} aria-label="Editar">
                        <PencilSimple size={16} />
                      </Button>
                      {row.id !== user?.id && row.role !== "client" && (
                        <Button variant="ghost" size="icon" onClick={() => remove(row)} aria-label="Excluir">
                          <Trash size={16} className="text-red-600" />
                        </Button>
                      )}
                    </>
                  )}
                </td>
              </tr>
            ))}
            {!rows.length && (
              <tr>
                <td colSpan={4} className="p-6 text-center text-slate-500">Nenhum usuário cadastrado.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) resetForm(); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar usuário" : "Novo usuário"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Label>Nível de acesso</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => applyRoleAclPreset(role)}
                  data-testid="tenant-user-acl-apply-preset"
                >
                  Padrão do nível
                </Button>
              </div>
              <select
                value={role}
                onChange={(e) => {
                  const next = e.target.value;
                  setRole(next);
                  if (next !== "signatario") setEmployeeId("");
                  if (!aclDirtyRef.current) {
                    applyRoleAclPreset(next);
                  }
                }}
                className="w-full border rounded-md h-10 px-3 mt-1 text-sm"
              >
                {ASSIGNABLE_ROLES.map((r) => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
            </div>
            <AccessAclPicker value={accessAcl} onChange={handleAclChange} />
            {role === "signatario" && (
              <div>
                <Label>Colaborador signatário</Label>
                <select
                  value={employeeId}
                  onChange={(e) => setEmployeeId(e.target.value)}
                  className="w-full border rounded-md h-10 px-3 mt-1 text-sm"
                >
                  <option value="">Selecione…</option>
                  {signatories.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.full_name}{e.registration_code ? ` (${e.registration_code})` : ""}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div>
              <Label>Nome</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div>
              <Label>E-mail</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div>
              <Label>{editing ? "Nova senha (opcional)" : "Senha"}</Label>
              <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={save} disabled={saving} className="bg-blue-600 hover:bg-blue-700 text-white">
              {saving ? "A guardar…" : editing ? "Guardar" : "Criar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
