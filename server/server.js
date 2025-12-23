const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
require('dotenv').config({ path: './config.env' });

// Routes
const authRoutes = require('./routes/auth');
const emailRoutes = require('./routes/email');
const campaignRoutes = require('./routes/campaigns');
const leadsRoutes = require('./routes/leads');

// Services
const followupService = require('./services/followupService');

const app = express();
const PORT = process.env.PORT || 3001;

/* ---------------- SECURITY ---------------- */
app.use(
  helmet({
    contentSecurityPolicy: false, // dev friendly
  })
);

/* ---------------- CORS ---------------- */
app.use(
  cors({
    origin: ['http://localhost:8080', 'http://localhost:5173'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

app.options('*', cors());

/* ---------------- MIDDLEWARE ---------------- */
app.use(compression());
app.use(morgan('dev'));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api', limiter);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

/* ---------------- HEALTH CHECK ---------------- */
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    environment: process.env.NODE_ENV || 'development',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

/* ---------------- API ROUTES ---------------- */
app.use('/api/auth', authRoutes);
app.use('/api/email', emailRoutes);
app.use('/api/campaigns', campaignRoutes);
app.use('/api/leads', leadsRoutes);

/* ---------------- 404 HANDLER ---------------- */
app.use((req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    path: req.originalUrl,
  });
});

/* ---------------- ERROR HANDLER ---------------- */
app.use((err, req, res, next) => {
  console.error('❌ Error:', err);

  res.status(err.statusCode || 500).json({
    error: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
});

/* ---------------- START SERVER ---------------- */
app.listen(PORT, () => {
  console.log(`🚀 MailSkrap Backend running on port ${PORT}`);
  console.log(`🗄️  DB: ${process.env.DB_NAME}`);
  console.log(`🌍 Env: ${process.env.NODE_ENV || 'development'}`);
  console.log(`❤️  Health: http://localhost:${PORT}/health`);

  followupService.startProcessor();
});

module.exports = app;
