const express = require('express');
const router = express.Router();
const { supabase } = require('../config/supabase');
const { verifyToken } = require('../middleware/auth');

// GET /api/cases/:id
router.get('/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    const { data: caseData, error } = await supabase
      .from('cases')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    
    if (!caseData) {
      return res.status(404).json({
        success: false,
        error: 'Kasus tidak ditemukan'
      });
    }

    res.json({
      success: true,
      data: caseData
    });

  } catch (error) {
    console.error('Error fetching case:', error);
    res.status(500).json({
      success: false,
      error: 'Gagal mengambil data kasus'
    });
  }
});

// GET /api/cases (dengan filter tipe)
router.get('/', verifyToken, async (req, res) => {
  try {
    const { type } = req.query;
    let query = supabase.from('cases').select('*');
    
    if (type) {
      query = query.eq('type', type);
    }

    const { data, error } = await query.order('date', { ascending: false });

    if (error) throw error;

    res.json({
      success: true,
      data
    });

  } catch (error) {
    console.error('Error fetching cases:', error);
    res.status(500).json({
      success: false,
      error: 'Gagal mengambil daftar kasus'
    });
  }
});

// PUT /api/cases/:id
router.put('/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const { data, error } = await supabase
      .from('cases')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    res.json({
      success: true,
      data
    });

  } catch (error) {
    console.error('Error updating case:', error);
    res.status(500).json({
      success: false,
      error: 'Gagal mengupdate kasus'
    });
  }
});

// DELETE /api/cases/:id
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from('cases')
      .delete()
      .eq('id', id);

    if (error) throw error;

    res.json({
      success: true,
      message: 'Kasus berhasil dihapus'
    });

  } catch (error) {
    console.error('Error deleting case:', error);
    res.status(500).json({
      success: false,
      error: 'Gagal menghapus kasus'
    });
  }
});

module.exports = router;