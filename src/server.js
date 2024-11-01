const express = require('express');
const path = require('path');
const cors = require('cors');
const fileUpload = require('express-fileupload');

const app = express();

// Basic middleware
app.use(express.json());
app.use(cors());

// Simple root endpoint
app.get('/', (req, res) => {
  res.status(200).send('OK');
});

// API routes
const authRouter = require('./routes/auth');
const casesRouter = require('./routes/cases');
const notificationsRouter = require('./routes/notifications');
const userRouter = require('./routes/user');
const filesRouter = require('./routes/files');
const foldersRouter = require('./routes/folders');

app.use('/api/auth', authRouter);
app.use('/api/cases', casesRouter);
app.use('/api/notifications', notificationsRouter);
app.use('/api/user', userRouter);
app.use('/api/files', filesRouter);
app.use('/api/folders', foldersRouter);

// Error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).send('Internal Server Error');
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});
