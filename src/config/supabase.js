const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey || !supabaseServiceRoleKey) {
  throw new Error('Supabase credentials missing');
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  },
  global: {
    headers: { 'x-application-name': 'kejaksaan-app' },
  },
  db: {
    schema: 'public'
  },
  realtime: {
    timeout: 20000
  },
  dangerouslyAllowBrowser: true
});

console.log('Supabase client initialized with URL:', supabaseUrl);

// Client dengan service role untuk operasi admin
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

module.exports = { 
  supabase,
  supabaseAdmin 
};