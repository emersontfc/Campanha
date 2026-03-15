import * as React from "react";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { motion } from "framer-motion";
import { 
  HeartPulse, ShieldCheck, Users, Activity, 
  ArrowRight, Globe, CheckCircle2, Sparkles 
} from "lucide-react";

export default function LandingPage() {
  const navigate = useNavigate();
  const [campaignPhotos, setCampaignPhotos] = useState<any[]>([]);

  useEffect(() => {
    const fetchPhotos = async () => {
      const { data } = await supabase
        .from('knowledge_base')
        .select('*')
        .like('name', 'campaign_photo_%')
        .order('created_at', { ascending: false })
        .limit(6);
      
      if (data) {
        setCampaignPhotos(data);
      }
    };
    fetchPhotos();
  }, []);

  return (
    <div className="min-h-screen bg-white font-sans selection:bg-cyan-100 selection:text-cyan-900">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-md border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 sm:h-20 flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-cyan-600 rounded-lg sm:rounded-xl flex items-center justify-center text-white shadow-lg shadow-cyan-200">
              <HeartPulse className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <span className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">AL-SHIFA</span>
          </div>
          <div className="flex items-center gap-2 sm:gap-4">
            <button 
              onClick={() => navigate("/login")}
              className="px-3 sm:px-6 py-2 text-xs sm:text-sm font-bold text-slate-600 hover:text-cyan-600 transition-colors"
            >
              Entrar
            </button>
            <button 
              onClick={() => navigate("/login")}
              className="px-4 sm:px-6 py-2 sm:py-2.5 bg-slate-900 text-white text-[10px] sm:text-sm font-bold rounded-lg sm:rounded-xl hover:bg-slate-800 transition-all shadow-lg shadow-slate-200"
            >
              Registar
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-24 sm:pt-32 pb-12 sm:pb-20 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          <motion.div 
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            className="space-y-6 sm:space-y-8 text-center lg:text-left"
          >
            <div className="inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 bg-cyan-50 text-cyan-700 rounded-full text-[10px] sm:text-xs font-black uppercase tracking-widest border border-cyan-100">
              <Sparkles className="w-3 h-3 sm:w-4 sm:h-4" />
              Iniciativa Moçambique 2026
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-7xl font-black text-slate-900 leading-[1.1] lg:leading-[0.95] tracking-tight">
              Saúde de <span className="text-cyan-600">Qualidade</span> para Todos.
            </h1>
            <p className="text-base sm:text-xl text-slate-500 leading-relaxed max-w-xl mx-auto lg:mx-0 font-medium">
              O Al-Shifa é uma plataforma inteligente de triagem epidemiológica dedicada a levar cuidados preventivos às comunidades de Moçambique.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 pt-4 justify-center lg:justify-start">
              <button 
                onClick={() => navigate("/login")}
                className="px-6 sm:px-8 py-4 sm:py-5 bg-cyan-600 text-white rounded-xl sm:rounded-2xl font-black text-base sm:text-lg hover:bg-cyan-700 transition-all shadow-2xl shadow-cyan-200 flex items-center justify-center gap-3 group"
              >
                Começar Triagem
                <ArrowRight className="w-5 h-5 sm:w-6 sm:h-6 group-hover:translate-x-1 transition-transform" />
              </button>
              <button 
                onClick={() => navigate("/patient")}
                className="px-6 sm:px-8 py-4 sm:py-5 bg-white border-2 border-slate-100 text-slate-900 rounded-xl sm:rounded-2xl font-black text-base sm:text-lg hover:bg-slate-50 transition-all flex items-center justify-center gap-3"
              >
                Portal do Paciente
              </button>
            </div>
            <div className="flex items-center justify-center lg:justify-start gap-4 sm:gap-8 pt-8 border-t border-slate-100">
              <div>
                <p className="text-2xl sm:text-3xl font-black text-slate-900">10k+</p>
                <p className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-widest">Vidas</p>
              </div>
              <div className="w-px h-8 sm:h-10 bg-slate-100" />
              <div>
                <p className="text-2xl sm:text-3xl font-black text-slate-900">50+</p>
                <p className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-widest">Equipa</p>
              </div>
              <div className="w-px h-8 sm:h-10 bg-slate-100" />
              <div>
                <p className="text-2xl sm:text-3xl font-black text-slate-900">100%</p>
                <p className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-widest">Digital</p>
              </div>
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="relative px-4 sm:px-0"
          >
            <div className="absolute -inset-4 bg-cyan-100/50 rounded-[2rem] sm:rounded-[3rem] blur-2xl sm:blur-3xl -z-10" />
            <div className="rounded-[2rem] sm:rounded-[3rem] overflow-hidden shadow-2xl border-4 sm:border-8 border-white">
              <img 
                src="https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&q=80&w=1000" 
                alt="Medical screening in Africa" 
                className="w-full h-[300px] sm:h-[450px] lg:h-[600px] object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
            
            {/* Floating Stats Card */}
            <div className="absolute -bottom-6 sm:-bottom-10 -left-2 sm:-left-10 bg-white p-4 sm:p-6 rounded-[1.5rem] sm:rounded-[2rem] shadow-2xl border border-slate-50 max-w-[180px] sm:max-w-[240px] hidden xs:block">
              <div className="flex items-center gap-3 sm:gap-4 mb-3 sm:mb-4">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-emerald-50 text-emerald-600 rounded-lg sm:rounded-xl flex items-center justify-center">
                  <Activity className="w-5 h-5 sm:w-6 sm:h-6" />
                </div>
                <div>
                  <p className="text-[8px] sm:text-[10px] font-black text-slate-400 uppercase">Estado</p>
                  <p className="text-xs sm:text-sm font-black text-slate-900">Ativo</p>
                </div>
              </div>
              <div className="space-y-1.5 sm:space-y-2">
                <div className="h-1.5 sm:h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 w-[85%]" />
                </div>
                <p className="text-[8px] sm:text-[10px] font-bold text-slate-400">85% de cobertura</p>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Campaign Photos Section */}
      {campaignPhotos.length > 0 && (
        <section className="py-12 sm:py-20 bg-slate-50 px-4 sm:px-6 border-t border-slate-100">
          <div className="max-w-7xl mx-auto">
            <div className="text-center max-w-3xl mx-auto mb-12 sm:mb-16 space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-sky-50 text-sky-700 rounded-full text-[10px] sm:text-xs font-black uppercase tracking-widest border border-sky-100">
                <Sparkles className="w-3 h-3" />
                Em Destaque
              </div>
              <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">As Nossas Campanhas</h2>
              <p className="text-base sm:text-lg text-slate-500 font-medium px-4">
                Veja o impacto das nossas iniciativas de saúde nas comunidades de Moçambique.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
              {campaignPhotos.map((photo, i) => {
                // Extract campaign ID from filename (format: campaign_photo_{id}_{timestamp}.png)
                const match = photo.name.match(/campaign_photo_(.*?)_\d+\.png/);
                const campId = match ? match[1] : null;
                // We don't have the campaign name here directly, but we can just show the date
                
                return (
                  <motion.div 
                    key={photo.id}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: i * 0.1 }}
                    className="group relative rounded-[2rem] overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 bg-white"
                  >
                    <div className="aspect-[4/3] w-full overflow-hidden bg-slate-100">
                      <img 
                        src={photo.file_url} 
                        alt="Campanha Al-Shifa" 
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-slate-900/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-6">
                      <p className="text-white font-bold text-lg">Campanha de Triagem</p>
                      <p className="text-cyan-300 text-sm font-medium">{new Date(photo.created_at).toLocaleDateString('pt-PT', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* Features Section */}
      <section className="py-12 sm:py-20 bg-white px-4 sm:px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-12 sm:mb-20 space-y-4">
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">Tecnologia ao Serviço da Vida</h2>
            <p className="text-base sm:text-lg text-slate-500 font-medium px-4">
              Combinamos inteligência artificial com cuidados humanos para transformar o cenário da saúde pública em Moçambique.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
            {[
              {
                title: "Triagem Inteligente",
                desc: "Análise instantânea de sinais vitais com suporte de IA para identificação precoce de riscos.",
                icon: Activity,
                color: "bg-cyan-600"
              },
              {
                title: "Gestão de Campanhas",
                desc: "Organização eficiente de missões de saúde em áreas remotas com sincronização em tempo real.",
                icon: Globe,
                color: "bg-indigo-600"
              },
              {
                title: "Segurança de Dados",
                desc: "Protocolos rigorosos de privacidade para garantir a proteção total dos dados dos pacientes.",
                icon: ShieldCheck,
                color: "bg-emerald-600"
              }
            ].map((feature, i) => (
              <div key={i} className="bg-white p-8 sm:p-10 rounded-[2rem] sm:rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-xl transition-all group">
                <div className={`w-12 h-12 sm:w-14 sm:h-14 ${feature.color} text-white rounded-xl sm:rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-lg`}>
                  <feature.icon className="w-6 h-6 sm:w-7 sm:h-7" />
                </div>
                <h3 className="text-lg sm:text-xl font-black text-slate-900 mb-3 sm:mb-4 tracking-tight">{feature.title}</h3>
                <p className="text-sm sm:text-base text-slate-500 font-medium leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Mission Section */}
      <section className="py-12 sm:py-20 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto bg-slate-900 rounded-[2.5rem] sm:rounded-[4rem] p-8 sm:p-12 lg:p-20 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-10 sm:p-20 opacity-10">
            <Globe className="w-48 h-48 sm:w-96 sm:h-96 text-white" />
          </div>
          
          <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            <div className="space-y-6 sm:space-y-8">
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white leading-tight tracking-tight">
                Nossa Missão é <span className="text-cyan-400">Prevenir</span> para Salvar.
              </h2>
              <div className="space-y-3 sm:space-y-4">
                {[
                  "Acesso universal a triagens de saúde",
                  "Digitalização de registos médicos rurais",
                  "Capacitação de profissionais locais",
                  "Monitorização epidemiológica em tempo real"
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-3 text-slate-300 text-sm sm:text-base font-bold">
                    <CheckCircle2 className="w-5 h-5 sm:w-6 sm:h-6 text-cyan-400 shrink-0" />
                    {item}
                  </div>
                ))}
              </div>
              <button 
                onClick={() => navigate("/login")}
                className="w-full sm:w-auto px-8 py-4 bg-white text-slate-900 rounded-xl sm:rounded-2xl font-black hover:bg-slate-100 transition-all"
              >
                Junte-se à Iniciativa
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              <div className="space-y-3 sm:space-y-4">
                <div className="h-32 sm:h-48 bg-white/5 rounded-2xl sm:rounded-3xl border border-white/10 flex flex-col items-center justify-center text-center p-4 sm:p-6">
                  <p className="text-2xl sm:text-4xl font-black text-white">24/7</p>
                  <p className="text-[8px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1 sm:mt-2">Disponível</p>
                </div>
                <div className="h-40 sm:h-64 bg-cyan-600 rounded-2xl sm:rounded-3xl flex flex-col items-center justify-center text-center p-4 sm:p-6 shadow-2xl shadow-cyan-900/20">
                  <Users className="w-8 h-8 sm:w-12 sm:h-12 text-white mb-2 sm:mb-4" />
                  <p className="text-sm sm:text-xl font-black text-white">Comunidade</p>
                </div>
              </div>
              <div className="space-y-3 sm:space-y-4 pt-6 sm:pt-8">
                <div className="h-40 sm:h-64 bg-white rounded-2xl sm:rounded-3xl flex flex-col items-center justify-center text-center p-4 sm:p-6 shadow-2xl">
                  <Activity className="w-8 h-8 sm:w-12 sm:h-12 text-cyan-600 mb-2 sm:mb-4" />
                  <p className="text-sm sm:text-xl font-black text-slate-900">Precisão</p>
                </div>
                <div className="h-32 sm:h-48 bg-white/5 rounded-2xl sm:rounded-3xl border border-white/10 flex flex-col items-center justify-center text-center p-4 sm:p-6">
                  <p className="text-2xl sm:text-4xl font-black text-white">100%</p>
                  <p className="text-[8px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1 sm:mt-2">Seguro</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 sm:py-12 border-t border-slate-100 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6 sm:gap-8">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-slate-900 rounded-lg flex items-center justify-center text-white">
              <HeartPulse className="w-5 h-5" />
            </div>
            <span className="font-black text-slate-900 tracking-tight">AL-SHIFA</span>
          </div>
          <p className="text-slate-400 text-xs sm:text-sm font-medium text-center">
            © 2026 Iniciativa de Saúde Al-Shifa Moçambique.
          </p>
          <div className="flex items-center gap-4 sm:gap-6">
            <a href="#" className="text-slate-400 hover:text-slate-900 transition-colors text-[10px] sm:text-sm font-bold">Privacidade</a>
            <a href="#" className="text-slate-400 hover:text-slate-900 transition-colors text-[10px] sm:text-sm font-bold">Termos</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
