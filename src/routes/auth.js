const express = require('express');
const router = express.Router();
const { supabase } = require('../config/supabase');

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

// Endpoint verifikasi yang sudah ada
router.post('/verify', async (req, res) => {
  // ... kode yang sudah ada
});

module.exports = { router };