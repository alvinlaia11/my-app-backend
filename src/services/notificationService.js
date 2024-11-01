const { supabase } = require('../config/supabase');

const createNotification = async (userId, message, type = 'info') => {
  try {
    const { data, error } = await supabase
      .from('notifications')
      .insert([
        {
          user_id: userId,
          message: message,
          type: type,
          is_read: false
        }
      ]);

    if (error) throw error;
    return data[0];
  } catch (error) {
    console.error('Error creating notification:', error);
    throw error;
  }
};

module.exports = { createNotification }; 