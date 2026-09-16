import React, { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabaseClient";
import { isMockApiMode, isSupabaseAuthMode } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export default function MustChangePasswordGate({ children }) {
  const { user, logout } = useAuth();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);

  if (!user || user === false || !user.must_change_password) return children;
  if (isMockApiMode || !isSupabaseAuthMode) return children;

  const submit = async (e) => {
    e.preventDefault();
    if (password.length < 8) {
      toast.error("A nova senha deve ter pelo menos 8 caracteres.");
      return;
    }
    if (password !== confirm) {
      toast.error("A confirmação não coincide.");
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      const { error: rpcErr } = await supabase.rpc("clear_must_change_password");
      if (rpcErr) throw rpcErr;
      toast.success("Senha atualizada. Continue o trabalho.");
      window.location.reload();
    } catch (err) {
      toast.error(err?.message || "Não foi possível atualizar a senha.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-background/70 p-4" role="dialog" aria-modal="true">
      <form onSubmit={submit} className="w-full max-w-md rounded-xl border border-border bg-card p-6 space-y-4">
        <h1 className="font-display text-xl font-semibold">Troca de senha obrigatória</h1>
        <p className="text-sm text-muted-foreground">
          A senha provisória tem de ser substituída no primeiro acesso (controlo eletrónico BPx).
        </p>
        <div className="space-y-2">
          <Label htmlFor="new-pass">Nova senha</Label>
          <Input id="new-pass" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="new-pass-2">Confirmar</Label>
          <Input id="new-pass-2" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" />
        </div>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => logout()}>Sair</Button>
          <Button type="submit" disabled={busy}>
            {busy ? "A guardar…" : "Atualizar senha"}
          </Button>
        </div>
      </form>
    </div>
  );
}
