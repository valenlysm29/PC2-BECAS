/* =========================================================
   CONFIGURACIÓN DE SUPABASE
   =========================================================
   Reemplaza los dos valores de abajo con los datos de TU
   proyecto de Supabase. Los encuentras en:
   Supabase -> Project Settings -> API

   - SUPABASE_URL    -> "Project URL"
   - SUPABASE_ANON_KEY -> "Project API keys" -> "anon" / "public"
   ========================================================= */

const SUPABASE_URL = "https://nxlgqtcldvyducwomndj.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im54bGdxdGNsZHZ5ZHVjd29tbmRqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE3MjQ0MDMsImV4cCI6MjA5NzMwMDQwM30.uMTpg6ouGsA2AAdfCAmlU4qncVysWIjlfrVUBxpSWXc";

// No editar debajo de esta línea.
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
