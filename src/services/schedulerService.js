const cron = require('node-cron');
const { supabase } = require('../config/supabase');

// Jalankan setiap menit
cron.schedule('* * * * *', async () => {
  try {
    const now = new Date();
    
    // Ambil notifikasi yang sudah waktunya dikirim
    const { data: notifications, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('is_sent', false)
      .lte('schedule_date', now.toISOString());

    if (error) throw error;

    // Update status notifikasi
    if (notifications?.length > 0) {
      const { error: updateError } = await supabase
        .from('notifications')
        .update({ is_sent: true })
        .in('id', notifications.map(n => n.id));

      if (updateError) throw updateError;
    }
  } catch (error) {
    console.error('Scheduler error:', error);
  }
}); 