const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Routes
app.use('/api/posts', require('./routes/postRoutes'));
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/user', require('./routes/userRoutes'));
app.use('/api/business', require('./routes/businessRoutes'));
app.use('/api/search', require('./routes/searchRoutes'));
app.use('/api/notifications', require('./routes/notificationRoutes'));
app.use('/api/saved-offers', require('./routes/savedOfferRoutes'));
app.use('/api/admin', require('./routes/adminRoutes'));

// Global DB Status for debugging
let dbStatus = 'Waiting for connection...';

// Basic Route
app.get('/', (req, res) => {
  res.send(`API is running... DB Status: ${dbStatus}`);
});

// Database Connection & Server Start
const startServer = async () => {
  // Start server FIRST to pass Render health checks
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
  });

  // Then try connecting to DB
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/offbytes');
    console.log(`MongoDB Connected: ${conn.connection.host}`);
    dbStatus = 'Connected';
  } catch (error) {
    console.error(`Database Connection Error: ${error.message}`);
    dbStatus = `Connection Error: ${error.message}`;
    // Do NOT exit process so the server stays alive and we can see the error on the page
  }
};

startServer();
