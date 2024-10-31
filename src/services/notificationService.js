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
    const scheduleDateObj = new Date(scheduleDate);
    if (isNaN(scheduleDateObj.getTime())) {
      throw new Error('Invalid schedule date');
    }

    const { data, error } = await supabase
      .from('notifications')
      .insert([{
        user_id: userId,
        message: message,
        is_read: false,
        is_sent: false,
        schedule_date: scheduleDateObj.toISOString(),
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