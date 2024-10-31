const express = require('express');
const router = express.Router();
const { supabase } = require('../config/supabase');
const { verifyToken } = require('../middleware/auth');

router.get('/', verifyToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    
    const { data: notifications, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json({
      success: true,
      data: notifications
    });

  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({
      success: false,
      error: 'Gagal mengambil notifikasi'
    });
  }
});

router.get('/unread', verifyToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    
    const { data, error } = await supabase
      .from('notifications')
      .select('count')
      .eq('user_id', userId)
      .eq('is_read', false)
      .single();

    if (error) throw error;

    res.json({
      success: true,
      count: data?.count || 0
    });

  } catch (error) {
    console.error('Error fetching unread notifications:', error);
    res.status(500).json({
      success: false,
      error: 'Gagal mengambil jumlah notifikasi'
    });
  }
});

module.exports = router; 