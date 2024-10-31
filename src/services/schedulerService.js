const cron = require('node-cron');
const { supabase } = require('../config/supabase');
const { sendNotification } = require('./notificationService');

// Jalankan setiap menit
cron.schedule('* * * * *', async () => {
  try {
    const now = new Date();
    console.log('Checking scheduled notifications at:', now);
    
    // Ambil notifikasi yang belum dikirim dan waktunya sudah tiba
    const { data: notifications, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('is_sent', false)
      .lte('schedule_date', now.toISOString())
      .eq('type', 'schedule');

    console.log('Found notifications:', notifications);

    if (notifications?.length > 0) {
      for (const notification of notifications) {
        try {
          // Kirim notifikasi baru
          await sendNotification(notification.user_id, {
            message: notification.message,
            type: 'reminder'
          });

          // Update status notifikasi yang dijadwalkan
          await supabase
            .from('notifications')
            .update({ is_sent: true })
            .eq('id', notification.id);

        } catch (error) {
          console.error('Error processing notification:', error);
        }
      }
    }
  } catch (error) {
    console.error('Scheduler error:', error);
  }
}); 