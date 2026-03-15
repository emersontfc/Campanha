import * as React from "react";
import { useState, useEffect } from "react";
import { useSearchParams, Link, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { Activity, Phone, User, Printer, Share2, Heart, Sparkles, ShieldCheck, Send, Loader2, MapPin, History } from "lucide-react";
import { VerifiedBadge } from "../components/VerifiedBadge";
import { generateConsultationId, formatMozPhone } from "../lib/utils";
import Markdown from 'react-markdown';

export default function PatientPortal() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const id = searchParams.get("id");
  const [consultation, setConsultation] = useState<any>(null);
  const [previousConsultations, setPreviousConsultations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [requesting, setRequesting] = useState(false);
  
  const [formData, setFormData] = useState({
    name: "",
    age: "",
    phone: "",
    reason: ""
  });

  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      try {
        const { data: consultationData, error: consultationError } = await supabase
          .from('consultations')
          .select('*')
          .eq('consultation_id', id)
          .single();
          
        if (consultationError) throw consultationError;
        
        if (consultationData && consultationData.professional_id) {
          const { data: profileData } = await supabase
            .from('profiles')
            .select('is_verified')
            .eq('id', consultationData.professional_id)
            .single();
            
          if (profileData) {
            consultationData.profiles = profileData;
          }
        }
        
        setConsultation(consultationData);

        if (consultationData && (consultationData.patient_name || consultationData.patient_phone)) {
          let query = supabase
            .from('consultations')
            .select('*')
            .eq('status', 'completed')
            .neq('consultation_id', id);

          if (consultationData.patient_name && consultationData.patient_phone) {
            query = query.or(`patient_name.eq."${consultationData.patient_name}",patient_phone.eq."${consultationData.patient_phone}"`);
          } else if (consultationData.patient_name) {
            query = query.eq('patient_name', consultationData.patient_name);
          } else {
            query = query.eq('patient_phone', consultationData.patient_phone);
          }

          const { data: historyData } = await query
            .order('created_at', { ascending: false })
            .limit(10);
          
          if (historyData) {
            setPreviousConsultations(historyData);
          }
        }
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    
    const interval = setInterval(() => {
      fetchData();
    }, 5000);
    
    return () => clearInterval(interval);
  }, [id]);

  const handleShare = () => {
    if (!id) return;
    
    const reportUrl = `${window.location.origin}/patient?id=${id}`;
    const text = `*Relatório de Saúde Al-Shifa*\n\nOlá! Aqui está o seu relatório de saúde (ID: ${id}).\n\nVeja os detalhes completos aqui:\n${reportUrl}`;
    
    const phone = consultation?.patient_phone?.replace(/\D/g, "") || "";
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
    window.open(url, "_blank");
  };

  const handleRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setRequesting(true);
    
    try {
      const consultationId = generateConsultationId();
      
      // 1. Get a valid professional_id and campaign_id to satisfy DB constraints
      // We need a professional_id because the DB has a NOT NULL constraint on it
      const { data: professionals } = await supabase
        .from('profiles')
        .select('id')
        .limit(1);

      const { data: campaigns } = await supabase
        .from('campaigns')
        .select('id')
        .order('active', { ascending: false })
        .limit(1);

      if (!professionals || professionals.length === 0) {
        throw new Error("Não existem profissionais registados no sistema.");
      }
      
      if (!campaigns || campaigns.length === 0) {
        throw new Error("Não existem campanhas configuradas.");
      }

      const insertData: any = {
        consultation_id: consultationId,
        patient_name: formData.name,
        patient_age: Number(formData.age),
        patient_phone: formatMozPhone(formData.phone),
        weight: 0,
        height: 0,
        bmi: 0,
        blood_pressure: "0/0",
        systolic: 0,
        diastolic: 0,
        glucose: 0,
        patient_sex: 'M',
        is_smoker: false,
        is_on_hypertension_treatment: false,
        cvd_risk_score: 0,
        ai_analysis: `SOLICITAÇÃO DE CONSULTA\n\nMotivo: ${formData.reason}`,
        status: 'pending',
        professional_id: professionals[0].id, // Temporary anchor to satisfy NOT NULL
        campaign_id: campaigns[0].id
      };

      const { error: consError } = await supabase
        .from('consultations')
        .insert([insertData]);
        
      if (consError) throw consError;
      
      await new Promise(resolve => setTimeout(resolve, 800));
      navigate(`/patient?id=${consultationId}`);
    } catch (err: any) {
      console.error("Detailed Request Error:", err);
      alert(`Erro ao solicitar consulta: ${err.message || "Erro de integridade de dados"}`);
    } finally {
      setRequesting(false);
    }
  };

  const getGlucoseStyles = (glucose: number) => {
    if (glucose > 7.0) return "border-rose-200 bg-rose-50 text-rose-700";
    if (glucose < 4.0) return "border-amber-200 bg-amber-50 text-amber-700";
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  };

  const getBPStyles = (systolic: number, diastolic: number) => {
    if (systolic >= 140 || diastolic >= 90) return "border-rose-200 bg-rose-50 text-rose-700";
    if (systolic < 90 || diastolic < 60) return "border-amber-200 bg-amber-50 text-amber-700";
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="w-8 h-8 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!consultation && !id) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <header className="bg-white border-b border-slate-200 px-4 py-6">
          <div className="max-w-2xl mx-auto flex items-center gap-3">
            <div className="w-10 h-10 bg-cyan-600 rounded-xl flex items-center justify-center text-white">
              <Activity className="w-6 h-6" />
            </div>
            <h1 className="font-bold text-slate-900">Al-Shifa Health</h1>
          </div>
        </header>

        <main className="max-w-md mx-auto w-full p-4 py-10 space-y-8">
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-black text-slate-900">Solicitar Consulta</h2>
            <p className="text-slate-500">Preencha os seus dados para ser encaminhado a um médico disponível.</p>
          </div>

          <form onSubmit={handleRequest} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 ml-1">Nome Completo</label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  required
                  placeholder="Seu nome"
                  className="w-full pl-11 pr-4 py-3 rounded-2xl border border-slate-100 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-cyan-500 outline-none transition-all text-sm"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 ml-1">Idade</label>
                <input
                  type="number"
                  required
                  placeholder="Ex: 25"
                  className="w-full px-4 py-3 rounded-2xl border border-slate-100 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-cyan-500 outline-none transition-all text-sm"
                  value={formData.age}
                  onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 ml-1">Telemóvel</label>
                <div className="relative">
                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="tel"
                    required
                    placeholder="840000000"
                    className="w-full pl-11 pr-4 py-3 rounded-2xl border border-slate-100 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-cyan-500 outline-none transition-all text-sm"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 ml-1">Motivo da Consulta</label>
              <textarea
                required
                placeholder="Descreva brevemente o que sente..."
                className="w-full px-4 py-3 rounded-2xl border border-slate-100 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-cyan-500 outline-none transition-all text-sm h-24 resize-none"
                value={formData.reason}
                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
              />
            </div>

            <button
              type="submit"
              disabled={requesting}
              className="w-full bg-slate-900 text-white font-bold py-4 rounded-2xl shadow-lg flex items-center justify-center gap-2 active:scale-[0.98] transition-all disabled:opacity-50"
            >
              {requesting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
              Enviar Solicitação
            </button>
          </form>

          <div className="flex items-center justify-center gap-2 text-emerald-600 bg-emerald-50 py-3 rounded-2xl">
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
            <span className="text-xs font-bold uppercase tracking-wider">Médicos Online Agora</span>
          </div>
        </main>
      </div>
    );
  }

  if (!consultation) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 text-center">
        <Activity className="w-16 h-16 text-slate-200 mb-4" />
        <h1 className="text-xl font-bold text-slate-900">Relatório não encontrado</h1>
        <p className="text-slate-500 mb-6">O ID fornecido é inválido ou a consulta foi removida.</p>
        <Link to="/" className="text-cyan-600 font-bold">Voltar ao Início</Link>
      </div>
    );
  }

  if (consultation.status === 'pending') {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 text-center">
        <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mb-6">
          <Loader2 className="w-8 h-8 text-amber-600 animate-spin" />
        </div>
        <h1 className="text-2xl font-black text-slate-900 mb-2">Aguarde, procurando um médico...</h1>
        <p className="text-slate-500 max-w-sm">
          A sua solicitação foi enviada. Por favor, aguarde enquanto um médico disponível aceita o seu pedido.
        </p>
      </div>
    );
  }

  if (consultation.status === 'accepted' || consultation.status === 'draft') {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 text-center">
        <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mb-6">
          <ShieldCheck className="w-10 h-10 text-emerald-600" />
        </div>
        <h1 className="text-2xl font-black text-slate-900 mb-2">Pedido Aceite!</h1>
        <p className="text-slate-500 mb-8 max-w-sm">
          O médico <strong>{consultation.professional_name}</strong> aceitou o seu pedido e aguarda por si.
        </p>
        
        <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm w-full max-w-sm mb-6">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Dirija-se ao Gabinete</p>
          <p className="text-6xl font-black text-cyan-600">{consultation.room_number}</p>
        </div>

        <div className="flex items-center gap-3 text-amber-600 bg-amber-50 px-6 py-4 rounded-2xl border border-amber-100 animate-pulse">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-sm font-bold uppercase tracking-tight">Aguardando o Prontuário...</span>
        </div>
        <p className="text-[10px] text-slate-400 mt-4 max-w-[200px] mb-6">
          O seu relatório de saúde aparecerá aqui automaticamente assim que o médico concluir o atendimento.
        </p>

        <button 
          onClick={() => {
            navigator.clipboard.writeText(window.location.href);
            alert("Link do prontuário copiado! Guarde este link para aceder ao seu relatório mais tarde.");
          }}
          className="flex items-center gap-2 px-6 py-3 bg-white border border-slate-200 text-slate-600 rounded-2xl font-bold text-xs hover:bg-slate-50 transition-all active:scale-[0.98] shadow-sm"
        >
          <Share2 className="w-4 h-4" />
          GUARDAR LINK DO PRONTUÁRIO
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-20 print:bg-white print:pb-0">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-4 py-6 print:hidden">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-cyan-600 rounded-xl flex items-center justify-center text-white">
              <Activity className="w-6 h-6" />
            </div>
            <h1 className="font-bold text-slate-900">Al-Shifa Health</h1>
          </div>
          <div className="flex gap-2">
            <button onClick={handleShare} className="p-2 bg-slate-100 rounded-lg text-slate-600">
              <Share2 className="w-5 h-5" />
            </button>
            <button onClick={() => window.print()} className="p-2 bg-slate-100 rounded-lg text-slate-600">
              <Printer className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto p-4 space-y-6 print:p-0 print:space-y-8">
        <div className="flex flex-col sm:flex-row gap-3 print:hidden">
          <button 
            onClick={() => {
              navigator.clipboard.writeText(window.location.href);
              alert("Link do prontuário copiado!");
            }}
            className="flex-1 flex items-center justify-center gap-2 px-6 py-4 bg-cyan-600 text-white rounded-2xl font-black text-sm hover:bg-cyan-700 transition-all shadow-lg shadow-cyan-200 active:scale-[0.98]"
          >
            <Share2 className="w-5 h-5" />
            COPIAR LINK DO PRONTUÁRIO
          </button>
          <button 
            onClick={() => window.print()}
            className="px-6 py-4 bg-white border border-slate-200 text-slate-600 rounded-2xl font-bold text-sm hover:bg-slate-50 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
          >
            <Printer className="w-5 h-5" />
            IMPRIMIR
          </button>
        </div>

        {/* ID Card */}
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm print:shadow-none print:border-slate-300">
          <div className="flex justify-between items-start mb-6">
            <div>
              <p className="text-[10px] font-bold text-cyan-600 uppercase tracking-widest mb-1">ID da Consulta</p>
              <h2 className="text-3xl font-black text-slate-900">{consultation.consultation_id}</h2>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Data e Hora</p>
              <p className="font-bold text-slate-700">
                {new Date(consultation.created_at).toLocaleDateString()} {new Date(consultation.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-6 border-t border-slate-50">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-slate-50 rounded-full flex items-center justify-center text-slate-400">
                <User className="w-4 h-4" />
              </div>
              <div>
                <p className="text-[10px] text-slate-400 uppercase font-bold">Paciente</p>
                <p className="text-sm font-bold text-slate-700">
                  {consultation.patient_name} ({consultation.patient_age} anos)
                </p>
                <p className="text-[10px] text-slate-500">{consultation.patient_phone}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-slate-50 rounded-full flex items-center justify-center text-slate-400">
                <Heart className="w-4 h-4" />
              </div>
              <div>
                <p className="text-[10px] text-slate-400 uppercase font-bold">Profissional</p>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-bold text-slate-700">{consultation.professional_name}</p>
                  {consultation.profiles?.is_verified && <VerifiedBadge size="sm" />}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Biometrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-100 text-center">
            <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Peso</p>
            <p className="text-xl font-black text-slate-900">{consultation.weight}<span className="text-xs font-normal ml-1">kg</span></p>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-slate-100 text-center">
            <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Altura</p>
            <p className="text-xl font-black text-slate-900">{consultation.height}<span className="text-xs font-normal ml-1">cm</span></p>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-cyan-100 bg-cyan-50/30 text-center">
            <p className="text-[10px] font-bold text-cyan-600 uppercase mb-1">IMC</p>
            <p className="text-xl font-black text-cyan-700">{consultation.bmi.toFixed(1)}</p>
          </div>
          <div className={`p-4 rounded-2xl border text-center ${getGlucoseStyles(consultation.glucose)}`}>
            <p className="text-[10px] font-bold uppercase mb-1 opacity-70">Glicemia</p>
            <p className="text-xl font-black">{consultation.glucose}<span className="text-xs font-normal ml-1">mmol/L</span></p>
          </div>
        </div>

        <div className={`p-4 rounded-2xl border text-center ${getBPStyles(consultation.systolic, consultation.diastolic)}`}>
            <p className="text-[10px] font-bold uppercase mb-1 opacity-70">Tensão Arterial</p>
            <p className="text-2xl font-black">{consultation.blood_pressure}<span className="text-xs font-normal ml-1">mmHg</span></p>
        </div>

        {previousConsultations.length > 0 && (
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm relative overflow-hidden">
            <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
              <History className="w-5 h-5 text-cyan-600" />
              Evolução do Paciente
            </h3>
            <div className="space-y-3">
              {previousConsultations.map((prev) => (
                <div key={prev.id} className="p-4 rounded-xl border border-slate-100 bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-bold text-slate-900">{new Date(prev.created_at).toLocaleDateString()}</p>
                    <p className="text-xs text-slate-500">Consulta anterior</p>
                  </div>
                  <div className="flex gap-4">
                    <div className="text-center">
                      <p className="text-[10px] uppercase font-bold text-slate-400">Glicemia</p>
                      <p className={`font-bold ${getGlucoseStyles(prev.glucose).split(' ').pop()}`}>{prev.glucose}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-[10px] uppercase font-bold text-slate-400">Tensão</p>
                      <p className={`font-bold ${getBPStyles(prev.systolic, prev.diastolic).split(' ').pop()}`}>{prev.blood_pressure}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-[10px] uppercase font-bold text-slate-400">Peso</p>
                      <p className="font-bold text-slate-700">{prev.weight}kg</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {consultation.physical_examination && (
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm relative overflow-hidden">
            <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
              <Activity className="w-5 h-5 text-cyan-600" />
              Exame Físico
            </h3>
            <div className="prose prose-slate text-slate-600 leading-relaxed whitespace-pre-wrap">
              {consultation.physical_examination}
            </div>
          </div>
        )}

        {/* AI Analysis */}
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <Heart className="w-20 h-20 text-cyan-600" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-cyan-600" />
            Análise e Recomendações
          </h3>
          <div className="prose prose-slate text-slate-600 leading-relaxed mb-8">
            <Markdown>{consultation.ai_analysis}</Markdown>
          </div>

          <button
            onClick={handleShare}
            className="w-full bg-emerald-600 text-white font-bold py-4 rounded-2xl shadow-lg flex items-center justify-center gap-2 active:scale-[0.98] transition-all"
          >
            <Send className="w-5 h-5" />
            Enviar Relatório via WhatsApp
          </button>
        </div>

        {/* Footer */}
        <footer className="text-center py-10 space-y-4 print:pt-20">
          <p className="text-xs text-slate-400">
            Este relatório foi gerado pela Al-Shifa Health Initiative 2026.<br />
            Consulte sempre um médico para diagnóstico e tratamento.
          </p>
          <div className="flex justify-center gap-4 grayscale opacity-30">
            <Activity className="w-6 h-6" />
            <Heart className="w-6 h-6" />
          </div>
        </footer>
      </main>
    </div>
  );
}
