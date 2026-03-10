import * as React from "react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { HeartPulse, Loader2 } from "lucide-react";

export default function LoginPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate("/dashboard");
      } else {
        const { data, error: signUpError } = await supabase.auth.signUp({ 
          email, 
          password,
          options: {
            data: {
              full_name: name,
              specialty: specialty,
            }
          }
        });
        
        if (signUpError) throw signUpError;
        
        if (data.user) {
          const { error: profileError } = await supabase
            .from('profiles')
            .insert([
              { 
                id: data.user.id, 
                name, 
                email, 
                specialty, 
                role: 'MedicalProfessional', 
                is_verified: false 
              }
            ]);
            
          if (profileError) throw profileError;
        }
        
        navigate("/pending-verification");
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-white font-sans">
      {/* Left Side: Form */}
      <div className="flex-1 flex flex-col justify-center px-6 sm:px-12 lg:px-24 xl:px-32 py-20 lg:py-12 relative">
        <div className="absolute top-8 sm:top-12 left-6 sm:left-12 lg:left-24 xl:left-32">
          <button onClick={() => navigate("/")} className="flex items-center gap-3 group">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-cyan-600 rounded-lg sm:rounded-xl flex items-center justify-center text-white shadow-lg shadow-cyan-100 group-hover:scale-110 transition-transform">
              <HeartPulse className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <span className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">AL-SHIFA</span>
          </button>
        </div>

        <div className="max-w-md w-full mx-auto lg:mx-0">
          <div className="mb-8 sm:mb-10">
            <h1 className="text-3xl sm:text-4xl font-black text-slate-900 mb-2 tracking-tight">
              {isLogin ? "Bem-vindo de volta." : "Junte-se à missão."}
            </h1>
            <p className="text-sm sm:text-base text-slate-500 font-medium leading-relaxed">
              {isLogin 
                ? "Aceda ao seu painel de triagem e continue o seu trabalho." 
                : "Registe-se como profissional de saúde para começar as triagens."}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5 sm:space-y-6">
            {!isLogin && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5 sm:space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nome Completo</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: João Silva"
                    className="w-full px-5 sm:px-6 py-3.5 sm:py-4 rounded-xl sm:rounded-2xl bg-slate-50 border border-slate-100 focus:ring-2 focus:ring-cyan-500 outline-none font-bold text-slate-900 transition-all text-sm sm:text-base"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5 sm:space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Especialidade</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Enfermagem"
                    className="w-full px-5 sm:px-6 py-3.5 sm:py-4 rounded-xl sm:rounded-2xl bg-slate-50 border border-slate-100 focus:ring-2 focus:ring-cyan-500 outline-none font-bold text-slate-900 transition-all text-sm sm:text-base"
                    value={specialty}
                    onChange={(e) => setSpecialty(e.target.value)}
                  />
                </div>
              </div>
            )}

            <div className="space-y-1.5 sm:space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Email Profissional</label>
              <input
                type="email"
                required
                autoComplete="email"
                placeholder="nome@exemplo.com"
                className="w-full px-5 sm:px-6 py-3.5 sm:py-4 rounded-xl sm:rounded-2xl bg-slate-50 border border-slate-100 focus:ring-2 focus:ring-cyan-500 outline-none font-bold text-slate-900 transition-all text-sm sm:text-base"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="space-y-1.5 sm:space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Senha</label>
              <input
                type="password"
                required
                autoComplete={isLogin ? "current-password" : "new-password"}
                placeholder="••••••••"
                className="w-full px-5 sm:px-6 py-3.5 sm:py-4 rounded-xl sm:rounded-2xl bg-slate-50 border border-slate-100 focus:ring-2 focus:ring-cyan-500 outline-none font-bold text-slate-900 transition-all text-sm sm:text-base"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            {error && (
              <div className="p-4 bg-red-50 border border-red-100 rounded-xl sm:rounded-2xl flex items-center gap-3 text-red-600 text-[10px] sm:text-xs font-bold">
                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse shrink-0" />
                {error}
              </div>
            )}

            {!isLogin && (
              <p className="text-[10px] text-slate-400 font-medium px-1">
                * A sua conta será analisada e verificada manualmente por um administrador para garantir a segurança da plataforma.
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-slate-900 hover:bg-slate-800 text-white font-black py-4 sm:py-5 rounded-xl sm:rounded-2xl transition-all shadow-2xl shadow-slate-200 disabled:opacity-50 flex items-center justify-center gap-3 text-base sm:text-lg"
            >
              {loading && <Loader2 className="w-5 h-5 animate-spin" />}
              {isLogin ? "Entrar no Painel" : "Criar Minha Conta"}
            </button>
          </form>

          <div className="mt-8 sm:mt-10 text-center lg:text-left">
            <button
              onClick={() => setIsLogin(!isLogin)}
              className="text-slate-400 text-xs sm:text-sm font-bold hover:text-cyan-600 transition-colors"
            >
              {isLogin ? (
                <>Não tem conta? <span className="text-cyan-600">Registe-se aqui</span></>
              ) : (
                <>Já tem conta? <span className="text-cyan-600">Entre aqui</span></>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Right Side: Image/Branding */}
      <div className="hidden lg:flex flex-1 bg-slate-50 p-12 items-center justify-center relative overflow-hidden">
        <div className="absolute top-0 right-0 p-20 opacity-5">
          <HeartPulse className="w-[800px] h-[800px] text-cyan-600" />
        </div>
        
        <div className="relative z-10 w-full max-w-2xl">
          <div className="rounded-[4rem] overflow-hidden shadow-2xl border-[12px] border-white transform rotate-2 hover:rotate-0 transition-transform duration-700">
            <img 
              src="https://images.unsplash.com/photo-1584362924004-231705285b1c?auto=format&fit=crop&q=80&w=1000" 
              alt="Medical professional in Africa" 
              className="w-full h-[700px] object-cover"
              referrerPolicy="no-referrer"
            />
          </div>
          
          <div className="absolute -bottom-10 -right-10 bg-white p-10 rounded-[3rem] shadow-2xl border border-slate-100 max-w-sm transform -rotate-2">
            <p className="text-2xl font-black text-slate-900 mb-4 leading-tight">
              "A tecnologia é a ponte para a saúde universal."
            </p>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-cyan-100 rounded-xl flex items-center justify-center text-cyan-600 font-black">
                AS
              </div>
              <div>
                <p className="text-sm font-black text-slate-900">Al-Shifa Health</p>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Iniciativa 2026</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
