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
const APP_VERSION = 'v1.2 (IP Debug Mode)';

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
    const urisToTry = [
      process.env.MONGO_URI, // 1. Try Render Env Variable
      'mongodb+srv://omp433167_db_user:Offbytes2025Secure@cluster0.9lbmrxq.mongodb.net/offbytes?appName=Cluster0', // 2. Try Recommended Password
      'mongodb+srv://omp433167_db_user:REAL_PASSWORD@cluster0.9lbmrxq.mongodb.net/offbytes?appName=Cluster0', // 3. Try User Input Literal
      'mongodb+srv://omp433167_db_user:offbytes123@cluster0.9lbmrxq.mongodb.net/offbytes?appName=Cluster0', // 4. Common Guess
      'mongodb+srv://omp433167_db_user:omp433167@cluster0.9lbmrxq.mongodb.net/offbytes?appName=Cluster0' // 5. Username as Password
    ].filter(uri => uri && uri.startsWith('mongodb')); // Filter out empty/invalid

    let connected = false;

    for (const [index, uri] of urisToTry.entries()) {
      if (connected) break;
      
      try {
        const cleanUri = uri.split('@')[1]; // Hide credentials in logs
        console.log(`Attempting connection ${index + 1}/${urisToTry.length}...`);
        dbStatus = `Trying connection ${index + 1}...`;

        await mongoose.connect(uri, {
          serverSelectionTimeoutMS: 3000 // Fast fail
        });

        console.log(`✅ MongoDB Connected using URI #${index + 1}`);
        dbStatus = `Connected (URI #${index + 1})`;
        connected = true;
      } catch (err) {
        console.error(`❌ Attempt ${index + 1} Failed: ${err.message}`);
      }
    }

    if (!connected) {
      dbStatus = 'Failed: ALL passwords invalid. Please Reset Password in Atlas.';
      console.error('All DB connection attempts failed.');
      // Retry whole loop after delay
      setTimeout(connectDB, 10000);
    }
  };

  connectDB();
};

startServer();
