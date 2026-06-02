import React, { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, PencilSimple } from "@phosphor-icons/react";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { canEditPersonnelStandardOptions } from "@/lib/roles";
import { PERSONNEL_OPTION_CATEGORIES } from "@/lib/personnelConstants";
import {
  loadOptionsByCategory,
  createStandardOption,
  updateStandardOption,
} from "@/lib/personnelStandardOptionsApi";

export default function StandardOptionsPanel({ tenantId }) {
  const { user } = useAuth();
  const canEdit = canEditPersonnelStandardOptions(user?.role);
  const [byCategory, setByCategory] = useState({});
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [category, setCategory] = useState("education_level");
  const [label, setLabel] = useState("");
  const [description, setDescription] = useState("");

  const load = useCallback(async () => {
    if (!tenantId) return;
    try {
      setByCategory(await loadOptionsByCategory(tenantId));
    } catch (e) {
      toast.error(e.message);
    }
  }, [tenantId]);

  useEffect(() => { load(); }, [load]);

  const save = async () => {
    if (!label.trim()) return toast.error("Informe o rótulo");
    try {
      if (editing) {
        await updateStandardOption(editing.id, { label, description, is_active: editing.is_active });
        toast.success("Atualizado");
      } else {
        await createStandardOption(tenantId, { category, label, description });
        toast.success("Criado");
      }
      setOpen(false);
      setEditing(null);
      load();
    } catch (e) {
      toast.error(e.message);
    }
  };

  return (
    <div className="space-y-4">
      {canEdit && (
        <div className="flex justify-end">
          <Button size="sm" className="bg-blue-600 text-white" onClick={() => { setEditing(null); setLabel(""); setDescription(""); setOpen(true); }}>
            <Plus size={16} className="mr-1" /> Nova opção
          </Button>
        </div>
      )}
      {PERSONNEL_OPTION_CATEGORIES.map((cat) => (
        <Card key={cat.value} className="border-slate-200">
          <CardContent className="p-4">
            <h3 className="font-semibold text-slate-800 mb-3">{cat.label}</h3>
            <ul className="space-y-1 text-sm">
              {(byCategory[cat.value] || []).map((opt) => (
                <li key={opt.id} className="flex items-center justify-between gap-2 py-1 border-b border-slate-50 last:border-0">
                  <span className={opt.is_active ? "" : "text-slate-400 line-through"}>{opt.label}</span>
                  {canEdit && (
                    <Button variant="ghost" size="sm" onClick={() => {
                      setEditing(opt);
                      setCategory(opt.category);
                      setLabel(opt.label);
                      setDescription(opt.description || "");
                      setOpen(true);
                    }}><PencilSimple size={14} /></Button>
                  )}
                </li>
              ))}
              {!(byCategory[cat.value] || []).length && (
                <li className="text-slate-500">—</li>
              )}
            </ul>
          </CardContent>
        </Card>
      ))}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? "Editar opção" : "Nova opção"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            {!editing && (
              <div>
                <Label>Categoria</Label>
                <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full border rounded-md h-10 px-3 text-sm">
                  {PERSONNEL_OPTION_CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </div>
            )}
            <div><Label>Rótulo</Label><Input value={label} onChange={(e) => setLabel(e.target.value)} /></div>
            <div><Label>Descrição</Label><Input value={description} onChange={(e) => setDescription(e.target.value)} /></div>
            {editing && (
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={editing.is_active} onChange={(e) => setEditing({ ...editing, is_active: e.target.checked })} />
                Ativo
              </label>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button className="bg-blue-600 text-white" onClick={save}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
