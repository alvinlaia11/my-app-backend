const express = require('express');
const router = express.Router();
const { supabase, supabaseAdmin } = require('../config/supabase');
const { verifyToken, verifyAdmin } = require('../middleware/auth');
const crypto = require('crypto');
const { createScheduleNotification } = require('../services/notificationService');

// POST /api/auth/signin
router.post('/signin', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email dan password harus diisi'
      });
    }

    // Login dengan Supabase Auth
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      console.error('Signin error:', error);
      return res.status(401).json({
        success: false,
        error: 'Email atau password salah'
      });
    }

    // Ambil profil user
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', data.user.id)
      .single();

    if (!profileError && profile) {
      data.user.profile = profile;
    }

    res.json({
      success: true,
      user: data.user,
      session: data.session,
      token: data.session.access_token
    });

  } catch (error) {
    console.error('Signin error:', error);
    res.status(500).json({
      success: false,
      error: 'Gagal melakukan login'
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
    const { error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .insert({
        user_id: data.user.id,
        email: data.user.email,
        username: email.split('@')[0],
        role: 'user'
      });

    if (profileError) {
      console.error('Error creating profile:', profileError);
      await supabaseAdmin.auth.admin.deleteUser(data.user.id);
      throw new Error('Gagal membuat profil user: ' + profileError.message);
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

// POST /api/auth/create-user (Admin only)
router.post('/create-user', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { email, password, username, position, phone, office } = req.body;

    if (!email || !password || !username) {
      return res.status(400).json({
        success: false,
        error: 'Email, password, dan username harus diisi'
      });
    }

    // Buat user baru menggunakan supabaseAdmin
    const { data, error: signupError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        username,
        position,
        phone,
        office,
        role: 'user'
      }
    });

    if (signupError) throw signupError;

    res.json({
      success: true,
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
router.post('/verify', verifyToken, async (req, res) => {
  try {
    res.json({
      success: true,
      user: req.user
    });
  } catch (error) {
    console.error('Token verification error:', error);
    res.status(401).json({
      success: false,
      error: 'Token tidak valid'
    });
  }
});

// GET /api/auth/users (Admin only)
router.get('/users', verifyToken, verifyAdmin, async (req, res) => {
  try {
    console.log('Fetching users, requester:', req.user.id);
    
    const { data: profiles, error: profilesError } = await supabase
      .from('user_profiles')
      .select(`
        *,
        auth_user:user_id (
          email,
          last_sign_in_at,
          created_at
        )
      `)
      .order('created_at', { ascending: false });

    if (profilesError) {
      console.error('Error fetching profiles:', profilesError);
      throw profilesError;
    }

    console.log('Found profiles:', profiles.length);

    const formattedUsers = profiles.map(profile => ({
      id: profile.user_id,
      email: profile.auth_user?.email,
      username: profile.username,
      position: profile.position,
      phone: profile.phone,
      office: profile.office,
      role: profile.role,
      status: profile.status,
      last_login: profile.auth_user?.last_sign_in_at,
      created_at: profile.created_at
    }));

    res.json({
      success: true,
      users: formattedUsers
    });

  } catch (error) {
    console.error('Error in /users endpoint:', error);
    res.status(500).json({
      success: false,
      error: 'Gagal mengambil data pengguna: ' + error.message
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

    const { data: profile, error } = await supabaseAdmin
      .from('user_profiles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      console.error('Database error:', error);
      throw error;
    }

    if (!profile) {
      console.log('Creating new profile for user:', userId);
      const { data: newProfile, error: createError } = await supabaseAdmin
        .from('user_profiles')
        .insert({
          id: crypto.randomUUID(),
          user_id: userId,
          email: req.user.email,
          username: req.user.email.split('@')[0],
          role: req.user.role || 'user'
        })
        .select()
        .single();

      if (createError) {
        console.error('Error creating profile:', createError);
        throw createError;
      }

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

// POST /api/auth/verify
router.post('/verify', verifyToken, async (req, res) => {
  try {
    const { data: session } = await supabase.auth.getSession();
    
    if (!session) {
      throw new Error('Invalid session');
    }

    res.json({
      success: true,
      user: req.user,
      session: session.data.session
    });
  } catch (error) {
    console.error('Token verification error:', error);
    res.status(401).json({
      success: false,
      error: 'Token tidak valid'
    });
  }
});

// Tambahkan fungsi ini setelah user berhasil login
const checkUpcomingSchedules = async (userId) => {
  try {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    
    const endOfTomorrow = new Date(tomorrow);
    endOfTomorrow.setHours(23, 59, 59, 999);

    // Ambil jadwal besok yang belum dinotifikasi
    const { data: cases, error } = await supabase
      .from('cases')
      .select('*')
      .eq('user_id', userId)
      .eq('notification_sent', false)
      .gte('date', tomorrow.toISOString())
      .lte('date', endOfTomorrow.toISOString());

    if (error) throw error;

    // Proses setiap jadwal
    const notifications = [];
    for (const caseData of cases) {
      // Cek apakah notifikasi sudah ada
      const { data: existingNotif } = await supabase
        .from('notifications')
        .select('id')
        .eq('case_id', caseData.id)
        .eq('type', 'schedule_reminder')
        .single();

      if (!existingNotif) {
        const notification = await createScheduleNotification(userId, caseData);
        notifications.push(notification);
      }
    }

    return notifications.length;
  } catch (error) {
    console.error('Error checking upcoming schedules:', error);
    return 0;
  }
};

module.exports = router;