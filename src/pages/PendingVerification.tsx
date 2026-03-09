import { HeartPulse, ShieldAlert } from "lucide-react";
import { Link } from "react-router-dom";

export default function PendingVerification() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4 text-center">
      <div className="max-w-md w-full bg-white p-8 rounded-3xl shadow-xl border border-slate-100">
        <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <ShieldAlert className="w-10 h-10 text-amber-600" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Conta em Análise</h1>
        <p className="text-slate-500 mb-8">
          Obrigado por se juntar à Al-Shifa Health Initiative. A sua conta está a ser verificada pelo administrador. 
          Receberá acesso total assim que o processo for concluído.
        </p>
        <Link 
          to="/dashboard" 
          className="block w-full bg-slate-900 text-white font-bold py-4 rounded-2xl active:scale-[0.98] transition-all"
        >
          Voltar ao Dashboard
        </Link>
      </div>
    </div>
  );
}
