const express = require('express');
const router = express.Router();
const { supabase } = require('../config/supabase');
const { verifyToken } = require('../middleware/auth');

router.use(verifyToken);

// POST endpoint untuk membuat folder
router.post('/', verifyToken, async (req, res) => {
  try {
    const { name, path = '' } = req.body;
    const userId = req.user.id;

    if (!name || name.trim() === '') {
      return res.status(400).json({
        success: false,
        error: 'Nama folder tidak boleh kosong'
      });
    }

    // Insert ke database
    const { data: folder, error } = await supabase
      .from('folders')
      .insert({
        name,
        path,
        user_id: userId,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;

    res.json({
      success: true,
      folder
    });

  } catch (error) {
    console.error('Create folder error:', error);
    res.status(500).json({
      success: false,
      error: 'Gagal membuat folder: ' + error.message
    });
  }
});

module.exports = router;
