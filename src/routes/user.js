const express = require('express');
const router = express.Router();
const { supabase } = require('../config/supabase');
const { verifyToken } = require('../middleware/auth');
const fileUpload = require('express-fileupload');
const path = require('path');

router.use(verifyToken);
router.use(fileUpload());

// GET /api/user/profile
router.get('/profile', async (req, res) => {
  try {
    const userId = req.user.userId;
    console.log('Fetching user profile:', { userId });

    // Ambil profil dari database tanpa perlu akses admin
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (profileError && profileError.code === 'PGRST116') {
      // Buat profil baru jika belum ada
      const { data: newProfile, error: createError } = await supabase
        .from('user_profiles')
        .insert({
          user_id: userId,
          email: req.user.email,
          username: req.user.email.split('@')[0],
          role: req.user.role || 'user',
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (createError) throw createError;

      return res.json({
        success: true,
        profile: newProfile
      });
    }

    if (profileError) throw profileError;

    res.json({
      success: true,
      profile
    });

  } catch (error) {
    console.error('Error fetching profile:', error);
    res.status(500).json({
      success: false,
      error: 'Gagal mengambil profil: ' + error.message
    });
  }
});

// POST /api/user/avatar
router.post('/avatar', verifyToken, async (req, res) => {
  try {
    if (!req.files || !req.files.avatar) {
      return res.status(400).json({
        success: false,
        error: 'File avatar harus diupload'
      });
    }

    const avatar = req.files.avatar;
    const userId = req.user.userId;
    const filename = `${userId}-${Date.now()}${path.extname(avatar.name)}`;

    // Upload ke storage
    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filename, avatar.data, {
        contentType: avatar.mimetype,
        upsert: true
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      throw uploadError;
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('avatars')
      .getPublicUrl(filename);

    // Update user_profiles
    const { error: updateError } = await supabase
      .from('user_profiles')
      .update({ avatar_url: publicUrl })
      .eq('user_id', userId);

    if (updateError) throw updateError;

    res.json({
      success: true,
      avatar_url: publicUrl
    });

  } catch (error) {
    console.error('Avatar upload error:', error);
    res.status(500).json({
      success: false, 
      error: 'Gagal mengupload avatar: ' + error.message
    });
  }
});

// PUT /api/user/profile
router.put('/profile', verifyToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { username, email, position, phone, office } = req.body;

    // Update profile di database
    const { data, error } = await supabase
      .from('user_profiles')
      .update({
        username,
        email,
        position,
        phone,
        office,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw error;

    res.json(data);
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({
      success: false,
      error: 'Gagal memperbarui profil: ' + error.message
    });
  }
});

// GET /api/user/all - Mengambil semua user (admin only)
router.get('/all', verifyToken, async (req, res) => {
  try {
    // Cek apakah user adalah admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Akses ditolak: Hanya admin yang dapat mengakses'
      });
    }

    const { data: users, error } = await supabase.auth.admin.listUsers();

    if (error) throw error;

    // Ambil data tambahan dari user_profiles
    const { data: profiles, error: profileError } = await supabase
      .from('user_profiles')
      .select('*');

    if (profileError) throw profileError;

    // Gabungkan data users dengan profiles
    const enrichedUsers = users.users.map(user => {
      const profile = profiles.find(p => p.user_id === user.id) || {};
      return {
        ...user,
        profile
      };
    });

    res.json({
      success: true,
      users: enrichedUsers
    });

  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({
      success: false,
      error: 'Gagal mengambil data pengguna: ' + error.message
    });
  }
});

// POST /api/user/create - Membuat user baru (admin only)
router.post('/create', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Akses ditolak: Hanya admin yang dapat membuat user'
      });
    }

    const { email, password, username, role = 'user' } = req.body;

    // Buat user baru di Supabase Auth
    const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { username, role }
    });

    if (createError) throw createError;

    // Buat profil user
    const { error: profileError } = await supabase
      .from('user_profiles')
      .insert({
        user_id: newUser.user.id,
        email,
        username,
        role,
        created_at: new Date().toISOString()
      });

    if (profileError) throw profileError;

    res.json({
      success: true,
      user: newUser.user
    });

  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({
      success: false,
      error: 'Gagal membuat user: ' + error.message
    });
  }
});

module.exports = router; 