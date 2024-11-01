const express = require('express');
const path = require('path');
const cors = require('cors');
const fileUpload = require('express-fileupload');
const { supabase } = require('./config/supabase');

const app = express();

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    status: 'error',
    message: 'Something broke!'
  });
});

// Import routers
const authRouter = require('./routes/auth');
const casesRouter = require('./routes/cases');
const notificationsRouter = require('./routes/notifications');
const userRouter = require('./routes/user');
const filesRouter = require('./routes/files');
const foldersRouter = require('./routes/folders');

// Middleware
app.use(express.json());
app.use(cors({
  origin: [
    "http://localhost:3000",
    "https://my-app-frontend-production-e401.up.railway.app",
    "https://my-app-backend-production-15df.up.railway.app"
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
}));

// Basic route untuk memastikan server berjalan
app.get('/', (req, res) => {
  res.json({ message: 'Server is running' });
});

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    // Test database connection
    const { data, error } = await supabase.auth.getSession();
    
    if (error) {
      console.error('Database connection failed:', error);
      return res.status(503).json({
        status: 'error',
        message: 'Database connection failed',
        error: error.message
      });
    }

    res.status(200).json({
      status: 'OK',
      timestamp: new Date().toISOString(),
      database: 'connected'
    });

  } catch (error) {
    console.error('Health check error:', error);
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
});

// API routes
app.use('/api/auth', authRouter);
app.use('/api/cases', casesRouter);
app.use('/api/notifications', notificationsRouter);
app.use('/api/user', userRouter);
app.use('/api/files', filesRouter);
app.use('/api/folders', foldersRouter);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
