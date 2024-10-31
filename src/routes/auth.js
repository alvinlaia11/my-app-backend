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

    // Buat profil user
    const { error: profileError } = await supabase
      .from('user_profiles')
      .insert({
        user_id: data.user.id,
        email: data.user.email,
        username: email.split('@')[0], // Default username dari email
        role: 'user'
      });

    if (profileError) {
      console.error('Error creating profile:', profileError);
      // Rollback user creation jika gagal membuat profil
      await supabaseAdmin.auth.admin.deleteUser(data.user.id);
      throw new Error('Gagal membuat profil user');
    }

    res.json({
      success: true,
      session: data.session,
      user: data.user
    });

  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({
      success: false,
      error: 'Gagal melakukan pendaftaran: ' + error.message
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

    // Buat user baru menggunakan supabaseAdmin
    const { data: { user }, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        username,
        role: 'user'
      }
    });

    if (createError) throw createError;

    // Buat profil user
    const { error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: user.id,
        username,
        email,
        role: 'user',
        created_at: new Date().toISOString()
      });

    if (profileError) {
      // Rollback - hapus user jika gagal membuat profil
      await supabaseAdmin.auth.admin.deleteUser(user.id);
      throw profileError;
    }

    res.json({
      success: true,
      message: 'User berhasil dibuat',
      user: {
        id: user.id,
        email: user.email,
        username: user.user_metadata.username,
        role: user.user_metadata.role
      }
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
    const { data, error } = await supabaseAdmin.auth.admin.listUsers();
    
    if (error) throw error;

    const users = data.users.map(user => ({
      id: user.id,
      email: user.email,
      user_metadata: user.user_metadata || {},
      status: user.status || 'active'
    }));

    res.json({
      success: true,
      users
    });

  } catch (error) {
    console.error('Error in GET /users:', error);
    res.status(500).json({
      success: false,
      error: 'Gagal mengambil daftar user: ' + error.message
    });
  }
});

// PUT /api/auth/users/:id
router.put('/users/:id', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { email, password, username, position, phone, office } = req.body;
    
    const updateData = {
      email,
      user_metadata: {
        username,
        position,
        phone,
        office,
        role: 'user'
      }
    };

    if (password) {
      updateData.password = password;
    }

    const { data: { user }, error } = await supabaseAdmin.auth.admin.updateUserById(
      id,
      updateData
    );

    if (error) throw error;

    res.json({
      success: true,
      user
    });

  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({
      success: false,
      error: 'Gagal mengupdate user: ' + error.message
    });
  }
});

// DELETE /api/auth/users/:id
router.delete('/users/:id', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    const { error } = await supabaseAdmin.auth.admin.deleteUser(id);

    if (error) throw error;

    res.json({
      success: true,
      message: 'User berhasil dihapus'
    });

  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({
      success: false, 
      error: 'Gagal menghapus user: ' + error.message
    });
  }
});

// GET /api/auth/profile
router.get('/profile', verifyToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    console.log('Fetching profile for user:', userId);

    // Cek dan buat profil jika belum ada
    const { data: profile, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    if (!profile) {
      const { data: newProfile, error: createError } = await supabase
        .from('user_profiles')
        .upsert({
          user_id: userId,
          email: req.user.email,
          username: req.user.email.split('@')[0],
          role: req.user.role || 'user'
        })
        .select()
        .single();

      if (createError) throw createError;

      return res.json({
        success: true,
        profile: newProfile
      });
    }

    res.json({
      success: true,
      profile
    });

  } catch (error) {
    console.error('Error in profile endpoint:', error);
    res.status(500).json({
      success: false,
      error: 'Gagal mengambil profil: ' + error.message
    });
  }
});

module.exports = router;