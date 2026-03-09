import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./hooks/useAuth";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { isSupabaseConfigured } from "./lib/supabase";
import LoginPage from "./pages/LoginPage";
import Dashboard from "./pages/Dashboard";
import NewConsultation from "./pages/NewConsultation";
import PatientPortal from "./pages/PatientPortal";
import AdminDashboard from "./pages/AdminDashboard";
import PendingVerification from "./pages/PendingVerification";
import { ShieldAlert } from "lucide-react";

function ConfigError() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6 text-center">
      <div className="max-w-md bg-white p-8 rounded-3xl shadow-xl border border-red-100">
        <ShieldAlert className="w-16 h-16 text-red-500 mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-slate-900 mb-4">Configuração Necessária</h1>
        <p className="text-slate-600 mb-6">
          As chaves do Supabase não foram encontradas. Por favor, configure as variáveis de ambiente 
          (VITE_SUPABASE_*) nas definições do projeto para ativar a plataforma.
        </p>
        <div className="text-xs text-slate-400 bg-slate-50 p-4 rounded-xl text-left font-mono">
          VITE_SUPABASE_URL<br/>
          VITE_SUPABASE_ANON_KEY
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
          <Route path="/patient" element={<PatientPortal />} />
          <Route 
            path="/admin" 
            element={
              <ProtectedRoute requireAdmin>
                <AdminDashboard />
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
          <Route path="/" element={<Navigate to="/dashboard" />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}
