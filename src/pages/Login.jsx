import React, { useState } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeSlash, Spinner } from "@phosphor-icons/react";
import { toast } from "sonner";
import { isMockApiMode, isSupabaseAuthMode } from "@/lib/api";
import { isTechnicianOnlyNav, isSignatoryOnlyNav } from "@/lib/roles";
import { COLETA_LIST_PATH } from "@/lib/coletaRoutes";
import { CERTIFICATE_PENDING_APPROVAL_PATH } from "@/lib/certificateRoutes";
import { APP_NAME, APP_TAGLINE, APP_LOGO_WIDE } from "@/lib/appBranding";
import AppBrand from "@/components/branding/AppBrand";

function DevHints() {
  return (
    <details className="mt-8 group rounded-lg border border-slate-200 bg-slate-50/80">
      <summary className="cursor-pointer list-none px-4 py-3 text-xs font-medium text-slate-600 select-none [&::-webkit-details-marker]:hidden flex items-center justify-between gap-2">
        <span>Ajuda para desenvolvimento</span>
        <span className="text-slate-400 group-open:rotate-180 transition-transform" aria-hidden>▾</span>
      </summary>
      <div className="px-4 pb-4 pt-0 text-xs text-slate-600 space-y-3 border-t border-slate-200/80">
        {isMockApiMode ? (
          <>
            <p className="pt-3 font-semibold text-slate-700">Modo local (sem API)</p>
            <p>Qualquer senha serve. O e-mail define o perfil:</p>
            <ul className="list-disc pl-4 space-y-1">
              <li><span className="font-mono text-slate-800">admin@demo.local</span> — administrador</li>
              <li><span className="font-mono text-slate-800">cliente@demo.local</span> — utilizador cliente</li>
            </ul>
          </>
        ) : isSupabaseAuthMode ? (
          <>
            <p className="pt-3 font-semibold text-slate-700">Supabase Auth</p>
            <p>
              Utilize uma conta criada no projeto Supabase. Promova o primeiro administrador na tabela{" "}
              <span className="font-mono">profiles</span> ou via Edge Functions.
            </p>
          </>
        ) : (
          <>
            <p className="pt-3 font-semibold text-slate-700">Credenciais conforme ambiente</p>
            <p>Consulte a documentação de deploy ou utilize as credenciais configuradas no backend.</p>
          </>
        )}
      </div>
    </details>
  );
}

const Login = () => {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (user && user !== false) {
    if (isTechnicianOnlyNav(user.role)) {
      return <Navigate to={COLETA_LIST_PATH} replace />;
    }
    if (isSignatoryOnlyNav(user.role)) {
      return <Navigate to={CERTIFICATE_PENDING_APPROVAL_PATH} replace />;
    }
    return <Navigate to="/dashboard" replace />;
  }

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await login(email, password);
    setLoading(false);
    if (!res.ok) {
      setError(res.error);
      toast.error(res.error);
    } else {
      toast.success("Bem-vindo de volta!");
      const role = res.user?.role;
      if (isTechnicianOnlyNav(role)) navigate(COLETA_LIST_PATH);
      else if (isSignatoryOnlyNav(role)) navigate(CERTIFICATE_PENDING_APPROVAL_PATH);
      else navigate("/dashboard");
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-white">
      <div className="flex items-center justify-center px-4 sm:px-6 py-10 sm:py-12">
        <div className="w-full max-w-md min-w-0">
          <div className="mb-8 sm:mb-10">
            <AppBrand variant="login" />
          </div>

          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 mb-2">
            Entrar no {APP_NAME}
          </h1>
          <p className="text-sm text-slate-600 mb-8 leading-relaxed">
            Gestão documental ISO 17025 — procedimentos, registros e controles de qualidade.
          </p>

          <form onSubmit={submit} className="space-y-5" noValidate>
            <div>
              <Label htmlFor="email" className="text-sm font-medium">E-mail</Label>
              <Input
                id="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                className="mt-1.5"
                data-testid="login-email"
              />
            </div>
            <div>
              <Label htmlFor="password" className="text-sm font-medium">Senha</Label>
              <div className="relative mt-1.5">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="pr-10"
                  data-testid="login-password"
                />
                <button
                  type="button"
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-slate-500 hover:text-slate-700 rounded-md"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeSlash size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {error && (
              <div
                className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2"
                role="alert"
                data-testid="login-error"
              >
                {error}
              </div>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white h-11"
              data-testid="login-submit"
            >
              {loading ? <><Spinner className="animate-spin mr-2" /> Entrando…</> : "Entrar"}
            </Button>
          </form>

          <DevHints />
        </div>
      </div>

      <div className="hidden lg:flex relative bg-slate-900 overflow-hidden">
        <div
          className="absolute inset-0 opacity-40"
          style={{
            backgroundImage: "radial-gradient(circle at 15% 20%, #2563eb55 0%, transparent 45%), radial-gradient(circle at 85% 70%, #1e40af66 0%, transparent 50%)",
          }}
        />
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: "linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />
        <img
          src={APP_LOGO_WIDE}
          alt=""
          aria-hidden
          className="absolute right-[-10%] bottom-[-5%] w-[min(520px,70%)] opacity-[0.07] pointer-events-none select-none object-contain"
        />
        <div className="relative z-10 flex flex-col justify-center px-12 xl:px-16 py-16 text-white max-w-xl">
          <p className="text-[10px] uppercase tracking-[0.28em] text-blue-400 mb-4">{APP_TAGLINE}</p>
          <h2 className="font-display text-4xl xl:text-[2.75rem] font-bold leading-tight mb-6">
            Qualidade metrológica centralizada em um só lugar.
          </h2>
          <ul className="space-y-3 text-slate-300 text-sm sm:text-base">
            <li className="flex gap-3">
              <span className="text-blue-400 font-bold shrink-0">—</span>
              <span>Procedimentos e registros por requisito ISO 17025</span>
            </li>
            <li className="flex gap-3">
              <span className="text-blue-400 font-bold shrink-0">—</span>
              <span>Lista Mestra, análise crítica e normas controladas</span>
            </li>
            <li className="flex gap-3">
              <span className="text-blue-400 font-bold shrink-0">—</span>
              <span>Coleta, cadastros e exportações institucionais</span>
            </li>
          </ul>
          <p className="mt-12 text-xs uppercase tracking-[0.2em] text-slate-500">{APP_TAGLINE}</p>
        </div>
      </div>
    </div>
  );
};

export default Login;
