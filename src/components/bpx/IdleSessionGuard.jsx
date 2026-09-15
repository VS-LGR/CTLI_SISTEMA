import { useEffect, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { IDLE_LOGOUT_MS } from "@/lib/bpx/sessionPolicy";
import { isMockApiMode } from "@/lib/api";

export default function IdleSessionGuard() {
  const { user, logout } = useAuth();
  const timer = useRef(null);

  useEffect(() => {
    if (!user || user === false || isMockApiMode) return undefined;

    const bump = () => {
      if (timer.current) window.clearTimeout(timer.current);
      timer.current = window.setTimeout(async () => {
        toast.message("Sessão encerrada por inatividade.");
        await logout();
      }, IDLE_LOGOUT_MS);
    };

    bump();
    const evts = ["mousemove", "keydown", "click", "scroll", "touchstart"];
    evts.forEach((e) => window.addEventListener(e, bump, { passive: true }));
    return () => {
      if (timer.current) window.clearTimeout(timer.current);
      evts.forEach((e) => window.removeEventListener(e, bump));
    };
  }, [user, logout]);

  return null;
}
