const { supabase } = require('../config/supabase');

const sendNotification = async (io, userId, notification) => {
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

    io.to(userId).emit('notification', data);
    return data;
  } catch (error) {
    console.error('Error sending notification:', error);
    throw error;
  }
};

module.exports = { sendNotification }; 