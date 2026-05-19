// index.js (Vercel version)
const dns = require('dns');
require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const http = require('http');
const socketService = require('./services/socketService');

const authRoutes = require('./routes/authRoutes');
const groupRoutes = require('./routes/groupRoutes');
const expenseRoutes = require('./routes/expenseRoutes');
const settlementRoutes = require('./routes/settlementRoutes');
const historyRoutes = require('./routes/historyRoutes');
const adminRoutes = require('./routes/adminRoutes');
const chatRoutes = require('./routes/chatRoutes');
const reportRoutes = require('./routes/reportRoutes');

const app = express();
const server = http.createServer(app);

// Enable trust proxy for real IP detection
app.set('trust proxy', true);

// Initialize Socket.io
socketService.init(server);

// Set DNS servers for local development only
if (process.env.NODE_ENV !== 'production') {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
}

// Disable mongoose buffering globally for serverless environments
mongoose.set('bufferCommands', false);

// Middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(cors());
app.use(cookieParser());

// Security headers for Google Auth popups
app.use((req, res, next) => {
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');
  next();
});

// Database connection (Vercel optimized)
const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('Missing MONGODB_URI');
}

// Cache connection for serverless
let cached = global.mongoose;
if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

// Monitor connection events
mongoose.connection.on('connected', () => console.log('Mongoose connected to DB'));
mongoose.connection.on('error', (err) => console.error('Mongoose connection error:', err.message));
mongoose.connection.on('disconnected', () => console.log('Mongoose disconnected'));

async function connectDB() {
  if (cached.conn) return cached.conn;

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
      serverSelectionTimeoutMS: 15000, 
      connectTimeoutMS: 15000,
    };

    console.log('Attempting to connect to MongoDB...');
    if (!MONGODB_URI) {
      const err = new Error('MONGODB_URI environment variable is missing');
      console.error(err.message);
      throw err;
    }

    // Mask URI for logs
    const maskedUri = MONGODB_URI.replace(/\/\/(.*):(.*)@/, '//***:***@');
    console.log(`Connecting to: ${maskedUri}`);

    cached.promise = mongoose.connect(MONGODB_URI, opts).then((mongoose) => {
      console.log('Successfully connected to MongoDB');
      return mongoose;
    }).catch(err => {
      console.error('MongoDB connection promise rejected:', err.message);
      cached.promise = null;
      throw err;
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    throw e;
  }

  return cached.conn;
}

// Connect DB before handling requests - MUST BE BEFORE ROUTES
app.use(async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (err) {
    console.error('Database connection error in middleware:', err.message);
    res.status(500).json({ error: 'Database connection failed. Please try again.' });
  }
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/settlements', settlementRoutes);
app.use('/api/history', historyRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/reports', reportRoutes);

// ❌ NO app.listen() here for Vercel
// But we need it for local development
const PORT = process.env.PORT || 5000;
if (process.env.NODE_ENV !== 'production') {
  server.listen(PORT, async () => {
    console.log(`Server running on port ${PORT}`);
    try {
      await connectDB();
    } catch (err) {
      console.error('Initial MongoDB connection failed:', err.message);
    }
  });
}

module.exports = app;