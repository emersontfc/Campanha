import * as React from "react";
import { useState, useEffect } from "react";
import { createClient } from '@supabase/supabase-js';
import { supabase } from "../lib/supabase";
import { useAuth } from "../hooks/useAuth";
import { 
  ShieldCheck, UserCheck, UserX, ChevronLeft, Search, 
  TrendingUp, Users, Activity, MapPin, Plus, Sparkles,
  LayoutDashboard, Settings, MoreVertical, Edit2, Key, Trash2,
  Menu, X, Bell, FileText, CheckCircle2, AlertCircle, Clock, RefreshCw,
  BookOpen, Image, Heart, Smartphone
} from "lucide-react";
import { VerifiedBadge } from "../components/VerifiedBadge";
import { useNavigate } from "react-router-dom";
import { DashboardStats, Campaign } from "../types";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend
} from 'recharts';
import { motion, AnimatePresence } from "framer-motion";

const COLORS = ['#0ea5e9', '#38bdf8', '#7dd3fc', '#bae6fd', '#e0f2fe'];

export default function AdminDashboard() {
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState<"overview" | "campaigns" | "users" | "consultations" | "knowledge" | "photos" | "settings">("overview");
  const [users, setUsers] = useState<any[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [consultations, setConsultations] = useState<any[]>([]);
  const [knowledgeBase, setKnowledgeBase] = useState<any[]>([]);
  const [campaignPhotos, setCampaignPhotos] = useState<any[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [donationSettings, setDonationSettings] = useState({
    mpesa_number: "",
    mpesa_name: "",
    emola_number: "",
    emola_name: "",
    donation_title: "",
    donation_description: ""
  });
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  
  // UI State
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showNewCampaignModal, setShowNewCampaignModal] = useState(false);
  const [newCampaign, setNewCampaign] = useState({ name: "", location: "" });
  const [isCreatingCampaign, setIsCreatingCampaign] = useState(false);
  const [isUploadingKB, setIsUploadingKB] = useState(false);
  const [isStylizingPhoto, setIsStylizingPhoto] = useState(false);
  const [selectedCampaignForPhoto, setSelectedCampaignForPhoto] = useState("");
  const [photoTitle, setPhotoTitle] = useState("");
  const [photoDate, setPhotoDate] = useState(new Date().toISOString().split('T')[0]);

  // User Management State
  const [editingUser, setEditingUser] = useState<any | null>(null);
  const [showEditUserModal, setShowEditUserModal] = useState(false);
  const [editUserForm, setEditUserForm] = useState({ name: "", role: "", specialty: "" });
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  
  // Create User State
  const [showNewUserModal, setShowNewUserModal] = useState(false);
  const [newUserForm, setNewUserForm] = useState({ name: "", email: "", password: "", role: "Profissional", specialty: "" });
  const [isCreatingUser, setIsCreatingUser] = useState(false);

  const navigate = useNavigate();

  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setErrorMsg(null);
    
    try {
      // Fetch Campaigns
      const { data: campaignData, error: campaignError } = await supabase
        .from('campaigns')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (campaignError) throw new Error(`Erro nas Campanhas: ${campaignError.message}`);
      setCampaigns(campaignData || []);

      // Fetch Users from the server API
      console.log("Fetching users from /api/admin...");
      const userResponse = await fetch("/api/admin?action=list-users").catch(err => {
        console.error("Fetch error:", err);
        throw new Error(`Falha na ligação ao servidor: ${err.message || "Network Error"}`);
      });

      if (!userResponse.ok) {
        const errorData = await userResponse.json().catch(() => ({}));
        throw new Error(errorData.error || `Erro do servidor (${userResponse.status})`);
      }
      const userData = await userResponse.json();
      setUsers(userData || []);

      // Fetch All Consultations
      const { data: consultationData, error: consultationError } = await supabase
        .from('consultations')
        .select('*')
        .order('created_at', { ascending: false });
        
      if (consultationError) throw new Error(`Consultations Error: ${consultationError.message}`);
      
      // Map campaign names manually to avoid join issues
      const consultationsWithCampaigns = (consultationData || []).map(c => ({
        ...c,
        campaigns: { name: campaignData?.find(camp => camp.id === c.campaign_id)?.name || 'Desconhecida' }
      }));
      
      setConsultations(consultationsWithCampaigns);

      // Fetch Knowledge Base and Photos
      const { data: kbData, error: kbError } = await supabase
        .from('knowledge_base')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (!kbError && kbData) {
        setKnowledgeBase(kbData.filter(item => !item.name.startsWith('campaign_photo_') && !item.name.startsWith('cphv2|')));
        setCampaignPhotos(kbData.filter(item => item.name.startsWith('campaign_photo_') || item.name.startsWith('cphv2|')));
      }

      // Fetch Donation Settings
      const { data: settingsData } = await supabase
        .from('site_settings')
        .select('value')
        .eq('key', 'donation_info')
        .single();
      
      if (settingsData) {
        setDonationSettings(settingsData.value);
      }

      // Calculate Stats
      if (consultationData) {
        const completedConsultations = consultationData.filter(c => c.status === 'completed');
        const total = completedConsultations.length;
        const hypertension = completedConsultations.filter(c => c.systolic >= 140 || c.diastolic >= 90).length;
        const diabetes = completedConsultations.filter(c => c.glucose >= 7.0).length;
        
        const bmiDist = {
          underweight: completedConsultations.filter(c => c.bmi < 18.5).length,
          normal: completedConsultations.filter(c => c.bmi >= 18.5 && c.bmi < 25).length,
          overweight: completedConsultations.filter(c => c.bmi >= 25 && c.bmi < 30).length,
          obese: completedConsultations.filter(c => c.bmi >= 30).length,
        };

        const campaignCounts = (campaignData || []).map(camp => ({
          campaign_name: camp.name,
          count: completedConsultations.filter(c => c.campaign_id === camp.id).length
        })).filter(c => c.count > 0);

        setStats({
          total_screenings: total,
          hypertension_prevalence: total > 0 ? (hypertension / total) * 100 : 0,
          diabetes_risk_prevalence: total > 0 ? (diabetes / total) * 100 : 0,
          bmi_distribution: bmiDist,
          screenings_by_campaign: campaignCounts
        });
      }
    } catch (err: any) {
      console.error("Error fetching admin data:", err);
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

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

  const handleSendPasswordReset = async (email: string, phone?: string) => {
    try {
      // If we have a phone number, we use the server API to generate a link WITHOUT sending an email
      if (phone) {
        const response = await fetch("/api/admin", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, action: 'generate-link' }),
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Erro ao gerar link no servidor");

        const resetLink = data.link;
        const resetMessage = `Olá! Foi solicitada a redefinição de senha para a sua conta na Al-Shifa Health.\n\nClique no link abaixo para criar uma nova senha segura:\n\n${resetLink}\n\nO link é válido por 1 hora por razões de segurança.`;
        
        const formattedPhone = phone.replace(/\D/g, "");
        const finalPhone = formattedPhone.startsWith('8') ? `258${formattedPhone}` : formattedPhone;
        const url = `https://wa.me/${finalPhone}?text=${encodeURIComponent(resetMessage)}`;
        window.open(url, "_blank");
      } else {
        // Fallback to standard email reset if no phone is provided
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/#/reset-password`,
        });
        if (error) throw error;
        alert(`Instruções de redefinição enviadas para o email ${email}.`);
      }
    } catch (err: any) {
      console.error("Error sending reset link:", err);
      alert(`Erro ao processar redefinição: ${err.message}`);
    }
    setActiveDropdown(null);
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserForm.name || !newUserForm.email || !newUserForm.password) return;

    setIsCreatingUser(true);
    try {
      const response = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...newUserForm, action: 'create-user' }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Erro ao criar utilizador");

      setShowNewUserModal(false);
      setNewUserForm({ name: "", email: "", password: "", role: "Profissional", specialty: "" });
      fetchData();
      alert("Utilizador criado com sucesso!");
    } catch (err: any) {
      console.error("Error creating user:", err);
      alert(`Erro ao criar utilizador: ${err.message}`);
    } finally {
      setIsCreatingUser(false);
    }
  };

  const handleSyncProfile = async (u: any) => {
    try {
      const response = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: u.id,
          email: u.email,
          name: u.name,
          role: u.role,
          specialty: u.specialty,
          action: 'sync-profile'
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Erro ao sincronizar perfil");
      }

      fetchData();
      alert("Perfil sincronizado com sucesso!");
    } catch (err: any) {
      console.error("Error syncing profile:", err);
      alert(`Erro ao sincronizar: ${err.message}`);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!window.confirm("Tem a certeza que deseja remover este utilizador? Esta ação não pode ser desfeita.")) return;
    try {
      const response = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete-user", id: userId })
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Erro ao remover utilizador do servidor");
      }
        
      setUsers(users.filter(u => u.id !== userId));
      alert("Utilizador removido com sucesso.");
    } catch (err: any) {
      console.error("Error deleting user:", err);
      alert(`Erro ao remover o utilizador: ${err.message}`);
    }
    setActiveDropdown(null);
  };

  const handleDeleteConsultation = async (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!window.confirm("Tem a certeza que deseja eliminar esta consulta? Esta ação não pode ser desfeita.")) return;
    try {
      const { error, data } = await supabase
        .from('consultations')
        .delete()
        .eq('id', id)
        .select();
        
      if (error) throw error;
      
      if (!data || data.length === 0) {
        throw new Error("Não tem permissão para eliminar esta consulta ou o registo já não existe.");
      }

      setConsultations(consultations.filter(c => c.id !== id));
      fetchData(); // Refresh stats
      alert("Consulta eliminada com sucesso.");
    } catch (err: any) {
      console.error("Error deleting consultation:", err);
      alert(`Erro ao eliminar a consulta: ${err.message || "Erro de conexão"}`);
    }
  };

  const exportToCSV = () => {
    if (consultations.length === 0) return;
    
    const headers = [
      "ID Consulta", "Data", "Paciente", "Idade", "Sexo", "Telemovel", 
      "Peso", "Altura", "IMC", "TA Sistolica", "TA Diastolica", "Glicemia",
      "Fumador", "Tratamento HT", "Risco CVD %", "Medico", "Campanha"
    ];
    
    const csvRows = consultations.map(c => [
      c.consultation_id,
      new Date(c.created_at).toLocaleDateString(),
      c.patient_name,
      c.patient_age,
      c.patient_sex || 'M',
      c.patient_phone,
      c.weight,
      c.height,
      c.bmi,
      c.systolic,
      c.diastolic,
      c.glucose,
      c.is_smoker ? 'Sim' : 'Não',
      c.is_on_hypertension_treatment ? 'Sim' : 'Não',
      c.cvd_risk_score || 0,
      c.professional_name || '-',
      c.campaigns?.name || '-'
    ].map(val => `"${val}"`).join(","));
    
    const csvContent = [headers.join(","), ...csvRows].join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `consultas_alshifa_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    link.remove();
  };

  const handleUploadCampaignPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert("Por favor, carregue apenas imagens.");
      return;
    }

    if (!selectedCampaignForPhoto) {
      alert("Por favor, selecione uma campanha primeiro.");
      return;
    }

    setIsStylizingPhoto(true);
    try {
      // Use a structured name to store metadata: cphv2|campaignId|title|date|timestamp|filename
      const timestamp = Date.now();
      const safeTitle = photoTitle.replace(/\|/g, '-'); // Avoid separator conflict
      const safeFileName = file.name.replace(/\|/g, '-');
      const dbName = `cphv2|${selectedCampaignForPhoto}|${safeTitle}|${photoDate}|${timestamp}|${safeFileName}`;
      
      const storageFileName = `campaign_photo_${selectedCampaignForPhoto}_${timestamp}_${file.name}`;
      const filePath = `knowledge-base/${storageFileName}`;

      const { error: uploadError } = await supabase.storage
        .from('knowledge-base')
        .upload(filePath, file, {
          contentType: file.type,
          upsert: true
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('knowledge-base')
        .getPublicUrl(filePath);

      // Save to database
      const { error: dbError } = await supabase
        .from('knowledge_base')
        .insert([{
          name: dbName,
          file_path: filePath,
          file_url: publicUrl
        }]);

      if (dbError) {
        await supabase.storage.from('knowledge-base').remove([filePath]);
        throw dbError;
      }

      // Refresh list
      const { data: kbData } = await supabase
        .from('knowledge_base')
        .select('*')
        .order('created_at', { ascending: false });
      if (kbData) {
        setKnowledgeBase(kbData.filter(item => !item.name.includes('campaign_photo_') && !item.name.startsWith('cphv2|')));
        setCampaignPhotos(kbData.filter(item => item.name.includes('campaign_photo_') || item.name.startsWith('cphv2|')));
      }
      
      setPhotoTitle(""); // Clear inputs
      alert("Foto da campanha carregada com sucesso!");
    } catch (err: any) {
      console.error("Error uploading photo:", err);
      alert(`Erro ao processar a foto: ${err.message}`);
    } finally {
      setIsStylizingPhoto(false);
      e.target.value = '';
    }
  };

  const handleUploadKB = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      alert("Por favor, carregue apenas ficheiros PDF.");
      return;
    }

    setIsUploadingKB(true);
    try {
      const fileName = `${Date.now()}_${file.name.replace(/\s+/g, '_')}`;
      const filePath = `knowledge-base/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('knowledge-base')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('knowledge-base')
        .getPublicUrl(filePath);

      const { error: dbError } = await supabase
        .from('knowledge_base')
        .insert([{
          name: file.name,
          file_path: filePath,
          file_url: publicUrl
        }]);

      if (dbError) {
        // Cleanup storage if DB insert fails
        await supabase.storage.from('knowledge-base').remove([filePath]);
        throw dbError;
      }

      // Refresh list
      const { data: kbData } = await supabase
        .from('knowledge_base')
        .select('*')
        .order('created_at', { ascending: false });
      if (kbData) {
        setKnowledgeBase(kbData.filter(item => !item.name.startsWith('campaign_photo_') && !item.name.startsWith('cphv2|')));
        setCampaignPhotos(kbData.filter(item => item.name.startsWith('campaign_photo_') || item.name.startsWith('cphv2|')));
      }
      
      alert("Documento adicionado à base de conhecimento com sucesso!");
    } catch (err: any) {
      console.error("Error uploading KB:", err);
      alert(`Erro ao carregar: ${err.message}`);
    } finally {
      setIsUploadingKB(false);
      // Reset input
      e.target.value = '';
    }
  };

  const handleSaveDonationSettings = async () => {
    setIsSavingSettings(true);
    try {
      const { error } = await supabase
        .from('site_settings')
        .upsert({
          key: 'donation_info',
          value: donationSettings,
          updated_at: new Date().toISOString()
        }, { onConflict: 'key' });

      if (error) throw error;
      alert("Configurações de doação guardadas com sucesso!");
    } catch (err: any) {
      console.error("Error saving settings:", err);
      alert(`Erro ao guardar configurações: ${err.message}`);
    } finally {
      setIsSavingSettings(false);
    }
  };

  const handleDeleteKB = async (id: string, filePath: string) => {
    if (!window.confirm("Tem a certeza que deseja remover este documento da base de conhecimento?")) return;

    try {
      const { error: storageError } = await supabase.storage
        .from('knowledge-base')
        .remove([filePath]);

      if (storageError) throw storageError;

      const { error: dbError } = await supabase
        .from('knowledge_base')
        .delete()
        .eq('id', id);

      if (dbError) throw dbError;

      setKnowledgeBase(knowledgeBase.filter(item => item.id !== id));
      setCampaignPhotos(campaignPhotos.filter(item => item.id !== id));
      alert("Documento removido.");
    } catch (err: any) {
      console.error("Error deleting KB:", err);
      alert(`Erro ao remover: ${err.message}`);
    }
  };

  if (profile?.role !== "Admin") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center space-y-4">
          <ShieldCheck className="w-16 h-16 text-red-500 mx-auto opacity-20" />
          <h1 className="text-2xl font-bold text-slate-900">Acesso Restrito</h1>
          <p className="text-slate-500">Apenas administradores podem aceder a este painel.</p>
          <button onClick={() => navigate("/dashboard")} className="text-sky-600 font-bold hover:underline">Voltar ao Dashboard</button>
        </div>
      </div>
    );
  }

  const filteredUsers = users.filter(u => 
    u.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    u.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredConsultations = consultations.filter(c => 
    c.patient_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.consultation_id?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const bmiChartData = stats ? [
    { name: 'Baixo Peso', value: stats.bmi_distribution.underweight },
    { name: 'Normal', value: stats.bmi_distribution.normal },
    { name: 'Sobrepeso', value: stats.bmi_distribution.overweight },
    { name: 'Obesidade', value: stats.bmi_distribution.obese },
  ].filter(d => d.value > 0) : [];

  const NavItem = ({ icon: Icon, label, id }: { icon: any, label: string, id: any }) => (
    <button 
      onClick={() => { setActiveTab(id); setIsSidebarOpen(false); }}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all ${
        activeTab === id 
          ? 'bg-sky-50 text-sky-700' 
          : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
      }`}
    >
      <Icon className={`w-5 h-5 ${activeTab === id ? 'text-sky-600' : 'text-slate-400'}`} />
      {label}
    </button>
  );

  return (
    <div className="min-h-screen bg-slate-50 flex font-sans">
      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 bg-slate-900/50 z-40 lg:hidden backdrop-blur-sm"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside className={`
        fixed lg:sticky top-0 left-0 h-screen w-72 bg-white border-r border-slate-200 z-50
        transform transition-transform duration-300 ease-in-out flex flex-col
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-sky-600 rounded-lg flex items-center justify-center text-white shadow-md">
              <Activity className="w-5 h-5" />
            </div>
            <span className="font-bold text-slate-900 text-lg tracking-tight">Al-Shifa Admin</span>
          </div>
          <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto py-6 px-4 space-y-1">
          <p className="px-4 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Menu Principal</p>
          <NavItem icon={LayoutDashboard} label="Visão Geral" id="overview" />
          <NavItem icon={Users} label="Profissionais" id="users" />
          <NavItem icon={MapPin} label="Campanhas" id="campaigns" />
          <NavItem icon={FileText} label="Consultas" id="consultations" />
          <NavItem icon={BookOpen} label="Base de Conhecimento" id="knowledge" />
          <NavItem icon={Image} label="Publicidade & Fotos" id="photos" />
          <NavItem icon={Settings} label="Configurações" id="settings" />
          
          <div className="pt-8 pb-2">
            <p className="px-4 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Sistema</p>
            <button onClick={() => navigate("/dashboard")} className="w-full flex items-center gap-3 px-4 py-3 text-slate-600 hover:bg-slate-50 hover:text-slate-900 rounded-xl font-medium transition-all">
              <ChevronLeft className="w-5 h-5 text-slate-400" />
              Sair do Admin
            </button>
          </div>
        </div>

        <div className="p-4 border-t border-slate-100">
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-slate-50 border border-slate-100">
            <div className="w-10 h-10 rounded-full bg-sky-100 text-sky-700 flex items-center justify-center font-bold text-sm">
              {profile?.name?.charAt(0) || 'A'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-900 truncate">{profile?.name}</p>
              <p className="text-xs text-slate-500 truncate">{profile?.email}</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header */}
        <header className="bg-white border-b border-slate-200 h-16 flex items-center justify-between px-4 sm:px-8 sticky top-0 z-30">
          <div className="flex items-center gap-4">
            <button onClick={() => setIsSidebarOpen(true)} className="lg:hidden text-slate-500 hover:text-slate-700">
              <Menu className="w-6 h-6" />
            </button>
            <h1 className="text-xl font-semibold text-slate-800 hidden sm:block">
              {activeTab === "overview" && "Visão Geral"}
              {activeTab === "campaigns" && "Gestão de Campanhas"}
              {activeTab === "users" && "Gestão de Profissionais"}
              {activeTab === "consultations" && "Registo de Consultas"}
            </h1>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="relative hidden md:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
              <input 
                type="text" 
                placeholder="Pesquisar..."
                className="pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:bg-white w-64 transition-all"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <button className="relative p-2 text-slate-400 hover:text-slate-600 transition-colors">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
            </button>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-8">
          <div className="max-w-7xl mx-auto space-y-8">
            
            {errorMsg && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3 text-red-700">
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-bold">Erro ao carregar dados</h3>
                  <p className="text-sm">{errorMsg}</p>
                </div>
              </div>
            )}

            {/* OVERVIEW TAB */}
            {activeTab === "overview" && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
                {/* Stats Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  {[
                    { title: "Total de Consultas", value: stats?.total_screenings || 0, icon: Users, color: "bg-sky-500" },
                    { title: "Casos de Hipertensão", value: `${stats?.hypertension_prevalence.toFixed(1)}%`, icon: Activity, color: "bg-rose-500" },
                    { title: "Risco de Diabetes", value: `${stats?.diabetes_risk_prevalence.toFixed(1)}%`, icon: TrendingUp, color: "bg-amber-500" },
                    { title: "Campanhas Ativas", value: campaigns.filter(c => c.active).length, icon: MapPin, color: "bg-indigo-500" }
                  ].map((stat, i) => (
                    <div key={i} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-white ${stat.color}`}>
                        <stat.icon className="w-6 h-6" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-500">{stat.title}</p>
                        <h3 className="text-2xl font-bold text-slate-900">{stat.value}</h3>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Charts */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                    <h3 className="text-lg font-bold text-slate-800 mb-6">Consultas por Campanha</h3>
                    <div className="h-72">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={stats?.screenings_by_campaign} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                          <XAxis dataKey="campaign_name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dy={10} />
                          <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                          <Tooltip cursor={{ fill: '#f1f5f9' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                          <Bar dataKey="count" fill="#0ea5e9" radius={[4, 4, 0, 0]} maxBarSize={50} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                    <h3 className="text-lg font-bold text-slate-800 mb-6">Distribuição de IMC</h3>
                    <div className="h-72">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={bmiChartData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value" stroke="none">
                            {bmiChartData.map((_, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                          </Pie>
                          <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                          <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '12px', color: '#64748b' }} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>

                {/* Recent Consultations Preview */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="p-6 border-b border-slate-200 flex items-center justify-between">
                    <h3 className="text-lg font-bold text-slate-800">Consultas Recentes</h3>
                    <button onClick={() => setActiveTab("consultations")} className="text-sm font-medium text-sky-600 hover:text-sky-700">Ver todas</button>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-slate-50 text-slate-500">
                        <tr>
                          <th className="px-6 py-3 font-medium">Paciente</th>
                          <th className="px-6 py-3 font-medium">Médico</th>
                          <th className="px-6 py-3 font-medium">Campanha</th>
                          <th className="px-6 py-3 font-medium">Data</th>
                          <th className="px-6 py-3 font-medium">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {consultations.slice(0, 5).map((c) => (
                          <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                            <td className="px-6 py-4">
                              <p className="font-medium text-slate-900">{c.patient_name}</p>
                              <p className="text-xs text-slate-500">{c.patient_age} anos</p>
                            </td>
                            <td className="px-6 py-4 text-slate-600">{c.professional_name || '-'}</td>
                            <td className="px-6 py-4 text-slate-600">{c.campaigns?.name || '-'}</td>
                            <td className="px-6 py-4 text-slate-600">{new Date(c.created_at).toLocaleDateString()}</td>
                            <td className="px-6 py-4">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                c.status === 'completed' ? 'bg-emerald-100 text-emerald-800' :
                                c.status === 'accepted' ? 'bg-sky-100 text-sky-800' :
                                c.status === 'draft' ? 'bg-slate-200 text-slate-800' :
                                'bg-amber-100 text-amber-800'
                              }`}>
                                {c.status === 'completed' ? 'Concluída' : c.status === 'accepted' ? 'Em Andamento' : c.status === 'draft' ? 'Rascunho' : 'Pendente'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </motion.div>
            )}

            {/* USERS TAB */}
            {activeTab === "users" && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <h2 className="text-2xl font-bold text-slate-800">Profissionais de Saúde</h2>
                  <div className="flex gap-3">
                    <div className="flex gap-2">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                        <input 
                          type="text" 
                          placeholder="Pesquisar profissionais..."
                          className="pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 w-full sm:w-64"
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                        />
                      </div>
                      <button 
                        onClick={() => fetchData()}
                        disabled={loading}
                        className="p-2 bg-white border border-slate-200 rounded-lg text-slate-500 hover:bg-slate-50 transition-colors disabled:opacity-50"
                        title="Atualizar lista"
                      >
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                      </button>
                    </div>
                    <button 
                      onClick={() => setShowNewUserModal(true)}
                      className="flex items-center justify-center gap-2 px-4 py-2 bg-sky-600 text-white rounded-lg text-sm font-medium hover:bg-sky-700 transition-colors shadow-sm whitespace-nowrap"
                    >
                      <Plus className="w-4 h-4" /> Novo Utilizador
                    </button>
                  </div>
                </div>

                <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                        <tr>
                          <th className="px-6 py-4 font-medium">Profissional</th>
                          <th className="px-6 py-4 font-medium">Especialidade / Função</th>
                          <th className="px-6 py-4 font-medium">Status</th>
                          <th className="px-6 py-4 font-medium text-right">Ações</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {filteredUsers.map((u) => (
                          <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-sky-100 text-sky-700 flex items-center justify-center font-bold">
                                  {u.name?.charAt(0) || 'U'}
                                </div>
                                <div>
                                  <div className="font-medium text-slate-900 flex items-center gap-1">
                                    {u.name}
                                    {u.is_verified && <VerifiedBadge size="sm" />}
                                    {!u.has_profile && (
                                      <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-md font-bold uppercase tracking-tighter">
                                        Fora do Banco
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-xs text-slate-500">{u.email}</div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="text-slate-900">{u.specialty || 'Geral'}</div>
                              <div className="text-xs text-slate-500">{u.role === 'Admin' ? 'Administrador' : 'Profissional'}</div>
                            </td>
                            <td className="px-6 py-4">
                              <button
                                onClick={() => toggleVerification(u.id, u.is_verified)}
                                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                                  u.is_verified 
                                    ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' 
                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                }`}
                              >
                                {u.is_verified ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
                                {u.is_verified ? 'Verificado' : 'Pendente'}
                              </button>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <div className="relative inline-block text-left">
                                <button
                                  onClick={() => setActiveDropdown(activeDropdown === u.id ? null : u.id)}
                                  className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
                                >
                                  <MoreVertical className="w-5 h-5" />
                                </button>
                                
                                <AnimatePresence>
                                  {activeDropdown === u.id && (
                                    <>
                                      <div className="fixed inset-0 z-10" onClick={() => setActiveDropdown(null)} />
                                      <motion.div
                                        initial={{ opacity: 0, scale: 0.95 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.95 }}
                                        className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-slate-200 py-1 z-20"
                                      >
                                        <button
                                          onClick={() => {
                                            setEditingUser(u);
                                            setEditUserForm({ name: u.name, role: u.role, specialty: u.specialty || '' });
                                            setShowEditUserModal(true);
                                            setActiveDropdown(null);
                                          }}
                                          className="w-full flex items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                                        >
                                          <Edit2 className="w-4 h-4" /> Editar Perfil
                                        </button>
                                        {!u.has_profile && (
                                          <button
                                            onClick={() => handleSyncProfile(u)}
                                            className="w-full flex items-center gap-2 px-4 py-2 text-sm text-sky-600 font-bold hover:bg-sky-50"
                                          >
                                            <RefreshCw className="w-4 h-4" /> Sincronizar Banco
                                          </button>
                                        )}
                                        <button
                                          onClick={() => handleSendPasswordReset(u.email, prompt("Digite o número de WhatsApp do utilizador (opcional, com código do país):"))}
                                          className="w-full flex items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                                        >
                                          <Key className="w-4 h-4" /> Repor Password
                                        </button>
                                        <div className="h-px bg-slate-100 my-1" />
                                        <button
                                          onClick={() => handleDeleteUser(u.id)}
                                          className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                                        >
                                          <Trash2 className="w-4 h-4" /> Remover
                                        </button>
                                      </motion.div>
                                    </>
                                  )}
                                </AnimatePresence>
                              </div>
                            </td>
                          </tr>
                        ))}
                        {filteredUsers.length === 0 && (
                          <tr>
                            <td colSpan={4} className="px-6 py-8 text-center text-slate-500">
                              Nenhum utilizador encontrado.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </motion.div>
            )}

            {/* CAMPAIGNS TAB */}
            {activeTab === "campaigns" && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <h2 className="text-2xl font-bold text-slate-800">Campanhas de Triagem</h2>
                  <button 
                    onClick={() => setShowNewCampaignModal(true)}
                    className="flex items-center justify-center gap-2 px-4 py-2 bg-sky-600 text-white rounded-lg text-sm font-medium hover:bg-sky-700 transition-colors shadow-sm"
                  >
                    <Plus className="w-4 h-4" /> Nova Campanha
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {campaigns.map((c) => (
                    <div key={c.id} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow flex flex-col">
                      <div className="flex justify-between items-start mb-4">
                        <div className={`p-3 rounded-xl ${c.active ? 'bg-sky-100 text-sky-600' : 'bg-slate-100 text-slate-400'}`}>
                          <MapPin className="w-6 h-6" />
                        </div>
                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${c.active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                          {c.active ? 'Ativa' : 'Encerrada'}
                        </span>
                      </div>
                      
                      <h3 className="text-lg font-bold text-slate-900 mb-1">{c.name}</h3>
                      <p className="text-sm text-slate-500 mb-6 flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5" /> {c.location}
                      </p>
                      
                      <div className="mt-auto pt-6 border-t border-slate-100 flex items-center justify-between">
                        <div>
                          <p className="text-xs text-slate-500 mb-0.5">Triagens Realizadas</p>
                          <p className="font-semibold text-slate-900">
                            {stats?.screenings_by_campaign.find(s => s.campaign_name === c.name)?.count || 0}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button 
                            onClick={() => navigate(`/campaign-report/${c.id}`)}
                            className="px-4 py-2 rounded-lg text-sm font-medium bg-cyan-50 text-cyan-700 hover:bg-cyan-100 transition-colors flex items-center gap-1.5"
                          >
                            <FileText className="w-4 h-4" />
                            <span className="hidden sm:inline">Relatório</span>
                          </button>
                          <button 
                            onClick={() => toggleCampaignStatus(c.id, c.active)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                              c.active 
                                ? 'bg-slate-100 text-slate-700 hover:bg-slate-200' 
                                : 'bg-slate-800 text-white hover:bg-slate-900'
                            }`}
                          >
                            {c.active ? 'Encerrar' : 'Reativar'}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* CONSULTATIONS TAB */}
            {activeTab === "consultations" && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <h2 className="text-2xl font-bold text-slate-800">Registo de Consultas</h2>
                  <div className="flex gap-3">
                    <button 
                      onClick={exportToCSV}
                      className="flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors shadow-sm whitespace-nowrap"
                    >
                      <FileText className="w-4 h-4" /> Exportar CSV
                    </button>
                    <div className="relative w-full sm:w-72">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                      <input 
                        type="text" 
                        placeholder="Pesquisar paciente ou ID..."
                        className="pl-9 pr-4 py-2 w-full bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                        <tr>
                          <th className="px-6 py-4 font-medium">ID / Data</th>
                          <th className="px-6 py-4 font-medium">Paciente</th>
                          <th className="px-6 py-4 font-medium">Médico</th>
                          <th className="px-6 py-4 font-medium">Campanha</th>
                          <th className="px-6 py-4 font-medium">Sinais Vitais</th>
                          <th className="px-6 py-4 font-medium">Status</th>
                          <th className="px-6 py-4 font-medium text-right">Ações</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {filteredConsultations.map((c) => (
                          <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                            <td className="px-6 py-4">
                              <div className="font-mono text-xs text-sky-600 font-medium mb-1">{c.consultation_id}</div>
                              <div className="text-xs text-slate-500 flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {new Date(c.created_at).toLocaleDateString()}
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="font-medium text-slate-900">{c.patient_name}</div>
                              <div className="text-xs text-slate-500">{c.patient_age} anos • {c.patient_phone}</div>
                            </td>
                            <td className="px-6 py-4 text-slate-700">{c.professional_name || '-'}</td>
                            <td className="px-6 py-4 text-slate-700">{c.campaigns?.name || '-'}</td>
                            <td className="px-6 py-4">
                              {c.status === 'completed' ? (
                                <div className="flex flex-col gap-1">
                                  <span className={`text-xs px-2 py-0.5 rounded inline-flex w-fit ${c.systolic >= 140 ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-700'}`}>
                                    TA: {c.blood_pressure}
                                  </span>
                                  <span className={`text-xs px-2 py-0.5 rounded inline-flex w-fit ${c.glucose >= 7.0 ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-700'}`}>
                                    Gli: {c.glucose}
                                  </span>
                                </div>
                              ) : (
                                <span className="text-slate-400 text-xs">-</span>
                              )}
                            </td>
                            <td className="px-6 py-4">
                              <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                                c.status === 'completed' ? 'bg-emerald-100 text-emerald-800' :
                                c.status === 'accepted' ? 'bg-sky-100 text-sky-800' :
                                c.status === 'draft' ? 'bg-slate-200 text-slate-800' :
                                'bg-amber-100 text-amber-800'
                              }`}>
                                {c.status === 'completed' ? 'Concluída' : c.status === 'accepted' ? 'Em Andamento' : c.status === 'draft' ? 'Rascunho' : 'Pendente'}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  onClick={() => navigate(`/edit-consultation?id=${c.consultation_id}`)}
                                  className="p-2 text-slate-400 hover:text-sky-600 rounded-lg hover:bg-sky-50 transition-colors"
                                  title="Editar consulta"
                                >
                                  <Edit2 className="w-5 h-5" />
                                </button>
                                <button
                                  onClick={(e) => handleDeleteConsultation(e, c.id)}
                                  className="p-2 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                                  title="Eliminar consulta"
                                >
                                  <Trash2 className="w-5 h-5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                        {filteredConsultations.length === 0 && (
                          <tr>
                            <td colSpan={7} className="px-6 py-8 text-center text-slate-500">
                              Nenhuma consulta encontrada.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </motion.div>
            )}

            {/* KNOWLEDGE BASE TAB */}
            {activeTab === "knowledge" && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-2xl font-bold text-slate-800">Base de Conhecimento IA</h2>
                    <p className="text-slate-500 text-sm">Adicione PDFs com diretrizes para que a IA possa fornecer recomendações melhores.</p>
                  </div>
                  <div className="flex gap-3">
                    <label className="flex items-center justify-center gap-2 px-4 py-2 bg-sky-600 text-white rounded-lg text-sm font-medium hover:bg-sky-700 transition-colors shadow-sm cursor-pointer">
                      {isUploadingKB ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                      {isUploadingKB ? "Carregando..." : "Adicionar PDF"}
                      <input 
                        type="file" 
                        accept=".pdf" 
                        className="hidden" 
                        onChange={handleUploadKB}
                        disabled={isUploadingKB}
                      />
                    </label>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {knowledgeBase.map((item) => (
                    <div key={item.id} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow flex flex-col">
                      <div className="flex justify-between items-start mb-4">
                        <div className="p-3 rounded-xl bg-sky-100 text-sky-600">
                          <FileText className="w-6 h-6" />
                        </div>
                        <button 
                          onClick={() => handleDeleteKB(item.id, item.file_path)}
                          className="p-2 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      <h3 className="text-lg font-bold text-slate-900 mb-1 line-clamp-2">{item.name}</h3>
                      <p className="text-xs text-slate-500 mb-4">Adicionado em {new Date(item.created_at).toLocaleDateString()}</p>
                      <a 
                        href={item.file_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="mt-auto text-sm font-medium text-sky-600 hover:underline flex items-center gap-1"
                      >
                        Visualizar Documento <ChevronLeft className="w-4 h-4 rotate-180" />
                      </a>
                    </div>
                  ))}
                  {knowledgeBase.length === 0 && (
                    <div className="col-span-full py-12 text-center bg-white border border-dashed border-slate-300 rounded-2xl">
                      <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                      <p className="text-slate-500">Nenhum documento na base de conhecimento.</p>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* PHOTOS TAB */}
            {activeTab === "photos" && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-2xl font-bold text-slate-800">Publicidade & Fotos</h2>
                    <p className="text-slate-500 text-sm">Adicione fotos das campanhas e deixe a IA estilizá-las para a página inicial.</p>
                  </div>
                  <div className="flex flex-wrap gap-3 items-center">
                    <input
                      type="text"
                      placeholder="Título da Foto (Ex: Palestra sobre Nutrição)"
                      value={photoTitle}
                      onChange={(e) => setPhotoTitle(e.target.value)}
                      className="px-4 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none w-full sm:w-64"
                    />
                    <input
                      type="date"
                      value={photoDate}
                      onChange={(e) => setPhotoDate(e.target.value)}
                      className="px-4 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none"
                    />
                    <select
                      value={selectedCampaignForPhoto}
                      onChange={(e) => setSelectedCampaignForPhoto(e.target.value)}
                      className="px-4 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none"
                    >
                      <option value="">Selecione a Campanha...</option>
                      {campaigns.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                    <label className={`flex items-center justify-center gap-2 px-4 py-2 text-white rounded-lg text-sm font-medium transition-colors shadow-sm ${!selectedCampaignForPhoto || isStylizingPhoto ? 'bg-slate-400 cursor-not-allowed' : 'bg-sky-600 hover:bg-sky-700 cursor-pointer'}`}>
                      {isStylizingPhoto ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Image className="w-4 h-4" />}
                      {isStylizingPhoto ? "Carregando..." : "Adicionar Foto"}
                      <input 
                        type="file" 
                        accept="image/*" 
                        className="hidden" 
                        onChange={handleUploadCampaignPhoto}
                        disabled={!selectedCampaignForPhoto || isStylizingPhoto}
                      />
                    </label>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {campaignPhotos.map((item) => {
                    let campId = null;
                    let displayTitle = "";
                    let displayDate = item.created_at;

                    if (item.name.startsWith('cphv2|')) {
                      const parts = item.name.split('|');
                      campId = parts[1];
                      displayTitle = parts[2];
                      displayDate = parts[3];
                    } else {
                      // Old format: campaign_photo_{id}_{timestamp}.png
                      const match = item.name.match(/campaign_photo_(.*?)_\d+/);
                      campId = match ? match[1] : null;
                    }

                    const campName = campaigns.find(c => c.id === campId)?.name || 'Campanha Desconhecida';

                    return (
                      <div key={item.id} className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow flex flex-col group">
                        <div className="relative h-48 bg-slate-100 overflow-hidden">
                          <img 
                            src={item.file_url} 
                            alt={displayTitle || campName} 
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110 brightness-[0.9] contrast-[1.1] saturate-[1.2]" 
                            referrerPolicy="no-referrer" 
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-60 group-hover:opacity-40 transition-opacity" />
                          <button 
                            onClick={() => handleDeleteKB(item.id, item.file_path)}
                            className="absolute top-2 right-2 p-2 bg-white/80 backdrop-blur-sm text-slate-600 hover:text-red-600 rounded-lg hover:bg-white transition-colors shadow-sm z-10"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="p-4">
                          <div className="flex justify-between items-start gap-2 mb-1">
                            <h3 className="text-lg font-bold text-slate-900 line-clamp-1">{displayTitle || campName}</h3>
                          </div>
                          <div className="flex flex-col gap-1">
                            <p className="text-xs font-medium text-sky-600">{campName}</p>
                            <p className="text-xs text-slate-500">Data: {new Date(displayDate).toLocaleDateString()}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {campaignPhotos.length === 0 && (
                    <div className="col-span-full py-12 text-center bg-white border border-dashed border-slate-300 rounded-2xl">
                      <Image className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                      <p className="text-slate-500">Nenhuma foto de campanha adicionada.</p>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* SETTINGS TAB */}
            {activeTab === "settings" && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 max-w-4xl">
                <div>
                  <h2 className="text-2xl font-bold text-slate-800">Configurações do Sistema</h2>
                  <p className="text-slate-500 text-sm">Configure os detalhes da página de doações e outras preferências do site.</p>
                </div>

                <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
                  <div className="p-6 border-b border-slate-100 bg-slate-50/50">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center text-red-600">
                        <Heart className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-slate-900">Página de Doações</h3>
                        <p className="text-sm text-slate-500">Configure os contactos para M-Pesa e e-Mola.</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-8 space-y-8">
                    {/* General Info */}
                    <div className="grid grid-cols-1 gap-6">
                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-slate-700">Título da Página</label>
                        <input 
                          type="text"
                          value={donationSettings.donation_title}
                          onChange={(e) => setDonationSettings({...donationSettings, donation_title: e.target.value})}
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none transition-all"
                          placeholder="Ex: Apoie a Nossa Causa"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-slate-700">Descrição/Mensagem</label>
                        <textarea 
                          rows={3}
                          value={donationSettings.donation_description}
                          onChange={(e) => setDonationSettings({...donationSettings, donation_description: e.target.value})}
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none transition-all resize-none"
                          placeholder="Explique como as doações ajudam..."
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      {/* M-Pesa Settings */}
                      <div className="space-y-6 p-6 bg-red-50/30 rounded-2xl border border-red-100">
                        <div className="flex items-center gap-2 text-red-600 mb-2">
                          <Smartphone className="w-5 h-5" />
                          <span className="font-bold uppercase tracking-wider text-sm">M-Pesa</span>
                        </div>
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500 uppercase">Número M-Pesa</label>
                            <input 
                              type="text"
                              value={donationSettings.mpesa_number}
                              onChange={(e) => setDonationSettings({...donationSettings, mpesa_number: e.target.value})}
                              className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-red-500 outline-none"
                              placeholder="84XXXXXXX"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500 uppercase">Nome da Conta</label>
                            <input 
                              type="text"
                              value={donationSettings.mpesa_name}
                              onChange={(e) => setDonationSettings({...donationSettings, mpesa_name: e.target.value})}
                              className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-red-500 outline-none"
                              placeholder="Nome do Titular"
                            />
                          </div>
                        </div>
                      </div>

                      {/* e-Mola Settings */}
                      <div className="space-y-6 p-6 bg-orange-50/30 rounded-2xl border border-orange-100">
                        <div className="flex items-center gap-2 text-orange-600 mb-2">
                          <Smartphone className="w-5 h-5" />
                          <span className="font-bold uppercase tracking-wider text-sm">e-Mola</span>
                        </div>
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500 uppercase">Número e-Mola</label>
                            <input 
                              type="text"
                              value={donationSettings.emola_number}
                              onChange={(e) => setDonationSettings({...donationSettings, emola_number: e.target.value})}
                              className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                              placeholder="86XXXXXXX"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500 uppercase">Nome da Conta</label>
                            <input 
                              type="text"
                              value={donationSettings.emola_name}
                              onChange={(e) => setDonationSettings({...donationSettings, emola_name: e.target.value})}
                              className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                              placeholder="Nome do Titular"
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end pt-4">
                      <button 
                        onClick={handleSaveDonationSettings}
                        disabled={isSavingSettings}
                        className="flex items-center gap-2 px-8 py-3 bg-sky-600 text-white rounded-xl font-bold hover:bg-sky-700 transition-all shadow-lg shadow-sky-200 disabled:opacity-50"
                      >
                        {isSavingSettings ? <RefreshCw className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
                        {isSavingSettings ? "Guardando..." : "Guardar Alterações"}
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

          </div>
        </main>
      </div>

      {/* MODALS */}
      
      {/* New Campaign Modal */}
      <AnimatePresence>
        {showNewCampaignModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowNewCampaignModal(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white w-full max-w-md rounded-2xl shadow-xl relative z-10 overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                <h2 className="text-xl font-bold text-slate-800">Nova Campanha</h2>
                <button onClick={() => setShowNewCampaignModal(false)} className="text-slate-400 hover:text-slate-600">
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <form onSubmit={handleCreateCampaign} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Nome da Campanha</label>
                  <input 
                    required type="text" placeholder="Ex: Triagem Mercado Central"
                    className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none transition-all"
                    value={newCampaign.name} onChange={(e) => setNewCampaign({...newCampaign, name: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Localidade</label>
                  <input 
                    required type="text" placeholder="Ex: Maputo"
                    className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none transition-all"
                    value={newCampaign.location} onChange={(e) => setNewCampaign({...newCampaign, location: e.target.value})}
                  />
                </div>
                
                <div className="flex gap-3 pt-4">
                  <button type="button" onClick={() => setShowNewCampaignModal(false)} className="flex-1 px-4 py-2.5 rounded-lg font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors">
                    Cancelar
                  </button>
                  <button type="submit" disabled={isCreatingCampaign} className="flex-1 px-4 py-2.5 rounded-lg font-medium text-white bg-sky-600 hover:bg-sky-700 transition-colors disabled:opacity-50">
                    {isCreatingCampaign ? "Criando..." : "Criar Campanha"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* New User Modal */}
      <AnimatePresence>
        {showNewUserModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowNewUserModal(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white w-full max-w-md rounded-2xl shadow-xl relative z-10 overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                <h2 className="text-xl font-bold text-slate-800">Novo Utilizador</h2>
                <button onClick={() => setShowNewUserModal(false)} className="text-slate-400 hover:text-slate-600">
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <form onSubmit={handleCreateUser} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Nome Completo</label>
                  <input 
                    required type="text" placeholder="Ex: Dr. João Silva"
                    className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none transition-all"
                    value={newUserForm.name} onChange={(e) => setNewUserForm({...newUserForm, name: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                  <input 
                    required type="email" placeholder="Ex: joao.silva@alshifa.com"
                    className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none transition-all"
                    value={newUserForm.email} onChange={(e) => setNewUserForm({...newUserForm, email: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Senha Inicial</label>
                  <input 
                    required type="password" placeholder="Mínimo 6 caracteres" minLength={6}
                    className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none transition-all"
                    value={newUserForm.password} onChange={(e) => setNewUserForm({...newUserForm, password: e.target.value})}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Função</label>
                    <select 
                      className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none transition-all bg-white"
                      value={newUserForm.role} onChange={(e) => setNewUserForm({...newUserForm, role: e.target.value})}
                    >
                      <option value="MedicalProfessional">Profissional</option>
                      <option value="Admin">Administrador</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Especialidade</label>
                    <input 
                      type="text" placeholder="Ex: Clínica Geral"
                      className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none transition-all"
                      value={newUserForm.specialty} onChange={(e) => setNewUserForm({...newUserForm, specialty: e.target.value})}
                    />
                  </div>
                </div>
                
                <div className="flex gap-3 pt-4">
                  <button type="button" onClick={() => setShowNewUserModal(false)} className="flex-1 px-4 py-2.5 rounded-lg font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors">
                    Cancelar
                  </button>
                  <button type="submit" disabled={isCreatingUser} className="flex-1 px-4 py-2.5 rounded-lg font-medium text-white bg-sky-600 hover:bg-sky-700 transition-colors disabled:opacity-50">
                    {isCreatingUser ? "Criando..." : "Criar Utilizador"}
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
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowEditUserModal(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white w-full max-w-md rounded-2xl shadow-xl relative z-10 overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                <h2 className="text-xl font-bold text-slate-800">Editar Utilizador</h2>
                <button onClick={() => setShowEditUserModal(false)} className="text-slate-400 hover:text-slate-600">
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <form onSubmit={handleEditUser} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Nome Completo</label>
                  <input 
                    required type="text"
                    className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none transition-all"
                    value={editUserForm.name} onChange={(e) => setEditUserForm({...editUserForm, name: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Função</label>
                  <select 
                    required
                    className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none transition-all bg-white"
                    value={editUserForm.role} onChange={(e) => setEditUserForm({...editUserForm, role: e.target.value})}
                  >
                    <option value="MedicalProfessional">Profissional de Saúde</option>
                    <option value="Admin">Administrador</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Especialidade</label>
                  <input 
                    type="text"
                    className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none transition-all"
                    value={editUserForm.specialty} onChange={(e) => setEditUserForm({...editUserForm, specialty: e.target.value})}
                  />
                </div>
                
                <div className="flex gap-3 pt-4">
                  <button type="button" onClick={() => setShowEditUserModal(false)} className="flex-1 px-4 py-2.5 rounded-lg font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors">
                    Cancelar
                  </button>
                  <button type="submit" className="flex-1 px-4 py-2.5 rounded-lg font-medium text-white bg-sky-600 hover:bg-sky-700 transition-colors">
                    Guardar
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
