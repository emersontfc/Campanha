import * as React from "react";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useAuth } from "../hooks/useAuth";
import { analyzeConsultation } from "../lib/gemini";
import { calculateBMI, generateConsultationId, formatMozPhone, calculateFraminghamRisk } from "../lib/utils";
import Markdown from 'react-markdown';
import { ChevronLeft, Sparkles, Save, Loader2, MapPin, History, ArrowRight, Activity, AlertCircle, Eye, Edit3 } from "lucide-react";
import { Campaign } from "../types";

export default function NewConsultation() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  
  const [formData, setFormData] = useState({
    patientName: "",
    patientAge: "",
    patientPhone: "",
    weight: "",
    height: "",
    systolic: "",
    diastolic: "",
    glucose: "",
    patientSex: "M" as "M" | "F",
    isSmoker: false,
    isTreated: false,
    hasDiabetes: false,
    physicalExamination: "",
    campaignId: "",
    isBilateral: false,
    systolicLeft: "",
    diastolicLeft: "",
    systolicRight: "",
    diastolicRight: "",
  });

  const [aiAnalysis, setAiAnalysis] = useState("");
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [previousConsultations, setPreviousConsultations] = useState<any[]>([]);
  const [professionals, setProfessionals] = useState<any[]>([]);
  const [assignedDoctor, setAssignedDoctor] = useState<string>("");
  const bmi = calculateBMI(Number(formData.weight), Number(formData.height));
  
  const cvdRisk = calculateFraminghamRisk(
    Number(formData.patientAge),
    formData.patientSex,
    bmi,
    formData.isBilateral 
      ? Math.max(Number(formData.systolicLeft), Number(formData.systolicRight))
      : Number(formData.systolic),
    formData.isTreated,
    formData.isSmoker,
    formData.hasDiabetes
  );

  useEffect(() => {
    const fetchCampaigns = async () => {
      const { data } = await supabase
        .from('campaigns')
        .select('*')
        .eq('active', true);
      if (data) setCampaigns(data);
    };
    const fetchProfessionals = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('id, name')
        .eq('is_verified', true);
      if (data) setProfessionals(data);
    };
    fetchCampaigns();
    fetchProfessionals();
  }, []);

  useEffect(() => {
    const fetchPrevious = async () => {
      if (formData.patientName.length < 3) {
        setPreviousConsultations([]);
        return;
      }
      const { data } = await supabase
        .from('consultations')
        .select('*')
        .ilike('patient_name', `%${formData.patientName}%`)
        .order('created_at', { ascending: false })
        .limit(3);
      
      if (data && data.length > 0) {
        setPreviousConsultations(data);
      } else {
        setPreviousConsultations([]);
      }
    };

    const timeoutId = setTimeout(fetchPrevious, 500);
    return () => clearTimeout(timeoutId);
  }, [formData.patientName]);

  const handleSelectPreviousPatient = (patient: any) => {
    setFormData(prev => ({
      ...prev,
      patientName: patient.patient_name,
      patientAge: String(patient.patient_age),
      patientPhone: patient.patient_phone,
    }));
  };

  const handleGenerateAI = async () => {
    let finalSystolic = Number(formData.systolic);
    let finalDiastolic = Number(formData.diastolic);
    let bpNote = "";

    if (formData.isBilateral) {
      if (!formData.systolicLeft || !formData.diastolicLeft || !formData.systolicRight || !formData.diastolicRight) {
        alert("Por favor preencha todos os campos biométricos (pressão arterial em ambos os braços).");
        return;
      }
      finalSystolic = Math.max(Number(formData.systolicLeft), Number(formData.systolicRight));
      finalDiastolic = Number(formData.systolicRight) >= Number(formData.systolicLeft) 
        ? Number(formData.diastolicRight) 
        : Number(formData.diastolicLeft);
      
      bpNote = `\n\n[AVALIAÇÃO BILATERAL AHA]\nBraço Direito: ${formData.systolicRight}/${formData.diastolicRight} mmHg\nBraço Esquerdo: ${formData.systolicLeft}/${formData.diastolicLeft} mmHg\nDiferença: ${Math.abs(Number(formData.systolicRight) - Number(formData.systolicLeft))} mmHg`;
    } else {
      if (!formData.systolic || !formData.diastolic) {
        alert("Por favor preencha a pressão arterial.");
        return;
      }
    }

    if (!formData.weight || !formData.height || !formData.glucose) {
      alert("Por favor preencha todos os campos biométricos (peso, altura, glicemia).");
      return;
    }

    setAnalyzing(true);
    try {
      const analysis = await analyzeConsultation({
        weight: Number(formData.weight),
        height: Number(formData.height),
        bmi,
        systolic: finalSystolic,
        diastolic: finalDiastolic,
        glucose: Number(formData.glucose),
        patientSex: formData.patientSex,
        isSmoker: formData.isSmoker,
        isTreated: formData.isTreated,
        cvdRisk: cvdRisk,
        physicalExamination: (formData.physicalExamination || "") + bpNote,
      });
      
      if (analysis.startsWith("Erro:")) {
        alert(analysis);
      } else {
        setAiAnalysis(analysis || "");
      }
    } catch (err) {
      console.error("Gemini Error:", err);
      alert("Erro ao comunicar com a IA. Verifique a consola.");
    } finally {
      setAnalyzing(false);
    }
  };

  const handleSaveDraft = async () => {
    if (!user) return;
    if (campaigns.length > 0 && !formData.campaignId) {
      alert("Por favor selecione uma campanha.");
      return;
    }
    if (!formData.patientName || !formData.patientAge) {
      alert("Para salvar um rascunho, preencha pelo menos o nome e a idade do paciente.");
      return;
    }
    
    setLoading(true);
    
    let profName = profile?.name;
    if (!profName && user) {
      const { data: profData } = await supabase.from('profiles').select('name').eq('id', user.id).single();
      if (profData) profName = profData.name;
    }

    const saveDraft = async (attempts = 0): Promise<string> => {
      try {
        const consultationId = generateConsultationId();
        
        let finalSystolic = Number(formData.systolic) || 0;
        let finalDiastolic = Number(formData.diastolic) || 0;
        let bpNote = "";

        if (formData.isBilateral) {
          finalSystolic = Math.max(Number(formData.systolicLeft) || 0, Number(formData.systolicRight) || 0);
          finalDiastolic = Math.max(Number(formData.diastolicLeft) || 0, Number(formData.diastolicRight) || 0);
          if (formData.systolicRight || formData.systolicLeft) {
            bpNote = `\n\n[AVALIAÇÃO BILATERAL AHA]\nBraço Direito: ${formData.systolicRight || 0}/${formData.diastolicRight || 0} mmHg\nBraço Esquerdo: ${formData.systolicLeft || 0}/${formData.diastolicLeft || 0} mmHg`;
          }
        }

        const targetProfessionalId = assignedDoctor || user.id;
        const targetProfessionalName = assignedDoctor 
          ? professionals.find(p => p.id === assignedDoctor)?.name || profName
          : profName;

        const insertData: any = {
          consultation_id: consultationId,
          professional_id: targetProfessionalId,
          professional_name: targetProfessionalName || "Profissional",
          patient_name: formData.patientName,
          patient_age: Number(formData.patientAge),
          patient_phone: formData.patientPhone ? formatMozPhone(formData.patientPhone) : "",
          weight: Number(formData.weight) || 0,
          height: Number(formData.height) || 0,
          bmi: Number(bmi.toFixed(1)) || 0,
          blood_pressure: `${finalSystolic}/${finalDiastolic}`,
          systolic: finalSystolic,
          diastolic: finalDiastolic,
          glucose: Number(formData.glucose) || 0,
          patient_sex: formData.patientSex,
          is_smoker: formData.isSmoker,
          is_on_hypertension_treatment: formData.isTreated,
          cvd_risk_score: cvdRisk || 0,
          physical_examination: (formData.physicalExamination || "") + bpNote,
          ai_analysis: aiAnalysis || "Rascunho",
          status: 'draft',
        };
        
        if (formData.campaignId) {
          insertData.campaign_id = formData.campaignId;
        }

        const { error } = await supabase
          .from('consultations')
          .insert([insertData]);
          
        if (error) {
          if (error.code === '23505' && attempts < 3) {
            return saveDraft(attempts + 1);
          }
          throw error;
        }
        
        return consultationId;
      } catch (err) {
        throw err;
      }
    };

    try {
      await saveDraft();
      navigate('/dashboard');
    } catch (err: any) {
      console.error("Error saving draft:", err);
      alert(`Erro ao salvar rascunho: ${err.message || "Erro desconhecido"}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (campaigns.length > 0 && !formData.campaignId) {
      alert("Por favor selecione uma campanha.");
      return;
    }
    
    setLoading(true);
    
    // Ensure we have the professional name, if not try to fetch it
    let profName = profile?.name;
    if (!profName && user) {
      const { data: profData } = await supabase.from('profiles').select('name').eq('id', user.id).single();
      if (profData) profName = profData.name;
    }

    const saveConsultation = async (attempts = 0): Promise<string> => {
      try {
        const consultationId = generateConsultationId();
        
        // Determine final BP values (highest arm if bilateral)
        let finalSystolic = Number(formData.systolic);
        let finalDiastolic = Number(formData.diastolic);
        let bpNote = "";

        if (formData.isBilateral) {
          finalSystolic = Math.max(Number(formData.systolicLeft), Number(formData.systolicRight));
          finalDiastolic = Number(formData.systolicRight) >= Number(formData.systolicLeft) 
            ? Number(formData.diastolicRight) 
            : Number(formData.diastolicLeft);
          
          bpNote = `\n\n[AVALIAÇÃO BILATERAL AHA]\nBraço Direito: ${formData.systolicRight}/${formData.diastolicRight} mmHg\nBraço Esquerdo: ${formData.systolicLeft}/${formData.diastolicLeft} mmHg\nDiferença: ${Math.abs(Number(formData.systolicRight) - Number(formData.systolicLeft))} mmHg`;
        }

        const insertData: any = {
          consultation_id: consultationId,
          professional_id: user.id,
          professional_name: profName || "Profissional",
          patient_name: formData.patientName,
          patient_age: Number(formData.patientAge),
          patient_phone: formatMozPhone(formData.patientPhone),
          weight: Number(formData.weight),
          height: Number(formData.height),
          bmi: Number(bmi.toFixed(1)),
          blood_pressure: `${finalSystolic}/${finalDiastolic}`,
          systolic: finalSystolic,
          diastolic: finalDiastolic,
          glucose: Number(formData.glucose),
          patient_sex: formData.patientSex,
          is_smoker: formData.isSmoker,
          is_on_hypertension_treatment: formData.isTreated,
          cvd_risk_score: cvdRisk,
          physical_examination: (formData.physicalExamination || "") + bpNote,
          ai_analysis: aiAnalysis,
          status: 'completed',
        };
        
        if (formData.campaignId) {
          insertData.campaign_id = formData.campaignId;
        }

        const { error } = await supabase
          .from('consultations')
          .insert([insertData]);
          
        if (error) {
          // If it's a duplicate key error and we have attempts left, try again with a new ID
          if (error.code === '23505' && attempts < 3) {
            return saveConsultation(attempts + 1);
          }
          throw error;
        }
        
        return consultationId;
      } catch (err: any) {
        // Handle network errors like "Load failed" or "Failed to fetch"
        const isNetworkError = err.message?.includes('Load failed') || 
                               err.message?.includes('Failed to fetch') ||
                               err.name === 'TypeError';
        
        if (isNetworkError && attempts < 3) {
          console.warn(`Network error detected (attempt ${attempts + 1}), retrying...`, err);
          // Wait a bit before retrying
          await new Promise(resolve => setTimeout(resolve, 1000 * (attempts + 1)));
          return saveConsultation(attempts + 1);
        }
        throw err;
      }
    };

    try {
      const finalId = await saveConsultation();
      navigate(`/patient?id=${finalId}`);
    } catch (err: any) {
      console.error("Save Error:", err);
      alert(`Erro ao salvar consulta: ${err.message || "Erro desconhecido"}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-10">
      <header className="bg-white border-b border-slate-200 px-4 py-4 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-slate-500">
            <ChevronLeft className="w-6 h-6" />
          </button>
          <h1 className="font-bold text-slate-900">Nova Triagem</h1>
        </div>
      </header>

      <main className="max-w-2xl mx-auto p-4">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
            <h2 className="font-bold text-slate-900 mb-2 flex items-center gap-2">
              <MapPin className="w-5 h-5 text-cyan-600" />
              Campanha & Paciente
            </h2>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Campanha Ativa</label>
              {campaigns.length === 0 ? (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-700 text-sm font-medium">
                  Nenhuma campanha ativa encontrada. Por favor, contacte o administrador para criar uma campanha antes de registar consultas.
                </div>
              ) : (
                <select
                  required
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-cyan-500 outline-none bg-white"
                  value={formData.campaignId}
                  onChange={(e) => setFormData({ ...formData, campaignId: e.target.value })}
                >
                  <option value="">Selecionar Campanha...</option>
                  {campaigns.map(c => (
                    <option key={c.id} value={c.id}>{c.name} ({c.location})</option>
                  ))}
                </select>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Nome do Paciente</label>
              <input
                type="text"
                placeholder="Nome Completo"
                required
                className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-cyan-500 outline-none"
                value={formData.patientName}
                onChange={(e) => setFormData({ ...formData, patientName: e.target.value })}
              />
            </div>

            {previousConsultations.length > 0 && (
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <h3 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
                  <History className="w-4 h-4 text-slate-400" />
                  Histórico Encontrado (Clique para preencher)
                </h3>
                <div className="space-y-2">
                  {previousConsultations.map((prev) => (
                    <div 
                      key={prev.id}
                      onClick={() => handleSelectPreviousPatient(prev)}
                      className="bg-white p-3 rounded-lg border border-slate-200 cursor-pointer hover:border-cyan-300 hover:shadow-sm transition-all text-sm"
                    >
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-bold text-slate-900">{prev.patient_name}</span>
                        <span className="text-xs text-slate-500">{new Date(prev.created_at).toLocaleDateString()}</span>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-slate-600">
                        <span>Idade: {prev.patient_age}</span>
                        <span>Tel: {prev.patient_phone}</span>
                      </div>
                      <div className="mt-2 pt-2 border-t border-slate-100 flex items-center gap-3 text-xs">
                        <span className={`${prev.systolic >= 140 || prev.diastolic >= 90 ? 'text-rose-600 font-medium' : 'text-slate-600'}`}>
                          TA: {prev.blood_pressure}
                        </span>
                        <span className={`${prev.glucose >= 7.0 ? 'text-rose-600 font-medium' : 'text-slate-600'}`}>
                          Glicemia: {prev.glucose}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Idade</label>
                <input
                  type="number"
                  placeholder="Ex: 45"
                  required
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-cyan-500 outline-none"
                  value={formData.patientAge}
                  onChange={(e) => setFormData({ ...formData, patientAge: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Sexo</label>
                <select
                  required
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-cyan-500 outline-none bg-white"
                  value={formData.patientSex}
                  onChange={(e) => setFormData({ ...formData, patientSex: e.target.value as "M" | "F" })}
                >
                  <option value="M">Masculino</option>
                  <option value="F">Feminino</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Telemóvel (+258)</label>
              <input
                type="tel"
                placeholder="840000000"
                required
                className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-cyan-500 outline-none"
                value={formData.patientPhone}
                onChange={(e) => setFormData({ ...formData, patientPhone: e.target.value })}
              />
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
            <h2 className="font-bold text-slate-900 mb-2">Fatores de Risco & Histórico</h2>
            
            <div className="grid grid-cols-1 gap-3">
              <label className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 hover:bg-slate-50 cursor-pointer transition-colors">
                <input
                  type="checkbox"
                  className="w-5 h-5 rounded border-slate-300 text-cyan-600 focus:ring-cyan-500"
                  checked={formData.isSmoker}
                  onChange={(e) => setFormData({ ...formData, isSmoker: e.target.checked })}
                />
                <div className="flex-1">
                  <span className="block text-sm font-bold text-slate-900">Fumador Ativo</span>
                  <span className="block text-xs text-slate-500">Consumo de tabaco no último ano</span>
                </div>
              </label>

              <label className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 hover:bg-slate-50 cursor-pointer transition-colors">
                <input
                  type="checkbox"
                  className="w-5 h-5 rounded border-slate-300 text-cyan-600 focus:ring-cyan-500"
                  checked={formData.isTreated}
                  onChange={(e) => setFormData({ ...formData, isTreated: e.target.checked })}
                />
                <div className="flex-1">
                  <span className="block text-sm font-bold text-slate-900">Tratamento para Hipertensão</span>
                  <span className="block text-xs text-slate-500">Toma medicação para a tensão arterial</span>
                </div>
              </label>

              <label className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 hover:bg-slate-50 cursor-pointer transition-colors">
                <input
                  type="checkbox"
                  className="w-5 h-5 rounded border-slate-300 text-cyan-600 focus:ring-cyan-500"
                  checked={formData.hasDiabetes}
                  onChange={(e) => setFormData({ ...formData, hasDiabetes: e.target.checked })}
                />
                <div className="flex-1">
                  <span className="block text-sm font-bold text-slate-900">Diabetes Mellitus</span>
                  <span className="block text-xs text-slate-500">Diagnóstico prévio de diabetes</span>
                </div>
              </label>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
            <div className="flex items-center justify-between mb-2">
              <h2 className="font-bold text-slate-900">Dados Biométricos</h2>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, isBilateral: !prev.isBilateral }))}
                  className={`text-[10px] font-bold px-3 py-1 rounded-full transition-all ${
                    formData.isBilateral 
                      ? 'bg-cyan-600 text-white shadow-sm' 
                      : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                  }`}
                >
                  Avaliação Bilateral (AHA)
                </button>
                <div className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 ${
                  cvdRisk < 10 ? 'bg-emerald-50 text-emerald-700' :
                  cvdRisk < 20 ? 'bg-amber-50 text-amber-700' :
                  'bg-rose-50 text-rose-700'
                }`}>
                  <Activity className="w-3 h-3" />
                  Risco CVD: {cvdRisk}%
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Peso (kg)</label>
                <input
                  type="number"
                  step="0.1"
                  required
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-cyan-500 outline-none"
                  value={formData.weight}
                  onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Altura (cm)</label>
                <input
                  type="number"
                  required
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-cyan-500 outline-none"
                  value={formData.height}
                  onChange={(e) => setFormData({ ...formData, height: e.target.value })}
                />
              </div>
            </div>

            <div className="p-4 bg-cyan-50 rounded-xl flex justify-between items-center">
              <span className="text-sm font-medium text-cyan-800">IMC Calculado</span>
              <span className="text-xl font-bold text-cyan-600">{bmi.toFixed(1)}</span>
            </div>

            {!formData.isBilateral ? (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Sistólica (mmHg)</label>
                  <input
                    type="number"
                    placeholder="120"
                    required
                    className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-cyan-500 outline-none"
                    value={formData.systolic}
                    onChange={(e) => setFormData({ ...formData, systolic: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Diastólica (mmHg)</label>
                  <input
                    type="number"
                    placeholder="80"
                    required
                    className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-cyan-500 outline-none"
                    value={formData.diastolic}
                    onChange={(e) => setFormData({ ...formData, diastolic: e.target.value })}
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Braço Direito</p>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        placeholder="Sist"
                        required
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-cyan-500 outline-none text-sm"
                        value={formData.systolicRight}
                        onChange={(e) => setFormData({ ...formData, systolicRight: e.target.value })}
                      />
                      <input
                        type="number"
                        placeholder="Diast"
                        required
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-cyan-500 outline-none text-sm"
                        value={formData.diastolicRight}
                        onChange={(e) => setFormData({ ...formData, diastolicRight: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Braço Esquerdo</p>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        placeholder="Sist"
                        required
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-cyan-500 outline-none text-sm"
                        value={formData.systolicLeft}
                        onChange={(e) => setFormData({ ...formData, systolicLeft: e.target.value })}
                      />
                      <input
                        type="number"
                        placeholder="Diast"
                        required
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-cyan-500 outline-none text-sm"
                        value={formData.diastolicLeft}
                        onChange={(e) => setFormData({ ...formData, diastolicLeft: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
                
                {formData.systolicRight && formData.systolicLeft && Math.abs(Number(formData.systolicRight) - Number(formData.systolicLeft)) > 10 && (
                  <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl flex items-start gap-2 text-rose-700">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <p className="text-[10px] font-bold leading-tight">
                      ALERTA CLÍNICO: Diferença interbraquial significativa ({Math.abs(Number(formData.systolicRight) - Number(formData.systolicLeft))} mmHg). 
                      Considere risco cardiovascular aumentado ou estenose arterial.
                    </p>
                  </div>
                )}
                
                <p className="text-[9px] text-slate-400 italic text-center">
                  * O sistema utilizará automaticamente os valores mais elevados para o cálculo de risco.
                </p>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Glicemia (mmol/L)</label>
              <input
                type="number"
                step="0.1"
                required
                placeholder="Ex: 5.5"
                className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-cyan-500 outline-none"
                value={formData.glucose}
                onChange={(e) => setFormData({ ...formData, glucose: e.target.value })}
              />
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
            <h2 className="font-bold text-slate-900 mb-2">Exame Físico</h2>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Ausculta Pulmonar, Cardíaca, Membros Inferiores, etc.</label>
              <textarea
                className="w-full h-32 px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-cyan-500 outline-none text-sm text-slate-600"
                placeholder="Descreva os achados do exame físico..."
                value={formData.physicalExamination}
                onChange={(e) => setFormData({ ...formData, physicalExamination: e.target.value })}
              />
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-slate-900">Análise IA Gemini</h2>
                {aiAnalysis && (
                  <button
                    type="button"
                    onClick={() => setIsPreviewMode(!isPreviewMode)}
                    className="p-1.5 text-slate-400 hover:text-cyan-600 transition-colors"
                    title={isPreviewMode ? "Editar" : "Visualizar"}
                  >
                    {isPreviewMode ? <Edit3 className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                )}
              </div>
              <button
                type="button"
                onClick={handleGenerateAI}
                disabled={analyzing}
                className="flex items-center gap-2 text-cyan-600 font-bold text-sm bg-cyan-50 px-4 py-2 rounded-full hover:bg-cyan-100 transition-colors disabled:opacity-50"
              >
                {analyzing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                Gerar Relatório IA
              </button>
            </div>
            
            {isPreviewMode && aiAnalysis ? (
              <div className="prose prose-sm max-w-none p-4 bg-slate-50 rounded-xl border border-slate-200 min-h-[160px]">
                <Markdown>{aiAnalysis}</Markdown>
              </div>
            ) : (
              <textarea
                className="w-full h-40 px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-cyan-500 outline-none text-sm text-slate-600"
                placeholder="A análise da IA aparecerá aqui..."
                value={aiAnalysis}
                onChange={(e) => setAiAnalysis(e.target.value)}
              />
            )}
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
            <h2 className="font-bold text-slate-900 mb-2">Atribuição (Opcional)</h2>
            <p className="text-sm text-slate-500 mb-4">
              Pode atribuir este rascunho a outro médico para que ele finalize a consulta.
            </p>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Médico Responsável</label>
              <select
                className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-cyan-500 outline-none bg-white"
                value={assignedDoctor}
                onChange={(e) => setAssignedDoctor(e.target.value)}
              >
                <option value="">Atribuir a mim mesmo</option>
                {professionals.filter(p => p.id !== user?.id).map(p => (
                  <option key={p.id} value={p.id}>Dr(a). {p.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              type="button"
              onClick={handleSaveDraft}
              disabled={loading}
              className="w-full bg-slate-100 text-slate-700 font-bold py-4 rounded-2xl shadow-sm flex items-center justify-center gap-2 hover:bg-slate-200 active:scale-[0.98] transition-all disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
              Guardar como Rascunho
            </button>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-slate-900 text-white font-bold py-4 rounded-2xl shadow-lg flex items-center justify-center gap-2 active:scale-[0.98] transition-all disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
              Finalizar e Salvar Triagem
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
