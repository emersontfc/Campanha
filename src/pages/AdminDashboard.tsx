import * as React from "react";
import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../hooks/useAuth";
import { 
  ShieldCheck, UserCheck, UserX, ChevronLeft, Search, 
  BarChart3, TrendingUp, Users, Activity, Download, 
  Filter, Calendar, MapPin, ArrowUpRight, ArrowDownRight, Plus, Sparkles,
  PieChart as PieChartIcon, LayoutDashboard, Settings,
  MoreVertical, Edit2, Key, Trash2
} from "lucide-react";
import { VerifiedBadge } from "../components/VerifiedBadge";
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
  const [activeTab, setActiveTab] = useState<"overview" | "campaigns" | "users">("overview");
  const [users, setUsers] = useState<any[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [recentConsultations, setRecentConsultations] = useState<any[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCampaign, setSelectedCampaign] = useState<string>("all");
  
  // New Campaign State
  const [showNewCampaignModal, setShowNewCampaignModal] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [newCampaign, setNewCampaign] = useState({ name: "", location: "" });
  const [isCreatingCampaign, setIsCreatingCampaign] = useState(false);

  // User Management State
  const [editingUser, setEditingUser] = useState<any | null>(null);
  const [showEditUserModal, setShowEditUserModal] = useState(false);
  const [editUserForm, setEditUserForm] = useState({ name: "", role: "", specialty: "" });
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);

  const navigate = useNavigate();

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

    // Fetch Recent Consultations
    const { data: recentData } = await supabase
      .from('consultations')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);
    setRecentConsultations(recentData || []);

    // Fetch Stats
    let query = supabase.from('consultations').select('bmi, systolic, diastolic, glucose, campaign_id, created_at');
    
    if (selectedCampaign !== "all") {
      query = query.eq('campaign_id', selectedCampaign);
    }

    const { data: consultations } = await query;

    if (consultations) {
      const total = consultations.length;
      const hypertension = consultations.filter(c => c.systolic >= 140 || c.diastolic >= 90).length;
      const diabetes = consultations.filter(c => c.glucose >= 7.0).length;
      
      const bmiDist = {
        underweight: consultations.filter(c => c.bmi < 18.5).length,
        normal: consultations.filter(c => c.bmi >= 18.5 && c.bmi < 25).length,
        overweight: consultations.filter(c => c.bmi >= 25 && c.bmi < 30).length,
        obese: consultations.filter(c => c.bmi >= 30).length,
      };

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

  useEffect(() => {
    fetchData();
  }, [selectedCampaign]);

  const handleCreateCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCampaign.name || !newCampaign.location) return;

    setIsCreatingCampaign(true);
    try {
      const { error } = await supabase
        .from('campaigns')
        .insert([{ ...newCampaign, active: true }]);
      
      if (error) throw error;
      
      setShowNewCampaignModal(false);
      setNewCampaign({ name: "", location: "" });
      fetchData();
    } catch (err) {
      console.error(err);
    } finally {
      setIsCreatingCampaign(false);
    }
  };

  const toggleCampaignStatus = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('campaigns')
        .update({ active: !currentStatus })
        .eq('id', id);
      if (error) throw error;
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

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

  const handleEditUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          name: editUserForm.name,
          role: editUserForm.role,
          specialty: editUserForm.specialty
        })
        .eq('id', editingUser.id);
      
      if (error) throw error;
      
      setUsers(users.map(u => u.id === editingUser.id ? { ...u, ...editUserForm } : u));
      setShowEditUserModal(false);
      setEditingUser(null);
    } catch (err) {
      console.error("Error updating user:", err);
      alert("Erro ao atualizar o utilizador.");
    }
  };

  const handleSendPasswordReset = async (email: string) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/#/login`,
      });
      if (error) throw error;
      alert(`Link de recuperação enviado para ${email}`);
    } catch (err) {
      console.error("Error sending reset link:", err);
      alert("Erro ao enviar o link de recuperação.");
    }
    setActiveDropdown(null);
  };

  const handleDeleteUser = async (userId: string) => {
    if (!window.confirm("Tem a certeza que deseja remover este utilizador? Esta ação não pode ser desfeita.")) return;
    try {
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', userId);
        
      if (error) throw error;
      setUsers(users.filter(u => u.id !== userId));
    } catch (err) {
      console.error("Error deleting user:", err);
      alert("Erro ao remover o utilizador.");
    }
    setActiveDropdown(null);
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
    <div className="min-h-screen bg-[#F8FAFC] flex font-sans">
      {/* Sidebar */}
      <aside className="hidden lg:flex w-72 bg-white border-r border-slate-200 flex-col sticky top-0 h-screen z-30">
        <div className="p-8 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-cyan-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-cyan-100">
              <Activity className="w-6 h-6" />
            </div>
            <div>
              <span className="font-black text-slate-900 tracking-tight text-lg">AL-SHIFA</span>
              <p className="text-[10px] font-bold text-cyan-600 uppercase tracking-widest">Admin Portal</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-6 space-y-1.5">
          <button 
            onClick={() => setActiveTab("overview")}
            className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl font-bold transition-all ${activeTab === "overview" ? 'bg-cyan-50 text-cyan-700 shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}
          >
            <LayoutDashboard className="w-5 h-5" />
            Overview
          </button>
          <button 
            onClick={() => setActiveTab("campaigns")}
            className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl font-bold transition-all ${activeTab === "campaigns" ? 'bg-cyan-50 text-cyan-700 shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}
          >
            <MapPin className="w-5 h-5" />
            Campanhas
          </button>
          <button 
            onClick={() => setActiveTab("users")}
            className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl font-bold transition-all ${activeTab === "users" ? 'bg-cyan-50 text-cyan-700 shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}
          >
            <Users className="w-5 h-5" />
            Profissionais
          </button>
          
          <div className="pt-8 pb-4">
            <p className="px-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">Ações Rápidas</p>
            <button onClick={() => navigate("/dashboard")} className="w-full flex items-center gap-3 px-4 py-3 text-slate-500 hover:bg-slate-50 rounded-2xl font-medium transition-all">
              <ChevronLeft className="w-5 h-5" />
              Voltar à App
            </button>
            <button onClick={() => setShowSettings(true)} className="w-full flex items-center gap-3 px-4 py-3 text-slate-500 hover:bg-slate-50 rounded-2xl font-medium transition-all">
              <Settings className="w-5 h-5" />
              Configurações
            </button>
          </div>
        </nav>

        <div className="p-6 border-t border-slate-100">
          <div className="bg-slate-50 rounded-2xl p-4 flex items-center gap-3">
            <div className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center text-cyan-600 font-black">
              {profile?.name?.charAt(0)}
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-bold text-slate-900 truncate">{profile?.name}</p>
              <p className="text-[10px] font-bold text-slate-400 uppercase">Super Admin</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="bg-white/80 backdrop-blur-md border-b border-slate-200 px-8 py-5 sticky top-0 z-20 flex items-center justify-between">
          <div className="flex items-center gap-4 lg:hidden">
            <button onClick={() => navigate(-1)} className="p-2 text-slate-500">
              <ChevronLeft className="w-6 h-6" />
            </button>
            <h1 className="font-black text-slate-900">AL-SHIFA</h1>
          </div>
          
          <div className="hidden lg:block">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              {activeTab === "overview" && "Dashboard de Saúde"}
              {activeTab === "campaigns" && "Gestão de Campanhas"}
              {activeTab === "users" && "Controlo de Profissionais"}
            </h1>
          </div>

          <div className="flex items-center gap-4">
            {activeTab === "campaigns" && (
              <button 
                onClick={() => setShowNewCampaignModal(true)}
                className="flex items-center gap-2 px-5 py-2.5 bg-cyan-600 text-white rounded-xl text-sm font-bold hover:bg-cyan-700 transition-all shadow-lg shadow-cyan-100"
              >
                <Plus className="w-4 h-4" />
                Nova Campanha
              </button>
            )}
            <button className="p-2.5 bg-white border border-slate-200 rounded-xl text-slate-500 hover:bg-slate-50 shadow-sm">
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </header>

        <main className="p-8 max-w-7xl mx-auto w-full space-y-8">
          {activeTab === "overview" && (
            <>
              {/* Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                  { label: "Total Triagens", value: stats?.total_screenings || 0, icon: Users, color: "text-cyan-600", bg: "bg-cyan-50", trend: "+12%", trendColor: "text-emerald-600" },
                  { label: "Hipertensão", value: `${stats?.hypertension_prevalence.toFixed(1)}%`, icon: Activity, color: "text-rose-500", bg: "bg-rose-50", trend: "+2.4%", trendColor: "text-rose-600" },
                  { label: "Risco Diabetes", value: `${stats?.diabetes_risk_prevalence.toFixed(1)}%`, icon: TrendingUp, color: "text-amber-500", bg: "bg-amber-50", trend: "-0.8%", trendColor: "text-emerald-600" },
                  { label: "Campanhas", value: campaigns.filter(c => c.active).length, icon: MapPin, color: "text-indigo-600", bg: "bg-indigo-50", trend: "Ativas", trendColor: "text-indigo-600" }
                ].map((stat, i) => (
                  <motion.div 
                    key={i}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className="bg-white p-7 rounded-[2.5rem] border border-slate-100 shadow-sm relative group hover:shadow-2xl hover:shadow-cyan-900/5 transition-all duration-500"
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div className={`w-14 h-14 ${stat.bg} ${stat.color} rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-500 shadow-inner`}>
                        <stat.icon className="w-7 h-7" />
                      </div>
                      <span className={`text-[10px] font-black px-2.5 py-1.5 rounded-xl bg-slate-50 ${stat.trendColor} border border-slate-100`}>
                        {stat.trend}
                      </span>
                    </div>
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.15em] mb-1">{stat.label}</p>
                    <h3 className="text-4xl font-black text-slate-900 tracking-tight">{stat.value}</h3>
                  </motion.div>
                ))}
              </div>

              {/* Charts Row */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 bg-white p-10 rounded-[3.5rem] border border-slate-100 shadow-sm hover:shadow-xl transition-shadow duration-500">
                  <div className="flex items-center justify-between mb-10">
                    <div>
                      <h2 className="text-xl font-black text-slate-900 tracking-tight">Volume de Triagens</h2>
                      <p className="text-sm font-medium text-slate-400">Distribuição geográfica de atendimentos por campanha</p>
                    </div>
                    <div className="flex gap-2">
                      <div className="w-3 h-3 rounded-full bg-cyan-600" />
                      <div className="w-3 h-3 rounded-full bg-slate-100" />
                    </div>
                  </div>
                  <div className="h-[380px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={stats?.screenings_by_campaign}>
                        <defs>
                          <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#0891b2" />
                            <stop offset="100%" stopColor="#06b6d4" />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="campaign_name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 800 }} dy={15} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                        <Tooltip 
                          cursor={{ fill: '#f8fafc', radius: 15 }} 
                          contentStyle={{ borderRadius: '24px', border: 'none', boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.15)', padding: '16px' }} 
                        />
                        <Bar dataKey="count" fill="url(#barGradient)" radius={[15, 15, 0, 0]} barSize={60} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="bg-white p-10 rounded-[3.5rem] border border-slate-100 shadow-sm hover:shadow-xl transition-shadow duration-500">
                  <h2 className="text-xl font-black text-slate-900 tracking-tight mb-2">Estado Nutricional</h2>
                  <p className="text-sm font-medium text-slate-400 mb-10">Perfil de IMC da população</p>
                  <div className="h-[320px] w-full relative">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={bmiChartData} cx="50%" cy="50%" innerRadius={85} outerRadius={110} paddingAngle={12} dataKey="value" stroke="none">
                          {bmiChartData.map((_, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                        </Pie>
                        <Tooltip contentStyle={{ borderRadius: '24px', border: 'none', boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.15)' }} />
                        <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', paddingTop: '20px' }} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      <span className="text-3xl font-black text-slate-900">{stats?.total_screenings}</span>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Recent Activity Table */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 bg-white rounded-[3.5rem] border border-slate-100 shadow-sm overflow-hidden hover:shadow-xl transition-shadow duration-500">
                  <div className="p-10 border-b border-slate-50 flex items-center justify-between">
                    <div>
                      <h2 className="text-xl font-black text-slate-900 tracking-tight">Fluxo de Triagens</h2>
                      <p className="text-sm font-medium text-slate-400">Monitorização em tempo real das atividades de campo</p>
                    </div>
                    <div className="flex gap-2">
                      <button className="px-5 py-2.5 bg-slate-50 text-slate-600 rounded-xl text-xs font-black hover:bg-slate-100 transition-all">Exportar Log</button>
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50/50">
                          <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">ID Triagem</th>
                          <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Paciente</th>
                          <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Profissional</th>
                          <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">TA / Glicemia</th>
                          <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Data</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {recentConsultations.map((c) => (
                          <tr key={c.id} className="hover:bg-slate-50/30 transition-colors">
                            <td className="px-8 py-5 font-mono text-xs font-bold text-cyan-600">{c.consultation_id}</td>
                            <td className="px-8 py-5">
                              <p className="text-sm font-bold text-slate-900">{c.patient_name}</p>
                              <p className="text-[10px] text-slate-400">{c.patient_age} anos</p>
                            </td>
                            <td className="px-8 py-5">
                              <p className="text-sm font-bold text-slate-900">{c.professional_name}</p>
                              <p className="text-[10px] text-slate-400">ID: {c.professional_id.slice(0,8)}</p>
                            </td>
                            <td className="px-8 py-5">
                              <div className="flex items-center gap-3">
                                <span className={`text-xs font-bold px-2 py-1 rounded-lg ${c.systolic >= 140 ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'}`}>
                                  {c.blood_pressure}
                                </span>
                                <span className={`text-xs font-bold px-2 py-1 rounded-lg ${c.glucose >= 7.0 ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-600'}`}>
                                  {c.glucose} mmol/L
                                </span>
                              </div>
                            </td>
                            <td className="px-8 py-5 text-xs font-medium text-slate-400">
                              {new Date(c.created_at).toLocaleDateString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="bg-slate-900 p-10 rounded-[3.5rem] shadow-2xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-8 opacity-10">
                    <Sparkles className="w-24 h-24 text-cyan-400" />
                  </div>
                  <h2 className="text-xl font-black text-white tracking-tight mb-2">AI Insights</h2>
                  <p className="text-xs font-bold text-cyan-400 uppercase tracking-widest mb-8">Análise Preditiva</p>
                  
                  <div className="space-y-6">
                    <div className="p-6 bg-white/5 rounded-[2rem] border border-white/10 backdrop-blur-md">
                      <p className="text-xs font-bold text-slate-400 uppercase mb-2">Observação Crítica</p>
                      <p className="text-sm text-slate-200 leading-relaxed">
                        {recentConsultations.length > 0 
                          ? `Baseado nas últimas ${recentConsultations.length} triagens, detetamos uma prevalência de ${stats?.hypertension_prevalence.toFixed(1)}% de hipertensão. Recomenda-se reforço de medicação na campanha ${campaigns.find(c => c.active)?.name || 'ativa'}.`
                          : "Aguardando dados suficientes para gerar insights preditivos."}
                      </p>
                    </div>
                    
                    <div className="flex items-center gap-4 p-4 bg-cyan-500/10 rounded-2xl border border-cyan-500/20">
                      <div className="w-10 h-10 bg-cyan-500 rounded-xl flex items-center justify-center text-white">
                        <TrendingUp className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-cyan-400 uppercase tracking-widest">Nível de Risco</p>
                        <p className="text-sm font-bold text-white">Moderado (Nível 2)</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {activeTab === "campaigns" && (
            <div className="space-y-8">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-black text-slate-900 tracking-tight">Missões Ativas</h2>
                  <p className="text-sm font-medium text-slate-500">Gestão de locais de triagem e equipas em campo</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {campaigns.map((c, i) => (
                  <motion.div 
                    key={c.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.1 }}
                    className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-sm relative group hover:shadow-2xl transition-all duration-500"
                  >
                    <div className="flex justify-between items-start mb-8">
                      <div className={`w-16 h-16 rounded-[1.5rem] flex items-center justify-center shadow-xl ${c.active ? 'bg-cyan-600 text-white shadow-cyan-200' : 'bg-slate-100 text-slate-400 shadow-none'}`}>
                        <MapPin className="w-8 h-8" />
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${c.active ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-slate-50 text-slate-400 border border-slate-100'}`}>
                          {c.active ? "Em Curso" : "Concluída"}
                        </span>
                        <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">Criada em {new Date(c.created_at).toLocaleDateString()}</p>
                      </div>
                    </div>

                    <h3 className="text-2xl font-black text-slate-900 mb-2 tracking-tight">{c.name}</h3>
                    <div className="flex items-center gap-2 text-slate-400 text-sm font-bold mb-8">
                      <MapPin className="w-4 h-4 text-cyan-600" />
                      {c.location}
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-8">
                      <div className="bg-slate-50 p-4 rounded-2xl">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Triagens</p>
                        <p className="text-xl font-black text-slate-900">
                          {stats?.screenings_by_campaign.find(s => s.campaign_name === c.name)?.count || 0}
                        </p>
                      </div>
                      <div className="bg-slate-50 p-4 rounded-2xl">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Impacto</p>
                        <p className="text-xl font-black text-cyan-600">Alto</p>
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <button 
                        onClick={() => toggleCampaignStatus(c.id, c.active)}
                        className={`flex-1 py-4 rounded-2xl text-xs font-black transition-all ${c.active ? 'bg-slate-900 text-white hover:bg-slate-800' : 'bg-cyan-600 text-white hover:bg-cyan-700'}`}
                      >
                        {c.active ? "Encerrar Missão" : "Reativar Missão"}
                      </button>
                      <button className="p-4 bg-slate-50 text-slate-400 rounded-2xl hover:bg-slate-100 transition-all">
                        <ArrowUpRight className="w-5 h-5" />
                      </button>
                    </div>
                  </motion.div>
                ))}
                
                <motion.button 
                  onClick={() => setShowNewCampaignModal(true)}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="bg-slate-50 border-4 border-dashed border-slate-200 rounded-[3rem] p-10 flex flex-col items-center justify-center gap-4 group hover:border-cyan-200 hover:bg-cyan-50/30 transition-all duration-500"
                >
                  <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center text-slate-300 group-hover:text-cyan-600 shadow-sm transition-colors">
                    <Plus className="w-8 h-8" />
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-black text-slate-400 group-hover:text-cyan-700 tracking-tight">Nova Campanha</p>
                    <p className="text-xs font-bold text-slate-300 group-hover:text-cyan-600">Adicionar local de triagem</p>
                  </div>
                </motion.button>
              </div>
            </div>
          )}

          {activeTab === "users" && (
            <div className="space-y-8">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                <div>
                  <h2 className="text-2xl font-black text-slate-900 tracking-tight">Equipa Médica</h2>
                  <p className="text-sm font-medium text-slate-500">Controlo de credenciais e autorizações de acesso</p>
                </div>
                <div className="relative w-full sm:w-96 group">
                  <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5 group-focus-within:text-cyan-600 transition-colors" />
                  <input 
                    type="text" 
                    placeholder="Procurar por nome, email ou especialidade..."
                    className="w-full pl-14 pr-6 py-4 rounded-[1.5rem] border border-slate-200 focus:ring-4 focus:ring-cyan-500/10 focus:border-cyan-500 outline-none bg-white text-sm font-bold transition-all shadow-sm"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <AnimatePresence>
                  {filteredUsers.map((u, i) => (
                    <motion.div 
                      key={u.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm flex items-center justify-between group hover:shadow-2xl hover:border-cyan-100 transition-all duration-500"
                    >
                      <div className="flex items-center gap-6">
                        <div className={`w-20 h-20 rounded-[2rem] flex items-center justify-center text-white font-black text-3xl shadow-2xl ${u.is_verified ? 'bg-cyan-600 shadow-cyan-100' : 'bg-slate-100 text-slate-300 shadow-none'}`}>
                          {u.name?.charAt(0)}
                        </div>
                        <div className="min-w-0">
                          <h3 className="text-xl font-black text-slate-900 flex items-center gap-2 truncate tracking-tight">
                            {u.name}
                            {u.is_verified && <VerifiedBadge />}
                          </h3>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-[10px] font-black text-cyan-600 uppercase tracking-widest bg-cyan-50 px-2 py-0.5 rounded-md">{u.specialty}</span>
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-50 px-2 py-0.5 rounded-md">{u.role}</span>
                          </div>
                          <p className="text-xs font-medium text-slate-400 truncate">{u.email}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3 relative">
                        <button
                          onClick={() => toggleVerification(u.id, u.is_verified)}
                          className={`p-4 rounded-[1.5rem] transition-all active:scale-90 shadow-sm ${u.is_verified ? 'bg-rose-50 text-rose-500 hover:bg-rose-100' : 'bg-cyan-50 text-cyan-600 hover:bg-cyan-100'}`}
                          title={u.is_verified ? "Remover Verificação" : "Verificar Utilizador"}
                        >
                          {u.is_verified ? <UserX className="w-6 h-6" /> : <UserCheck className="w-6 h-6" />}
                        </button>
                        
                        <div className="relative">
                          <button
                            onClick={() => setActiveDropdown(activeDropdown === u.id ? null : u.id)}
                            className="p-4 rounded-[1.5rem] bg-slate-50 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-all"
                          >
                            <MoreVertical className="w-6 h-6" />
                          </button>
                          
                          <AnimatePresence>
                            {activeDropdown === u.id && (
                              <motion.div
                                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                                className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-slate-100 py-2 z-50"
                              >
                                <button
                                  onClick={() => {
                                    setEditingUser(u);
                                    setEditUserForm({ name: u.name, role: u.role, specialty: u.specialty });
                                    setShowEditUserModal(true);
                                    setActiveDropdown(null);
                                  }}
                                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-50 transition-colors"
                                >
                                  <Edit2 className="w-4 h-4" />
                                  Editar Perfil
                                </button>
                                <button
                                  onClick={() => handleSendPasswordReset(u.email)}
                                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-50 transition-colors"
                                >
                                  <Key className="w-4 h-4" />
                                  Repor Palavra-passe
                                </button>
                                <div className="h-px bg-slate-100 my-1 mx-4" />
                                <button
                                  onClick={() => handleDeleteUser(u.id)}
                                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-bold text-rose-600 hover:bg-rose-50 transition-colors"
                                >
                                  <Trash2 className="w-4 h-4" />
                                  Remover Utilizador
                                </button>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* New Campaign Modal */}
      <AnimatePresence>
        {showNewCampaignModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowNewCampaignModal(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white w-full max-w-md rounded-[3rem] p-10 shadow-2xl relative z-10"
            >
              <h2 className="text-2xl font-black text-slate-900 mb-2">Nova Campanha</h2>
              <p className="text-sm text-slate-500 mb-8">Defina o local e nome para a nova missão de triagem.</p>
              
              <form onSubmit={handleCreateCampaign} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nome da Campanha</label>
                  <input 
                    required
                    type="text"
                    placeholder="Ex: Triagem Xipamanine"
                    className="w-full px-6 py-4 rounded-2xl bg-slate-50 border border-slate-100 focus:ring-2 focus:ring-cyan-500 outline-none font-bold text-slate-900 transition-all"
                    value={newCampaign.name}
                    onChange={(e) => setNewCampaign({...newCampaign, name: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Localidade</label>
                  <input 
                    required
                    type="text"
                    placeholder="Ex: Mercado Central, Maputo"
                    className="w-full px-6 py-4 rounded-2xl bg-slate-50 border border-slate-100 focus:ring-2 focus:ring-cyan-500 outline-none font-bold text-slate-900 transition-all"
                    value={newCampaign.location}
                    onChange={(e) => setNewCampaign({...newCampaign, location: e.target.value})}
                  />
                </div>
                
                <div className="flex gap-3 pt-4">
                  <button 
                    type="button"
                    onClick={() => setShowNewCampaignModal(false)}
                    className="flex-1 px-6 py-4 rounded-2xl font-bold text-slate-500 hover:bg-slate-50 transition-all"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit"
                    disabled={isCreatingCampaign}
                    className="flex-1 px-6 py-4 rounded-2xl font-bold bg-cyan-600 text-white hover:bg-cyan-700 transition-all shadow-lg shadow-cyan-100 disabled:opacity-50"
                  >
                    {isCreatingCampaign ? "Criando..." : "Criar Campanha"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit User Modal */}
      <AnimatePresence>
        {showEditUserModal && editingUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowEditUserModal(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white w-full max-w-md rounded-[3rem] p-10 shadow-2xl relative z-10"
            >
              <h2 className="text-2xl font-black text-slate-900 mb-2">Editar Utilizador</h2>
              <p className="text-sm text-slate-500 mb-8">Atualize os dados do perfil de {editingUser.name}.</p>
              
              <form onSubmit={handleEditUser} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nome Completo</label>
                  <input 
                    required
                    type="text"
                    className="w-full px-6 py-4 rounded-2xl bg-slate-50 border border-slate-100 focus:ring-2 focus:ring-cyan-500 outline-none font-bold text-slate-900 transition-all"
                    value={editUserForm.name}
                    onChange={(e) => setEditUserForm({...editUserForm, name: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Função</label>
                  <select 
                    required
                    className="w-full px-6 py-4 rounded-2xl bg-slate-50 border border-slate-100 focus:ring-2 focus:ring-cyan-500 outline-none font-bold text-slate-900 transition-all appearance-none"
                    value={editUserForm.role}
                    onChange={(e) => setEditUserForm({...editUserForm, role: e.target.value})}
                  >
                    <option value="MedicalProfessional">Profissional de Saúde</option>
                    <option value="Admin">Administrador</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Especialidade</label>
                  <input 
                    type="text"
                    className="w-full px-6 py-4 rounded-2xl bg-slate-50 border border-slate-100 focus:ring-2 focus:ring-cyan-500 outline-none font-bold text-slate-900 transition-all"
                    value={editUserForm.specialty}
                    onChange={(e) => setEditUserForm({...editUserForm, specialty: e.target.value})}
                  />
                </div>
                
                <div className="flex gap-3 pt-4">
                  <button 
                    type="button"
                    onClick={() => setShowEditUserModal(false)}
                    className="flex-1 px-6 py-4 rounded-2xl font-bold text-slate-500 hover:bg-slate-50 transition-all"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 px-6 py-4 rounded-2xl font-bold bg-cyan-600 text-white hover:bg-cyan-700 transition-all shadow-lg shadow-cyan-100"
                  >
                    Guardar
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Settings Modal Placeholder */}
      <AnimatePresence>
        {showSettings && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowSettings(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-xl"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-lg bg-white rounded-[3.5rem] shadow-2xl overflow-hidden p-12"
            >
              <div className="flex items-center gap-4 mb-8">
                <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-400">
                  <Settings className="w-7 h-7" />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-slate-900 tracking-tight">Configurações</h2>
                  <p className="text-sm font-medium text-slate-400">Personalize o seu painel de controlo</p>
                </div>
              </div>
              
              <div className="space-y-6 mb-10">
                <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100">
                  <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Modo Escuro</p>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-slate-600">Ativar tema escuro (Beta)</span>
                    <div className="w-12 h-6 bg-slate-200 rounded-full relative">
                      <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full shadow-sm" />
                    </div>
                  </div>
                </div>
                <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100">
                  <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Notificações</p>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-slate-600">Alertas de novas triagens</span>
                    <div className="w-12 h-6 bg-cyan-600 rounded-full relative">
                      <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full shadow-sm" />
                    </div>
                  </div>
                </div>
              </div>

              <button 
                onClick={() => setShowSettings(false)}
                className="w-full py-5 bg-slate-900 text-white rounded-2xl text-sm font-black hover:bg-slate-800 transition-all shadow-xl shadow-slate-200"
              >
                Guardar Alterações
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
