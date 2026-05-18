import React, { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, PencilSimple, Trash } from "@phosphor-icons/react";
import { toast } from "sonner";

export default function ColetaTechniciansPanel({ tenantId, isAdmin }) {
  const [techs, setTechs] = useState([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!tenantId) return;
    const { data, error } = await supabase
      .from("profiles")
      .select("id, email, full_name, role")
      .eq("tenant_id", tenantId)
      .eq("role", "tecnico_campo")
      .order("full_name");
    if (error) toast.error(error.message);
    else setTechs(data || []);
  }, [tenantId]);

  useEffect(() => { load(); }, [load]);

  const resetForm = () => {
    setEditing(null);
    setName("");
    setEmail("");
    setPassword("");
  };

  const openCreate = () => {
    resetForm();
    setOpen(true);
  };

  const openEdit = (t) => {
    setEditing(t);
    setName(t.full_name || "");
    setEmail(t.email || "");
    setPassword("");
    setOpen(true);
  };

  const invoke = async (body) => {
    const { data, error } = await supabase.functions.invoke("tenant-manage-technician", { body });
    if (error) throw error;
    if (data?.error) throw new Error(data.error);
    return data;
  };

  const save = async () => {
    if (!name.trim() || !email.trim()) return toast.error("Nome e e-mail são obrigatórios");
    if (!editing && !password) return toast.error("Senha obrigatória para novo técnico");
    setSaving(true);
    try {
      if (editing) {
        await invoke({
          action: "update",
          user_id: editing.id,
          full_name: name.trim(),
          email: email.trim(),
          ...(password ? { password } : {}),
        });
        toast.success("Técnico atualizado");
      } else {
        await invoke({
          action: "create",
          full_name: name.trim(),
          email: email.trim(),
          password,
          ...(isAdmin ? { tenant_id: tenantId } : {}),
        });
        toast.success("Técnico criado");
      }
      setOpen(false);
      resetForm();
      load();
    } catch (e) {
      toast.error(e?.message || "Falha ao guardar técnico");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (t) => {
    if (!window.confirm(`Excluir técnico ${t.full_name}?`)) return;
    try {
      await invoke({ action: "delete", user_id: t.id });
      toast.success("Técnico excluído");
      load();
    } catch (e) {
      toast.error(e?.message || "Falha ao excluir");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-slate-600">
          Contas de técnicos com acesso apenas ao módulo Coleta neste ambiente.
        </p>
        <Button type="button" onClick={openCreate} className="bg-blue-600 hover:bg-blue-700">
          <Plus size={16} className="mr-1" /> Novo técnico
        </Button>
      </div>

      {techs.length === 0 ? (
        <p className="text-sm text-slate-500 py-6 text-center border rounded-lg bg-slate-50">
          Nenhum técnico de campo cadastrado.
        </p>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b">
              <tr>
                <th className="text-left p-3 font-medium">Nome</th>
                <th className="text-left p-3 font-medium">E-mail</th>
                <th className="p-3 w-28" />
              </tr>
            </thead>
            <tbody>
              {techs.map((t) => (
                <tr key={t.id} className="border-b last:border-0">
                  <td className="p-3">{t.full_name}</td>
                  <td className="p-3 text-slate-600">{t.email}</td>
                  <td className="p-3 text-right space-x-1">
                    <Button type="button" variant="ghost" size="sm" onClick={() => openEdit(t)}>
                      <PencilSimple size={16} />
                    </Button>
                    <Button type="button" variant="ghost" size="sm" className="text-red-600" onClick={() => remove(t)}>
                      <Trash size={16} />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Editar técnico" : "Novo técnico de campo"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Nome completo</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label>E-mail</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label>{editing ? "Nova senha (opcional)" : "Senha"}</Label>
              <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1" />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button type="button" onClick={save} disabled={saving} className="bg-blue-600 hover:bg-blue-700">
              {saving ? "A guardar…" : "Guardar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
