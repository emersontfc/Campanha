import { createClient } from "@supabase/supabase-js";

export default async function handler(req: any, res: any) {
  // Configurações do Supabase
  const supabaseUrl = process.env.VITE_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  if (!supabaseServiceKey) {
    return res.status(500).json({ 
      error: "SUPABASE_SERVICE_ROLE_KEY não configurada. Adicione-a nas Environment Variables da Vercel." 
    });
  }

  const { email } = req.body;
  if (!email) return res.status(400).json({ error: "Email é obrigatório" });

  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  try {
    // Gerar link de recuperação (sem enviar email)
    const { data, error } = await supabaseAdmin.auth.admin.generateLink({
      type: 'recovery',
      email: email,
      options: {
        // Na Vercel, o origin será o seu domínio .vercel.app
        redirectTo: `${req.headers['x-forwarded-proto'] || 'https'}://${req.headers.host}/#/reset-password`
      }
    });

    if (error) throw error;

    return res.status(200).json({ link: data.properties.action_link });
  } catch (err: any) {
    console.error("Error generating link:", err);
    return res.status(500).json({ error: err.message });
  }
}
