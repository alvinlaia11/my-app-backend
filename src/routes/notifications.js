const express = require('express');
const router = express.Router();
const { supabase } = require('../config/supabase');
const { verifyToken } = require('../middleware/auth');
const { createScheduledNotification } = require('../services/notificationService');

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
      .select('*', { count: 'exact' })
      .eq('user_id', userId)
      .eq('is_read', false);

    if (error) throw error;

    res.json({
      success: true,
      count: data.length
    });

  } catch (error) {
    console.error('Error fetching unread notifications:', error);
    res.status(500).json({
      success: false,
      error: 'Gagal mengambil jumlah notifikasi'
    });
  }
});

router.post('/schedule', verifyToken, async (req, res) => {
  try {
    const { message, scheduleDate } = req.body;
    const userId = req.user.userId;

    console.log('Creating scheduled notification:', {
      userId,
      message,
      scheduleDate
    });

    const notification = await createScheduledNotification(userId, message, scheduleDate);
    
    res.json({
      success: true,
      data: notification
    });
  } catch (error) {
    console.error('Error scheduling notification:', error);
    res.status(500).json({
      success: false,
      error: 'Gagal membuat notifikasi terjadwal'
    });
  }
});

router.put('/read/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    const { data, error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw error;

    res.json({
      success: true,
      data
    });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({
      success: false,
      error: 'Gagal mengupdate status notifikasi'
    });
  }
});

router.post('/test-scheduler', verifyToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const now = new Date();
    const testDate = new Date(now.getTime() + 1 * 60000); // 1 menit dari sekarang
    
    const notification = await createScheduledNotification(
      userId,
      "Test notification - akan muncul dalam 1 menit",
      testDate.toISOString()
    );

    res.json({
      success: true,
      message: 'Test notification created',
      data: notification
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to create test notification'
    });
  }
});

router.get('/test-connection', verifyToken, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('notifications')
      .select('count')
      .limit(1);
      
    res.json({
      success: true,
      dbConnection: error ? 'Failed' : 'Success',
      scheduler: 'Running',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Connection test failed'
    });
  }
});

module.exports = router; 