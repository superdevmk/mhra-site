// assets/js/supabaseClient.js
// 1) Krijo projektin në Supabase
// 2) Merr Project URL + anon key
// 3) Vendosi këtu:

const SUPABASE_URL = "https://lqhtqxuiahivairqaoeb.supabase.co";

const SUPABASE_ANON_KEY = "sb_publishable_Q1JFiQ1CzZ61BwN-hCXBIQ_UlJ-AZx7";



// Supabase v2 (CDN) ekspozon global: supabase
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
