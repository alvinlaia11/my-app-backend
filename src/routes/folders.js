const express = require('express');
const router = express.Router();
const { supabase } = require('../config/supabase');
const { verifyToken } = require('../middleware/auth');

router.post('/', verifyToken, async (req, res) => {
  try {
    const { name, path = '' } = req.body;
    const userId = req.user.id;

    console.log('Creating folder with:', { name, path, userId });

    if (!name || name.trim() === '') {
      return res.status(400).json({
        success: false,
        error: 'Nama folder tidak boleh kosong'
      });
    }

    // Cek folder duplikat
    const { data: existingFolder, error: checkError } = await supabase
      .from('folders')
      .select('*')
      .eq('user_id', userId)
      .eq('path', path)
      .eq('name', name.trim())
      .single();

    if (existingFolder) {
      return res.status(400).json({
        success: false,
        error: 'Folder dengan nama tersebut sudah ada'
      });
    }

    // Insert folder baru
    const { data: folder, error: insertError } = await supabase
      .from('folders')
      .insert({
        name: name.trim(),
        path,
        user_id: userId
      })
      .select()
      .single();

    if (insertError) throw insertError;

    console.log('Folder created:', folder);

    res.json({
      success: true,
      data: {
        id: folder.id,
        name: folder.name,
        type: 'folder',
        created_at: folder.created_at
      }
    });

  } catch (error) {
    console.error('Create folder error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Gagal membuat folder'
    });
  }
});

module.exports = router;
