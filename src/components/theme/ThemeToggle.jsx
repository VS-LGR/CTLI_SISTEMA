import React, { useEffect, useState } from "react";
import { useTheme } from "@/components/theme/ThemeProvider";
import { Moon, Sun, Monitor } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";

const CYCLE = ["light", "dark", "system"];

const LABELS = {
  light: "Claro",
  dark: "Escuro",
  system: "Sistema",
};

const ICONS = {
  light: Sun,
  dark: Moon,
  system: Monitor,
};

/**
 * Ciclo claro → escuro → sistema. Texto visível, alvo ≥ 44px.
 */
export default function ThemeToggle({ className = "" }) {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const current = CYCLE.includes(theme) ? theme : "light";
  const Icon = ICONS[current] || Sun;
  const label = LABELS[current] || "Claro";

  const cycle = () => {
    const i = CYCLE.indexOf(current);
    setTheme(CYCLE[(i + 1) % CYCLE.length]);
  };

  if (!mounted) {
    return (
      <Button
        type="button"
        variant="outline"
        disabled
        aria-label="Tema"
        className={`h-11 min-w-[7.5rem] px-3 justify-start gap-2 ${className}`.trim()}
      >
        <Sun size={18} weight="duotone" className="shrink-0" aria-hidden />
        <span>Claro</span>
      </Button>
    );
  }

  return (
    <Button
      type="button"
      variant="outline"
      onClick={cycle}
      aria-label={`Tema: ${label}. Clique para alterar. Tema efetivo: ${resolvedTheme === "dark" ? "escuro" : "claro"}.`}
      title="Alternar tema claro, escuro ou do sistema"
      className={`h-11 min-w-[7.5rem] px-3 justify-start gap-2 ${className}`.trim()}
      data-testid="theme-toggle"
    >
      <Icon size={18} weight="duotone" className="shrink-0" aria-hidden />
      <span>{label}</span>
    </Button>
  );
}
