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
    "https://my-app-frontend-production-e401.up.railway.app"
  ],
  credentials: true
}));

// Middleware untuk logging requests
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

app.use('/api/auth', authRouter);
app.use('/api/cases', casesRouter);
app.use('/api/notifications', notificationsRouter);
app.use('/api/user', userRouter);
app.use('/api/files', filesRouter);
app.use('/api/folders', foldersRouter);

// Static file handling
app.use(express.static(path.join(__dirname, '../build')));

// Fallback route untuk React app
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../build/index.html'));
});

// Test connection endpoint
app.get('/test-connection', async (req, res) => {
  try {
    const { error: supabaseError } = await supabase
      .from('cases')
      .select('count')
      .limit(1);

    res.json({
      success: true,
      database: { connected: !supabaseError },
      server: { status: 'running' }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
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
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
  initializeScheduler();
});