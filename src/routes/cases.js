const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const { supabase } = require('../config/supabase');
const { createScheduleNotification } = require('../services/notificationService');

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

// POST /api/cases - Tambah kasus baru
router.post('/', verifyToken, async (req, res) => {
  try {
    const { title, date, description, parties, type } = req.body;
    const userId = req.user.userId;

    // Validasi input
    if (!title || !date || !type) {
      return res.status(400).json({
        success: false,
        error: 'Judul, tanggal, dan tipe kasus harus diisi'
      });
    }

    // Simulasi loading dengan delay 1 detik
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Insert ke database
    const { data: newCase, error } = await supabase
      .from('cases')
      .insert({
        title,
        date,
        description,
        parties,
        type,
        user_id: userId,
        created_by: userId,
        notification_sent: false
      })
      .select()
      .single();

    if (error) throw error;

    // Cek apakah jadwal besok
    const scheduleDate = new Date(date);
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (scheduleDate.toDateString() === tomorrow.toDateString()) {
      setTimeout(async () => {
        try {
          await createScheduleNotification(userId, newCase);
        } catch (err) {
          console.error('Error creating notification:', err);
        }
      }, 10000);
    }

    res.json({
      success: true,
      data: newCase
    });

  } catch (error) {
    console.error('Error creating case:', error);
    res.status(500).json({
      success: false,
      error: 'Gagal menambahkan kasus: ' + error.message
    });
  }
});

module.exports = router;