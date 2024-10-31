const cron = require('node-cron');
const { supabase } = require('../config/supabase');
const { sendNotification } = require('./notificationService');

const initializeScheduler = () => {
  console.log('Starting notification scheduler...');
  
  cron.schedule('* * * * *', async () => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] Running notification check...`);
    
    try {
      const now = new Date();
      
      // Log timezone untuk debugging
      console.log('Server timezone:', Intl.DateTimeFormat().resolvedOptions().timeZone);
      console.log('Current time:', now.toISOString());
      
      const { data: notifications, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('is_sent', false)
        .lte('schedule_date', now.toISOString())
        .eq('type', 'schedule');

      console.log('Query result:', { notifications, error });

      if (notifications?.length > 0) {
        console.log(`Found ${notifications.length} notifications to process`);
        
        for (const notification of notifications) {
          console.log('Processing notification:', notification);
          
          try {
            await sendNotification(notification.user_id, {
              message: notification.message,
              type: 'reminder'
            });
            
            console.log('Notification sent successfully');

            await supabase
              .from('notifications')
              .update({ is_sent: true })
              .eq('id', notification.id);
              
            console.log('Notification marked as sent');
          } catch (error) {
            console.error('Error processing notification:', error);
          }
        }
      } else {
        console.log('No notifications to process');
      }
    } catch (error) {
      console.error('Scheduler error:', error);
    }
  });
};

module.exports = { initializeScheduler }; 