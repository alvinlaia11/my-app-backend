const express = require('express');
const http = require('http');
const cors = require('cors');
const fileUpload = require('express-fileupload');
const path = require('path');
const { supabase } = require('./config/supabase');
const { initializeScheduler } = require('./services/schedulerService');

const { router: filesRouter } = require('./routes/files');
const authRouter = require('./routes/auth');
const { router: foldersRouter } = require('./routes/folders');
const casesRouter = require('./routes/cases');
const notificationsRouter = require('./routes/notifications');
const userRouter = require('./routes/user');

const app = express();
const server = http.createServer(app);

app.use(express.json());
app.use(cors({
  origin: [
    "http://localhost:3000",
    "http://localhost:5000",
    "https://my-app-frontend-production-e401.up.railway.app",
    "http://my-app-frontend-production-e401.up.railway.app:8080",
    "http://my-app-frontend-production-e401.up.railway.app:5000"
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

// Middleware untuk logging requests
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

app.use('/api/auth', authRouter);
app.use('/api/cases', casesRouter);
app.use('/api/notifications', notificationsRouter);
app.use('/api/user', userRouter);

app.use(fileUpload({
  createParentPath: true,
  limits: { 
    fileSize: 10 * 1024 * 1024
  },
  abortOnLimit: true,
  responseOnLimit: 'File terlalu besar, maksimal 10MB',
  debug: true
}));

app.use('/api/files', filesRouter);
app.use('/api/folders', foldersRouter);

// Serve static files
app.use(express.static(path.join(__dirname, '../../my-app/build')));

// Fallback route untuk client-side routing
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) {
    return next();
  }
  res.sendFile(path.join(__dirname, '../../my-app/build', 'index.html'));
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

// Test connection endpoint
app.get('/test-connection', async (req, res) => {
  try {
    // Test Supabase connection
    const { data: testData, error: supabaseError } = await supabase
      .from('cases')
      .select('count')
      .limit(1);

    // Test environment variables
    const envCheck = {
      NODE_ENV: process.env.NODE_ENV || 'not set',
      PORT: process.env.PORT || 'not set',
      SUPABASE_URL: process.env.SUPABASE_URL ? 'set' : 'not set',
      CORS_ORIGINS: [
        "http://localhost:3000",
        "https://my-app-frontend-production-e401.up.railway.app",
        "http://my-app-frontend-production-e401.up.railway.app:8080"
      ]
    };

    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      environment: envCheck,
      database: {
        connected: !supabaseError,
        error: supabaseError ? supabaseError.message : null
      },
      server: {
        status: 'running',
        uptime: process.uptime()
      },
      request: {
        origin: req.headers.origin,
        method: req.method,
        path: req.path
      }
    });

  } catch (error) {
    console.error('Test connection error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Tambahkan sebelum error handling middleware
app.use((req, res, next) => {
  res.status(404).json({
    success: false,
    error: 'Route not found'
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal Server Error',
    message: err.message
  });
});

// Di bagian atas file setelah imports
process.env.TZ = 'Asia/Jakarta';
console.log('Server timezone set to:', process.env.TZ);

// Verifikasi timezone
const moment = require('moment-timezone');
moment.tz.setDefault('Asia/Jakarta');

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log('Server URL:', process.env.NODE_ENV === 'production' 
    ? 'https://my-app-frontend-production-e401.up.railway.app' 
    : `http://localhost:${PORT}`
  );
  initializeScheduler();
}).on('error', (error) => {
  console.error('Server failed to start:', error);
  process.exit(1);
});