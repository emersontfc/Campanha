import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../hooks/useAuth";
import { Plus, Users, ClipboardList, Activity, LogOut, ShieldCheck, Wifi, WifiOff, Loader2 } from "lucide-react";
import { VerifiedBadge } from "../components/VerifiedBadge";
import { Link, useNavigate } from "react-router-dom";

export default function Dashboard() {
  const { user, profile } = useAuth();
  const [stats, setStats] = useState({ total: 0, today: 0 });
  const [recentConsultations, setRecentConsultations] = useState<any[]>([]);
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [acceptedRequests, setAcceptedRequests] = useState<any[]>([]);
  const [isOnline, setIsOnline] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (profile) {
      setIsOnline(profile.is_online || false);
    }
  }, [profile]);

  const toggleOnlineStatus = async () => {
    if (!user) return;
    setUpdatingStatus(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_online: !isOnline })
        .eq('id', user.id);
      
      if (error) throw error;
      setIsOnline(!isOnline);
    } catch (error) {
      console.error("Error updating status:", error);
    } finally {
      setUpdatingStatus(false);
    }
  };

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      try {
        // Fetch recent completed/filled consultations
        const { data: recent, count } = await supabase
          .from('consultations')
          .select('*', { count: 'exact' })
          .eq('professional_id', user.id)
          .eq('status', 'completed')
          .order('created_at', { ascending: false })
          .limit(5);
        
        setRecentConsultations(recent || []);
        setStats({ total: count || 0, today: 0 });

        // Fetch pending requests (unassigned)
        const { data: pending } = await supabase
          .from('consultations')
          .select('*')
          .eq('status', 'pending')
          .order('created_at', { ascending: false });
        
        setPendingRequests(pending || []);

        // Fetch accepted requests assigned to this doctor
        const { data: accepted } = await supabase
          .from('consultations')
          .select('*')
          .eq('professional_id', user.id)
          .eq('status', 'accepted')
          .order('created_at', { ascending: false });
        
        setAcceptedRequests(accepted || []);
      } catch (error) {
        console.error("Error fetching consultations:", error);
      }
    };

    fetchData();
    
    const interval = setInterval(() => {
      fetchData();
    }, 5000);
    
    return () => clearInterval(interval);
  }, [user]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/login");
  };

  const handleAcceptRequest = async (consultationId: string) => {
    const roomNumber = window.prompt("Digite o número do gabinete para esta consulta:");
    if (!roomNumber) return;
    
    try {
      const { error } = await supabase
        .from('consultations')
        .update({
          status: 'accepted',
          room_number: roomNumber,
          professional_id: user?.id,
          professional_name: profile?.name
        })
        .eq('consultation_id', consultationId);
        
      if (error) throw error;
      
      // Refresh data
      const acceptedReq = pendingRequests.find(r => r.consultation_id === consultationId);
      if (acceptedReq) {
        setPendingRequests(prev => prev.filter(r => r.consultation_id !== consultationId));
        setAcceptedRequests(prev => [{...acceptedReq, status: 'accepted', room_number: roomNumber}, ...prev]);
      }
      
    } catch (error) {
      console.error("Error accepting request:", error);
      alert("Erro ao aceitar solicitação.");
    }
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
              <div className="flex items-center gap-2">
                <h1 className="font-bold text-slate-900">Al-Shifa Health</h1>
                {profile?.is_verified && <VerifiedBadge size="sm" />}
              </div>
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
          <button
            onClick={toggleOnlineStatus}
            disabled={updatingStatus}
            className={`p-4 rounded-2xl border transition-all flex flex-col items-center justify-center gap-2 ${
              isOnline 
                ? "bg-emerald-50 border-emerald-100 text-emerald-700" 
                : "bg-slate-100 border-slate-200 text-slate-500"
            }`}
          >
            {updatingStatus ? (
              <Loader2 className="w-6 h-6 animate-spin" />
            ) : isOnline ? (
              <Wifi className="w-6 h-6" />
            ) : (
              <WifiOff className="w-6 h-6" />
            )}
            <span className="text-xs font-bold uppercase tracking-wider">
              {isOnline ? "Online" : "Offline"}
            </span>
          </button>

          <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col items-center justify-center">
            <p className="text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-1">Total Consultas</p>
            <p className="text-2xl font-bold text-slate-900">{stats.total}</p>
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
            <h2 className="font-bold text-slate-900">Solicitações Pendentes</h2>
            <span className="bg-amber-100 text-amber-700 text-[10px] font-bold px-2 py-1 rounded-full uppercase">
              {pendingRequests.length} Novas
            </span>
          </div>
          <div className="space-y-3">
            {pendingRequests.length === 0 ? (
              <div className="bg-white p-6 rounded-2xl border border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-400">
                <p className="text-xs">Nenhuma solicitação pendente</p>
              </div>
            ) : (
              pendingRequests.map((r) => (
                <div
                  key={r.id}
                  className="block bg-white p-4 rounded-2xl border-2 border-amber-100 shadow-sm relative overflow-hidden"
                >
                  <div className="absolute top-0 right-0 w-1 h-full bg-amber-400" />
                  <div className="flex justify-between items-start mb-2">
                    <span className="font-bold text-slate-900">{r.patient_name}</span>
                    <span className="text-[10px] font-bold text-slate-400">
                      {new Date(r.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 line-clamp-1 mb-3">{r.ai_analysis.replace('SOLICITAÇÃO DE CONSULTA\n\nMotivo: ', '')}</p>
                  <button
                    onClick={() => handleAcceptRequest(r.consultation_id)}
                    className="w-full bg-amber-100 text-amber-700 font-bold py-2 rounded-xl text-sm active:bg-amber-200 transition-colors"
                  >
                    Aceitar e Informar Gabinete
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {acceptedRequests.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <h2 className="font-bold text-slate-900">Em Andamento (Aceites)</h2>
              <span className="bg-emerald-100 text-emerald-700 text-[10px] font-bold px-2 py-1 rounded-full uppercase">
                {acceptedRequests.length}
              </span>
            </div>
            <div className="space-y-3">
              {acceptedRequests.map((r) => (
                <Link
                  key={r.id}
                  to={`/edit-consultation?id=${r.consultation_id}`}
                  className="block bg-white p-4 rounded-2xl border-2 border-emerald-100 shadow-sm active:bg-emerald-50 transition-colors relative overflow-hidden"
                >
                  <div className="absolute top-0 right-0 w-1 h-full bg-emerald-400" />
                  <div className="flex justify-between items-start mb-2">
                    <span className="font-bold text-slate-900">{r.patient_name}</span>
                    <span className="text-[10px] font-bold text-slate-400">
                      Gabinete: {r.room_number}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 line-clamp-1">Clique para preencher a triagem</p>
                </Link>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h2 className="font-bold text-slate-900">Consultas Recentes</h2>
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
