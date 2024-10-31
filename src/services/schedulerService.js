const cron = require('node-cron');
const { supabase } = require('../config/supabase');
const { sendNotification } = require('./notificationService');
const moment = require('moment');

const initializeScheduler = () => {
  console.log('Starting scheduler with config:', {
    timezone: process.env.TZ,
    currentTime: moment().tz('Asia/Jakarta').format('YYYY-MM-DD HH:mm:ss')
  });

  cron.schedule('*/30 * * * * *', async () => {
    try {
      const jakartaTime = moment().tz('Asia/Jakarta');
      
      console.log('\n=== Scheduler Check ===');
      console.log('Current Jakarta time:', jakartaTime.format('YYYY-MM-DD HH:mm:ss'));
      
      console.log('Checking for notifications scheduled before:', jakartaTime.format('YYYY-MM-DD HH:mm:ss'));
      
      const { data: notifications, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('is_sent', false)
        .lte('schedule_date', jakartaTime.format('YYYY-MM-DD HH:mm:ss'));

      if (error) throw error;

      console.log('Raw notifications found:', notifications);
      console.log(`Found ${notifications?.length || 0} pending notifications`);

      if (notifications?.length > 0) {
        for (const notif of notifications) {
          console.log('Processing notification:', {
            id: notif.id,
            schedule_date: notif.schedule_date,
            current_time: jakartaTime.format('YYYY-MM-DD HH:mm:ss')
          });
          
          await sendNotification(notif.user_id, {
            message: notif.message,
            type: 'reminder'
          });
          
          await supabase
            .from('notifications')
            .update({ 
              is_sent: true,
              sent_at: jakartaTime.format('YYYY-MM-DD HH:mm:ss')
            })
            .eq('id', notif.id)
            .eq('user_id', notif.user_id);
        }
      }
    } catch (err) {
      console.error('Scheduler error:', err);
    }
  });
};

module.exports = { initializeScheduler }; 