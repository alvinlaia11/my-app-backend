const express = require('express');
const cors = require('cors');
const fileUpload = require('express-fileupload');

// Import routers
const authRouter = require('./routes/auth');
const casesRouter = require('./routes/cases');
const filesRouter = require('./routes/files');
const foldersRouter = require('./routes/folders');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(fileUpload({
  limits: { fileSize: 10 * 1024 * 1024 },
  useTempFiles: true,
  tempFileDir: '/tmp/'
}));

// Routes
app.use('/api/auth', authRouter);
app.use('/api/cases', casesRouter);
app.use('/api/files', filesRouter);
app.use('/api/folders', foldersRouter);

// Error handling
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({
    success: false,
    error: 'Terjadi kesalahan pada server'
  });
});

module.exports = app; 