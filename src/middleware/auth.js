const { supabase } = require('../config/supabase');

const verifyToken = async (req, res, next) => {
  try {
    console.log('Request headers:', req.headers);
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      console.log('No token provided');
      return res.status(401).json({
        success: false,
        error: 'Token tidak ditemukan'
      });
    }

    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error) {
      console.error('Token verification error:', error);
      return res.status(401).json({
        success: false,
        error: 'Token tidak valid'
      });
    }

    req.user = {
      userId: user.id,
      email: user.email,
      role: user.role
    };

    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(401).json({
      success: false,
      error: 'Gagal memverifikasi token'
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