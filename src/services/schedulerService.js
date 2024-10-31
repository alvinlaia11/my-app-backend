const cron = require('node-cron');
const { supabase } = require('../config/supabase');
const { sendNotification } = require('./notificationService');

const initializeScheduler = () => {
  console.log('Starting scheduler with config:', {
    timezone: process.env.TZ,
    currentTime: new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })
  });

  cron.schedule('*/30 * * * * *', async () => {
    try {
      const now = new Date();
      const jakartaTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Jakarta' }));
      
      console.log('\n=== Scheduler Check ===');
      console.log('Server time:', now.toISOString());
      console.log('Jakarta time:', jakartaTime.toISOString());
      
      const { data: notifications, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('is_sent', false)
        .lte('schedule_date', jakartaTime.toISOString());

      if (error) throw error;

      console.log(`Found ${notifications?.length || 0} pending notifications`);

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