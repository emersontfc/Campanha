import express from "express";
import { createServer as createViteServer } from "vite";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  console.log(`[Server] Starting in ${process.env.NODE_ENV || 'development'} mode`);

  app.use(express.json());

  // Health check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  const supabaseUrl = process.env.VITE_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  // Consolidado Admin API (Compatível com Vercel)
  app.all("/api/admin", async (req, res) => {
    if (!supabaseServiceKey) {
      return res.status(500).json({ 
        error: "SUPABASE_SERVICE_ROLE_KEY não configurada." 
      });
    }

    const action = req.query.action || (req.body ? req.body.action : null);
    const email = req.body ? req.body.email : null;
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    console.log(`[Admin API] Action: ${action}, Method: ${req.method}`);

    try {
      if (action === 'list-users' || req.method === 'GET') {
        console.log("[Admin API] Fetching users from Auth...");
        const { data: { users: authUsers }, error: authError } = await supabaseAdmin.auth.admin.listUsers();
        if (authError) {
          console.error("[Admin API] Auth Error:", authError);
          throw authError;
        }
        
        console.log(`[Admin API] Found ${authUsers?.length} auth users. Fetching profiles...`);
        const { data: profiles, error: profileError } = await supabaseAdmin.from('profiles').select('*');
        if (profileError) {
          console.error("[Admin API] Profile Error:", profileError);
          throw profileError;
        }

        const mergedUsers = authUsers
          .map(authUser => {
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
          })
          .filter(user => user.has_profile);
        
        console.log(`[Admin API] Successfully merged and filtered ${mergedUsers.length} users.`);
        return res.json(mergedUsers);
      }

      if (action === 'delete-user') {
        const { id } = req.body;
        if (!id) return res.status(400).json({ error: "ID do utilizador é obrigatório" });

        console.log(`[Admin API] Deleting user: ${id}`);
        
        // Delete from profiles first
        const { error: profileError } = await supabaseAdmin.from('profiles').delete().eq('id', id);
        if (profileError) {
          console.error("[Admin API] Profile Delete Error:", profileError);
          throw profileError;
        }

        // Delete from auth
        const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(id);
        if (authError) {
          console.error("[Admin API] Auth Delete Error:", authError);
          throw authError;
        }

        console.log(`[Admin API] User ${id} deleted successfully.`);
        return res.json({ success: true });
      }

      if (action === 'create-user') {
        const { email, password, name, role, specialty } = req.body;
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
          email, password, email_confirm: true, user_metadata: { name, role, specialty }
        });
        if (authError) throw authError;

        await supabaseAdmin.from('profiles').upsert({
          id: authData.user.id, name, email,
          role: role === "Administrador" ? "Admin" : "MedicalProfessional",
          specialty, is_verified: true
        });
        return res.json({ success: true, user: authData.user });
      }

      if (action === 'sync-profile') {
        const { id, email, name, role, specialty } = req.body;
        await supabaseAdmin.from('profiles').upsert({ id, name, email, role, specialty, is_verified: true });
        return res.json({ success: true });
      }

      if (action === 'generate-link' || (!action && email)) {
        const { data, error } = await supabaseAdmin.auth.admin.generateLink({
          type: 'recovery', email, options: { redirectTo: `${req.headers.origin}/reset-password` }
        });
        if (error) throw error;
        return res.json({ link: data.properties.action_link });
      }

      res.status(400).json({ error: "Ação inválida" });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);

    // Fallback for SPA in dev
    app.get("*", async (req, res, next) => {
      if (req.originalUrl.startsWith("/api")) {
        return next();
      }

      const url = req.originalUrl;
      try {
        const template = fs.readFileSync(path.resolve(__dirname, "index.html"), "utf-8");
        const html = await vite.transformIndexHtml(url, template);
        res.status(200).set({ "Content-Type": "text/html" }).end(html);
      } catch (e) {
        next(e);
      }
    });
  } else {
    // Serve static files in production
    const distPath = path.resolve(__dirname, "dist");
    console.log(`[Server] Production mode. Serving from: ${distPath}`);
    
    // Serve static assets
    app.use(express.static(distPath));
    
    // SPA Fallback: All non-API routes serve index.html
    app.get("*", (req, res) => {
      const url = req.originalUrl || req.url;
      console.log(`[Server] Request: ${url}`);

      // Skip API
      if (url.startsWith("/api")) {
        return res.status(404).json({ error: "API route not found" });
      }

      const indexPath = path.join(distPath, "index.html");
      if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
      } else {
        console.error(`[Server] Critical: index.html not found at ${indexPath}`);
        res.status(404).send("Application files not found. Please rebuild.");
      }
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
