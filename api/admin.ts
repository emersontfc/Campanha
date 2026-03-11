import { createClient } from "@supabase/supabase-js";

export default async function handler(req: any, res: any) {
  // Configurações do Supabase
  const supabaseUrl = process.env.VITE_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  // Permitir GET para listagem e POST para as outras ações
  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  if (!supabaseServiceKey) {
    return res.status(500).json({ 
      error: "SUPABASE_SERVICE_ROLE_KEY não configurada. Adicione-a nas Environment Variables da Vercel." 
    });
  }

  const { email } = req.body;

  // Handle different endpoints based on a query param or body field if needed, 
  // but Vercel usually prefers separate files. However, to keep it simple for the user,
  // I will use a simple routing logic inside this handler based on a 'action' field or similar.
  // Actually, I'll just check the path or a custom header.
  
  const action = req.query.action || req.body.action;

  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  try {
    if (action === 'list-users' || req.method === 'GET') {
      const { data: { users: authUsers }, error: authError } = await supabaseAdmin.auth.admin.listUsers();
      if (authError) throw authError;

      const { data: profiles, error: profileError } = await supabaseAdmin.from('profiles').select('*');
      if (profileError) throw profileError;

      const mergedUsers = authUsers.map(authUser => {
        const profile = profiles?.find(p => p.id === authUser.id);
        return {
          id: authUser.id,
          email: authUser.email,
          name: profile?.name || authUser.user_metadata?.name || authUser.user_metadata?.full_name || 'Sem Nome',
          role: profile?.role || authUser.user_metadata?.role || 'MedicalProfessional',
          specialty: profile?.specialty || authUser.user_metadata?.specialty || '',
          is_verified: profile?.is_verified ?? false,
          created_at: authUser.created_at,
          has_profile: !!profile
        };
      });
      return res.status(200).json(mergedUsers);
    }

    if (action === 'create-user') {
      const { email, password, name, role, specialty } = req.body;
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { name, role, specialty }
      });
      if (authError) throw authError;

      const { error: profileError } = await supabaseAdmin.from('profiles').upsert({
        id: authData.user.id,
        name,
        email,
        role: role === "Administrador" ? "Admin" : "MedicalProfessional",
        specialty,
        is_verified: true
      });
      if (profileError) throw profileError;

      return res.status(200).json({ success: true, user: authData.user });
    }

    if (action === 'sync-profile') {
      const { id, email, name, role, specialty } = req.body;
      const { error } = await supabaseAdmin.from('profiles').upsert({
        id,
        name,
        email,
        role,
        specialty,
        is_verified: true
      });
      if (error) throw error;
      return res.status(200).json({ success: true });
    }

    // Default: Generate recovery link
    if (!email) return res.status(400).json({ error: "Email é obrigatório" });
    
    const { data, error } = await supabaseAdmin.auth.admin.generateLink({
      type: 'recovery',
      email: email,
      options: {
        redirectTo: `${req.headers['x-forwarded-proto'] || 'https'}://${req.headers.host}/#/reset-password`
      }
    });

    if (error) throw error;

    return res.status(200).json({ link: data.properties.action_link });
  } catch (err: any) {
    console.error("Error in API:", err);
    return res.status(500).json({ error: err.message });
  }
}
