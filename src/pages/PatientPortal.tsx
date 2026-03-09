import { useState, useEffect } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { Activity, Phone, User, Printer, Share2, Heart, Sparkles } from "lucide-react";

export default function PatientPortal() {
  const [searchParams] = useSearchParams();
  const id = searchParams.get("id");
  const [consultation, setConsultation] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;

    const fetchData = async () => {
      const { data, error } = await supabase
        .from('consultations')
        .select('*')
        .eq('consultation_id', id)
        .single();
        
      if (error) {
        console.error(error);
      } else {
        setConsultation(data);
      }
      setLoading(false);
    };

    fetchData();
  }, [id]);

  const handleShare = () => {
    const text = `Olá! Aqui está o seu relatório de saúde Al-Shifa (ID: ${id}). Veja os detalhes em: ${window.location.href}`;
    const url = `https://wa.me/${consultation?.patient_phone?.replace(/\D/g, "")}?text=${encodeURIComponent(text)}`;
    window.open(url, "_blank");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="w-8 h-8 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
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
                <p className="text-sm font-bold text-slate-700">{consultation.professional_name}</p>
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
          <div className="bg-white p-4 rounded-2xl border border-slate-100 text-center">
            <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Glicemia</p>
            <p className="text-xl font-black text-slate-900">{consultation.glucose}<span className="text-xs font-normal ml-1">mmol/L</span></p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-100 text-center">
          <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Tensão Arterial</p>
          <p className="text-2xl font-black text-slate-900">{consultation.blood_pressure}<span className="text-xs font-normal ml-1">mmHg</span></p>
        </div>

        {/* AI Analysis */}
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <Heart className="w-20 h-20 text-cyan-600" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-cyan-600" />
            Análise e Recomendações
          </h3>
          <div className="prose prose-slate text-slate-600 leading-relaxed whitespace-pre-wrap">
            {consultation.ai_analysis}
          </div>
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
