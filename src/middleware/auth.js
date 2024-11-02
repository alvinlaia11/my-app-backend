const { supabase } = require('../config/supabase');

const verifyToken = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) throw new Error('No token provided');

    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error) throw error;

    req.user = {
      userId: user.id,
      email: user.email
    };
    
    next();
  } catch (error) {
    console.error('Auth error:', error);
    res.status(401).json({
      success: false,
      error: 'Unauthorized'
    });
  }
};

const verifyAdmin = async (req, res, next) => {
  try {
    if (!req.user || !req.user.userId) {
      throw new Error('User tidak terautentikasi');
    }

    const { data: profile, error } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('user_id', req.user.userId)
      .single();

    if (error) throw error;

    if (!profile || profile.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Akses ditolak. Hanya admin yang diizinkan.'
      });
    }

    next();
  } catch (error) {
    console.error('Admin verification error:', error);
    res.status(403).json({
      success: false,
      error: 'Akses ditolak: ' + error.message
    });
  }
};

module.exports = {
  verifyToken,
  verifyAdmin
};