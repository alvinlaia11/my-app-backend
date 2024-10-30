const express = require('express');
const router = express.Router();
const { supabase } = require('../config/supabase');
const { verifyToken } = require('../middleware/auth');

router.use(verifyToken);

// POST /api/folders/create
router.post('/create', async (req, res) => {
  try {
    const { name, path = '' } = req.body;
    const userId = req.user.userId;

    if (!name) {
      return res.status(400).json({
        success: false,
        error: 'Nama folder harus diisi'
      });
    }

    // Cek apakah folder sudah ada
    const { data: existingFolder } = await supabase
      .from('folders')
      .select('*')
      .eq('user_id', userId)
      .eq('path', path)
      .eq('name', name)
      .single();

    if (existingFolder) {
      return res.status(400).json({
        success: false,
        error: 'Folder dengan nama tersebut sudah ada'
      });
    }

    // Buat folder baru
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
      folder: {
        id: folder.id,
        name: folder.name,
        path: folder.path,
        created_at: folder.created_at
      }
    });

  } catch (error) {
    console.error('Create folder error:', error);
    res.status(500).json({
      success: false,
      error: 'Gagal membuat folder: ' + error.message
    });
  }
});

module.exports = { router };
