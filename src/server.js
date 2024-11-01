const setupServer = require('./server-setup');

const app = setupServer();
let routesInitialized = false;

// Start server first
const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});

// Initialize routes after server is running
setTimeout(async () => {
  if (!routesInitialized) {
    try {
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

      routesInitialized = true;
      console.log('Routes initialized successfully');
    } catch (error) {
      console.error('Failed to initialize routes:', error);
    }
  }
}, 1000);

// Graceful shutdown
process.on('SIGTERM', () => {
  server.close(() => {
    console.log('Server shut down gracefully');
    process.exit(0);
  });
});
