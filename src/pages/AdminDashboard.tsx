import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../hooks/useAuth";
import { 
  ShieldCheck, UserCheck, UserX, ChevronLeft, Search, 
  BarChart3, TrendingUp, Users, Activity, Download, 
  Filter, Calendar, MapPin, ArrowUpRight, ArrowDownRight,
  PieChart as PieChartIcon, LayoutDashboard, Settings
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { DashboardStats, Campaign } from "../types";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend, LineChart, Line 
} from 'recharts';
import { motion, AnimatePresence } from "framer-motion";

const COLORS = ['#0891b2', '#06b6d4', '#22d3ee', '#67e8f9', '#a5f3fc'];

export default function AdminDashboard() {
  const { profile } = useAuth();
  const [users, setUsers] = useState<any[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCampaign, setSelectedCampaign] = useState<string>("all");
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      
      // Fetch Campaigns
      const { data: campaignData } = await supabase
        .from('campaigns')
        .select('*')
        .order('created_at', { ascending: false });
      setCampaigns(campaignData || []);

      // Fetch Users
      const { data: userData } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });
      setUsers(userData || []);

      // Fetch Stats
      let query = supabase.from('consultations').select('bmi, systolic, diastolic, glucose, campaign_id, created_at');
      
      if (selectedCampaign !== "all") {
        query = query.eq('campaign_id', selectedCampaign);
      }

      const { data: consultations } = await query;

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

        // Calculate screenings by campaign
        const campaignCounts = (campaignData || []).map(camp => ({
          campaign_name: camp.name,
          count: consultations.filter(c => c.campaign_id === camp.id).length
        })).filter(c => c.count > 0);

        setStats({
          total_screenings: total,
          hypertension_prevalence: total > 0 ? (hypertension / total) * 100 : 0,
          diabetes_risk_prevalence: total > 0 ? (diabetes / total) * 100 : 0,
          bmi_distribution: bmiDist,
          screenings_by_campaign: campaignCounts
        });
      }
      setLoading(false);
    };

    fetchData();
  }, [selectedCampaign]);

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

  const exportData = () => {
    alert("Funcionalidade de exportação CSV em preparação para a campanha.");
  };

  if (profile?.role !== "Admin") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center space-y-4">
          <ShieldCheck className="w-16 h-16 text-red-500 mx-auto opacity-20" />
          <h1 className="text-2xl font-bold text-slate-900">Acesso Restrito</h1>
          <p className="text-slate-500">Apenas administradores podem aceder a este painel.</p>
          <button onClick={() => navigate("/dashboard")} className="text-cyan-600 font-bold hover:underline">Voltar ao Dashboard</button>
        </div>
      </div>
    );
  }

  const filteredUsers = users.filter(u => 
    u.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    u.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const bmiChartData = stats ? [
    { name: 'Baixo Peso', value: stats.bmi_distribution.underweight },
    { name: 'Normal', value: stats.bmi_distribution.normal },
    { name: 'Sobrepeso', value: stats.bmi_distribution.overweight },
    { name: 'Obesidade', value: stats.bmi_distribution.obese },
  ].filter(d => d.value > 0) : [];

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex">
      {/* Sidebar - Desktop */}
      <aside className="hidden lg:flex w-64 bg-white border-r border-slate-200 flex-col sticky top-0 h-screen">
        <div className="p-6 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-cyan-600 rounded-lg flex items-center justify-center text-white">
              <Activity className="w-5 h-5" />
            </div>
            <span className="font-bold text-slate-900">Al-Shifa Admin</span>
          </div>
        </div>
        <nav className="flex-1 p-4 space-y-2">
          <button className="w-full flex items-center gap-3 px-4 py-3 bg-cyan-50 text-cyan-700 rounded-xl font-bold transition-all">
            <LayoutDashboard className="w-5 h-5" />
            Dashboard
          </button>
          <button onClick={() => navigate("/dashboard")} className="w-full flex items-center gap-3 px-4 py-3 text-slate-500 hover:bg-slate-50 rounded-xl font-medium transition-all">
            <ChevronLeft className="w-5 h-5" />
            Voltar App
          </button>
        </nav>
        <div className="p-4 border-t border-slate-100">
          <div className="flex items-center gap-3 px-4 py-3">
            <div className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center text-slate-500 font-bold">
              {profile?.name?.charAt(0)}
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-bold text-slate-900 truncate">{profile?.name}</p>
              <p className="text-xs text-slate-500 truncate">Super Admin</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="bg-white/80 backdrop-blur-md border-b border-slate-200 px-6 py-4 sticky top-0 z-20 flex items-center justify-between">
          <div className="flex items-center gap-4 lg:hidden">
            <button onClick={() => navigate(-1)} className="p-2 text-slate-500">
              <ChevronLeft className="w-6 h-6" />
            </button>
            <h1 className="font-bold text-slate-900">Admin</h1>
          </div>
          <div className="hidden lg:block">
            <h1 className="text-xl font-bold text-slate-900">Epidemiology & Operations</h1>
            <p className="text-sm text-slate-500">Monitorização em tempo real das campanhas de saúde.</p>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={exportData}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 hover:bg-slate-50 transition-all shadow-sm"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Exportar Dados</span>
            </button>
          </div>
        </header>

        <main className="p-6 space-y-8 max-w-7xl mx-auto w-full">
          {/* Filters & Quick Actions */}
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div className="flex items-center gap-3 bg-white p-1.5 rounded-2xl border border-slate-200 shadow-sm w-full sm:w-auto">
              <div className="flex items-center gap-2 px-3 py-1.5 text-slate-500">
                <Filter className="w-4 h-4" />
                <span className="text-xs font-bold uppercase tracking-wider">Filtrar</span>
              </div>
              <select 
                value={selectedCampaign}
                onChange={(e) => setSelectedCampaign(e.target.value)}
                className="bg-transparent border-none outline-none text-sm font-bold text-slate-900 pr-8 py-1.5 cursor-pointer"
              >
                <option value="all">Todas as Campanhas</option>
                {campaigns.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2 text-xs font-bold text-slate-400 bg-slate-100 px-4 py-2 rounded-full">
              <Calendar className="w-3 h-3" />
              Última atualização: {new Date().toLocaleTimeString()}
            </div>
          </div>

          {/* Stats Bento Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm relative overflow-hidden group"
            >
              <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                <Users className="w-16 h-16 text-cyan-600" />
              </div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Total Triagens</p>
              <div className="flex items-end gap-2">
                <h3 className="text-4xl font-black text-slate-900">{stats?.total_screenings || 0}</h3>
                <div className="flex items-center text-emerald-500 text-xs font-bold mb-1">
                  <ArrowUpRight className="w-3 h-3" />
                  12%
                </div>
              </div>
              <p className="text-[10px] text-slate-400 mt-4">Pacientes únicos atendidos</p>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm relative overflow-hidden group"
            >
              <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                <Activity className="w-16 h-16 text-red-600" />
              </div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Hipertensão</p>
              <div className="flex items-end gap-2">
                <h3 className="text-4xl font-black text-slate-900">{stats?.hypertension_prevalence.toFixed(1)}%</h3>
                <div className="flex items-center text-red-500 text-xs font-bold mb-1">
                  <ArrowUpRight className="w-3 h-3" />
                  2.4%
                </div>
              </div>
              <p className="text-[10px] text-slate-400 mt-4">Prevalência (TA ≥ 140/90)</p>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm relative overflow-hidden group"
            >
              <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                <TrendingUp className="w-16 h-16 text-amber-600" />
              </div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Risco Diabetes</p>
              <div className="flex items-end gap-2">
                <h3 className="text-4xl font-black text-slate-900">{stats?.diabetes_risk_prevalence.toFixed(1)}%</h3>
                <div className="flex items-center text-emerald-500 text-xs font-bold mb-1">
                  <ArrowDownRight className="w-3 h-3" />
                  0.8%
                </div>
              </div>
              <p className="text-[10px] text-slate-400 mt-4">Glicemia ≥ 126 mg/dL</p>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-cyan-600 p-6 rounded-[2rem] shadow-lg shadow-cyan-100 relative overflow-hidden group"
            >
              <div className="absolute top-0 right-0 p-4 opacity-20">
                <MapPin className="w-16 h-16 text-white" />
              </div>
              <p className="text-xs font-bold text-cyan-100 uppercase tracking-widest mb-2">Campanhas Ativas</p>
              <h3 className="text-4xl font-black text-white">{campaigns.filter(c => c.active).length}</h3>
              <p className="text-[10px] text-cyan-100 mt-4">Em Maputo e arredores</p>
            </motion.div>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* BMI Distribution Chart */}
            <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    <PieChartIcon className="w-5 h-5 text-cyan-600" />
                    Distribuição de IMC
                  </h2>
                  <p className="text-xs text-slate-400">Estado nutricional da população triada</p>
                </div>
              </div>
              <div className="h-[300px] w-full">
                {bmiChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={bmiChartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={80}
                        outerRadius={100}
                        paddingAngle={8}
                        dataKey="value"
                      >
                        {bmiChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                      />
                      <Legend verticalAlign="bottom" height={36}/>
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-slate-300">
                    <PieChartIcon className="w-12 h-12 mb-2 opacity-20" />
                    <p className="text-sm">Sem dados suficientes</p>
                  </div>
                )}
              </div>
            </div>

            {/* Screenings by Campaign */}
            <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-cyan-600" />
                    Triagens por Campanha
                  </h2>
                  <p className="text-xs text-slate-400">Volume de atendimentos por localidade</p>
                </div>
              </div>
              <div className="h-[300px] w-full">
                {stats?.screenings_by_campaign && stats.screenings_by_campaign.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stats.screenings_by_campaign}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis 
                        dataKey="campaign_name" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 600 }}
                        dy={10}
                      />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                      <Tooltip 
                        cursor={{ fill: '#f8fafc' }}
                        contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                      />
                      <Bar dataKey="count" fill="#0891b2" radius={[6, 6, 0, 0]} barSize={40} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-slate-300">
                    <BarChart3 className="w-12 h-12 mb-2 opacity-20" />
                    <p className="text-sm">Sem dados de campanhas</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* User Management Section */}
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Gestão de Profissionais</h2>
                <p className="text-sm text-slate-500">Aprovação e controlo de acesso à plataforma.</p>
              </div>
              <div className="relative w-full sm:w-72">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Procurar por nome ou email..."
                  className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-cyan-500 outline-none bg-white text-sm transition-all"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <AnimatePresence>
                {filteredUsers.map((u, index) => (
                  <motion.div 
                    key={u.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex items-center justify-between group hover:border-cyan-100 transition-all"
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white font-bold text-lg shadow-inner ${u.is_verified ? 'bg-cyan-600' : 'bg-slate-200 text-slate-400'}`}>
                        {u.name?.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-bold text-slate-900 flex items-center gap-2 truncate">
                          {u.name}
                          {u.is_verified && <ShieldCheck className="w-4 h-4 text-cyan-600" />}
                        </h3>
                        <p className="text-xs text-slate-500 truncate">{u.specialty} • {u.email}</p>
                      </div>
                    </div>
                    
                    <button
                      onClick={() => toggleVerification(u.id, u.is_verified)}
                      className={`p-3 rounded-2xl transition-all active:scale-90 ${u.is_verified ? 'bg-red-50 text-red-500 hover:bg-red-100' : 'bg-cyan-50 text-cyan-600 hover:bg-cyan-100'}`}
                      title={u.is_verified ? "Desativar Profissional" : "Verificar Profissional"}
                    >
                      {u.is_verified ? <UserX className="w-5 h-5" /> : <UserCheck className="w-5 h-5" />}
                    </button>
                  </motion.div>
                ))}
              </AnimatePresence>
              
              {filteredUsers.length === 0 && (
                <div className="col-span-full py-20 text-center bg-white rounded-[2.5rem] border border-dashed border-slate-200">
                  <Users className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                  <p className="text-slate-400 font-medium">Nenhum profissional encontrado.</p>
                </div>
              )}
            </div>
          </div>
        </main>

        <footer className="p-6 text-center border-t border-slate-100 bg-white/50">
          <p className="text-xs text-slate-400 font-medium">
            Al-Shifa Health Initiative 2026 • Sistema de Monitorização Epidemiológica
          </p>
        </footer>
      </div>
    </div>
  );
}
