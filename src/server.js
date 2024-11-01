const express = require('express');
const cors = require('cors');
const fileUpload = require('express-fileupload');
const path = require('path');

const authRouter = require('./routes/auth');
const filesRouter = require('./routes/files');
const foldersRouter = require('./routes/folders');
const casesRouter = require('./routes/cases');
const notificationsRouter = require('./routes/notifications');
const userRouter = require('./routes/user');

const app = express();

// Middleware
app.use(express.json());
app.use(fileUpload());
app.use(cors({
  origin: [
    "http://localhost:3000",
    "https://my-app-frontend-production-e401.up.railway.app",
    "https://my-app-backend-production-15df.up.railway.app"
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept']
}));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Routes
app.use('/api/auth', authRouter);
app.use('/api/files', filesRouter);
app.use('/api/folders', foldersRouter);
app.use('/api/cases', casesRouter);
app.use('/api/notifications', notificationsRouter);
app.use('/api/user', userRouter);

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    error: 'Internal Server Error'
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
