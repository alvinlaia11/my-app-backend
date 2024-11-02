const express = require('express');
const router = express.Router();

// Import route handlers
const filesRouter = require('./files');
const foldersRouter = require('./folders');

// Mount routes
router.use('/files', filesRouter);
router.use('/folders', foldersRouter);

module.exports = router; 