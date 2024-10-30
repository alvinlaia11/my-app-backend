const express = require('express');
const cors = require('cors');
const fileUpload = require('express-fileupload');
const path = require('path');

const { router: filesRouter } = require('./routes/files');
const { router: authRouter } = require('./routes/auth');
const { router: foldersRouter } = require('./routes/folders');

const app = express();

app.use(express.json());
app.use(cors({
  origin: ["http://localhost:3000", "http://localhost:3002"],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

app.use(fileUpload({
  createParentPath: true,
  limits: { 
    fileSize: 10 * 1024 * 1024 // 10MB
  },
  abortOnLimit: true,
  responseOnLimit: 'File terlalu besar, maksimal 10MB',
  debug: true // tambahkan ini untuk debugging
}));

// Daftarkan routes
app.use('/api/auth', authRouter);
app.use('/api/files', filesRouter);
app.use('/api/folders', foldersRouter);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server berjalan di port ${PORT}`);
});