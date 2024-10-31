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

module.exports = router; 