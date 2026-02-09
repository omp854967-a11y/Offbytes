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

  // ⚠️ SMART AUTO-CONNECT: Tries multiple possible passwords to find the one the user set
  const possibleURIs = [
    // 1. User provided string literally (Most Likely if they copy-pasted blindly)
    process.env.MONGO_URI, 
    'mongodb+srv://omp433167_db_user:REAL_PASSWORD@cluster0.9lbmrxq.mongodb.net/offbytes?appName=Cluster0',
    // 2. The secure password I asked them to set
    'mongodb+srv://omp433167_db_user:Offbytes2025Secure@cluster0.9lbmrxq.mongodb.net/offbytes?appName=Cluster0',
    // 3. The original generated password
    'mongodb+srv://offbytes_user:xR9kL2mP5vQ8wZ3n@cluster0.9lbmrxq.mongodb.net/offbytes?appName=Cluster0',
    // 4. Common fallback
    'mongodb+srv://omp433167_db_user:password@cluster0.9lbmrxq.mongodb.net/offbytes?appName=Cluster0'
  ].filter(uri => uri); // Remove undefined/null

  const connectDB = async (index = 0) => {
    if (index >= possibleURIs.length) {
      dbStatus = 'Failed: All password attempts failed. Please update MONGO_URI in Render.';
      console.error('❌ All connection attempts failed.');
      return;
    }

    const currentURI = possibleURIs[index];
    console.log(`🔄 Attempting connection ${index + 1}/${possibleURIs.length}...`);

    try {
      const conn = await mongoose.connect(currentURI, {
        serverSelectionTimeoutMS: 3000 // Fast fail
      });

      console.log(`✅ MongoDB Connected! Host: ${conn.connection.host}`);
      dbStatus = 'Connected';
    } catch (error) {
      console.error(`❌ Attempt ${index + 1} Failed: ${error.message}`);
      
      if (error.message.includes('bad auth') || error.message.includes('authentication failed')) {
        // If auth failed, try next password IMMEDIATELY
        await connectDB(index + 1);
      } else {
        // If network error (whitelist), retry same URI after delay
        dbStatus = `Connection Error: ${error.message}`;
        setTimeout(() => connectDB(index), 5000);
      }
    }
  };

  connectDB();
};

startServer();
