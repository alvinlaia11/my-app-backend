const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const { supabase } = require('../config/supabase');

// GET /api/user/profile
router.get('/profile', verifyToken, async (req, res) => {
  try {
    const userId = req.user.userId;

    // Ambil data user dari tabel profiles
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) throw error;

    if (!profile) {
      return res.status(404).json({
        success: false,
        error: 'Profil tidak ditemukan'
      });
    }

    res.json({
      success: true,
      ...profile
    });

  } catch (error) {
    console.error('Error fetching profile:', error);
    res.status(500).json({
      success: false,
      error: 'Gagal mengambil data profil'
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