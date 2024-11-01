const express = require('express');
const cors = require('cors');

const app = express();

// Basic middleware
app.use(express.json());
app.use(cors());

// Root endpoint untuk health check
app.get('/', (req, res) => {
  res.status(200).send('OK');
});

// API routes setelah health check berhasil
const setupRoutes = () => {
  app.use('/api/auth', require('./routes/auth'));
  app.use('/api/cases', require('./routes/cases'));
  app.use('/api/notifications', require('./routes/notifications'));
  app.use('/api/user', require('./routes/user'));
  app.use('/api/files', require('./routes/files'));
  app.use('/api/folders', require('./routes/folders'));
};

// Start server
const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
  setupRoutes(); // Setup routes setelah server berjalan
});
