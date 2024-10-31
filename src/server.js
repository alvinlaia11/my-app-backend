const express = require('express');
const cors = require('cors');
const fileUpload = require('express-fileupload');
const path = require('path');
const { supabase } = require('./config/supabase');

const { router: filesRouter } = require('./routes/files');
const { router: authRouter } = require('./routes/auth');
const { router: foldersRouter } = require('./routes/folders');

const app = express();

// Tambahkan di awal setelah inisialisasi app
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});

app.use(express.json());
app.use(cors({
  origin: [
    "http://localhost:3000",
    "http://localhost:3002",
    "https://my-app-backend-production-ad9e.up.railway.app",
    "*" // sementara untuk testing
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

// Middleware untuk logging requests
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

app.use(fileUpload({
  createParentPath: true,
  limits: { 
    fileSize: 10 * 1024 * 1024 // 10MB
  },
  abortOnLimit: true,
  responseOnLimit: 'File terlalu besar, maksimal 10MB',
  debug: true
}));

// Health check endpoint
app.get('/health', (req, res) => {
  try {
    res.json({ 
      status: 'OK', 
      timestamp: new Date().toISOString(),
      env: process.env.NODE_ENV,
      port: process.env.PORT,
      supabase_url: process.env.SUPABASE_URL
    });
  } catch (error) {
    console.error('Health check error:', error);
    res.status(500).json({
      status: 'ERROR',
      error: error.message
    });
  }
});

// Daftarkan routes
app.use('/api/auth', authRouter);
app.use('/api/files', filesRouter);
app.use('/api/folders', foldersRouter);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal Server Error',
    message: err.message
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server berjalan di port ${PORT}`);
  console.log('CORS enabled for origins:', app.get('cors').origin);
  console.log('Environment:', process.env.NODE_ENV);
});