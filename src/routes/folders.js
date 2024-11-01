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

// DELETE /api/folders/:id
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    console.log('Attempting to delete folder:', { folderId: id, userId });

    // Cek folder exists dengan error handling yang lebih baik
    const { data: folders, error: fetchError } = await supabase
      .from('folders')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId);

    if (fetchError) {
      console.error('Error fetching folder:', fetchError);
      throw fetchError;
    }

    if (!folders || folders.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Folder tidak ditemukan'
      });
    }

    const folder = folders[0];

    // Hapus semua file dalam folder
    const { error: filesError } = await supabase
      .from('files')
      .delete()
      .eq('path', folder.path + '/' + folder.name)
      .eq('user_id', userId);

    if (filesError) {
      console.error('Error deleting files:', filesError);
      throw filesError;
    }

    // Hapus folder
    const { error: deleteError } = await supabase
      .from('folders')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (deleteError) {
      console.error('Error deleting folder:', deleteError);
      throw deleteError;
    }

    res.json({
      success: true,
      message: 'Folder berhasil dihapus'
    });

  } catch (error) {
    console.error('Delete folder error:', error);
    res.status(500).json({
      success: false,
      error: 'Gagal menghapus folder: ' + error.message
    });
  }
});

module.exports = router;
