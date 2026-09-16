import React, { createContext, useCallback, useContext, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const ESignCtx = createContext(null);

export function ESignProvider({ children }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("Assinatura eletrónica");
  const [meaning, setMeaning] = useState("");
  const [password, setPassword] = useState("");
  const pending = useRef(null);

  const requestEsign = useCallback(({ title: t, meaning: m }) => {
    setTitle(t || "Assinatura eletrónica");
    setMeaning(m || "Confirmo a ação crítica com a minha senha.");
    setPassword("");
    setOpen(true);
    return new Promise((resolve, reject) => {
      pending.current = { resolve, reject };
    });
  }, []);

  const close = (result) => {
    setOpen(false);
    const p = pending.current;
    pending.current = null;
    if (result?.ok) p?.resolve(result);
    else p?.reject(new Error(result?.error || "Assinatura cancelada"));
  };

  return (
    <ESignCtx.Provider value={{ requestEsign }}>
      {children}
      <Dialog open={open} onOpenChange={(v) => { if (!v) close({ ok: false, error: "Assinatura cancelada" }); }}>
        <DialogContent className="max-w-md" data-testid="esign-dialog">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">{meaning}</p>
          <p className="text-xs text-muted-foreground">
            Esta ação exige senha no ato (assinatura eletrónica). Não basta o login da sessão.
          </p>
          <div className="space-y-2">
            <Label htmlFor="esign-password">Senha</Label>
            <Input
              id="esign-password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              data-testid="esign-password"
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => close({ ok: false, error: "Assinatura cancelada" })}>
              Cancelar
            </Button>
            <Button
              type="button"
              disabled={!password}
              onClick={() => close({ ok: true, password, meaning })}
              data-testid="esign-confirm"
            >
              Assinar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ESignCtx.Provider>
  );
}

export function useESign() {
  const ctx = useContext(ESignCtx);
  if (!ctx) {
    return {
      requestEsign: async ({ meaning }) => {
        const password = window.prompt("Senha para assinatura eletrónica:");
        if (!password) throw new Error("Assinatura cancelada");
        return { ok: true, password, meaning };
      },
    };
  }
  return ctx;
}
