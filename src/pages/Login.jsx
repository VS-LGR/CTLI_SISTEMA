import React, { useEffect, useState } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeSlash, Spinner } from "@phosphor-icons/react";
import { toast } from "sonner";
import { isMockApiMode, isSupabaseAuthMode } from "@/lib/api";
import { restrictedNavHomePath } from "@/lib/roleNav";
import {
  APP_NAME,
  APP_LOGO,
  APP_LOGO_TAGLINE,
  APP_DOCUMENT_TITLE,
} from "@/lib/appBranding";
import AppBrand from "@/components/branding/AppBrand";
import LegalCopyrightLinks from "@/components/legal/LegalCopyrightLinks";

function DevHints() {
  return (
    <details className="mt-6 group rounded-xl border border-white/10 bg-white/[0.03]">
      <summary className="cursor-pointer list-none px-4 py-3 text-xs font-medium text-white/60 select-none [&::-webkit-details-marker]:hidden flex items-center justify-between gap-2">
        <span>Ajuda para desenvolvimento</span>
        <span className="text-white/35 group-open:rotate-180 transition-transform" aria-hidden>▾</span>
      </summary>
      <div className="px-4 pb-4 pt-0 text-xs text-white/65 space-y-3 border-t border-white/10">
        {isMockApiMode ? (
          <>
            <p className="pt-3 font-semibold text-white/85">Modo local (sem API)</p>
            <p>Qualquer senha serve. O e-mail define o perfil:</p>
            <ul className="list-disc pl-4 space-y-1">
              <li><span className="font-mono text-orange-200">admin@demo.local</span> — administrador</li>
              <li><span className="font-mono text-orange-200">cliente@demo.local</span> — utilizador cliente</li>
            </ul>
          </>
        ) : isSupabaseAuthMode ? (
          <>
            <p className="pt-3 font-semibold text-white/85">Supabase Auth</p>
            <p>
              Utilize uma conta criada no projeto Supabase. Promova o primeiro administrador na tabela{" "}
              <span className="font-mono">profiles</span> ou via Edge Functions.
            </p>
          </>
        ) : (
          <>
            <p className="pt-3 font-semibold text-white/85">Credenciais conforme ambiente</p>
            <p>Consulte a documentação de deploy ou utilize as credenciais configuradas no backend.</p>
          </>
        )}
      </div>
    </details>
  );
}

const FIELD_CLASS =
  "mt-1.5 h-11 rounded-lg bg-black/50 border-white/15 text-white placeholder:text-white/30 shadow-none focus-visible:ring-orange-500 focus-visible:border-orange-400/60";

const Login = () => {
  const { user, login } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    document.title = APP_DOCUMENT_TITLE;
  }, []);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (user && user !== false) {
    return <Navigate to={restrictedNavHomePath(user.role)} replace />;
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
      navigate(restrictedNavHomePath(res.user?.role));
    }
  };

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[#050505] text-white">
      <div
        className="pointer-events-none absolute inset-0"
        aria-hidden
        style={{
          backgroundImage:
            "radial-gradient(ellipse 70% 55% at 12% 18%, rgba(249,115,22,0.22) 0%, transparent 55%), radial-gradient(ellipse 55% 50% at 92% 88%, rgba(251,191,36,0.12) 0%, transparent 50%)",
        }}
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.07]"
        aria-hidden
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.45) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.45) 1px, transparent 1px)",
          backgroundSize: "56px 56px",
        }}
      />
      <img
        src={APP_LOGO}
        alt=""
        aria-hidden
        className="pointer-events-none select-none hidden lg:block absolute right-[-6%] top-1/2 -translate-y-1/2 w-[min(42vw,640px)] max-w-none opacity-[0.16] object-contain"
      />

      <div className="relative z-10 min-h-screen flex flex-col lg:grid lg:grid-cols-2">
        <section className="flex flex-col px-5 sm:px-8 lg:px-12 xl:px-16 py-8 sm:py-10 lg:py-14 lg:min-h-screen">
          <div className="flex flex-col gap-8 lg:gap-12 min-w-0">
            <AppBrand variant="login" />

            <div className="max-w-lg min-w-0">
              <p className="text-[10px] sm:text-[11px] uppercase tracking-[0.14em] sm:tracking-[0.18em] text-orange-300/90 mb-4 leading-5">
                {APP_LOGO_TAGLINE}
              </p>
              <h1 className="font-display text-[1.65rem] sm:text-4xl xl:text-[2.65rem] font-extrabold leading-[1.12] tracking-tight">
                Qualidade metrológica centralizada em um só lugar.
              </h1>
              <p className="mt-3 sm:mt-4 text-sm sm:text-base text-white/60 leading-relaxed">
                Procedimentos, registros e controlos ISO 17025 num único ambiente — desenhado para laboratório de calibração.
              </p>
              <ul className="mt-6 sm:mt-8 space-y-3 text-sm text-white/75 hidden sm:block">
                <li className="flex gap-3 min-w-0">
                  <span className="mt-2 h-1.5 w-1.5 rounded-full bg-orange-400 shrink-0" aria-hidden />
                  <span>Lista Mestra, análise crítica e documentos controlados</span>
                </li>
                <li className="flex gap-3 min-w-0">
                  <span className="mt-2 h-1.5 w-1.5 rounded-full bg-amber-400 shrink-0" aria-hidden />
                  <span>Coleta, certificados e rastreabilidade metrológica</span>
                </li>
                <li className="flex gap-3 min-w-0">
                  <span className="mt-2 h-1.5 w-1.5 rounded-full bg-orange-500 shrink-0" aria-hidden />
                  <span>Acesso por papel, trilha e assinatura eletrónica</span>
                </li>
              </ul>
            </div>
          </div>

          <LegalCopyrightLinks
            className="hidden lg:block mt-auto pt-10"
            noticeClassName="text-xs text-white/40"
            linksClassName="text-xs text-white/40"
            linkClassName="text-orange-300 hover:text-orange-200 hover:underline"
          />
        </section>

        <section className="flex items-center justify-center px-4 sm:px-8 pb-10 lg:py-14 flex-1">
          <div className="w-full max-w-md min-w-0 rounded-2xl border border-white/10 bg-black/45 backdrop-blur-md shadow-[0_24px_80px_rgba(0,0,0,0.45)] p-5 sm:p-8">
            <h2 className="font-display text-2xl sm:text-[1.75rem] font-bold tracking-tight mb-1">
              Entrar
            </h2>
            <p className="text-sm text-white/55 mb-7 leading-relaxed">
              Aceda ao ambiente {APP_NAME} com o seu e-mail e senha.
            </p>

            <form onSubmit={submit} className="space-y-5" noValidate>
              <div>
                <Label htmlFor="email" className="text-sm font-medium text-white/80">E-mail</Label>
                <Input
                  id="email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  className={FIELD_CLASS}
                  data-testid="login-email"
                />
              </div>
              <div>
                <Label htmlFor="password" className="text-sm font-medium text-white/80">Senha</Label>
                <div className="relative mt-1.5">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    required
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className={`${FIELD_CLASS} mt-0 pr-10`}
                    data-testid="login-password"
                  />
                  <button
                    type="button"
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-white/45 hover:text-white rounded-md"
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
                  className="text-sm text-red-200 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2"
                  role="alert"
                  data-testid="login-error"
                >
                  {error}
                </div>
              )}

              <Button
                type="submit"
                disabled={loading}
                className="w-full h-11 rounded-lg bg-gradient-to-r from-orange-500 to-amber-400 text-black font-semibold hover:from-orange-400 hover:to-amber-300 shadow-[0_8px_24px_rgba(249,115,22,0.28)]"
                data-testid="login-submit"
              >
                {loading ? <><Spinner className="animate-spin mr-2" /> Entrando…</> : "Entrar"}
              </Button>
            </form>

            <DevHints />

            <LegalCopyrightLinks
              className="mt-8 pt-6 border-t border-white/10 lg:hidden"
              noticeClassName="text-xs text-white/40"
              linksClassName="text-xs text-white/40"
              linkClassName="text-orange-300 hover:text-orange-200 hover:underline"
            />
          </div>
        </section>
      </div>
    </div>
  );
};

export default Login;
