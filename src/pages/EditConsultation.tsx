import * as React from "react";
import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useAuth } from "../hooks/useAuth";
import { analyzeConsultation } from "../lib/gemini";
import { calculateBMI, calculateFraminghamRisk } from "../lib/utils";
import { ChevronLeft, Sparkles, Save, Loader2, MapPin, User, History, Activity, AlertCircle } from "lucide-react";
import { Campaign } from "../types";

export default function EditConsultation() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const id = searchParams.get("id");
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
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
  const [previousConsultations, setPreviousConsultations] = useState<any[]>([]);
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
    const fetchData = async () => {
      if (!id) return;
      
      const [consRes, campRes] = await Promise.all([
        supabase.from('consultations').select('*').eq('consultation_id', id).single(),
        supabase.from('campaigns').select('*').eq('active', true)
      ]);

      if (consRes.data) {
        const c = consRes.data;
        setFormData({
          patientName: c.patient_name,
          patientAge: String(c.patient_age),
          patientPhone: c.patient_phone,
          weight: c.weight > 0 ? String(c.weight) : "",
          height: c.height > 0 ? String(c.height) : "",
          systolic: c.systolic > 0 ? String(c.systolic) : "",
          diastolic: c.diastolic > 0 ? String(c.diastolic) : "",
          glucose: c.glucose > 0 ? String(c.glucose) : "",
          patientSex: c.patient_sex || "M",
          isSmoker: c.is_smoker || false,
          isTreated: c.is_on_hypertension_treatment || false,
          hasDiabetes: c.glucose >= 7.0 || false, // Fallback if not explicitly set
          physicalExamination: c.physical_examination || "",
          campaignId: c.campaign_id || "",
          isBilateral: false,
          systolicLeft: "",
          diastolicLeft: "",
          systolicRight: "",
          diastolicRight: "",
        });
        setAiAnalysis(c.ai_analysis);

        // Fetch previous history
        if (c.patient_name) {
          const { data: historyData } = await supabase
            .from('consultations')
            .select('*')
            .eq('patient_name', c.patient_name)
            .neq('consultation_id', id)
            .order('created_at', { ascending: false })
            .limit(3);
          
          if (historyData) {
            setPreviousConsultations(historyData);
          }
        }
      }
      
      if (campRes.data) setCampaigns(campRes.data);
      setLoading(false);
    };
    
    fetchData();
  }, [id]);

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
        patientSex: formData.patientSex,
        isSmoker: formData.isSmoker,
        isTreated: formData.isTreated,
        cvdRisk: cvdRisk,
        physicalExamination: formData.physicalExamination,
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (campaigns.length > 0 && !formData.campaignId) {
      alert("Por favor selecione uma campanha.");
      return;
    }
    
    setSaving(true);
    
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

    try {
      const updateData: any = {
        patient_name: formData.patientName,
        patient_age: Number(formData.patientAge),
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
        physical_examination: formData.physicalExamination + bpNote,
        ai_analysis: aiAnalysis,
        status: 'completed',
      };
      
      if (formData.campaignId) {
        updateData.campaign_id = formData.campaignId;
      }

      const { error } = await supabase
        .from('consultations')
        .update(updateData)
        .eq('consultation_id', id);
        
      if (error) {
        console.error("Supabase Update Error:", error);
        throw error;
      }
      navigate(`/patient?id=${id}`);
    } catch (err: any) {
      console.error("Finalize Error:", err);
      alert(`Erro ao salvar consulta: ${err.message || "Erro desconhecido"}`);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <Loader2 className="w-8 h-8 text-cyan-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-10">
      <header className="bg-white border-b border-slate-200 px-4 py-4 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-slate-500">
            <ChevronLeft className="w-6 h-6" />
          </button>
          <h1 className="font-bold text-slate-900">Completar Triagem</h1>
        </div>
      </header>

      <main className="max-w-2xl mx-auto p-4">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
            <h2 className="font-bold text-slate-900 mb-2 flex items-center gap-2">
              <User className="w-5 h-5 text-cyan-600" />
              Dados do Paciente
            </h2>
            
            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nome do Paciente</label>
                <input
                  type="text"
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
                    Histórico do Paciente
                  </h3>
                  <div className="space-y-2">
                    {previousConsultations.map((prev) => (
                      <div 
                        key={prev.id}
                        className="bg-white p-3 rounded-lg border border-slate-200 text-sm"
                      >
                        <div className="flex justify-between items-center mb-1">
                          <span className="font-bold text-slate-900">{prev.patient_name}</span>
                          <span className="text-xs text-slate-500">{new Date(prev.created_at).toLocaleDateString()}</span>
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
                <label className="block text-sm font-medium text-slate-700 mb-1">Telemóvel</label>
                <input
                  type="text"
                  disabled
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-500"
                  value={formData.patientPhone}
                />
              </div>
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

            <div className="pt-4 border-t border-slate-50">
              <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-cyan-600" />
                Vincular a Campanha
              </label>
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
              value={aiAnalysis}
              onChange={(e) => setAiAnalysis(e.target.value)}
            />
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full bg-slate-900 text-white font-bold py-4 rounded-2xl shadow-lg flex items-center justify-center gap-2 active:scale-[0.98] transition-all disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
            Finalizar Atendimento
          </button>
        </form>
      </main>
    </div>
  );
}
