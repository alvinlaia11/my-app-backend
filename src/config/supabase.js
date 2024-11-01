const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Validasi environment variables
if (!supabaseUrl || !supabaseKey || !supabaseServiceRoleKey) {
  console.error('Missing Supabase credentials:', {
    url: !!supabaseUrl,
    key: !!supabaseKey,
    serviceKey: !!supabaseServiceRoleKey
  });
  process.exit(1);
}

// Buat client dengan retry logic
const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: false,
    detectSessionInUrl: false
  },
  db: {
    schema: 'public'
  },
  global: {
    headers: { 'x-application-name': 'kejaksaan-app' }
  }
});

// Client admin dengan konfigurasi terpisah
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  },
  db: {
    schema: 'public'
  }
});

// Fungsi untuk test koneksi
const testConnection = async () => {
  try {
    const { error } = await supabase.auth.getSession();
    if (error) {
      console.error('Supabase connection error:', error.message);
      return false;
    }
    console.log('Supabase connection successful');
    return true;
  } catch (err) {
    console.error('Failed to test connection:', err);
    return false;
  }
};

module.exports = {
  supabase,
  supabaseAdmin,
  testConnection
};