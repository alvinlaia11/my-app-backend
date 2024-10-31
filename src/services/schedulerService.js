const cron = require('node-cron');
const { supabase } = require('../config/supabase');
const { sendNotification } = require('./notificationService');

const initializeScheduler = () => {
  console.log('Starting notification scheduler...');
  
  console.log('Scheduler initialized at:', new Date().toISOString());
  
  cron.schedule('* * * * *', async () => {
    try {
      const now = new Date();
      console.log('\n--- Scheduler Check ---');
      console.log('Running check at:', now.toISOString());
      
      // Ambil notifikasi yang belum dikirim
      const { data: notifications, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('is_sent', false)
        .lte('schedule_date', now.toISOString());

      if (error) {
        console.error('Error fetching notifications:', error);
        return;
      }

      console.log(`Found ${notifications?.length || 0} notifications to process`);
      
      if (notifications?.length > 0) {
        console.log('Notifications:', notifications);
      }
    } catch (error) {
      console.error('Scheduler error:', error);
    }
  });
};

module.exports = { initializeScheduler }; 