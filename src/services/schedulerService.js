const cron = require('node-cron');
const { supabase } = require('../config/supabase');
const { sendNotification, createScheduleNotification } = require('./notificationService');
const moment = require('moment');

const checkUpcomingSchedules = async () => {
  try {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    
    const endOfTomorrow = new Date(tomorrow);
    endOfTomorrow.setHours(23, 59, 59, 999);

    const { data: cases, error } = await supabase
      .from('cases')
      .select('*')
      .eq('notification_sent', false)
      .gte('date', tomorrow.toISOString())
      .lte('date', endOfTomorrow.toISOString());

    if (error) throw error;

    for (const caseData of cases) {
      const { data: existingNotif, error: notifError } = await supabase
        .from('notifications')
        .select('id')
        .eq('case_id', caseData.id)
        .eq('type', 'schedule_reminder')
        .single();

      if (notifError && !existingNotif) {
        await createScheduleNotification(caseData.user_id, caseData);
        
        await supabase
          .from('cases')
          .update({ notification_sent: true })
          .eq('id', caseData.id);
      }
    }

    return cases.length;
  } catch (error) {
    console.error('Error checking upcoming schedules:', error);
    return 0;
  }
};

const initializeScheduler = () => {
  console.log('Starting scheduler with config:', {
    timezone: process.env.TZ,
    currentTime: moment().tz('Asia/Jakarta').format('YYYY-MM-DD HH:mm:ss')
  });

  cron.schedule('*/30 * * * * *', async () => {
    await checkUpcomingSchedules();
  });
};

module.exports = { initializeScheduler }; 