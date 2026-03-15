import * as React from "react";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { HeartPulse, Loader2, Lock, CheckCircle2, AlertCircle } from "lucide-react";
import { motion } from "framer-motion";

export default function ResetPassword() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [isSessionValid, setIsSessionValid] = useState<boolean | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    // Check if we have a recovery session
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      // Supabase sets a session when clicking a recovery link
      if (session) {
        setIsSessionValid(true);
      } else {
        setIsSessionValid(false);
      }
    };
    checkSession();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password.length < 6) {
      setError("A senha deve ter pelo menos 6 caracteres.");
      return;
    }

    if (password !== confirmPassword) {
      setError("As senhas não coincidem.");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      
      setSuccess(true);
      setTimeout(() => {
        navigate("/login");
      }, 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (isSessionValid === false) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white p-8 rounded-[2.5rem] shadow-xl border border-slate-100 text-center">
          <div className="w-16 h-16 bg-rose-100 rounded-2xl flex items-center justify-center text-rose-600 mx-auto mb-6">
            <AlertCircle className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-black text-slate-900 mb-4 tracking-tight">Link Inválido ou Expirado</h1>
          <p className="text-slate-500 font-medium mb-8">
            Este link de recuperação de senha não é mais válido ou já expirou por razões de segurança.
          </p>
          <button
            onClick={() => navigate("/login")}
            className="w-full bg-slate-900 text-white font-black py-4 rounded-2xl hover:bg-slate-800 transition-all"
          >
            Voltar ao Login
          </button>
        </div>
      </div>
    );
  }

  if (isSessionValid === null) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-cyan-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 font-sans">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-white p-8 sm:p-10 rounded-[3rem] shadow-2xl border border-slate-100 relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 p-10 opacity-5 -mr-10 -mt-10">
          <Lock className="w-40 h-40 text-cyan-600" />
        </div>

        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-10">
            <div className="w-10 h-10 bg-cyan-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-cyan-100">
              <HeartPulse className="w-6 h-6" />
            </div>
            <span className="text-xl font-black text-slate-900 tracking-tight uppercase">AL-SHIFA</span>
          </div>

          {success ? (
            <div className="text-center py-4">
              <div className="w-20 h-20 bg-emerald-100 rounded-3xl flex items-center justify-center text-emerald-600 mx-auto mb-6">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <h2 className="text-2xl font-black text-slate-900 mb-3 tracking-tight">Senha Redefinida!</h2>
              <p className="text-slate-500 font-medium mb-8">
                A sua senha foi atualizada com sucesso. A redirecionar para o login...
              </p>
              <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: "100%" }}
                  transition={{ duration: 3 }}
                  className="bg-emerald-500 h-full"
                />
              </div>
            </div>
          ) : (
            <>
              <div className="mb-8">
                <h1 className="text-3xl font-black text-slate-900 mb-2 tracking-tight">Nova Senha.</h1>
                <p className="text-slate-500 font-medium leading-relaxed">
                  Crie uma nova senha segura para a sua conta profissional.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nova Senha</label>
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    className="w-full px-6 py-4 rounded-2xl bg-slate-50 border border-slate-100 focus:ring-2 focus:ring-cyan-500 outline-none font-bold text-slate-900 transition-all"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Confirmar Senha</label>
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    className="w-full px-6 py-4 rounded-2xl bg-slate-50 border border-slate-100 focus:ring-2 focus:ring-cyan-500 outline-none font-bold text-slate-900 transition-all"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                </div>

                {error && (
                  <div className="p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3 text-red-600 text-xs font-bold">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-slate-900 hover:bg-slate-800 text-white font-black py-5 rounded-2xl transition-all shadow-2xl shadow-slate-200 disabled:opacity-50 flex items-center justify-center gap-3 text-lg"
                >
                  {loading && <Loader2 className="w-5 h-5 animate-spin" />}
                  Atualizar Senha
                </button>
              </form>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
}
