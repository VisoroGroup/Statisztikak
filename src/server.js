require('dotenv').config();

const express = require('express');
const path = require('path');
const expressLayouts = require('express-ejs-layouts');
const session = require('express-session');
const PgSession = require('connect-pg-simple')(session);
const passport = require('passport');
const flash = require('connect-flash');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Passport config
require('./config/passport')(passport);

const app = express();

// Trust Railway's reverse proxy (needed for secure cookies behind proxy)
app.set('trust proxy', 1);

// Security & middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "cdn.jsdelivr.net"],
      styleSrc: ["'self'", "'unsafe-inline'", "cdn.jsdelivr.net", "fonts.googleapis.com"],
      fontSrc: ["'self'", "fonts.gstatic.com", "cdn.jsdelivr.net"],
      imgSrc: ["'self'", "data:", "blob:"],
      connectSrc: ["'self'"],
    },
  },
}));
app.use(compression());
if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
}

// Body parser
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Static files
app.use(express.static(path.join(__dirname, 'public')));

// EJS
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(expressLayouts);
app.set('layout', 'layouts/main');

// Session
const sessionConfig = {
  store: new PgSession({
    conString: process.env.DATABASE_URL,
    tableName: 'user_sessions',
    createTableIfMissing: true,
  }),
  secret: process.env.SESSION_SECRET || 'dev-secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    secure: false, // Railway handles HTTPS at proxy level
    httpOnly: true,
    sameSite: 'lax',
  },
};

app.use(session(sessionConfig));

// Passport
app.use(passport.initialize());
app.use(passport.session());

// Flash messages
app.use(flash());

// Global variables for templates
app.use((req, res, next) => {
  res.locals.user = req.user || null;
  res.locals.success_msg = req.flash('success');
  res.locals.error_msg = req.flash('error');
  res.locals.error = req.flash('error');
  next();
});

// Routes
const authRoutes = require('./routes/auth');
const statisticsRoutes = require('./routes/statistics');
const conditionsRoutes = require('./routes/conditions');
const adminRoutes = require('./routes/admin');
const exportRoutes = require('./routes/export');
const battleplanRoutes = require('./routes/battleplans');
const apiRoutes = require('./routes/api');

app.use('/', authRoutes);
app.use('/', statisticsRoutes);
app.use('/', conditionsRoutes);
app.use('/', adminRoutes);
app.use('/', exportRoutes);
app.use('/', battleplanRoutes);
app.use('/api', apiRoutes);

// Root redirect
app.get('/', (req, res) => {
  if (req.isAuthenticated()) {
    res.redirect(`/${req.user.organizationId.toString()}/statistics`);
  } else {
    res.redirect('/login');
  }
});

// 404
app.use((req, res) => {
  res.status(404).render('error', {
    title: '404 - Nem található',
    message: 'Az oldal nem található.',
    layout: 'layouts/main',
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).render('error', {
    title: 'Hiba',
    message: process.env.NODE_ENV === 'production'
      ? 'Belső szerverhiba történt.'
      : err.message,
    layout: 'layouts/main',
  });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Stats Visoro server running on port ${PORT}`);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  await prisma.$disconnect();
  process.exit(0);
});

module.exports = app;
