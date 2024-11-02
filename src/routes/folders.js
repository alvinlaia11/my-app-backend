const express = require('express');
const router = express.Router();
const { supabase } = require('../config/supabase');
const { verifyToken } = require('../middleware/auth');

router.use(verifyToken);

// POST endpoint untuk membuat folder
router.post('/', async (req, res) => {
  try {
    const { name, path = '' } = req.body;
    const userId = req.user.userId;

    if (!name || name.trim() === '') {
      return res.status(400).json({
        success: false,
        error: 'Nama folder tidak boleh kosong'
      });
    }

    // Cek folder duplikat
    const { data: existingFolder } = await supabase
      .from('folders')
      .select('id')
      .eq('user_id', userId)
      .eq('name', name)
      .eq('path', path)
      .single();

    if (existingFolder) {
      return res.status(400).json({
        success: false,
        error: 'Folder dengan nama tersebut sudah ada'
      });
    }

    // Insert ke database
    const { data: folder, error } = await supabase
      .from('folders')
      .insert({
        name,
        path,
        user_id: userId
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
