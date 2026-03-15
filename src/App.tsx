import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./hooks/useAuth";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { isSupabaseConfigured } from "./lib/supabase";
import LoginPage from "./pages/LoginPage";
import LandingPage from "./pages/LandingPage";
import Dashboard from "./pages/Dashboard";
import NewConsultation from "./pages/NewConsultation";
import PatientPortal from "./pages/PatientPortal";
import EditConsultation from "./pages/EditConsultation";
import AdminDashboard from "./pages/AdminDashboard";
import CampaignReport from "./pages/CampaignReport";
import PendingVerification from "./pages/PendingVerification";
import ResetPassword from "./pages/ResetPassword";
import Donate from "./pages/Donate";
import { ShieldAlert } from "lucide-react";

function ConfigError() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6 text-center">
      <div className="max-w-md bg-white p-8 rounded-3xl shadow-xl border border-red-100">
        <ShieldAlert className="w-16 h-16 text-red-500 mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-slate-900 mb-4">Configuração Necessária</h1>
        <p className="text-slate-600 mb-6">
          As chaves do Supabase não foram encontradas ou são inválidas. 
          Certifique-se de que o URL começa com <strong>https://</strong>.
        </p>
        <div className="space-y-4">
          <div className="text-xs text-slate-400 bg-slate-50 p-4 rounded-xl text-left font-mono break-all">
            <p className="font-bold text-slate-500 mb-1">VITE_SUPABASE_URL</p>
            {import.meta.env.VITE_SUPABASE_URL || "Não configurado"}
            <p className="font-bold text-slate-500 mt-3 mb-1">VITE_SUPABASE_ANON_KEY</p>
            {import.meta.env.VITE_SUPABASE_ANON_KEY ? "••••••••" : "Não configurado"}
          </div>
          <p className="text-sm text-slate-500 italic">
            Adicione estas chaves no menu <strong>Settings &gt; Secrets</strong> do AI Studio.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  if (!isSupabaseConfigured) {
    return <ConfigError />;
  }

  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route 
            path="/dashboard" 
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/new-consultation" 
            element={
              <ProtectedRoute requireVerified>
                <NewConsultation />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/edit-consultation" 
            element={
              <ProtectedRoute requireVerified>
                <EditConsultation />
              </ProtectedRoute>
            } 
          />
          <Route path="/patient" element={<PatientPortal />} />
          <Route path="/donate" element={<Donate />} />
          <Route 
            path="/admin" 
            element={
              <ProtectedRoute requireAdmin>
                <AdminDashboard />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/campaign-report/:id" 
            element={
              <ProtectedRoute requireAdmin>
                <CampaignReport />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/pending-verification" 
            element={
              <ProtectedRoute>
                <PendingVerification />
              </ProtectedRoute>
            } 
          />
          <Route path="/" element={<LandingPage />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}
