const express = require('express');
const router = express.Router();
const { supabase } = require('../config/supabase');
const { verifyToken } = require('../middleware/auth');

router.use(verifyToken);

// GET /api/user/profile
router.get('/profile', async (req, res) => {
  try {
    const userId = req.user.userId;

    // Coba ambil profil user
    const { data: profile, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    // Jika profil tidak ditemukan, buat profil baru
    if (error && error.code === 'PGRST116') {
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

    if (error) throw error;
    res.json(profile);

  } catch (error) {
    console.error('Error in profile endpoint:', error);
    res.status(500).json({
      success: false,
      error: 'Gagal mengambil profil: ' + error.message
    });
  }
});

module.exports = router; 