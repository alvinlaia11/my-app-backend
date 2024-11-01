const express = require('express');
const cors = require('cors');

const app = express();

// Basic middleware
app.use(express.json());
app.use(cors());

// Simple health check
app.get('/', (_, res) => res.sendStatus(200));

// Start server first
const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
  
  // Setup routes after server is running
  try {
    app.use('/api/auth', require('./routes/auth'));
    app.use('/api/cases', require('./routes/cases'));
    app.use('/api/notifications', require('./routes/notifications'));
    app.use('/api/user', require('./routes/user'));
    app.use('/api/files', require('./routes/files'));
    app.use('/api/folders', require('./routes/folders'));
  } catch (error) {
    console.error('Error setting up routes:', error);
  }
});

// Handle shutdown
process.on('SIGTERM', () => {
  server.close(() => process.exit(0));
});
