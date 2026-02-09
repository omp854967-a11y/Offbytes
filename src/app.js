const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const axios = require('axios'); // Added for IP check
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
let serverIP = 'Checking...';
const APP_VERSION = 'v1.3 (Force URI Fix)';

// Basic Route
app.get('/', (req, res) => {
  res.send(`
    <h1>Offbytes API</h1>
    <p><strong>Version:</strong> ${APP_VERSION}</p>
    <p><strong>Server IP:</strong> ${serverIP}</p>
    <p><strong>DB Status:</strong> ${dbStatus}</p>
    <hr>
    <h3>Troubleshooting:</h3>
    <ul>
      <li>If DB Status says "IP isn't whitelisted", go to MongoDB Atlas > Network Access > Add IP Address > Allow Access from Anywhere (0.0.0.0/0).</li>
      <li>If DB Status says "bad auth" or "authentication failed", check your MONGO_URI password in Render Environment Variables.</li>
    </ul>
  `);
});

// Database Connection & Server Start
const startServer = async () => {
  // Start server FIRST to pass Render health checks
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
  });

  // Check Server Public IP
  try {
    const ipRes = await axios.get('https://api.ipify.org?format=json');
    serverIP = ipRes.data.ip;
    console.log(`Server Public IP: ${serverIP}`);
  } catch (err) {
    console.error('Failed to get Server IP:', err.message);
    serverIP = 'Unknown';
  }

  // Database Connection
  const connectDB = async () => {
    try {
      // ⚠️ Fallback if Env Var is missing or undefined
      const fallbackURI = 'mongodb+srv://pom465311_db_user:Offbytes2025Secure@cluster0.nkiryhq.mongodb.net/offbytes?appName=Cluster0';
      
      let mongoURI = process.env.MONGO_URI;
      
      // Explicit check for undefined string or empty
      if (!mongoURI || mongoURI === 'undefined' || mongoURI.trim() === '') {
        console.warn('⚠️ MONGO_URI is missing/undefined. Using Fallback.');
        mongoURI = fallbackURI;
      }

      console.log(`Connecting to MongoDB...`); 

      const conn = await mongoose.connect(mongoURI, {
        serverSelectionTimeoutMS: 5000
      });

      console.log(`✅ MongoDB Connected! Host: ${conn.connection.host}`);
      dbStatus = 'Connected';
    } catch (error) {
      console.error(`Database Connection Error: ${error.message}`);
      dbStatus = `Connection Error: ${error.message}`;
      // Retry
      setTimeout(connectDB, 5000);
    }
  };

  connectDB();
};

startServer();
