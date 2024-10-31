const cron = require('node-cron');
const { supabase } = require('../config/supabase');
const { sendNotification } = require('./notificationService');

const initializeScheduler = () => {
  console.log('Starting notification scheduler...');
  
  cron.schedule('* * * * *', async () => {
    try {
      const now = new Date();
      console.log('Current server time:', now);
      console.log('Server timezone:', process.env.TZ || Intl.DateTimeFormat().resolvedOptions().timeZone);
      console.log('ISO time:', now.toISOString());
      
      // Ambil notifikasi yang belum dikirim
      const { data: notifications, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('is_sent', false)
        .eq('type', 'schedule')
        .lte('schedule_date', now.toISOString());

      console.log('Query params:', {
        is_sent: false,
        type: 'schedule',
        schedule_date_lte: now.toISOString()
      });

      if (error) {
        console.error('Error fetching notifications:', error);
        return;
      }

      console.log('Found notifications:', notifications);

      if (notifications?.length > 0) {
        for (const notification of notifications) {
          try {
            // Kirim notifikasi baru
            const newNotif = await sendNotification(notification.user_id, {
              message: notification.message,
              type: 'reminder'
            });
            
            console.log('New notification created:', newNotif);

            // Update status notifikasi lama
            const { error: updateError } = await supabase
              .from('notifications')
              .update({ is_sent: true })
              .eq('id', notification.id);

            if (updateError) {
              console.error('Error updating notification:', updateError);
            }
          } catch (error) {
            console.error('Error processing notification:', error);
          }
        }
      }
    } catch (error) {
      console.error('Scheduler error:', error);
    }
  });
};

module.exports = { initializeScheduler }; 