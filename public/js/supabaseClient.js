import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const supabaseUrl = 'https://enjnknibetnfisavtlgv.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVuam5rbmliZXRuZmlzYXZ0bGd2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMzNTY0MDQsImV4cCI6MjA2ODkzMjQwNH0.ftnIz7vXZRzfURTaH99ZvG11V46IsCUMcmGEZ6m7jOo';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
});

export default supabase;
