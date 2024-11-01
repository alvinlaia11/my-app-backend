const express = require('express');
const path = require('path');
const cors = require('cors');
const fileUpload = require('express-fileupload');

const app = express();

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

// API routes
app.use('/api/auth', authRouter);
app.use('/api/cases', casesRouter);
app.use('/api/notifications', notificationsRouter);
app.use('/api/user', userRouter);
app.use('/api/files', filesRouter);
app.use('/api/folders', foldersRouter);

// Add after API routes
app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
