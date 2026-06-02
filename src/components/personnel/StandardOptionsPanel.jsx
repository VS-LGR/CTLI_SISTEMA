import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, PencilSimple, CaretRight } from "@phosphor-icons/react";
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
  const [openCategories, setOpenCategories] = useState(() => new Set());

  const setCategoryOpen = (value, open) => {
    setOpenCategories((prev) => {
      const next = new Set(prev);
      if (open) next.add(value);
      else next.delete(value);
      return next;
    });
  };

  const expandAll = () => {
    setOpenCategories(new Set(PERSONNEL_OPTION_CATEGORIES.map((c) => c.value)));
  };

  const collapseAll = () => {
    setOpenCategories(new Set());
  };

  const totalOptions = useMemo(
    () => PERSONNEL_OPTION_CATEGORIES.reduce((n, cat) => n + (byCategory[cat.value]?.length || 0), 0),
    [byCategory],
  );

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
    <div className="space-y-3 min-w-0">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-slate-600">
          {PERSONNEL_OPTION_CATEGORIES.length} categorias · {totalOptions} opções
        </p>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" onClick={expandAll}>
            Expandir todas
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={collapseAll}>
            Recolher todas
          </Button>
          {canEdit && (
            <Button
              size="sm"
              className="bg-blue-600 text-white"
              onClick={() => {
                setEditing(null);
                setLabel("");
                setDescription("");
                setOpen(true);
              }}
            >
              <Plus size={16} className="mr-1" /> Nova opção
            </Button>
          )}
        </div>
      </div>

      <div className="space-y-2">
        {PERSONNEL_OPTION_CATEGORIES.map((cat) => {
          const items = byCategory[cat.value] || [];
          const activeCount = items.filter((o) => o.is_active).length;
          const isOpen = openCategories.has(cat.value);

          return (
            <Collapsible
              key={cat.value}
              open={isOpen}
              onOpenChange={(open) => setCategoryOpen(cat.value, open)}
            >
              <Card className="border-slate-200 overflow-hidden">
                <CollapsibleTrigger asChild>
                  <button
                    type="button"
                    className="w-full flex items-center gap-2 px-4 py-3 text-left bg-slate-50/80 hover:bg-slate-100/80 transition-colors border-b border-slate-100"
                    aria-expanded={isOpen}
                  >
                    <CaretRight
                      size={16}
                      className={`shrink-0 text-slate-500 transition-transform ${isOpen ? "rotate-90" : ""}`}
                    />
                    <span className="font-semibold text-slate-800 flex-1 min-w-0 truncate">{cat.label}</span>
                    <span className="text-xs text-slate-500 shrink-0 tabular-nums">
                      {activeCount}{items.length !== activeCount ? ` / ${items.length}` : ""} itens
                    </span>
                  </button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent className="p-3 pt-2">
                    <ul className="space-y-0.5 text-sm max-h-[min(50vh,420px)] overflow-y-auto overscroll-contain">
                      {items.map((opt) => (
                        <li
                          key={opt.id}
                          className="flex items-start justify-between gap-2 py-2 px-2 rounded-md hover:bg-slate-50 border-b border-slate-50 last:border-0"
                        >
                          <span className={`break-words min-w-0 ${opt.is_active ? "text-slate-800" : "text-slate-400 line-through"}`}>
                            {opt.label}
                          </span>
                          {canEdit && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="shrink-0 h-8 w-8"
                              onClick={() => {
                                setEditing(opt);
                                setCategory(opt.category);
                                setLabel(opt.label);
                                setDescription(opt.description || "");
                                setOpen(true);
                              }}
                              aria-label={`Editar ${opt.label}`}
                            >
                              <PencilSimple size={14} />
                            </Button>
                          )}
                        </li>
                      ))}
                      {items.length === 0 && (
                        <li className="py-2 px-2 text-slate-500">Nenhuma opção nesta categoria.</li>
                      )}
                    </ul>
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>
          );
        })}
      </div>

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
