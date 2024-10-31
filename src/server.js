const express = require('express');
const http = require('http');
const cors = require('cors');
const fileUpload = require('express-fileupload');
const path = require('path');
const { supabase } = require('./config/supabase');

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
    "http://localhost:3002",
    "https://my-app-frontend-production.up.railway.app",
    "https://my-app-backend-production-15df.up.railway.app",
    "https://my-app-backend-production-ad9e.up.railway.app"
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
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});