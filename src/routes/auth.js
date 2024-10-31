const express = require('express');
const router = express.Router();
const { supabase, supabaseAdmin } = require('../config/supabase');
const { verifyToken, verifyAdmin } = require('../middleware/auth');

// POST /api/auth/signin
router.post('/signin', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    console.log('Login attempt:', { email });

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email dan password harus diisi'
      });
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      console.log('Supabase auth error:', error);
      if (error.message === 'Invalid login credentials') {
        return res.status(401).json({
          success: false,
          error: 'Email atau password salah'
        });
      }
      throw error;
    }

    if (!data?.user) {
      throw new Error('User data tidak ditemukan');
    }

    console.log('Login success:', { user: data.user });

    res.json({
      success: true,
      session: data.session,
      user: data.user
    });

  } catch (error) {
    console.error('Sign in error:', error);
    res.status(401).json({
      success: false,
      error: error.message
    });
  }
});

// POST /api/auth/signup 
router.post('/signup', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    console.log('Signup attempt with Supabase config:', {
      hasUrl: !!process.env.SUPABASE_URL,
      hasKey: !!process.env.SUPABASE_ANON_KEY,
      email
    });

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email dan password harus diisi'
      });
    }

    try {
      const { error: pingError } = await supabase.auth.getSession();
      if (pingError) {
        console.error('Supabase connection test failed:', pingError);
        throw new Error('Tidak dapat terhubung ke layanan autentikasi');
      }
    } catch (pingError) {
      console.error('Connection test error:', pingError);
      return res.status(503).json({
        success: false,
        error: 'Layanan autentikasi sedang tidak tersedia'
      });
    }

    const signupPromise = supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: process.env.FRONTEND_URL || 'http://localhost:3000'
      }
    });

    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Signup timeout')), 10000)
    );

    const { data, error } = await Promise.race([signupPromise, timeoutPromise]);

    if (error) {
      console.error('Detailed signup error:', {
        message: error.message,
        status: error.status,
        details: error
      });
      throw error;
    }

    console.log('Signup success:', { userId: data?.user?.id });

    res.json({
      success: true,
      session: data.session,
      user: data.user
    });

  } catch (error) {
    console.error('Full signup error:', error);
    res.status(error.status || 500).json({
      success: false,
      error: 'Gagal melakukan pendaftaran: ' + (error.message || 'Unknown error'),
      details: process.env.NODE_ENV === 'development' ? error : undefined
    });
  }
});

// POST /api/auth/create-user
router.post('/create-user', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { email, password, username } = req.body;
    
    if (!email || !password || !username) {
      return res.status(400).json({
        success: false,
        error: 'Email, password, dan username harus diisi'
      });
    }

    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        username,
        role: 'user'
      }
    });

    if (error) throw error;

    const { error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .insert({
        user_id: data.user.id,
        username,
        email,
        created_at: new Date().toISOString()
      });

    if (profileError) throw profileError;

    res.json({
      success: true,
      message: 'User berhasil dibuat',
      user: data.user
    });

  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({
      success: false,
      error: 'Gagal membuat user: ' + error.message
    });
  }
});

// Endpoint verifikasi yang sudah ada
router.post('/verify', async (req, res) => {
  // ... kode yang sudah ada
});

// GET /api/auth/users
router.get('/users', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { data: { users }, error } = await supabaseAdmin.auth.admin.listUsers();
    
    if (error) throw error;

    res.json({
      success: true,
      users: users.map(user => ({
        id: user.id,
        email: user.email,
        username: user.user_metadata?.username || user.email,
        role: user.user_metadata?.role || 'user',
        created_at: user.created_at
      }))
    });

  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({
      success: false,
      error: 'Gagal mengambil daftar user: ' + error.message
    });
  }
});

module.exports = router;