import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../hooks/useAuth";
import { ShieldCheck, UserCheck, UserX, ChevronLeft, Search, BarChart3, TrendingUp, Users, Activity } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { DashboardStats } from "../types";

export default function AdminDashboard() {
  const { profile } = useAuth();
  const [users, setUsers] = useState<any[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      // Fetch Users
      const { data: userData } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });
      setUsers(userData || []);

      // Fetch Stats
      const { data: consultations } = await supabase
        .from('consultations')
        .select('bmi, systolic, diastolic, glucose, campaign_id');

      if (consultations) {
        const total = consultations.length;
        const hypertension = consultations.filter(c => c.systolic >= 140 || c.diastolic >= 90).length;
        const diabetes = consultations.filter(c => c.glucose >= 126).length;
        
        const bmiDist = {
          underweight: consultations.filter(c => c.bmi < 18.5).length,
          normal: consultations.filter(c => c.bmi >= 18.5 && c.bmi < 25).length,
          overweight: consultations.filter(c => c.bmi >= 25 && c.bmi < 30).length,
          obese: consultations.filter(c => c.bmi >= 30).length,
        };

        setStats({
          total_screenings: total,
          hypertension_prevalence: total > 0 ? (hypertension / total) * 100 : 0,
          diabetes_risk_prevalence: total > 0 ? (diabetes / total) * 100 : 0,
          bmi_distribution: bmiDist,
          screenings_by_campaign: [] // Simplified for MVP
        });
      }
      setLoading(false);
    };

    fetchData();
  }, []);

  const toggleVerification = async (userId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_verified: !currentStatus })
        .eq('id', userId);
        
      if (error) throw error;
      setUsers(users.map(u => u.id === userId ? { ...u, is_verified: !currentStatus } : u));
    } catch (err) {
      console.error(err);
    }
  };

  if (profile?.role !== "Admin") {
    return <div className="p-10 text-center">Acesso Negado</div>;
  }

  const filteredUsers = users.filter(u => 
    u.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    u.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-50 pb-10">
      <header className="bg-white border-b border-slate-200 px-4 py-4 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-slate-500">
            <ChevronLeft className="w-6 h-6" />
          </button>
          <h1 className="font-bold text-slate-900">Epidemiology Dashboard</h1>
        </div>
      </header>

      <main className="max-w-5xl mx-auto p-4 space-y-8">
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
            <div className="flex items-center gap-3 mb-4 text-cyan-600">
              <Users className="w-5 h-5" />
              <span className="text-xs font-bold uppercase tracking-wider">Total Triagens</span>
            </div>
            <p className="text-4xl font-black text-slate-900">{stats?.total_screenings || 0}</p>
          </div>
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
            <div className="flex items-center gap-3 mb-4 text-red-500">
              <Activity className="w-5 h-5" />
              <span className="text-xs font-bold uppercase tracking-wider">Hipertensão</span>
            </div>
            <p className="text-4xl font-black text-slate-900">{stats?.hypertension_prevalence.toFixed(1)}%</p>
            <p className="text-xs text-slate-400 mt-1">Prevalência na amostra</p>
          </div>
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
            <div className="flex items-center gap-3 mb-4 text-amber-500">
              <TrendingUp className="w-5 h-5" />
              <span className="text-xs font-bold uppercase tracking-wider">Risco Diabetes</span>
            </div>
            <p className="text-4xl font-black text-slate-900">{stats?.diabetes_risk_prevalence.toFixed(1)}%</p>
            <p className="text-xs text-slate-400 mt-1">Glicemia ≥ 126 mg/dL</p>
          </div>
        </div>

        {/* BMI Distribution */}
        <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
          <h2 className="font-bold text-slate-900 mb-6 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-cyan-600" />
            Distribuição de IMC
          </h2>
          <div className="space-y-4">
            {Object.entries(stats?.bmi_distribution || {}).map(([key, value]) => {
              const percentage = stats?.total_screenings ? (Number(value) / stats.total_screenings) * 100 : 0;
              return (
                <div key={key}>
                  <div className="flex justify-between text-xs font-bold uppercase mb-1">
                    <span className="text-slate-500">{key}</span>
                    <span className="text-slate-900">{percentage.toFixed(1)}%</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-cyan-500 transition-all duration-1000" 
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* User Management */}
        <div className="space-y-4">
          <h2 className="font-bold text-slate-900 px-1">Gestão de Profissionais</h2>
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Procurar profissional..."
              className="w-full pl-12 pr-4 py-3 rounded-2xl border border-slate-200 focus:ring-2 focus:ring-cyan-500 outline-none bg-white"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="space-y-3">
            {filteredUsers.map((u) => (
              <div key={u.id} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg ${u.is_verified ? 'bg-cyan-600' : 'bg-slate-300'}`}>
                    {u.name?.charAt(0)}
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 flex items-center gap-2">
                      {u.name}
                      {u.is_verified && <ShieldCheck className="w-4 h-4 text-cyan-600" />}
                    </h3>
                    <p className="text-xs text-slate-500">{u.specialty} • {u.email}</p>
                  </div>
                </div>
                
                <button
                  onClick={() => toggleVerification(u.id, u.is_verified)}
                  className={`p-2 rounded-xl transition-colors ${u.is_verified ? 'bg-red-50 text-red-600' : 'bg-cyan-50 text-cyan-600'}`}
                >
                  {u.is_verified ? <UserX className="w-6 h-6" /> : <UserCheck className="w-6 h-6" />}
                </button>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
