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
    console.log('Creating scheduled notification:', {
      userId,
      message,
      scheduleDate
    });

    const { data, error } = await supabase
      .from('notifications')
      .insert([{
        user_id: userId,
        message: message,
        is_read: false,
        is_sent: false,
        schedule_date: scheduleDate,
        created_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (error) {
      console.error('Database error:', error);
      throw error;
    }

    console.log('Notification created:', data);
    return data;
  } catch (error) {
    console.error('Error creating scheduled notification:', error);
    throw error;
  }
};

module.exports = { sendNotification, createScheduledNotification }; 