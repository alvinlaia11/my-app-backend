
const express = require('express');
const cors = require('cors');

const setupServer = () => {
  const app = express();
  
  // Basic middleware
  app.use(express.json());
  app.use(cors());
  
  // Basic health check that doesn't depend on any services
  app.get('/', (req, res) => {
    res.status(200).send({
      status: 'ok',
      timestamp: new Date().toISOString()
    });
  });
  
  return app;
};

module.exports = setupServer;