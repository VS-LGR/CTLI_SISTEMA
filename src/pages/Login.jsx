import React, { useState } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ShieldCheck, Spinner } from "@phosphor-icons/react";
import { toast } from "sonner";
import { isMockApiMode, isSupabaseAuthMode } from "@/lib/api";

const Login = () => {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (user && user !== false) return <Navigate to="/dashboard" replace />;

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
      navigate("/dashboard");
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* Left form */}
      <div className="flex items-center justify-center px-6 py-12 bg-white">
        <div className="w-full max-w-md">
          <div className="flex items-center gap-2 mb-10">
            <div className="w-10 h-10 rounded-md bg-blue-600 flex items-center justify-center text-white">
              <ShieldCheck size={22} weight="bold" />
            </div>
            <div>
              <div className="font-display font-bold text-xl tracking-tight">ProcVault</div>
              <div className="text-[10px] uppercase tracking-[0.18em] text-slate-500">Sistema de Gestão de Qualidade</div>
            </div>
          </div>

          <h1 className="font-display text-3xl font-bold tracking-tight text-slate-900 mb-2">Bem-vindo de volta</h1>
          <p className="text-sm text-slate-600 mb-8">Acesse sua base de procedimentos, registros e dashboard de qualidade.</p>

          <form onSubmit={submit} className="space-y-5">
            <div>
              <Label htmlFor="email" className="text-sm font-medium">E-mail</Label>
              <Input
                id="email" type="email" required value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                className="mt-1.5"
                data-testid="login-email"
              />
            </div>
            <div>
              <Label htmlFor="password" className="text-sm font-medium">Senha</Label>
              <Input
                id="password" type="password" required value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="mt-1.5"
                data-testid="login-password"
              />
            </div>

            {error && (
              <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2" data-testid="login-error">
                {error}
              </div>
            )}

            <Button type="submit" disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 text-white" data-testid="login-submit">
              {loading ? <><Spinner className="animate-spin mr-2" /> Entrando…</> : "Entrar"}
            </Button>
          </form>

          <div className="mt-8 text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-md px-4 py-3">
            {isMockApiMode ? (
              <>
                <div className="font-semibold text-slate-700 mb-1">Modo local (sem API)</div>
                <p className="text-slate-600 mb-2">Qualquer senha serve. O e-mail define o perfil:</p>
                <ul className="list-disc pl-4 space-y-1 text-slate-600">
                  <li><span className="font-mono text-slate-800">admin@demo.local</span> — administrador (todos os clientes)</li>
                  <li><span className="font-mono text-slate-800">cliente@demo.local</span> — utilizador cliente (ambiente demonstração)</li>
                </ul>
              </>
            ) : isSupabaseAuthMode ? (
              <>
                <div className="font-semibold text-slate-700 mb-1">Supabase Auth</div>
                <p className="text-slate-600 mb-2">
                  Utilize uma conta criada no projeto Supabase. O primeiro administrador costuma ser promovido manualmente
                  após o primeiro registo (por exemplo, atualizar a coluna <span className="font-mono">role</span> para{" "}
                  <span className="font-mono">admin</span> na tabela <span className="font-mono">profiles</span>)
                  ou criado com papel admin pelas Edge Functions.
                </p>
                <p className="text-slate-600">
                  Documentos e outras rotas REST continuam a usar <span className="font-mono">REACT_APP_BACKEND_URL</span> quando configurado (fase 2).
                </p>
              </>
            ) : (
              <>
                <div className="font-semibold text-slate-700 mb-1">Credenciais padrão (admin):</div>
                <div className="font-mono">admin@procvault.com</div>
                <div className="font-mono">Admin@123</div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Right visual */}
      <div className="hidden lg:flex relative bg-slate-900 overflow-hidden">
        <div className="absolute inset-0 opacity-30"
             style={{ backgroundImage: "radial-gradient(circle at 20% 20%, #2563eb33 0%, transparent 50%), radial-gradient(circle at 80% 60%, #1e40af33 0%, transparent 50%)" }} />
        <div className="absolute inset-0 opacity-[0.04]"
             style={{ backgroundImage: "linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)", backgroundSize: "40px 40px" }} />
        <div className="relative z-10 flex flex-col justify-center px-16 text-white">
          <div className="text-[10px] uppercase tracking-[0.3em] text-blue-400 mb-4">ISO • Procedimentos • Registros</div>
          <h2 className="font-display text-4xl xl:text-5xl font-bold leading-tight mb-6">
            Centralize a gestão documental do seu sistema da qualidade.
          </h2>
          <p className="text-slate-300 text-base max-w-md">
            Organize procedimentos e registros por requisito (4 a 8), edite em editor rico, exporte em PDF ou Word, e mantenha o histórico em pastas vigentes e obsoletas — separado por cliente.
          </p>
          <div className="mt-12 grid grid-cols-5 gap-3 max-w-md">
            {["4","5","6","7","8"].map(n => (
              <div key={n} className="aspect-square rounded-md bg-white/5 border border-white/10 flex items-center justify-center font-mono text-xl text-blue-300">
                {n}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
