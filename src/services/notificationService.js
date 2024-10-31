const { supabase } = require('../config/supabase');

const sendNotification = async (userId, notification) => {
  try {
    const { data, error } = await supabase
      .from('notifications')
      .insert([{
        user_id: userId,
        message: notification.message,
        type: notification.type,
        is_read: false,
        created_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error sending notification:', error);
    throw error;
  }
};

const createScheduledNotification = async (userId, message, scheduleDate) => {
  try {
    const { data, error } = await supabase
      .from('notifications')
      .insert([{
        user_id: userId,
        message: message,
        type: 'schedule',
        is_read: false,
        schedule_date: scheduleDate,
        created_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error creating scheduled notification:', error);
    throw error;
  }
};

module.exports = { sendNotification, createScheduledNotification }; 