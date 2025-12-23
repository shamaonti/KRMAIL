const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const session = require('express-session');
require('dotenv').config({ path: './config.env' });

const authRoutes = require('./routes/auth');
const emailRoutes = require('./routes/email');
const campaignRoutes = require('./routes/campaigns');
const emailCampRoutes = require('./routes/emailcamp');
const followupService = require('./services/followupService');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(helmet({ contentSecurityPolicy: false }));

app.use(cors({
  origin: ['http://localhost:8080', 'http://localhost:5173'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

/* ✅ SESSION MIDDLEWARE (CRITICAL FIX) */
app.use(session({
  name: 'marketskrap.sid',
  secret: process.env.SESSION_SECRET || 'marketskrap_secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: false,       // localhost only
    sameSite: 'lax'
  }
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100
});
app.use('/api/', limiter);

app.get('/health', (req, res) => {
  res.json({ status: 'OK' });
});

app.use('/api/auth', authRoutes);
app.use('/api/email', emailRoutes);
app.use('/api/campaigns', campaignRoutes);
app.use('/api/emailcamp', emailCampRoutes);

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  followupService.startProcessor();
});

module.exports = app;
