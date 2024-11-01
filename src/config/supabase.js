const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey || !supabaseServiceRoleKey) {
  console.error('Missing environment variables:', {
    supabaseUrl: !!supabaseUrl,
    supabaseKey: !!supabaseKey,
    supabaseServiceRoleKey: !!supabaseServiceRoleKey
  });
  throw new Error('Supabase credentials missing');
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: false,
    detectSessionInUrl: false
  },
  global: {
    headers: { 'x-application-name': 'kejaksaan-app' },
  },
  db: {
    schema: 'public'
  },
  realtime: {
    timeout: 5000,
    params: {
      eventsPerSecond: 1
    }
  },
  dangerouslyAllowBrowser: true
});

console.log('Supabase client initialized with URL:', supabaseUrl);
console.log('Environment variables loaded:', {
  SUPABASE_URL: process.env.SUPABASE_URL ? 'Set' : 'Not set',
  SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY ? 'Set' : 'Not set',
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ? 'Set' : 'Not set'
});

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