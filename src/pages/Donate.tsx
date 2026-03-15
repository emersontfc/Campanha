import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Heart, Smartphone, CreditCard, ArrowLeft, CheckCircle2, Copy, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';

interface DonationSettings {
  mpesa_number: string;
  mpesa_name: string;
  emola_number: string;
  emola_name: string;
  donation_title: string;
  donation_description: string;
}

const defaultSettings: DonationSettings = {
  mpesa_number: "840000000",
  mpesa_name: "Al-Shifa Health",
  emola_number: "860000000",
  emola_name: "Al-Shifa Health",
  donation_title: "Apoie a Nossa Causa",
  donation_description: "A sua doação ajuda-nos a levar cuidados de saúde gratuitos a mais comunidades em Moçambique. Cada contribuição faz a diferença."
};

export default function Donate() {
  const [settings, setSettings] = useState<DonationSettings>(defaultSettings);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('site_settings')
        .select('value')
        .eq('key', 'donation_info')
        .single();

      if (data && !error) {
        setSettings(data.value as DonationSettings);
      }
    } catch (err) {
      console.error("Error fetching donation settings:", err);
    }
  };

  const handleCopy = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    setCopied(type);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 text-slate-600 hover:text-sky-600 transition-colors">
            <ArrowLeft className="w-5 h-5" />
            <span className="font-medium">Voltar</span>
          </Link>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-sky-600 rounded-lg flex items-center justify-center">
              <Heart className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-slate-900 tracking-tight">Donate</span>
          </div>
          <div className="w-20"></div> {/* Spacer */}
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-12">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center justify-center p-3 bg-red-100 rounded-2xl mb-6">
            <Heart className="w-10 h-10 text-red-600 fill-red-600" />
          </div>
          <h1 className="text-4xl font-extrabold text-slate-900 mb-4 tracking-tight">
            {settings.donation_title}
          </h1>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
            {settings.donation_description}
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* M-Pesa Card */}
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-3xl p-8 shadow-sm border border-slate-200 hover:shadow-md transition-shadow relative overflow-hidden group"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-red-50 rounded-full -mr-16 -mt-16 transition-transform group-hover:scale-110" />
            
            <div className="relative">
              <div className="w-14 h-14 bg-red-600 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-red-200">
                <Smartphone className="w-8 h-8 text-white" />
              </div>
              
              <h2 className="text-2xl font-bold text-slate-900 mb-2">M-Pesa</h2>
              <p className="text-slate-500 mb-8">Faça a sua doação via M-Pesa de forma rápida e segura.</p>
              
              <div className="space-y-4">
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Número</p>
                  <div className="flex items-center justify-between">
                    <span className="text-xl font-mono font-bold text-slate-900">{settings.mpesa_number}</span>
                    <button 
                      onClick={() => handleCopy(settings.mpesa_number, 'mpesa')}
                      className="p-2 hover:bg-white rounded-lg transition-colors text-slate-400 hover:text-sky-600"
                    >
                      {copied === 'mpesa' ? <CheckCircle2 className="w-5 h-5 text-green-500" /> : <Copy className="w-5 h-5" />}
                    </button>
                  </div>
                </div>
                
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Nome da Conta</p>
                  <p className="text-lg font-bold text-slate-900">{settings.mpesa_name}</p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* e-Mola Card */}
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-3xl p-8 shadow-sm border border-slate-200 hover:shadow-md transition-shadow relative overflow-hidden group"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-orange-50 rounded-full -mr-16 -mt-16 transition-transform group-hover:scale-110" />
            
            <div className="relative">
              <div className="w-14 h-14 bg-orange-500 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-orange-200">
                <Smartphone className="w-8 h-8 text-white" />
              </div>
              
              <h2 className="text-2xl font-bold text-slate-900 mb-2">e-Mola</h2>
              <p className="text-slate-500 mb-8">Contribua através do serviço e-Mola com toda a conveniência.</p>
              
              <div className="space-y-4">
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Número</p>
                  <div className="flex items-center justify-between">
                    <span className="text-xl font-mono font-bold text-slate-900">{settings.emola_number}</span>
                    <button 
                      onClick={() => handleCopy(settings.emola_number, 'emola')}
                      className="p-2 hover:bg-white rounded-lg transition-colors text-slate-400 hover:text-sky-600"
                    >
                      {copied === 'emola' ? <CheckCircle2 className="w-5 h-5 text-green-500" /> : <Copy className="w-5 h-5" />}
                    </button>
                  </div>
                </div>
                
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Nome da Conta</p>
                  <p className="text-lg font-bold text-slate-900">{settings.emola_name}</p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Other Ways to Help */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-16 bg-sky-900 rounded-[2.5rem] p-8 md:p-12 text-white relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-64 h-64 bg-sky-800 rounded-full -mr-32 -mt-32 opacity-50" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-sky-800 rounded-full -ml-24 -mb-24 opacity-30" />
          
          <div className="relative flex flex-col md:flex-row items-center gap-8">
            <div className="flex-1">
              <h2 className="text-3xl font-bold mb-4">Outras Formas de Ajudar</h2>
              <p className="text-sky-100 mb-6 text-lg">
                Se deseja apoiar com equipamentos médicos, medicamentos ou voluntariado, entre em contacto connosco.
              </p>
              <div className="flex flex-wrap gap-4">
                <a 
                  href="mailto:contato@alshifa.org" 
                  className="px-6 py-3 bg-white text-sky-900 rounded-xl font-bold hover:bg-sky-50 transition-colors inline-flex items-center gap-2"
                >
                  Contactar por Email
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            </div>
            <div className="w-full md:w-64 aspect-square bg-sky-800/50 backdrop-blur-sm rounded-3xl border border-sky-700/50 flex items-center justify-center">
              <CreditCard className="w-24 h-24 text-sky-300 opacity-50" />
            </div>
          </div>
        </motion.div>

        <div className="mt-12 text-center">
          <p className="text-slate-400 text-sm">
            © {new Date().getFullYear()} Al-Shifa Health Moçambique. Todos os direitos reservados.
          </p>
        </div>
      </main>
    </div>
  );
}
