import * as React from "react";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useAuth } from "../hooks/useAuth";
import { analyzeConsultation } from "../lib/gemini";
import { calculateBMI, generateConsultationId, formatMozPhone } from "../lib/utils";
import { ChevronLeft, Sparkles, Save, Loader2, MapPin } from "lucide-react";
import { Campaign } from "../types";

export default function NewConsultation() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  
  const [formData, setFormData] = useState({
    patientPhone: "",
    weight: "",
    height: "",
    systolic: "",
    diastolic: "",
    glucose: "",
    campaignId: "",
  });

  const [aiAnalysis, setAiAnalysis] = useState("");
  const bmi = calculateBMI(Number(formData.weight), Number(formData.height));

  useEffect(() => {
    const fetchCampaigns = async () => {
      const { data } = await supabase
        .from('campaigns')
        .select('*')
        .eq('active', true);
      if (data) setCampaigns(data);
    };
    fetchCampaigns();
  }, []);

  const handleGenerateAI = async () => {
    if (!formData.weight || !formData.height || !formData.systolic || !formData.diastolic || !formData.glucose) {
      alert("Por favor preencha todos os campos biométricos.");
      return;
    }

    setAnalyzing(true);
    try {
      const analysis = await analyzeConsultation({
        weight: Number(formData.weight),
        height: Number(formData.height),
        bmi,
        systolic: Number(formData.systolic),
        diastolic: Number(formData.diastolic),
        glucose: Number(formData.glucose),
      });
      setAiAnalysis(analysis || "");
    } catch (err) {
      console.error(err);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!formData.campaignId) {
      alert("Por favor selecione uma campanha.");
      return;
    }
    
    setLoading(true);
    const consultationId = generateConsultationId();
    
    try {
      const { error } = await supabase
        .from('consultations')
        .insert([
          {
            consultation_id: consultationId,
            professional_id: user.id,
            campaign_id: formData.campaignId,
            professional_name: profile?.name,
            patient_phone: formatMozPhone(formData.patientPhone),
            weight: Number(formData.weight),
            height: Number(formData.height),
            bmi,
            blood_pressure: `${formData.systolic}/${formData.diastolic}`,
            systolic: Number(formData.systolic),
            diastolic: Number(formData.diastolic),
            glucose: Number(formData.glucose),
            ai_analysis: aiAnalysis,
          }
        ]);
        
      if (error) throw error;
      
      navigate(`/patient?id=${consultationId}`);
    } catch (err) {
      console.error(err);
      alert("Erro ao salvar consulta.");
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
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Telemóvel do Paciente (+258)</label>
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
            <h2 className="font-bold text-slate-900 mb-2">Dados Biométricos</h2>
            
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

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Glicemia (mg/dL)</label>
              <input
                type="number"
                required
                className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-cyan-500 outline-none"
                value={formData.glucose}
                onChange={(e) => setFormData({ ...formData, glucose: e.target.value })}
              />
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-slate-900">Análise IA Gemini</h2>
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
            
            <textarea
              className="w-full h-40 px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-cyan-500 outline-none text-sm text-slate-600"
              placeholder="A análise da IA aparecerá aqui..."
              value={aiAnalysis}
              onChange={(e) => setAiAnalysis(e.target.value)}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-slate-900 text-white font-bold py-4 rounded-2xl shadow-lg flex items-center justify-center gap-2 active:scale-[0.98] transition-all disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
            Finalizar e Salvar Triagem
          </button>
        </form>
      </main>
    </div>
  );
}
