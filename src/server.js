const express = require('express');
const cors = require('cors');
const fileUpload = require('express-fileupload');
const userRouter = require('./routes/user');
const authRouter = require('./routes/auth');
const casesRouter = require('./routes/cases');
const { createClient } = require('@supabase/supabase-js');
const { supabase } = require('./config/supabase');

const app = express();

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept']
}));

app.use(express.json());
app.use(fileUpload());

// Logging middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    // Basic check tanpa Supabase dulu
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'backend-kejaksaan',
      uptime: process.uptime(),
      env: {
        nodeEnv: process.env.NODE_ENV,
        hasSupabaseUrl: !!process.env.SUPABASE_URL,
        hasSupabaseKey: !!process.env.SUPABASE_ANON_KEY,
        hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
        port: process.env.PORT,
        frontendUrl: process.env.FRONTEND_URL
      }
    });
  } catch (error) {
    console.error('Health check error:', error);
    res.status(500).json({
      status: 'error',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Register routes dengan prefix /api
app.use('/api/auth', authRouter);
app.use('/api/user', userRouter);
app.use('/api/cases', casesRouter);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error details:', {
    message: err.message,
    stack: err.stack,
    path: req.path
  });
  
  res.status(err.status || 500).json({
    status: 'error',
    code: err.status || 500,
    message: err.message || 'Internal Server Error',
    request_id: req.headers['x-request-id']
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    status: 'error',
    code: 404,
    message: 'Endpoint tidak ditemukan',
    path: req.path
  });
});

const PORT = process.env.PORT || 5000;

// Tambahkan logging saat startup
console.log('Starting server with config:', {
  port: PORT,
  nodeEnv: process.env.NODE_ENV,
  hasSupabaseUrl: !!process.env.SUPABASE_URL,
  hasSupabaseKey: !!process.env.SUPABASE_ANON_KEY,
  hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
  corsOrigin: process.env.FRONTEND_URL || 'http://localhost:3000'
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;
