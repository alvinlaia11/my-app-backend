const { supabase } = require('../config/supabase');

const verifyToken = async (req, res, next) => {
  try {
    console.log('Request headers:', req.headers);
    const authHeader = req.headers.authorization;
    console.log('Auth header:', authHeader);

    if (!authHeader) {
      return res.status(401).json({
        success: false,
        error: 'Token tidak ditemukan'
      });
    }

    const token = authHeader.split(' ')[1];
    console.log('Token:', token);
    
    // Verifikasi token menggunakan getUser
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error) throw error;

    if (!user) {
      throw new Error('User tidak valid');
    }

    // Set user data ke request
    req.user = {
      userId: user.id,
      email: user.email,
      role: user.user_metadata?.role || 'user'
    };

    // Set global auth untuk supabase client
    await supabase.auth.setSession({
      access_token: token,
      refresh_token: null
    });
    
    next();
  } catch (error) {
    console.error('Auth error:', error);
    res.status(401).json({
      success: false,
      error: 'Token tidak valid'
    });
  }
};

const verifyAdmin = async (req, res, next) => {
  try {
    if (!req.user) {
      throw new Error('User tidak terautentikasi');
    }

    if (req.user.role !== 'admin') {
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
      error: 'Akses ditolak'
    });
  }
};

module.exports = {
  verifyToken,
  verifyAdmin
};