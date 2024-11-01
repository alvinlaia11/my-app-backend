const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

let supabase = null;
let supabaseAdmin = null;

const initializeSupabase = () => {
  if (supabase && supabaseAdmin) return;
  
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_ANON_KEY;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  try {
    if (supabaseUrl && supabaseKey) {
      supabase = createClient(supabaseUrl, supabaseKey, {
        auth: { persistSession: false }
      });
    }

    if (supabaseUrl && supabaseServiceRoleKey) {
      supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
        auth: { persistSession: false }
      });
    }
  } catch (error) {
    console.error('Supabase initialization error:', error);
  }
};

module.exports = {
  getSupabase: () => {
    if (!supabase) initializeSupabase();
    return supabase;
  },
  getSupabaseAdmin: () => {
    if (!supabaseAdmin) initializeSupabase();
    return supabaseAdmin;
  }
};