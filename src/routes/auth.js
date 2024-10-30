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
    
    console.log('Signup attempt:', { email });

    const { data, error } = await supabase.auth.signUp({
      email,
      password
    });

    if (error) {
      console.log('Supabase signup error:', error);
      throw error;
    }

    console.log('Signup success:', { user: data.user });

    res.json({
      success: true,
      session: data.session,
      user: data.user
    });

  } catch (error) {
    console.error('Sign up error:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// Endpoint verifikasi yang sudah ada
router.post('/verify', async (req, res) => {
  // ... kode yang sudah ada
});

module.exports = { router };