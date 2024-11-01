const express = require('express');
const router = express.Router();
const authRoutes = require('./auth');
const userRoutes = require('./user');
const casesRoutes = require('./cases');

router.use('/auth', authRoutes);
router.use('/user', userRoutes);
router.use('/cases', casesRoutes);

module.exports = router; 