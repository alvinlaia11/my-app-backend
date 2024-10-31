const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const { supabase } = require('../config/supabase');

// GET /api/user/profile
router.get('/profile', verifyToken, async (req, res) => {
  try {
    const userId = req.user.userId;

    // Ambil data profil dari tabel user_profiles
    const { data: profile, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) throw error;

    if (!profile) {
      // Jika profil belum ada, buat profil baru
      const { data: newProfile, error: createError } = await supabase
        .from('user_profiles')
        .insert({
          user_id: userId,
          email: req.user.email,
          username: req.user.email.split('@')[0],
          role: req.user.role
        })
        .select()
        .single();

      if (createError) throw createError;
      
      return res.json(newProfile);
    }

    res.json(profile);

  } catch (error) {
    console.error('Error in profile endpoint:', error);
    res.status(500).json({
      success: false,
      error: 'Gagal mengambil profil: ' + error.message
    });
  }
});

// PUT /api/user/profile
router.put('/profile', verifyToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { username, position, phone, office } = req.body;

    const { data, error } = await supabase
      .from('profiles')
      .update({
        username,
        position,
        phone,
        office,
        updated_at: new Date()
      })
      .eq('id', userId)
      .select()
      .single();

    if (error) throw error;

    res.json({
      success: true,
      data
    });

  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({
      success: false,
      error: 'Gagal memperbarui profil'
    });
  }
});

module.exports = router; 