const { supabase } = require('../config/supabase');

const verifyToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    console.log('Auth header:', authHeader);

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('Invalid auth header format');
      return res.status(401).json({
        success: false,
        error: 'Token tidak valid'
      });
    }

    const token = authHeader.split(' ')[1];
    console.log('Extracted token:', token);

    const { data: { user }, error } = await supabase.auth.getUser(token);
    console.log('Auth result:', { user, error });

    if (error || !user) {
      console.log('Auth failed:', error);
      throw new Error('Token tidak valid');
    }

    req.user = {
      userId: user.id,
      email: user.email,
      role: user.user_metadata?.role || 'user'
    };

    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
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