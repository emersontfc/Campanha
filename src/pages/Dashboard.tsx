import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../hooks/useAuth";
import { Plus, Users, ClipboardList, Activity, LogOut, ShieldCheck } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

export default function Dashboard() {
  const { user, profile } = useAuth();
  const [stats, setStats] = useState({ total: 0, today: 0 });
  const [recentConsultations, setRecentConsultations] = useState<any[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      try {
        const { data, error, count } = await supabase
          .from('consultations')
          .select('*', { count: 'exact' })
          .eq('professional_id', user.id)
          .order('created_at', { ascending: false })
          .limit(5);
        
        if (error) throw error;
        setRecentConsultations(data || []);
        setStats({ total: count || 0, today: 0 });
      } catch (error) {
        console.error("Error fetching consultations:", error);
      }
    };

    fetchData();
  }, [user]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      <header className="bg-white border-b border-slate-200 px-4 py-4 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-cyan-600 rounded-xl flex items-center justify-center text-white">
              <Activity className="w-6 h-6" />
            </div>
            <div>
              <h1 className="font-bold text-slate-900">Al-Shifa Health</h1>
              <p className="text-xs text-slate-500">Olá, {profile?.name}</p>
            </div>
          </div>
          <button onClick={handleLogout} className="p-2 text-slate-400 hover:text-red-500 transition-colors">
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-4 space-y-6">
        {!profile?.is_verified && profile?.role !== "Admin" && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex gap-3">
            <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0">
              <ShieldCheck className="w-6 h-6 text-amber-600" />
            </div>
            <div>
              <h3 className="font-semibold text-amber-900">Aguardando Verificação</h3>
              <p className="text-sm text-amber-700">A sua conta ainda não foi verificada pelo administrador. Não poderá registar novas consultas até lá.</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
            <p className="text-slate-500 text-xs font-medium uppercase tracking-wider mb-1">Total Consultas</p>
            <p className="text-2xl font-bold text-slate-900">{stats.total}</p>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
            <p className="text-slate-500 text-xs font-medium uppercase tracking-wider mb-1">Hoje</p>
            <p className="text-2xl font-bold text-cyan-600">{stats.today}</p>
          </div>
        </div>

        <div className="space-y-3">
          <h2 className="font-bold text-slate-900 px-1">Ações Rápidas</h2>
          <div className="grid grid-cols-1 gap-3">
            <Link
              to="/new-consultation"
              className="flex items-center justify-between bg-cyan-600 p-4 rounded-2xl text-white shadow-lg shadow-cyan-100 active:scale-[0.98] transition-all"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                  <Plus className="w-6 h-6" />
                </div>
                <span className="font-semibold">Nova Consulta</span>
              </div>
            </Link>
            
            {profile?.role === "Admin" && (
              <Link
                to="/admin"
                className="flex items-center justify-between bg-slate-900 p-4 rounded-2xl text-white shadow-lg shadow-slate-200 active:scale-[0.98] transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                    <Users className="w-6 h-6" />
                  </div>
                  <span className="font-semibold">Painel Administrativo</span>
                </div>
              </Link>
            )}
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h2 className="font-bold text-slate-900">Consultas Recentes</h2>
            <Link to="/consultations" className="text-cyan-600 text-sm font-medium">Ver todas</Link>
          </div>
          <div className="space-y-3">
            {recentConsultations.length === 0 ? (
              <div className="bg-white p-8 rounded-2xl border border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-400">
                <ClipboardList className="w-12 h-12 mb-2 opacity-20" />
                <p className="text-sm">Nenhuma consulta registada</p>
              </div>
            ) : (
              recentConsultations.map((c) => (
                <Link
                  key={c.id}
                  to={`/patient?id=${c.consultation_id}`}
                  className="block bg-white p-4 rounded-2xl border border-slate-100 shadow-sm active:bg-slate-50 transition-colors"
                >
                  <div className="flex justify-between items-start mb-2">
                    <span className="font-bold text-slate-900">{c.consultation_id}</span>
                    <span className="text-[10px] font-bold bg-cyan-50 text-cyan-700 px-2 py-1 rounded-full uppercase">
                      {new Date(c.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex gap-4 text-sm text-slate-500">
                    <span>IMC: {c.bmi.toFixed(1)}</span>
                    <span>TA: {c.blood_pressure}</span>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
