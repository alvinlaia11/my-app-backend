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

const createScheduleNotification = async (userId, caseData) => {
  try {
    const { data: existingNotif, error: checkError } = await supabase
      .from('notifications')
      .select('id')
      .eq('case_id', caseData.id)
      .eq('type', 'schedule_reminder')
      .single();

    if (existingNotif) {
      console.log(`Notification already exists for case ${caseData.id}`);
      return existingNotif;
    }

    const { data, error } = await supabase
      .from('notifications')
      .insert([
        {
          user_id: userId,
          message: `Pengingat: Jadwal "${caseData.title}" akan berlangsung besok pada ${new Date(caseData.date).toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`,
          type: 'schedule_reminder',
          is_read: false,
          case_id: caseData.id
        }
      ])
      .select()
      .single();

    if (error) throw error;

    await supabase
      .from('cases')
      .update({ notification_sent: true })
      .eq('id', caseData.id);

    return data;
  } catch (error) {
    console.error('Error creating schedule notification:', error);
    throw error;
  }
};

const markAllAsRead = async (userId) => {
  try {
    const { data, error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', userId)
      .eq('is_read', false);

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    throw error;
  }
};

module.exports = { createNotification, createScheduleNotification, markAllAsRead }; 