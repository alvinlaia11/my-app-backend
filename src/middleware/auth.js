const { supabase } = require('../config/supabase');

const verifyToken = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Token tidak ditemukan'
      });
    }

    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      console.error('Token verification error:', error);
      return res.status(401).json({
        success: false,
        error: 'Token tidak valid'
      });
    }

    // Set basic user data
    req.user = {
      id: user.id,
      email: user.email,
      role: user.user_metadata?.role || 'user'
    };
    
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(401).json({
      success: false,
      error: 'Unauthorized'
    });
  }
};

const verifyAdmin = async (req, res, next) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        error: 'User tidak terautentikasi'
      });
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
      error: 'Akses ditolak: ' + error.message
    });
  }
};

// Middleware untuk memastikan session masih valid
const validateSession = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Token tidak ditemukan'
      });
    }

    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error || !session) {
      return res.status(401).json({
        success: false,
        error: 'Session tidak valid'
      });
    }

    next();
  } catch (error) {
    console.error('Session validation error:', error);
    res.status(401).json({
      success: false,
      error: 'Session tidak valid'
    });
  }
};

module.exports = {
  verifyToken,
  verifyAdmin,
  validateSession
};