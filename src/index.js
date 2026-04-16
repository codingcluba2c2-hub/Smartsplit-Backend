require('dotenv').config();
const dns = require('node:dns');

// Fix for querySrv ECONNREFUSED when using mongodb+srv
// This forces Node to use reliable public DNS servers for resolution
dns.setServers(['8.8.8.8', '1.1.1.1']);

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const cookieParser = require('cookie-parser');

const authRoutes = require('./routes/authRoutes');
const groupRoutes = require('./routes/groupRoutes');
const expenseRoutes = require('./routes/expenseRoutes');
const settlementRoutes = require('./routes/settlementRoutes');
const historyRoutes = require('./routes/historyRoutes');

const app = express();

// Middleware
// Increased limit to fix the "Network Error" when uploading screenshots
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(cors());
app.use(cookieParser());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/settlements', settlementRoutes);
app.use('/api/history', historyRoutes);

// Health check
app.get('/health', (req, res) => res.json({ status: 'OK' }));

// Database connection
const PORT = process.env.PORT || 5000;
const MONGODB_URI = "mongodb+srv://akhlaquerahman0786_db_user:SmartSplit123@smartsplitcluster.3dpujul.mongodb.net/?appName=SmartSplitCluster";
mongoose.connect(process.env.MONGODB_URI || MONGODB_URI)
  .then(() => {
    console.log('Connected to MongoDB');
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  })
  .catch((err) => console.error('MongoDB connection error:', err));
