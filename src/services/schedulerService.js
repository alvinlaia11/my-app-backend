const cron = require('node-cron');
const { supabase } = require('../config/supabase');
const { sendNotification } = require('./notificationService');

const initializeScheduler = () => {
  console.log('Starting scheduler with config:', {
    timezone: process.env.TZ,
    currentTime: new Date().toISOString()
  });

  // Jalankan pengecekan setiap 30 detik
  cron.schedule('*/30 * * * * *', async () => {
    const now = new Date();
    console.log('\n=== Scheduler Check ===');
    console.log('Time:', now.toISOString());
    
    try {
      // Cek koneksi Supabase
      const { data: testData, error: testError } = await supabase
        .from('notifications')
        .select('count')
        .limit(1);
        
      console.log('Database connection test:', testError ? 'Failed' : 'Success');

      // Ambil notifikasi
      const { data: notifications, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('is_sent', false)
        .lte('schedule_date', now.toISOString());

      if (error) throw error;

      console.log(`Found ${notifications?.length || 0} pending notifications`);
      console.log('Notifications:', notifications);

      // Proses notifikasi
      if (notifications?.length > 0) {
        for (const notif of notifications) {
          console.log(`Processing notification ID: ${notif.id}`);
          await sendNotification(notif.user_id, {
            message: notif.message,
            type: 'reminder'
          });
          console.log('Notification sent');
          
          await supabase
            .from('notifications')
            .update({ is_sent: true })
            .eq('id', notif.id);
          console.log('Notification marked as sent');
        }
      }
    } catch (err) {
      console.error('Scheduler error:', err);
    }
  });
};

module.exports = { initializeScheduler }; 