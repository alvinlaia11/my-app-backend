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
          message: `Pengingat: Jadwal "${caseData.title}" akan berlangsung besok pada ${new Date(caseData.date).toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} <span style="color: ${getCategoryColor(caseData.type)}; font-weight: bold; padding: 2px 8px; border-radius: 4px; background-color: ${getCategoryColor(caseData.type)}20;">${caseData.type}</span>`,
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

const getCategoryColor = (type) => {
  switch (type.toLowerCase()) {
    case 'penyelidikan':
      return '#4caf50';
    case 'penyidikan':
      return '#2196f3';
    case 'penuntutan':
      return '#ff9800';
    case 'eksekusi':
      return '#f44336';
    default:
      return '#757575';
  }
};

module.exports = { createNotification, createScheduleNotification, markAllAsRead, getCategoryColor }; 