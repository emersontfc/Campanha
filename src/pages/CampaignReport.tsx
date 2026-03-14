import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { 
  ArrowLeft, Download, Activity, Users, Heart, AlertCircle, 
  MapPin, Calendar, FileText, Loader2
} from "lucide-react";
import { Campaign, Consultation } from "../types";

export default function CampaignReport() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCampaignData = async () => {
      if (!id) return;
      setLoading(true);
      try {
        // Fetch campaign details
        const { data: campaignData, error: campaignError } = await supabase
          .from('campaigns')
          .select('*')
          .eq('id', id)
          .single();
        
        if (campaignError) throw campaignError;
        setCampaign(campaignData);

        // Fetch all completed consultations for this campaign
        const { data: consultationsData, error: consultationsError } = await supabase
          .from('consultations')
          .select('*')
          .eq('campaign_id', id)
          .eq('status', 'completed');

        if (consultationsError) throw consultationsError;
        setConsultations(consultationsData || []);
      } catch (err) {
        console.error("Error fetching campaign data:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchCampaignData();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 animate-spin text-cyan-600" />
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-slate-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-700">Campanha não encontrada</h2>
          <button 
            onClick={() => navigate('/admin')}
            className="mt-4 text-cyan-600 hover:underline"
          >
            Voltar ao Dashboard
          </button>
        </div>
      </div>
    );
  }

  // Calculate Statistics
  const total = consultations.length;
  const males = consultations.filter(c => c.patient_sex === 'M').length;
  const females = consultations.filter(c => c.patient_sex === 'F').length;
  
  const avgAge = total > 0 ? Math.round(consultations.reduce((sum, c) => sum + c.patient_age, 0) / total) : 0;
  
  const hypertension = consultations.filter(c => c.systolic >= 140 || c.diastolic >= 90).length;
  const diabetesRisk = consultations.filter(c => c.glucose >= 7.0).length;
  const smokers = consultations.filter(c => c.is_smoker).length;
  
  const bmiCategories = {
    underweight: consultations.filter(c => c.bmi < 18.5).length,
    normal: consultations.filter(c => c.bmi >= 18.5 && c.bmi < 25).length,
    overweight: consultations.filter(c => c.bmi >= 25 && c.bmi < 30).length,
    obese: consultations.filter(c => c.bmi >= 30).length,
  };

  const cvdRiskCategories = {
    low: consultations.filter(c => (c.cvd_risk_score || 0) < 10).length,
    medium: consultations.filter(c => (c.cvd_risk_score || 0) >= 10 && (c.cvd_risk_score || 0) < 20).length,
    high: consultations.filter(c => (c.cvd_risk_score || 0) >= 20).length,
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-12 print:bg-white print:pb-0">
      {/* Header - Hidden in Print */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10 print:hidden">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => navigate('/admin')}
              className="p-2 -ml-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="font-bold text-slate-900">Relatório da Campanha</h1>
          </div>
          <button 
            onClick={handlePrint}
            className="flex items-center gap-2 bg-cyan-600 text-white px-4 py-2 rounded-xl font-medium hover:bg-cyan-700 transition-colors shadow-sm"
          >
            <Download className="w-4 h-4" />
            <span>Exportar PDF</span>
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 print:pt-0 print:max-w-none print:px-0">
        
        {/* Report Header */}
        <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm mb-8 print:border-none print:shadow-none print:p-0 print:mb-6">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h1 className="text-3xl font-black text-slate-900 mb-2">{campaign.name}</h1>
              <div className="flex flex-wrap items-center gap-4 text-slate-500 text-sm">
                <span className="flex items-center gap-1.5">
                  <MapPin className="w-4 h-4" /> {campaign.location}
                </span>
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-4 h-4" /> {new Date(campaign.created_at).toLocaleDateString('pt-PT')}
                </span>
                <span className="flex items-center gap-1.5">
                  <Activity className="w-4 h-4" /> {campaign.active ? 'Em Curso' : 'Encerrada'}
                </span>
              </div>
            </div>
            <div className="w-16 h-16 bg-cyan-50 rounded-2xl flex items-center justify-center text-cyan-600 print:hidden">
              <FileText className="w-8 h-8" />
            </div>
          </div>
          
          <p className="text-slate-600 leading-relaxed">
            Este relatório epidemiológico consolida os dados recolhidos durante a campanha, fornecendo uma visão geral das estatísticas vitais e dos fatores de risco cardiovascular da população rastreada. Os dados aqui apresentados destinam-se a apoiar estudos epidemiológicos e a tomada de decisões em saúde pública.
          </p>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8 print:gap-2">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm print:border-slate-300">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center">
                <Users className="w-4 h-4" />
              </div>
              <span className="text-sm font-medium text-slate-600">Total Rastreios</span>
            </div>
            <p className="text-3xl font-black text-slate-900">{total}</p>
          </div>
          
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm print:border-slate-300">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 bg-rose-50 text-rose-600 rounded-lg flex items-center justify-center">
                <Heart className="w-4 h-4" />
              </div>
              <span className="text-sm font-medium text-slate-600">Hipertensão</span>
            </div>
            <p className="text-3xl font-black text-slate-900">
              {total > 0 ? Math.round((hypertension / total) * 100) : 0}%
            </p>
            <p className="text-xs text-slate-500 mt-1">{hypertension} casos (≥140/90)</p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm print:border-slate-300">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 bg-amber-50 text-amber-600 rounded-lg flex items-center justify-center">
                <Activity className="w-4 h-4" />
              </div>
              <span className="text-sm font-medium text-slate-600">Risco Diabetes</span>
            </div>
            <p className="text-3xl font-black text-slate-900">
              {total > 0 ? Math.round((diabetesRisk / total) * 100) : 0}%
            </p>
            <p className="text-xs text-slate-500 mt-1">{diabetesRisk} casos (≥7.0 mmol/L)</p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm print:border-slate-300">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 bg-slate-100 text-slate-600 rounded-lg flex items-center justify-center">
                <AlertCircle className="w-4 h-4" />
              </div>
              <span className="text-sm font-medium text-slate-600">Fumadores</span>
            </div>
            <p className="text-3xl font-black text-slate-900">
              {total > 0 ? Math.round((smokers / total) * 100) : 0}%
            </p>
            <p className="text-xs text-slate-500 mt-1">{smokers} casos</p>
          </div>
        </div>

        {/* Detailed Sections */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 print:gap-4 print:block">
          
          {/* Demographics */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm print:mb-6 print:break-inside-avoid">
            <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
              <Users className="w-5 h-5 text-cyan-600" /> Demografia
            </h3>
            
            <div className="space-y-6">
              <div>
                <p className="text-sm font-medium text-slate-500 mb-2">Idade Média</p>
                <p className="text-2xl font-bold text-slate-800">{avgAge} anos</p>
              </div>
              
              <div>
                <div className="flex justify-between text-sm font-medium text-slate-500 mb-2">
                  <span>Distribuição por Sexo</span>
                </div>
                <div className="h-4 w-full bg-slate-100 rounded-full overflow-hidden flex">
                  <div 
                    className="bg-sky-400 h-full" 
                    style={{ width: `${total > 0 ? (males / total) * 100 : 0}%` }}
                    title={`Masculino: ${males}`}
                  />
                  <div 
                    className="bg-pink-400 h-full" 
                    style={{ width: `${total > 0 ? (females / total) * 100 : 0}%` }}
                    title={`Feminino: ${females}`}
                  />
                </div>
                <div className="flex justify-between mt-2 text-xs text-slate-600 font-medium">
                  <span className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-sky-400" /> Masculino ({males})</span>
                  <span className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-pink-400" /> Feminino ({females})</span>
                </div>
              </div>
            </div>
          </div>

          {/* BMI Distribution */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm print:mb-6 print:break-inside-avoid">
            <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
              <Activity className="w-5 h-5 text-cyan-600" /> Índice de Massa Corporal (IMC)
            </h3>
            
            <div className="space-y-4">
              {[
                { label: 'Baixo Peso (<18.5)', count: bmiCategories.underweight, color: 'bg-blue-400' },
                { label: 'Normal (18.5-24.9)', count: bmiCategories.normal, color: 'bg-emerald-400' },
                { label: 'Excesso Peso (25-29.9)', count: bmiCategories.overweight, color: 'bg-amber-400' },
                { label: 'Obesidade (≥30)', count: bmiCategories.obese, color: 'bg-rose-400' },
              ].map((item, idx) => (
                <div key={idx}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-slate-600">{item.label}</span>
                    <span className="font-bold text-slate-900">
                      {item.count} <span className="text-slate-400 font-normal">({total > 0 ? Math.round((item.count / total) * 100) : 0}%)</span>
                    </span>
                  </div>
                  <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div 
                      className={`${item.color} h-full rounded-full`} 
                      style={{ width: `${total > 0 ? (item.count / total) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Cardiovascular Risk */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm md:col-span-2 print:mb-6 print:break-inside-avoid">
            <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
              <Heart className="w-5 h-5 text-rose-500" /> Risco Cardiovascular (Framingham)
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-100">
                <p className="text-sm font-bold text-emerald-800 mb-1">Risco Baixo (&lt;10%)</p>
                <p className="text-3xl font-black text-emerald-600">{cvdRiskCategories.low}</p>
                <p className="text-xs text-emerald-700 mt-1">
                  {total > 0 ? Math.round((cvdRiskCategories.low / total) * 100) : 0}% da população
                </p>
              </div>
              
              <div className="p-4 rounded-2xl bg-amber-50 border border-amber-100">
                <p className="text-sm font-bold text-amber-800 mb-1">Risco Médio (10-20%)</p>
                <p className="text-3xl font-black text-amber-600">{cvdRiskCategories.medium}</p>
                <p className="text-xs text-amber-700 mt-1">
                  {total > 0 ? Math.round((cvdRiskCategories.medium / total) * 100) : 0}% da população
                </p>
              </div>
              
              <div className="p-4 rounded-2xl bg-rose-50 border border-rose-100">
                <p className="text-sm font-bold text-rose-800 mb-1">Risco Alto (&gt;20%)</p>
                <p className="text-3xl font-black text-rose-600">{cvdRiskCategories.high}</p>
                <p className="text-xs text-rose-700 mt-1">
                  {total > 0 ? Math.round((cvdRiskCategories.high / total) * 100) : 0}% da população
                </p>
              </div>
            </div>
          </div>

        </div>

        {/* Print Footer */}
        <div className="hidden print:block mt-16 pt-8 border-t border-slate-200">
          <div className="flex justify-between items-end">
            <div className="text-sm text-slate-500">
              <p className="font-bold text-slate-700 mb-1">Relatório Epidemiológico de Fim de Campanha</p>
              <p>Gerado automaticamente por AI Studio Build</p>
              <p>Data de emissão: {new Date().toLocaleDateString('pt-PT')}</p>
            </div>
            <div className="text-center">
              <div className="w-64 border-b border-slate-800 mb-2"></div>
              <p className="text-sm font-bold text-slate-800">Assinatura do Administrador</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
