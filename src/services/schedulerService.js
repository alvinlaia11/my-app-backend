const cron = require('node-cron');
const { supabase } = require('../config/supabase');
const { sendNotification } = require('./notificationService');

// Jalankan setiap menit
cron.schedule('* * * * *', async () => {
  try {
    const now = new Date();
    
    // Ambil notifikasi yang sudah waktunya dikirim
    const { data: notifications, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('is_sent', false)
      .lte('schedule_date', now.toISOString())
      .eq('type', 'schedule');  // Tambahkan filter untuk tipe schedule

    if (error) throw error;
    console.log('Found scheduled notifications:', notifications);

    // Kirim notifikasi
    if (notifications?.length > 0) {
      for (const notification of notifications) {
        try {
          await sendNotification(notification.user_id, {
            message: notification.message,
            type: 'schedule'
          });

          // Update status notifikasi
          const { error: updateError } = await supabase
            .from('notifications')
            .update({ is_sent: true })
            .eq('id', notification.id);

          if (updateError) throw updateError;
        } catch (error) {
          console.error('Error processing notification:', error);
        }
      }
    }
  } catch (error) {
    console.error('Scheduler error:', error);
  }
}); 